import type {RetentionAccount,RetentionEvent} from './retention-core';
export function demoSeed(now=new Date()){
 const at=(hours:number)=>new Date(now.getTime()-hours*3600000).toISOString();
 const account=(id:string,name:string,consent:RetentionAccount['profile']['emailConsent']='allowed'):RetentionAccount=>({id:`demo:${id}`,workspace:'resolve-demo',name,email:`${id}@example.com`,source:'demo',version:1,profile:{plan:'Growth (synthetic)',mrr:249,purchase:null,onboarding:'Completed (synthetic)',emailConsent:consent}});
 const event=(id:string,kind:RetentionEvent['kind'],hours:number,summary:string,data:RetentionEvent['data']={}):RetentionEvent=>({id,kind,at:at(hours),summary,data,synthetic:true});
 return [
 {account:account('northstar','Northstar'),events:[event('northstar-fail-1','integration_failed',72,'CRM connection failed: authentication rejected.',{error:'authentication_rejected'}),event('northstar-fail-2','integration_failed',49,'CRM reconnection failed with the same authentication error.'),event('northstar-fail-3','integration_failed',25,'Third CRM connection attempt failed.'),event('northstar-support','support_open',24,'Customer requested help restoring the CRM connection.'),event('northstar-usage','usage_drop',2,'Weekly active sessions declined from 20 to 6.',{declinePercent:70,previous:20,current:6})]},
 {account:{...account('bluepeak','Bluepeak'),profile:{...account('bluepeak','Bluepeak').profile,onboarding:'Incomplete (synthetic)'}},events:[event('bluepeak-setup','onboarding_stalled',20,'Setup stopped before the first project was connected.')]},
 {account:account('meridian','Meridian'),events:[event('meridian-usage','usage_recovered',3,'Customer continues using the connected workspace regularly.')]},
 {account:account('harbor','HarborCloud','opted_out'),events:[event('harbor-payment','payment_failed',9,'Subscription payment failed. The customer has opted out of email.')]},
 {account:account('luma','LumaStack'),events:[event('luma-setup','onboarding_stalled',18,'Initial setup is incomplete. A support email was already simulated one hour ago.')]},
 {account:account('pine','PineWorks'),events:[event('pine-payment','payment_failed',8,'Subscription payment failed with an unspecified processor error.')]}
 ];
}

export function judgeSeed(workspace:string, now=new Date()) {
 const at=(hours:number)=>new Date(now.getTime()-hours*3600000).toISOString();
 const shopper=(id:string,name:string,consent:RetentionAccount['profile']['emailConsent']='allowed'):RetentionAccount=>({id:`${workspace}:${id}`,workspace,name,email:`${name.toLowerCase()}@example.com`,source:'demo',version:1,profile:{plan:null,mrr:null,purchase:'Only the fictional events in the timeline are supplied',onboarding:null,emailConsent:consent}});
 const event=(id:string,kind:RetentionEvent['kind'],hours:number,summary:string,data:RetentionEvent['data']={}):RetentionEvent=>({id,kind,at:at(hours),summary,data,synthetic:true});
 const abandoned=(id:string,hours:number,product:string)=>event(`${id}-incomplete`,'checkout_abandoned',hours,`Fictional checkout for ${product} remained incomplete after the waiting period. The reason is unknown.`,{checkoutId:`synthetic-${id}`,products:product,waitHours:4,confidence:'Observed incompletion; cause unknown'});
 const northstar=demoSeed(now)[0];
 return [
 {account:{...shopper('checkout','Ava'),profile:{...shopper('checkout','Ava').profile,purchase:'No earlier purchases are included in this example'}},events:[
   event('ava-view','product_viewed',5.5,'Ava viewed Trail Shoes.',{product:'Trail Shoes'}),
   event('ava-cart','product_added_to_cart',5.4,'Ava added Trail Shoes to the cart.',{product:'Trail Shoes'}),
   event('ava-checkout','checkout_started',5.3,'Ava started checkout for Trail Shoes.',{checkoutId:'synthetic-checkout',products:'Trail Shoes'}),
   abandoned('checkout',1.3,'Trail Shoes')]},
 {account:shopper('bluepeak','Leo'),events:[event('leo-collection','collection_viewed',2,'Leo browsed the Weekend Essentials collection.'),event('leo-view','product_viewed',1.8,'Leo viewed the Weekend Backpack.',{product:'Weekend Backpack'})]},
 {account:shopper('meridian','Maya'),events:[abandoned('maya',8,'Trail Shoes'),event('maya-complete','checkout_completed',1,'Maya completed checkout for Trail Shoes.',{checkoutId:'synthetic-maya',products:'Trail Shoes'}),event('maya-paid','order_paid',0.9,'Maya’s fictional order was paid. No recovery email was needed.',{product:'Trail Shoes'})]},
 {account:shopper('pine','Oliver'),events:[event('oliver-order','order_created',24,'Oliver placed a fictional order for a water bottle.',{product:'Water Bottle'}),event('oliver-cancel','order_cancelled',3,'Oliver requested cancellation. The specific reason was not supplied.',{reason:'customer',products:'Water Bottle'})]},
 {account:shopper('harbor','Noah','opted_out'),events:[event('noah-checkout','checkout_started',7,'Noah started checkout for a Weekend Backpack.',{checkoutId:'synthetic-noah',product:'Weekend Backpack'}),abandoned('noah',3,'Weekend Backpack')]},
 {account:shopper('luma','Emma'),events:[event('emma-checkout','checkout_started',10,'Emma started checkout for Trail Shoes.',{checkoutId:'synthetic-emma',product:'Trail Shoes'}),abandoned('emma',6,'Trail Shoes')]},
 {account:{...northstar.account,id:`${workspace}:northstar`,workspace},events:northstar.events}
 ];
}
