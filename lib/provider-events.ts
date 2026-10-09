import { after } from 'next/server';
import { analyze } from '@/lib/ai';
import { unpack } from '@/lib/recovery';
import { database } from '@/lib/storage';
import { recommend,type RecoveryDecision } from '@/lib/recovery';
export async function ingestEvent(event:{id:string;provider:string;type:string;customer:string;mode:string;context:Record<string,string>}){
 const db=database();const now=new Date().toISOString();const sourceId=`stream-${event.provider}`;const key=`${event.provider}:${event.id}`;
 const decision:RecoveryDecision=event.type==='invoice.payment_failed'?{tool:'ask_user',title:'Clarify the payment issue',reason:'Stripe reported invoice.payment_failed. The payment failure is confirmed, but its underlying cause is unknown.',message:'Your subscription payment did not complete. Check the payment details in your account. If you need help, tell us what error you encountered.',execution:'Payment guidance was prepared in the dashboard.'}:event.type==='orders/cancelled'?{tool:'ask_user',title:'Ask about the cancellation',reason:'Shopify reported an order cancellation. This event alone does not establish that the customer is leaving.',message:'We noticed your order was cancelled. Was there a problem we can help you with?',execution:'A question about the cancellation was prepared in the dashboard.'}:recommend(event.type,event.context);
 // The receipt and recovery record are committed atomically. A duplicate delivery cannot create another case.
 const result=await db.batch([
 db.prepare('INSERT OR IGNORE INTO imports (id,filename,source,row_count,status,created_at) VALUES (?,?,?,?,?,?)').bind(sourceId,event.provider+' webhook',event.provider,0,'complete',now),
 db.prepare('INSERT OR IGNORE INTO provider_events (id,provider,event_type,customer_id,mode,created_at) VALUES (?,?,?,?,?,?)').bind(key,event.provider,event.type,event.customer,event.mode,now),
 db.prepare('INSERT OR IGNORE INTO recovery_records (id,customer_id,name,signal,context,status,decision,source,import_id,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)').bind(key,event.customer,event.customer,event.type,JSON.stringify({...event.context,environment:event.mode}),'pending',JSON.stringify(decision),event.provider,sourceId,now,now),
 db.prepare('UPDATE retention_accounts SET version=version+1 WHERE id=? AND changes()=1').bind(`shopify:${event.context.shop||''}:${event.customer}`)
 ]);
 if(result[1].meta.changes!==0)after(async()=>{
  const raw=await db.prepare('SELECT * FROM recovery_records WHERE id=?').bind(key).first();
  if(!raw)return;const record=unpack(raw);
  try{
   const aiDecision=await analyze(record);
   await db.prepare('UPDATE recovery_records SET decision=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(aiDecision),new Date().toISOString(),key,record.version).run();
   // Manual approval is the default. Email execution is owned by the retention lifecycle.

  }catch{
   console.warn('Automatic AI analysis failed; original rule decision preserved.');
  }
 });
 return {received:true,duplicate:result[1].meta.changes===0};
}
