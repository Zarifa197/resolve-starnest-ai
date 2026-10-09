import {retentionStore} from './retention-store.ts';
import {executionBlock,type RetentionProfile} from './retention-core.ts';
import {commerceStore} from './shopify-intelligence.ts';
type Store=ReturnType<typeof retentionStore>;
// A merchant lease protects analysis + send. Per-job leases survive process restarts.
// An outbound attempt is never replayed automatically, even if a worker crashes.
export async function runRetentionJobs(db:D1Database,shop:string,store:Store,preflight:(p:RetentionProfile)=>Promise<string|null>,clock=()=>new Date()){
 const owner=crypto.randomUUID(),now=clock().toISOString(),until=new Date(clock().getTime()+240000).toISOString();
 const lease=await db.prepare('INSERT INTO agent_leases(name,owner,expires_at) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE agent_leases.expires_at<?').bind(shop,owner,until,now).run();
 if(!lease.meta.changes)return {busy:true,processed:0};let processed=0;
 try{
 const jobs=await db.prepare("SELECT * FROM retention_jobs WHERE shop=? AND (status='pending' OR status='retry' OR (status='processing' AND lease_until<?)) AND due_at<=? ORDER BY due_at LIMIT 3").bind(shop,now,now).all();
 for(const j of jobs.results){const claim=await db.prepare("UPDATE retention_jobs SET status='processing',lease_token=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE id=? AND (status IN('pending','retry') OR (status='processing' AND lease_until<?))").bind(owner,until,now,j.id,now).run();if(!claim.meta.changes)continue;
 const finish=async(status:string,detail:string,decisionId:string|null=null)=>db.prepare('UPDATE retention_jobs SET status=?,detail=?,decision_id=?,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=?').bind(status,detail,decisionId,clock().toISOString(),j.id,owner).run();
 try{
 let p=await store.profile(String(j.account_id));
 if(p.actions.some(a=>a.status==='executing'||a.status==='unknown')){await finish('unknown','An earlier outbound attempt is unresolved. Operator reconciliation is required.');continue;}
 const blocked=await preflight(p);if(blocked){await finish('suppressed',blocked);continue;}
 p=await store.analyze(p.account.id,p.account.version);const rule=executionBlock(p,clock());if(rule){await finish('suppressed',rule,p.decision?.id||null);continue;}
 const policy=await commerceStore(db,clock).settings(shop);
 if(!policy.automatic){await finish('awaiting_approval','Draft prepared; manual approval is enabled.',p.decision!.id);continue;}
 if(p.decision!.diagnosis.engine!=='gemini'){await finish('awaiting_approval','Live Gemini analysis was unavailable. Automatic sending is blocked.',p.decision!.id);continue;}
 // Confirm that this worker still owns an unexpired merchant lease before sending.
 const renewed=await db.prepare('UPDATE agent_leases SET expires_at=? WHERE name=? AND owner=? AND expires_at>?').bind(new Date(clock().getTime()+240000).toISOString(),shop,owner,clock().toISOString()).run();
 if(!renewed.meta.changes){await finish('retry','Worker lease expired before outbound reservation.');continue;}
 // Reserve an irreversible boundary before calling the delivery transport.
 await finish('sending','Reserved outbound attempt. Do not replay automatically.',p.decision!.id);
 const after=await store.execute(p.account.id,p.account.version,'automatic');const action=after.actions.find(a=>a.decisionId===p.decision!.id)!;
 await finish(action.status,action.error||'Provider acceptance is recorded separately from delivery.',p.decision!.id);processed++;
 }catch(error){const message=error instanceof Error?error.message:'Job failed';const state=await db.prepare('SELECT status FROM retention_jobs WHERE id=?').bind(j.id).first();if(state?.status==='sending')await finish('unknown','Outbound result is unresolved. Inspect the action/provider before retrying.');else if(Number(j.attempts)>=3)await finish('failed',message);else{await db.prepare("UPDATE retention_jobs SET status='retry',due_at=?,detail=?,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=?").bind(new Date(clock().getTime()+2**Number(j.attempts)*60000).toISOString(),message,clock().toISOString(),j.id,owner).run();}}
 }
 return {busy:false,processed};
 }finally{await db.prepare('DELETE FROM agent_leases WHERE name=? AND owner=?').bind(shop,owner).run();}
}
