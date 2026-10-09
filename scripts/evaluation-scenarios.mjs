import {scoreRisk,defaultPolicy,evidenceFingerprint} from '../lib/retention-core.ts';
export async function evaluationScenarios(now){
 const old=new Date(now.getTime()-5*3600000).toISOString(),fresh=now.toISOString();
 const event=(id,kind,summary,data={},at=old)=>({id,kind,summary,data,at,synthetic:true});
 const definitions=[
 {id:'E01',name:'Incomplete checkout',expected:'checkout_recovery',events:[event('checkout','checkout_abandoned','A checkout containing Trail Shoes remained incomplete for five hours.',{products:'Trail Shoes',checkoutId:'synthetic1'})]},
 {id:'E02',name:'Customer cancellation with unknown cause',expected:'post_cancellation_followup',events:[event('cancel','order_cancelled','The customer requested cancellation of the Trail Shoes order. No additional explanation is available.',{reason:'customer',products:'Trail Shoes'})]},
 {id:'E03',name:'Repeat purchase inactivity',expected:'reengagement',events:[event('inactive','customer_inactive','A repeat purchaser has not ordered in 60 days; two observed earlier purchases were 25 days apart.',{days:60,usualDays:25})]},
 {id:'E04',name:'Opted-out checkout',expected:'internal_review',consent:'opted_out',events:[event('optoutcheckout','checkout_abandoned','Checkout remains incomplete, but email permission is opted out.',{checkoutId:'synthetic4'})]},
 {id:'E05',name:'Checkout already recovered',expected:'no_action',events:[event('recovercheckout','checkout_abandoned','An earlier checkout was incomplete.',{checkoutId:'synthetic5'}),event('purchase','checkout_recovered','The same checkout completed before outreach.',{checkoutId:'synthetic5'},fresh)]},
 {id:'E06',name:'Recent outreach inside cooldown',expected:'no_action',events:[event('recentcheckout','checkout_abandoned','Checkout remains incomplete.',{checkoutId:'synthetic6'})],recent:true}
 ];
 return Promise.all(definitions.map(async d=>{const account={id:`eval:${d.id}`,workspace:'synthetic-evaluation',name:'Sample shopper',email:null,source:'shopify',version:1,profile:{plan:null,mrr:null,onboarding:null,purchase:d.id==='E03'?'Two synchronized prior purchases; 25-day observed interval.':null,emailConsent:d.consent||'allowed'}};const actions=d.recent?[{id:'prior',accountId:account.id,decisionId:'prior',status:'accepted',mode:'test_email',createdAt:new Date(now.getTime()-3600000).toISOString(),completedAt:null,providerId:'synthetic-receipt',approvedBy:'test-fixture',beforeScore:45,subject:'Previous recovery message',message:'Synthetic',error:null}]:[];const p={account,events:d.events,actions,risk:scoreRisk(d.events),decision:null,audit:[],policy:defaultPolicy,capabilities:{ai:true,testEmail:false},baseline:null,fingerprint:await evidenceFingerprint(account,d.events,actions,defaultPolicy)};return {...d,profile:p};}));
}
