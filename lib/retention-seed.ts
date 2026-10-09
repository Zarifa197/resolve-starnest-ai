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
