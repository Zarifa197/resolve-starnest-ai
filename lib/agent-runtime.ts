import {env} from '@resolve/runtime';
import {database} from './storage';
import {merchantSession,localOperator,decryptToken,signedValue} from './merchant-auth';
import {shopifyClient,CUSTOMER_FIELDS,CUSTOMER_MINIMAL_FIELDS,ORDER_FIELDS} from './shopify-client';
import {commerceStore,type CustomerNode,type OrderNode,type CheckoutNode} from './shopify-intelligence';
import {retentionStore} from './retention-store';
import {analyzeRetention} from './retention-ai';
import {sendTestEmail} from './email';
import {outreachBlock,activeEvents,type RetentionProfile,type Diagnosis} from './retention-core';
import {productionBlock,safeShopLink} from './merchant-policy';
import {runRetentionJobs} from './retention-jobs';
export async function authorizedShop(req:Request){if(localOperator(req))return env.SHOPIFY_SHOP_DOMAIN||null;return env.SESSION_SECRET?merchantSession(req,env.SESSION_SECRET):null;}
export async function connection(shop:string){
 const db=database(),row=await db.prepare('SELECT * FROM merchant_connections WHERE shop=?').bind(shop).first();
 if(row?.revoked_at)throw Error('Shopify connection was revoked. Reconnect before processing.');
 if(row&&env.SESSION_SECRET)return {graphql:shopifyClient(shop,await decryptToken(env.SESSION_SECRET,String(row.token_encrypted))),authenticated:true};
 if(shop!==env.SHOPIFY_SHOP_DOMAIN||!env.SHOPIFY_CLIENT_ID||!env.SHOPIFY_CLIENT_SECRET)throw Error('Shopify authentication is unavailable for this store.');
 const response=await fetch(`https://${shop}/admin/oauth/access_token`,{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'client_credentials',client_id:env.SHOPIFY_CLIENT_ID,client_secret:env.SHOPIFY_CLIENT_SECRET})});
 const result=await response.json() as {access_token?:string};if(!response.ok||!result.access_token)throw Error('Shopify authentication failed. Reconnect the store.');return {graphql:shopifyClient(shop,result.access_token),authenticated:false};
}
export async function domainVerified(sender:string){if(!env.RESEND_API_KEY||!sender)return false;const r=await fetch('https://api.resend.com/domains',{headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`},signal:AbortSignal.timeout(10000)});if(!r.ok)return false;const b=await r.json() as {data?:{name:string;status:string}[]};return !!b.data?.some(d=>d.name===sender.split('@')[1]&&d.status==='verified');}
export function agentRuntime(shop:string){
 const db=database(),commerce=commerceStore(db);
 async function preflight(p:RetentionProfile){
 if(p.account.source==='demo')return null;
 if(p.account.workspace!==shop)return 'Customer belongs to a different merchant.';
 const policy=await commerce.settings(shop);if(p.policy.merchant&&JSON.stringify(p.policy.merchant)!==JSON.stringify(policy))return 'Merchant policy changed. Analyze again.';const basic=outreachBlock(p.account,p.actions,new Date(),p.policy);if(basic)return basic;
 if(!p.account.email)return 'Customer email is unavailable.';
 const suppression=await db.prepare('SELECT reason FROM email_suppressions WHERE shop=? AND email=?').bind(shop,p.account.email.toLowerCase()).first();if(suppression)return `Email suppressed: ${suppression.reason}`;
 const c=await connection(shop),id=p.account.id.split(':').at(-1)!;
 const live=await c.graphql<{customer:CustomerNode&{orders:{nodes:OrderNode[]}}|null}>(`query($id:ID!){customer(id:$id){${CUSTOMER_MINIMAL_FIELDS} orders(first:10,sortKey:CREATED_AT,reverse:true){nodes{id createdAt cancelledAt}}}}`,{id:`gid://shopify/Customer/${id}`});
 if(!live.customer||live.customer.defaultEmailAddress?.marketingState!=='SUBSCRIBED')return 'Current Shopify email marketing consent is not subscribed.';
 if(live.customer.defaultEmailAddress.emailAddress.toLowerCase()!==p.account.email.toLowerCase())return 'Customer email changed. Synchronize and analyze again.';
 const trigger=activeEvents(p.events).findLast(e=>['checkout_abandoned','cart_abandoned','order_cancelled','customer_inactive'].includes(e.kind));if(!trigger)return 'No current actionable trigger remains.';
 if(live.customer.orders.nodes.some(o=>o.createdAt>trigger.at&&!o.cancelledAt))return 'A subsequent purchase made this recommendation stale.';
 if(trigger.kind==='cart_abandoned'&&policy.otherRecoveryAutomation)return 'Another recovery automation is configured. Cart outreach is suppressed.';
 if(trigger.kind==='checkout_abandoned'){
 const id=String(trigger.data.checkoutId||'').split('/').pop();if(!/^\d+$/.test(id||''))return 'Checkout reference is invalid.';
 const data=await c.graphql<{abandonedCheckouts:{nodes:{id:string;completedAt:string|null}[]}}>('query($query:String!){abandonedCheckouts(first:2,query:$query){nodes{id completedAt}}}',{query:`id:${id} status:open recovery_state:not_recovered email_state:not_sent`});if(!data.abandonedCheckouts.nodes.some(v=>v.id===trigger.data.checkoutId&&!v.completedAt))return 'Checkout was recovered or native recovery email is scheduled, suppressed, or already sent.';
 }
 if(policy.mode==='test_email'&&(!env.EMAIL_TEST_TO||!env.RESEND_API_KEY))return 'Configure the restricted test recipient and Resend key.';
 if(policy.mode==='customer_email')return productionBlock(policy,{authenticated:c.authenticated,domainVerified:await domainVerified(policy.senderEmail),provider:!!env.RESEND_API_KEY,publicUrl:!!env.PUBLIC_APP_URL?.startsWith('https://')&&!env.PUBLIC_APP_URL.includes('trycloudflare.com')});
 return null;
 }
 async function deliver(key:string,d:Diagnosis,p?:RetentionProfile){if(!p||p.account.source==='demo'||p.policy.mode==='test_email')return sendTestEmail(key,{tool:d.action,title:d.subject,reason:d.explanation,message:d.message,execution:'Restricted test recipient'});
 const policy=await commerce.settings(shop);if(policy.mode!=='customer_email'||!env.RESEND_API_KEY||!env.PUBLIC_APP_URL||!env.SESSION_SECRET)throw Error('Customer delivery prerequisites are incomplete.');
 const trigger=activeEvents(p.events).findLast(e=>e.kind==='checkout_abandoned'),checkout=trigger?await commerce.snapshot(shop,'checkout',String(trigger.data.checkoutId)) as CheckoutNode|null:null;
 const destination=d.action==='checkout_recovery'?safeShopLink(checkout?.abandonedCheckoutUrl||'',shop):`https://${shop}`;if(!destination)throw Error('A validated recovery destination is unavailable.');
 const token=await signedValue(env.SESSION_SECRET,{shop,email:p.account.email,expires:Date.now()+365*86400000}),unsubscribe=`${env.PUBLIC_APP_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;
 // Text only. AI never controls recipient, sender, links, headers, or HTML.
 const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`resolve-${key}`},body:JSON.stringify({from:`${policy.senderName.replace(/[<>\r\n]/g,'')} <${policy.senderEmail}>`,to:[p.account.email],reply_to:policy.replyTo,subject:d.subject,text:`${d.message}\n\nContinue: ${destination}\n\nMarketing email from ${policy.brandName}.\n${policy.postalAddress}\nUnsubscribe: ${unsubscribe}`,headers:{'List-Unsubscribe':`<${unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}})});const b=await r.json() as {id?:string};if(!r.ok||!b.id)throw Error('Provider did not confirm acceptance.');return b.id;
 }
 const store=retentionStore({db,ai:env.GEMINI_API_KEY?analyzeRetention:undefined,deliver,beforeExecute:preflight});return {store,commerce,preflight};
}
export async function agentTick(shop:string){
 const db=database(),runtime=agentRuntime(shop);
 const uninstalled=await db.prepare("SELECT event_id FROM webhook_inbox WHERE shop=? AND topic='app/uninstalled' AND status='pending'").bind(shop).all();
 if(uninstalled.results.length){await db.prepare('UPDATE merchant_connections SET revoked_at=? WHERE shop=?').bind(new Date().toISOString(),shop).run();await runtime.commerce.saveSettings(shop,{...await runtime.commerce.settings(shop),automatic:false});await db.prepare("UPDATE webhook_inbox SET status='processed' WHERE shop=? AND topic='app/uninstalled' AND status='pending'").bind(shop).run();return {uninstalled:true};}
 const c=await connection(shop);
 const inbox=await db.prepare("SELECT * FROM webhook_inbox WHERE shop=? AND status='pending' AND attempts<4 ORDER BY created_at LIMIT 10").bind(shop).all();
 for(const row of inbox.results){try{if(row.topic==='app/uninstalled'){await db.prepare('UPDATE merchant_connections SET revoked_at=? WHERE shop=?').bind(new Date().toISOString(),shop).run();await runtime.commerce.saveSettings(shop,{...await runtime.commerce.settings(shop),automatic:false});}else if(String(row.topic).startsWith('customers/')){const result=await c.graphql<{customer:CustomerNode|null}>(`query($id:ID!){customer(id:$id){${CUSTOMER_MINIMAL_FIELDS}}}`,{id:`gid://shopify/Customer/${row.resource_id}`});if(result.customer)await runtime.commerce.customer(shop,result.customer);}else{const result=await c.graphql<{order:OrderNode|null}>(`query($id:ID!){order(id:$id){${ORDER_FIELDS}}}`,{id:`gid://shopify/Order/${row.resource_id}`});if(result.order)await runtime.commerce.order(shop,result.order);}await db.prepare("UPDATE webhook_inbox SET status='processed',detail=NULL WHERE shop=? AND event_id=?").bind(shop,row.event_id).run();}catch(e){await db.prepare('UPDATE webhook_inbox SET attempts=attempts+1,detail=? WHERE shop=? AND event_id=?').bind(e instanceof Error?e.message:'Processing failed',shop,row.event_id).run();}}
 const sync=await runtime.commerce.sync(shop,c.graphql);const detection=await runtime.commerce.detect(shop);const jobs=await runRetentionJobs(db,shop,runtime.store,runtime.preflight);return {sync,detection,jobs};
}
