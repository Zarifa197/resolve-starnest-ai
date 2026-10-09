import type { RecoveryRecord } from './recovery';
export const signalLabel=(signal:string)=>({'orders/cancelled':'Order cancelled','invoice.payment_failed':'Payment failed','customer.subscription.deleted':'Subscription ended','customer.subscription.trial_will_end':'Trial ending'}[signal]||signal);
export const recordTitle=(r:RecoveryRecord)=>r.source==='shopify'?(r.context.order_name?`Order ${r.context.order_name}`:'Cancelled order'):r.name;
export const contextLabel=(key:string)=>({order_id:'Order ID',order_name:'Order number',cancel_reason:'Cancellation reason',shop:'Store',environment:'Environment'}[key]||key);
export const contextValue=(key:string,value:string)=>key==='environment'&&value==='test'?'Test store':key==='cancel_reason'?({customer:'Customer request',inventory:'Out of stock',fraud:'Suspected fraud',declined:'Payment declined',other:'Other',not_provided:'Not provided'}[value]||value):value;
