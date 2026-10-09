import {equal} from './webhooks.ts';
export async function verifyEmailReceipt(raw:string,headers:Headers,secret:string,now=Date.now()){
 const id=headers.get('svix-id')||'',timestamp=headers.get('svix-timestamp')||'',sigs=headers.get('svix-signature')||'';
 if(!id||Math.abs(now/1000-Number(timestamp))>300||!Number(timestamp))return false;
 try{const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(secret.replace(/^whsec_/,'')),c=>c.charCodeAt(0)),{name:'HMAC',hash:'SHA-256'},false,['sign']);const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${id}.${timestamp}.${raw}`));const value=btoa(String.fromCharCode(...new Uint8Array(mac)));return sigs.split(' ').some(s=>s.startsWith('v1,')&&equal(s.slice(3),value));}catch{return false}
}
export async function recordEmailReceipt(db:D1Database,eventId:string,kind:string,providerId:string,at:string){
 if(!['email.delivered','email.bounced','email.complained','email.failed'].includes(kind))return {ignored:true};
 const status=kind.slice(6),rows=await db.prepare('SELECT a.id,a.account_id,a.body,r.workspace,r.email FROM retention_actions a JOIN retention_accounts r ON r.id=a.account_id WHERE json_extract(a.body,\'$.providerId\')=?').bind(providerId).all();
 if(!rows.results.length)return {unmatched:true};
 // Retain every receipt, but never let a late delivery event undo a bounce/complaint.
 for(const row of rows.results){const action=JSON.parse(String(row.body));if(['bounced','complained'].includes(action.status)&&status==='delivered')continue;action.status=status;const statements=[db.prepare('INSERT OR IGNORE INTO email_receipts(event_id,provider_id,kind,at) VALUES(?,?,?,?)').bind(eventId,providerId,kind,at),db.prepare('UPDATE retention_actions SET body=? WHERE id=? AND changes()=1').bind(JSON.stringify(action),row.id),db.prepare("UPDATE retention_jobs SET status=?,detail=? WHERE shop=? AND decision_id=? AND status IN('accepted','delivered','unknown','sending')").bind(status,`Verified provider receipt: ${kind}`,row.workspace,action.decisionId),db.prepare('INSERT OR IGNORE INTO retention_audit(id,account_id,kind,detail,at) VALUES(?,?,?,?,?)').bind(`resend:${eventId}`,row.account_id,status,`Verified Resend receipt: ${kind}`,at)];if(['bounced','complained'].includes(status)&&action.mode==='customer_email'&&row.email)statements.push(db.prepare('INSERT INTO email_suppressions(shop,email,reason,at) VALUES(?,?,?,?) ON CONFLICT(shop,email) DO UPDATE SET reason=excluded.reason,at=excluded.at').bind(row.workspace,String(row.email).toLowerCase(),status,at));await db.batch(statements);}
 return {recorded:true};
}
