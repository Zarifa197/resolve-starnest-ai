import {defaultPolicy,evidenceFingerprint,scoreRisk,executionBlock,baselineDiagnosis,validateDiagnosis,eventSchema,activeEvents,type RetentionAccount,type RetentionEvent,type Decision,type Diagnosis,type Intervention,type Audit,type Policy,type RetentionProfile} from './retention-core.ts';
import {demoSeed,judgeSeed} from './retention-seed.ts';
export class RetentionError extends Error {status:number;constructor(message:string,status=409){super(message);this.status=status}}
type Dependencies={db:D1Database;ai?:(profile:RetentionProfile)=>Promise<Diagnosis>;deliver?:(key:string,diagnosis:Diagnosis,profile?:RetentionProfile)=>Promise<string>;beforeExecute?:(profile:RetentionProfile)=>Promise<string|null>;now?:()=>Date};
export function retentionStore(deps:Dependencies){
 const {db}=deps;const now=()=>deps.now?.()||new Date();const id=()=>crypto.randomUUID();
 const audit=(account:string,kind:string,detail:string)=>db.prepare('INSERT INTO retention_audit(id,account_id,kind,detail,at) VALUES(?,?,?,?,?)').bind(id(),account,kind,detail,now().toISOString());
 const parseAccount=(row:Record<string,unknown>):RetentionAccount=>({id:String(row.id),workspace:String(row.workspace),name:String(row.name),email:row.email?String(row.email):null,source:row.source as RetentionAccount['source'],profile:JSON.parse(String(row.profile)),version:Number(row.version)});
 async function policy(workspace:string):Promise<Policy>{const row=await db.prepare('SELECT body FROM retention_settings WHERE workspace=?').bind(workspace).first();return row?JSON.parse(String(row.body)):defaultPolicy;}
 async function registerShopify(company:string){
 const rows=await db.prepare('SELECT * FROM customers WHERE company_id=?').bind(company).all();
 if(rows.results.length)await db.batch(rows.results.map(c=>db.prepare('INSERT INTO retention_accounts(id,workspace,name,email,source,profile,version) VALUES(?,?,?,?,?,?,1) ON CONFLICT(id) DO NOTHING').bind(`shopify:${c.id}`,company,`Customer ${String(c.shopify_id).slice(-6)}`,c.email,'shopify',JSON.stringify({plan:null,mrr:null,purchase:null,onboarding:null,emailConsent:'unknown'}))));
 }
 async function seed(reset=false,workspace='resolve-demo'){
 if(workspace!=='resolve-demo'&&!/^judge:[a-f0-9]{64}$/.test(workspace))throw new RetentionError('Invalid demo workspace.',403);
 const existing=await db.prepare('SELECT id FROM retention_accounts WHERE workspace=? LIMIT 1').bind(workspace).first();if(existing&&!reset)return;
 const statements:D1PreparedStatement[]=[];
 if(reset){for(const table of ['retention_actions','retention_decisions','retention_audit','retention_events'])statements.push(db.prepare(`DELETE FROM ${table} WHERE account_id IN(SELECT id FROM retention_accounts WHERE workspace=?)`).bind(workspace));statements.push(db.prepare('DELETE FROM retention_accounts WHERE workspace=?').bind(workspace));statements.push(db.prepare('DELETE FROM retention_settings WHERE workspace=?').bind(workspace));}
 for(const {account,events} of (workspace==='resolve-demo'?demoSeed(now()):judgeSeed(workspace,now()))){
 statements.push(db.prepare('INSERT OR IGNORE INTO retention_accounts(id,workspace,name,email,source,profile,version) VALUES(?,?,?,?,?,?,?)').bind(account.id,account.workspace,account.name,account.email,account.source,JSON.stringify(account.profile),account.version));
 for(const event of events)statements.push(db.prepare('INSERT OR IGNORE INTO retention_events(id,account_id,body) VALUES(?,?,?)').bind(`${workspace}:${event.id}`,account.id,JSON.stringify({...event,id:`${workspace}:${event.id}`})));
 statements.push(audit(account.id,'seeded','Explicitly synthetic hackathon scenario loaded. No real customer data was changed.'));
 if(account.id===`${workspace==='resolve-demo'?'demo':workspace}:luma`){const action:Intervention={id:`${account.id}-prior`,accountId:account.id,decisionId:`${account.id}-prior-decision`,status:'simulated',mode:'simulation',createdAt:new Date(now().getTime()-3600000).toISOString(),completedAt:new Date(now().getTime()-3600000).toISOString(),providerId:null,approvedBy:'seeded-demo',beforeScore:20,subject:'Help with setup',message:'An earlier support email was simulated for this scenario.',error:null};statements.push(db.prepare('INSERT OR IGNORE INTO retention_actions(id,account_id,decision_id,body) VALUES(?,?,?,?)').bind(action.id,account.id,action.decisionId,JSON.stringify(action)));}
 }
 await db.batch(statements);
 }
 async function profile(accountId:string,capabilities={ai:!!deps.ai,testEmail:!!deps.deliver}):Promise<RetentionProfile>{
 const raw=await db.prepare('SELECT * FROM retention_accounts WHERE id=?').bind(accountId).first();if(!raw)throw new RetentionError('Customer not found.',404);const account=parseAccount(raw);
 const [er,dr,ar,au,p]=await Promise.all([db.prepare('SELECT body FROM retention_events WHERE account_id=?').bind(accountId).all(),db.prepare('SELECT * FROM retention_decisions WHERE account_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').bind(accountId).first(),db.prepare('SELECT body FROM retention_actions WHERE account_id=? ORDER BY rowid DESC').bind(accountId).all(),db.prepare('SELECT * FROM retention_audit WHERE account_id=? ORDER BY at DESC,rowid DESC LIMIT 100').bind(accountId).all(),policy(account.workspace)]);
 const events:RetentionEvent[]=er.results.map(e=>eventSchema.parse(JSON.parse(String(e.body))));
 if(account.source==='shopify'){
 const customerId=accountId.slice('shopify:'.length).slice(account.workspace.length+1);
 const records=await db.prepare("SELECT id,signal,context,created_at FROM recovery_records WHERE source='shopify' AND customer_id=? AND json_extract(context,'$.shop')=? ORDER BY created_at").bind(customerId,account.workspace).all();
 for(const r of records.results){const ctx=JSON.parse(String(r.context));if(r.signal==='orders/cancelled'&&!events.some(e=>e.kind==='order_cancelled'&&String(e.data.orderId).split('/').pop()===String(ctx.order_id)))events.push({id:String(r.id),kind:'order_cancelled',at:String(r.created_at),summary:`Shopify reported a cancelled order${ctx.order_name?` ${ctx.order_name}`:''}. Cancellation reason: ${ctx.cancel_reason||'not provided'}.`,data:{...(ctx.order_id?{orderId:ctx.order_id}:{}),...(ctx.cancel_reason?{reason:ctx.cancel_reason}:{}),...(typeof ctx.total_price==='string'?{total:ctx.total_price}:{})},synthetic:false});}
 if(!account.profile.commerce)account.profile.purchase=records.results.length?`${records.results.length} synchronized cancellation event(s). Full purchase history unavailable.`:null;
 }
 const actions:Intervention[]=ar.results.map(a=>JSON.parse(String(a.body)));const decision:Decision|null=dr?{id:String(dr.id),accountId,createdAt:String(dr.created_at),fingerprint:String(dr.fingerprint),diagnosis:JSON.parse(String(dr.diagnosis))}:null;
 const history:Audit[]=au.results.map(a=>({id:String(a.id),kind:String(a.kind),detail:String(a.detail),at:String(a.at)}));
 return {account,events:events.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)),risk:scoreRisk(events),decision,actions,audit:history,fingerprint:await evidenceFingerprint(account,events,actions,p),policy:p,capabilities,baseline:actions.findLast(a=>a.beforeScore!==undefined)?.beforeScore??null};
 }
 async function list(workspaces:string[]){const rows=await db.prepare(`SELECT id FROM retention_accounts WHERE workspace IN (${workspaces.map(()=>'?').join(',')}) ORDER BY source,name`).bind(...workspaces).all();return Promise.all(rows.results.map(r=>profile(String(r.id))));}
 async function analyze(accountId:string,expectedVersion:number){
 const before=await profile(accountId);if(before.account.version!==expectedVersion)throw new RetentionError('Customer changed. Refresh and try again.');
 let diagnosis:Diagnosis;
 if(deps.ai){try{const output=await deps.ai(before);diagnosis={...validateDiagnosis(outputWithoutMeta(output),before.account,before.events,before.actions,now(),before.policy),engine:'gemini',model:output.model};}catch{diagnosis={...baselineDiagnosis(before.account,before.events,before.actions,now(),before.policy),fallbackReason:'Live AI was unavailable or its response failed validation. This is a deterministic recommendation.'};}}
 else diagnosis={...baselineDiagnosis(before.account,before.events,before.actions,now(),before.policy),fallbackReason:'No AI key is configured. This is a deterministic recommendation.'};
 const current=await profile(accountId);if(current.fingerprint!==before.fingerprint||current.account.version!==expectedVersion)throw new RetentionError('Evidence changed during analysis. Run it again.');
 const decisionId=id(),time=now().toISOString();
 const saved=await db.batch([db.prepare('INSERT INTO retention_decisions(id,account_id,fingerprint,created_at,diagnosis) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM retention_accounts WHERE id=? AND version=?)').bind(decisionId,accountId,before.fingerprint,time,JSON.stringify(diagnosis),accountId,expectedVersion),db.prepare('UPDATE retention_accounts SET version=version+1 WHERE id=? AND version=?').bind(accountId,expectedVersion),db.prepare('INSERT INTO retention_audit(id,account_id,kind,detail,at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM retention_decisions WHERE id=?)').bind(id(),accountId,'analysis',`${diagnosis.engine==='gemini'?'Gemini':'Deterministic fallback'} recommended ${diagnosis.action}. ${diagnosis.explanation}`,time,decisionId)]);
 if(saved[0].meta.changes!==1)throw new RetentionError('Customer changed during analysis.');
 const latest=await profile(accountId);
 if(latest.policy.automatic&&(latest.account.source==='demo'||diagnosis.engine==='gemini')&&!executionBlock(latest,now()))return execute(accountId,latest.account.version,'automatic');
 return latest;
 }
 async function execute(accountId:string,expectedVersion:number,approval:'manual'|'automatic'='manual'){
 const p=await profile(accountId);if(p.account.version!==expectedVersion)throw new RetentionError('Customer changed. Refresh and try again.');
 if(approval==='automatic'&&!p.policy.automatic&&!p.policy.merchant?.automatic)throw new RetentionError('Automatic execution is not enabled.');
 const blocked=executionBlock(p,now());if(blocked)throw new RetentionError(blocked);
 if(p.policy.mode!=='simulation'&&!deps.deliver)throw new RetentionError('Restricted test email is not configured.',503);
 if(deps.beforeExecute){const reason=await deps.beforeExecute(p);if(reason)throw new RetentionError(reason);}if((await profile(accountId)).fingerprint!==p.fingerprint)throw new RetentionError('Evidence changed during preflight. Run analysis again.');
 const decision=p.decision!,action:Intervention={id:id(),accountId,decisionId:decision.id,status:'executing',mode:p.policy.mode,createdAt:now().toISOString(),completedAt:null,providerId:null,approvedBy:approval==='manual'?'operator':'explicit-automatic-policy',beforeScore:p.risk.score,subject:decision.diagnosis.subject,message:decision.diagnosis.message,error:null};
 const result=await db.batch([db.prepare('INSERT INTO retention_actions(id,account_id,decision_id,body) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM retention_accounts WHERE id=? AND version=?) AND NOT EXISTS(SELECT 1 FROM retention_actions WHERE decision_id=?)').bind(action.id,accountId,decision.id,JSON.stringify(action),accountId,expectedVersion,decision.id),db.prepare('UPDATE retention_accounts SET version=version+1 WHERE id=? AND version=?').bind(accountId,expectedVersion),db.prepare('INSERT INTO retention_audit(id,account_id,kind,detail,at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM retention_actions WHERE id=?)').bind(id(),accountId,'approved',`${approval==='manual'?'Operator approval':'Explicit automatic policy'} authorized ${action.mode}.`,now().toISOString(),action.id) ]);
 if(result[0].meta.changes!==1)throw new RetentionError('This decision was already executed or the customer changed.');
 if(action.mode==='simulation'){action.status='simulated';}
 else {try{const reason=deps.beforeExecute?await deps.beforeExecute(p):null;if(reason){action.status='suppressed';action.error=reason;}else{action.providerId=await deps.deliver!(action.id,decision.diagnosis,p);action.status='accepted';}}catch{action.status='unknown';action.error='The provider request did not confirm acceptance. Delivery is unknown; do not retry automatically.';}}
 action.completedAt=now().toISOString();await db.batch([db.prepare('UPDATE retention_actions SET body=? WHERE id=?').bind(JSON.stringify(action),action.id),audit(accountId,action.status,action.status==='simulated'?'Delivery was simulated. No email left Resolve.':action.status==='accepted'?'The email provider accepted the message. Delivery has not been confirmed.':action.error!)]);
 return profile(accountId);
 }
 async function appendEvents(accountId:string,expectedVersion:number,input:RetentionEvent[]){
 const p=await profile(accountId);if(p.account.source!=='demo')throw new RetentionError('Synthetic activity is only allowed on demo accounts.',403);
 if(p.account.version!==expectedVersion)throw new RetentionError('Customer changed. Refresh and try again.');
 const events=input.map(e=>eventSchema.parse(e));if(events.some(e=>!e.id.startsWith(`${accountId}:`)))throw new RetentionError('Activity IDs must belong to this account.',400);
 if(events.some(e=>p.events.some(previous=>previous.id===e.id)))throw new RetentionError('Activity was already ingested.');
 if(events.some(e=>!e.synthetic))throw new RetentionError('Demo activity must be labelled synthetic.',400);
 if(events.some(e=>new Date(e.at).getTime()>now().getTime()+1000))throw new RetentionError('Future activity cannot be ingested.',400);
 const statements=events.map(e=>db.prepare('INSERT OR IGNORE INTO retention_events(id,account_id,body) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM retention_accounts WHERE id=? AND version=?)').bind(e.id,accountId,JSON.stringify(e),accountId,expectedVersion));
 statements.push(db.prepare('UPDATE retention_accounts SET version=version+1 WHERE id=? AND version=?').bind(accountId,expectedVersion));statements.push(audit(accountId,'simulated_activity','Clearly simulated customer activity was ingested. Risk was recalculated from the new evidence.'));
 const result=await db.batch(statements);if(!result.slice(0,events.length).some(r=>r.meta.changes))throw new RetentionError('Activity was already ingested or the customer changed.');return profile(accountId);
 }
 async function reengage(accountId:string,expectedVersion:number){
 const p=await profile(accountId);if(!p.actions.some(a=>['simulated','accepted'].includes(a.status)))throw new RetentionError('Execute an approved intervention before simulating an outcome.');
 const active=activeEvents(p.events),at=now().toISOString();
 const resolutions:Partial<Record<RetentionEvent['kind'],{kind:RetentionEvent['kind'];summary:string;data?:RetentionEvent['data']}>>={integration_failed:{kind:'integration_restored',summary:'SIMULATED: CRM authentication was restored and the connection succeeded.'},support_open:{kind:'support_resolved',summary:'SIMULATED: the open support issue was resolved.'},usage_drop:{kind:'usage_recovered',summary:'SIMULATED: weekly active sessions returned from 6 to 18.',data:{previous:6,current:18}},onboarding_stalled:{kind:'onboarding_completed',summary:'SIMULATED: initial setup was completed.'},payment_failed:{kind:'payment_recovered',summary:'SIMULATED: the payment issue was resolved.'},checkout_abandoned:{kind:'checkout_recovered',summary:'SIMULATED: the shopper completed the checkout. This is not a real purchase.',data:{checkoutId:String(active.find(e=>e.kind==='checkout_abandoned')?.data.checkoutId||'synthetic-checkout')}}};
 const kinds=[...new Set(active.map(e=>e.kind))];const events=kinds.flatMap(kind=>{const r=resolutions[kind];return r?[{id:`${accountId}:reengaged:${r.kind}`,kind:r.kind,at,summary:r.summary,data:r.data||{},synthetic:true}]:[];});
 if(!events.length)throw new RetentionError('No unresolved signal is available for this simulated outcome.');return appendEvents(accountId,expectedVersion,events);
 }
 async function setPolicy(workspace:string,value:Policy){
 if(workspace!=='resolve-demo')throw new RetentionError('Automation policy changes are restricted to the synthetic demo workspace.',403);
 await db.prepare('INSERT INTO retention_settings(workspace,body) VALUES(?,?) ON CONFLICT(workspace) DO UPDATE SET body=excluded.body').bind(workspace,JSON.stringify(value)).run();
 const accounts=await db.prepare('SELECT id FROM retention_accounts WHERE workspace=?').bind(workspace).all();if(accounts.results.length)await db.batch(accounts.results.map(a=>audit(String(a.id),'policy',`Policy changed: ${value.automatic?'automatic execution':'manual approval'}, ${value.mode}, ${value.cooldownHours}-hour contact limit.`)));
 }
 return {seed,profile,list,registerShopify,analyze,execute,appendEvents,reengage,setPolicy};
}
function outputWithoutMeta(d:Diagnosis){const {engine,model,fallbackReason,...output}=d;return output;}
