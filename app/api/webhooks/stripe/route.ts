import { env } from '@resolve/runtime';
import { z } from 'zod';
import { verifyStripe } from '@/lib/webhooks';
import { ingestEvent } from '@/lib/provider-events';
import { storageError } from '@/lib/storage';
export async function POST(req:Request){
 if(!env.STRIPE_WEBHOOK_SECRET)return Response.json({error:'Stripe connection is not configured'},{status:503});
 const raw=await req.text();if(raw.length>1000000)return new Response('Payload too large',{status:413});
 if(!await verifyStripe(raw,req.headers.get('stripe-signature')||'',env.STRIPE_WEBHOOK_SECRET))return new Response('Invalid signature',{status:401});
 let input;try{input=JSON.parse(raw)}catch{return new Response('Invalid JSON',{status:400})}
 const parsed=z.object({id:z.string().max(150),type:z.string(),livemode:z.boolean(),data:z.object({object:z.object({customer:z.union([z.string(),z.object({id:z.string()})]).nullish(),currency:z.string().optional(),attempt_count:z.number().optional()}).passthrough()})}).safeParse(input);if(!parsed.success)return new Response('Invalid event',{status:400});
 const e=parsed.data;if(e.livemode)return new Response('Only test events are enabled',{status:403});
 if(!['invoice.payment_failed','customer.subscription.deleted','customer.subscription.trial_will_end'].includes(e.type))return Response.json({received:true,ignored:true});
 const customer=typeof e.data.object.customer==='string'?e.data.object.customer:e.data.object.customer?.id;if(!customer)return new Response('Missing customer',{status:400});
 try{return Response.json(await ingestEvent({id:e.id,provider:'stripe',type:e.type,customer,mode:'test',context:{currency:e.data.object.currency||'',attempt_count:String(e.data.object.attempt_count||0)}}))}catch(e){return storageError(e)}
}
