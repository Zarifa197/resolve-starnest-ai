import {env} from '@resolve/runtime';
import {agentTick} from '@/lib/agent-runtime';
import {localOperator} from '@/lib/merchant-auth';
import {equal,signature} from '@/lib/webhooks';
export async function POST(req:Request){if(!localOperator(req)||!env.SHOPIFY_CLIENT_SECRET||!env.SHOPIFY_SHOP_DOMAIN)return new Response('Unauthorized',{status:401});const time=req.headers.get('x-resolve-time')||'';if(Math.abs(Date.now()-Number(time))>60000||!equal(req.headers.get('x-resolve-signature')||'',await signature(env.SHOPIFY_CLIENT_SECRET,`agent:${time}`,'hex')))return new Response('Unauthorized',{status:401});try{return Response.json(await agentTick(env.SHOPIFY_SHOP_DOMAIN));}catch{return Response.json({error:'Background cycle failed; retry on the next tick.'},{status:503})}}
