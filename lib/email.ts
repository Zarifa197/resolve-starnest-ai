import { env } from '@resolve/runtime';
import type { RecoveryDecision } from './recovery';
export async function sendTestEmail(key:string,decision:RecoveryDecision){
 if(!env.RESEND_API_KEY||!env.EMAIL_TEST_TO)throw Error('Email is not configured');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`resolve-${key}`},body:JSON.stringify({from:'Resolve <onboarding@resend.dev>',to:[env.EMAIL_TEST_TO],subject:`[Resolve test] ${decision.title}`,text:`This is a demo email prepared from a Shopify test event.\n\n${decision.message}\n\n— Resolve`})});
 const body=await response.json() as {id?:string};
 if(!response.ok||!body.id)throw Error('The email provider did not accept the message');
 return body.id;
}
