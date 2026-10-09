import { z } from 'zod';

export const eventSchema = z.object({
 id:z.string().min(1).max(180), kind:z.enum(['integration_failed','integration_restored','usage_drop','usage_recovered','onboarding_stalled','onboarding_completed','payment_failed','payment_recovered','support_open','support_resolved','order_cancelled','order_created','order_paid','order_fulfilled','refund_issued','checkout_abandoned','checkout_recovered','customer_inactive','cart_abandoned','browsing_interest','page_viewed','product_viewed','collection_viewed','product_added_to_cart','product_removed_from_cart','cart_viewed','checkout_started','checkout_contact_info_submitted','checkout_completed','search_submitted']),
 at:z.string().datetime(), summary:z.string().min(1).max(600), data:z.record(z.union([z.string().max(500),z.number().finite(),z.boolean()])).default({}), synthetic:z.boolean()
}).superRefine((event,ctx)=>{const decline=event.data.declinePercent;if(typeof decline==='number'&&(decline<0||decline>100))ctx.addIssue({code:'custom',message:'Usage decline must be between 0 and 100 percent.'});});
export type RetentionEvent = z.infer<typeof eventSchema>;
export type RetentionAccount = {id:string;workspace:string;name:string;email:string|null;source:'demo'|'shopify';version:number;profile:{plan:string|null;mrr:number|null;purchase:string|null;onboarding:string|null;emailConsent:'allowed'|'opted_out'|'unknown';commerce?:{createdAt:string;orders:string|null;spending:{amount:string;currencyCode:string}|null;tags:string[];consentState:string;consentUpdatedAt:string|null;unsubscribeUrl:string|null}}};
export type Evidence = {eventId:string;label:string;points:number};
export type Risk = {score:number;level:'High'|'Moderate'|'Low'|'Unknown';evidence:Evidence[];summary:string};
export type Intervention = {id:string;accountId:string;decisionId:string;status:'awaiting_approval'|'executing'|'simulated'|'accepted'|'failed'|'unknown'|'delivered'|'bounced'|'complained'|'suppressed';mode:'simulation'|'test_email'|'customer_email';createdAt:string;completedAt:string|null;providerId:string|null;approvedBy:string;beforeScore:number;subject:string;message:string;error:string|null};
export const diagnosisSchema=z.object({action:z.enum(['troubleshoot','onboarding_help','billing_help','clarify','internal_review','no_action','checkout_recovery','cart_recovery','post_cancellation_followup','reengagement']),cause:z.string().min(1).max(1000),uncertainty:z.string().min(1).max(1000),explanation:z.string().min(1).max(1200),evidenceIds:z.array(z.string()).max(30),subject:z.string().max(180),message:z.string().max(2000)}).strict();
export type Diagnosis=z.infer<typeof diagnosisSchema> & {engine:'gemini'|'deterministic';model?:string;fallbackReason?:string};
export type Decision={id:string;accountId:string;fingerprint:string;createdAt:string;diagnosis:Diagnosis};
export type Audit={id:string;kind:string;detail:string;at:string};
export type RetentionProfile={account:RetentionAccount;events:RetentionEvent[];risk:Risk;decision:Decision|null;actions:Intervention[];audit:Audit[];fingerprint:string;policy:Policy;capabilities:{ai:boolean;testEmail:boolean};baseline: number|null};
export type Policy={automatic:boolean;mode:'simulation'|'test_email'|'customer_email';cooldownHours:number;merchant?:import('./merchant-policy.ts').MerchantPolicy};
export const defaultPolicy:Policy={automatic:false,mode:'simulation',cooldownHours:72};
const pairs:Partial<Record<RetentionEvent['kind'],RetentionEvent['kind']>>={integration_failed:'integration_restored',usage_drop:'usage_recovered',onboarding_stalled:'onboarding_completed',payment_failed:'payment_recovered',support_open:'support_resolved'};
export function activeEvents(events:RetentionEvent[]):RetentionEvent[]{
 const sorted=[...events].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
 return sorted.filter((event,i)=>{const later=sorted.slice(i+1);if(pairs[event.kind]&&later.some(next=>next.kind===pairs[event.kind]))return false;if(['checkout_abandoned','cart_abandoned','customer_inactive','browsing_interest'].includes(event.kind)&&later.some(next=>['order_created','order_paid','checkout_completed'].includes(next.kind)||next.kind==='checkout_recovered'&&next.data.checkoutId===event.data.checkoutId))return false;return true;});
}
// Evidence weights are a deterministic prioritization heuristic, not a churn probability.
export function scoreRisk(events:RetentionEvent[]):Risk{
 const active=activeEvents(events), evidence:Evidence[]=[];
 const add=(kind:RetentionEvent['kind'],points:number,label:string)=>{const event=active.findLast(e=>e.kind===kind);if(event)evidence.push({eventId:event.id,label,points})};
 add('integration_failed',35,'Integration failures remain unresolved');
 const failures=active.filter(e=>e.kind==='integration_failed');if(failures.length>=3)evidence.push({eventId:failures[failures.length-1].id,label:'Three or more integration failures',points:10});
 const usage=active.findLast(e=>e.kind==='usage_drop');if(usage&&typeof usage.data.declinePercent==='number'&&usage.data.declinePercent>=25)evidence.push({eventId:usage.id,label:`Usage declined ${usage.data.declinePercent}%`,points:usage.data.declinePercent>=50?30:15});
 add('support_open',15,'Support issue is still open');add('onboarding_stalled',20,'Onboarding has stalled');add('payment_failed',25,'Payment failure is unresolved');const cancellation=active.findLast(e=>e.kind==='order_cancelled');if(cancellation&&!['fraud','inventory','declined'].includes(String(cancellation.data.reason)))evidence.push({eventId:cancellation.id,label:cancellation.data.reason==='customer'?'Customer-requested cancellation; dissatisfaction is unproven':'Order cancelled; the underlying reason is unknown',points:10});add('checkout_abandoned',45,'Checkout is incomplete after the waiting period');add('cart_abandoned',25,'Identified cart has no observed checkout');add('customer_inactive',30,'Repeat purchases are overdue relative to observed history');add('browsing_interest',5,'Repeated interest is a weak signal only');
 const score=Math.min(100,evidence.reduce((sum,e)=>sum+e.points,0));
 const known=events.some(e=>e.kind!=='order_cancelled');
 const level=score>=60?'High':score>=25?'Moderate':known||score>0?'Low':'Unknown';
 return {score,level,evidence,summary:level==='Unknown'?'Not enough activity data to assess risk.':score===0?'No unresolved risk signals in the available events.':`${evidence.length} observed signal${evidence.length===1?' contributes':'s contribute'} to this score.`};
}
export function outreachBlock(account:RetentionAccount,actions:Intervention[],now:Date,policy:Policy):string|null{
 if(account.profile.emailConsent==='opted_out')return 'The customer opted out of email. Only an internal review is allowed.';
 if(account.profile.emailConsent==='unknown')return 'Communication permission is unavailable. Confirm permission before outreach.';
 const recent=actions.find(a=>['executing','simulated','accepted','unknown','delivered','bounced','complained'].includes(a.status)&&now.getTime()-new Date(a.completedAt||a.createdAt).getTime()<policy.cooldownHours*3600000);
 return recent?`An outreach attempt is inside the ${policy.cooldownHours}-hour contact limit. Do not send another message.`:null;
}
export function baselineDiagnosis(account:RetentionAccount,events:RetentionEvent[],actions:Intervention[],now:Date,policy:Policy):Diagnosis{
 const risk=scoreRisk(events),block=outreachBlock(account,actions,now,policy),active=activeEvents(events);let action:Diagnosis['action']='no_action',cause='No unresolved risk signal is available.',uncertainty='Available events do not prove whether this customer will leave.',explanation='Monitor new activity instead of contacting a customer without a supported reason.',subject='',message='';
 if(block){action=account.profile.emailConsent==='opted_out'?'internal_review':'no_action';cause=block;explanation='Outreach is suppressed by communication policy.';}
 else if(account.source==='shopify'||active.some(e=>['checkout_abandoned','cart_abandoned','customer_inactive','order_cancelled'].includes(e.kind))){
 const checkout=active.findLast(e=>e.kind==='checkout_abandoned'),cart=active.findLast(e=>e.kind==='cart_abandoned'),inactive=active.findLast(e=>e.kind==='customer_inactive'),cancelled=active.findLast(e=>e.kind==='order_cancelled'&&e.data.reason==='customer');
 action=checkout?'checkout_recovery':cart?'cart_recovery':cancelled?'post_cancellation_followup':inactive?'reengagement':'no_action';
 if(policy.merchant&&!policy.merchant.allowed.includes(action as import('./merchant-policy.ts').MerchantPolicy['allowed'][number]))action='no_action';
 if(action!=='no_action'){cause='The recorded shopping journey is incomplete; the specific reason is unknown.';uncertainty='These events do not establish dissatisfaction, unexpected costs, or the reason for leaving.';explanation=action==='post_cancellation_followup'?'Respectfully offer assistance after a customer-requested cancellation.':action==='reengagement'?'Prior observed purchase timing supports a consented, helpful check-in.':'Offer a helpful reminder without assuming why the shopping journey stopped.';subject=action==='post_cancellation_followup'?'Can we help with your cancelled order?':action==='reengagement'?'A quick check-in':'Pick up where you left off';message=`Hi ${account.name},\n\n${action==='post_cancellation_followup'?'If you need help with your cancelled order, reply and let us know.':action==='reengagement'?'We hope you are doing well. If there is anything we can help you find, just reply.':'You can return to your shopping when you are ready. Reply if you need a hand.'}\n\n${policy.merchant?.brandName||'Resolve'}`;}
 }
 else if(active.some(e=>e.kind==='integration_failed')){action='troubleshoot';cause='Integration failures may be preventing the customer from using the product.';explanation='Help restore the integration before considering incentives.';subject='Let’s help restore your integration';message=`Hi ${account.name},\n\nWe noticed repeated integration failures${active.some(e=>e.kind==='usage_drop')?' alongside a drop in usage':''}. Would you like help checking the connection and the errors you are seeing? We can route the details to support.\n\nResolve`}
 else if(active.some(e=>e.kind==='payment_failed')){action='billing_help';cause='A payment failure may be interrupting access.';explanation='Offer help with the billing issue; do not assume the customer cannot afford the product.';subject='Help with your recent payment';message=`Hi ${account.name},\n\nYour latest payment did not complete. Please check your account’s billing details. If you encountered an error, reply with what you saw so we can help.\n\nResolve`}
 else if(active.some(e=>e.kind==='onboarding_stalled')){action='onboarding_help';cause='Incomplete onboarding may be blocking the first useful experience.';explanation='Ask which setup step is difficult and offer focused help.';subject='Can we help with setup?';message=`Hi ${account.name},\n\nIt looks like setup is incomplete. Which step is holding you up? We can help you work through it.\n\nResolve`}
 else if(risk.score>0){action='clarify';cause='A change was observed, but its specific cause is unknown.';explanation='Ask a focused question before choosing an intervention.';subject='Can we help with a recent issue?';message=`Hi ${account.name},\n\nWe noticed a recent change in your account activity. Is there a problem we can help you work through?\n\nResolve`}
 return {action,cause,uncertainty,explanation,evidenceIds:[...new Set(risk.evidence.map(e=>e.eventId))],subject,message,engine:'deterministic'};
}
export function validateDiagnosis(input:unknown,account:RetentionAccount,events:RetentionEvent[],actions:Intervention[],now:Date,policy:Policy):z.infer<typeof diagnosisSchema>{
 const result=diagnosisSchema.parse(input),ids=new Set(events.map(e=>e.id));if(result.evidenceIds.some(id=>!ids.has(id)))throw Error('AI cited an event that is not present.');
 const baseline=baselineDiagnosis(account,events,actions,now,policy);
 if(outreachBlock(account,actions,now,policy)&&!['no_action','internal_review'].includes(result.action))throw Error('AI recommendation conflicts with communication policy.');
 if(scoreRisk(events).score===0&&!['no_action','internal_review'].includes(result.action))throw Error('No unresolved evidence supports customer outreach.');
 if(result.action!==baseline.action&&!['no_action','internal_review'].includes(result.action))throw Error('The intervention does not match the available evidence.');
 if(['no_action','internal_review'].includes(result.action)){result.subject='';result.message='';}
 else if(!result.subject.trim()||!result.message.trim()||!result.evidenceIds.length)throw Error('An outreach recommendation requires evidence and a message.');
 if(account.source==='shopify'&&result.message&&(/https?:\/\//i.test(result.message)||/\b(discount|coupon|free shipping|guarantee|limited.time|hurry)\b/i.test(result.message)))throw Error('Unapproved links, offers, or promises are not allowed.');
 return result;
}
export function executionBlock(profile:Pick<RetentionProfile,'account'|'events'|'actions'|'policy'|'fingerprint'|'decision'>,now:Date):string|null{
 if(!profile.decision)return 'Analyze this customer before execution.';
 if(profile.decision.fingerprint!==profile.fingerprint)return 'Customer evidence or policy changed. Run analysis again.';
 if(['no_action','internal_review'].includes(profile.decision.diagnosis.action))return 'This decision does not permit customer outreach.';
 return outreachBlock(profile.account,profile.actions,now,profile.policy);
}
export async function evidenceFingerprint(account:RetentionAccount,events:RetentionEvent[],actions:Intervention[],policy:Policy):Promise<string>{
 const text=JSON.stringify({account: {...account,version:undefined},events:[...events].sort((a,b)=>a.id.localeCompare(b.id)),actions:actions.filter(a=>a.status!=='awaiting_approval').map(a=>[a.id,a.status,a.completedAt]),policy});
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
