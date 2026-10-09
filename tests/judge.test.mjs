import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {judgeSession,consumeJudgeAction,judgeCookie} from '../lib/judge-session.ts';
import {retentionStore} from '../lib/retention-store.ts';
const now=Date.parse('2026-10-09T13:00:00Z');
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>/^\d{4}.*\.sql$/.test(f)).sort())sqlite.exec(readFileSync(new URL(`../drizzle/${file}`,import.meta.url),'utf8'));
 function prepare(sql,params=[]){return {sql,params,bind(...v){return prepare(sql,v)},async first(){return sqlite.prepare(sql).get(...params)||null},async all(){return {results:sqlite.prepare(sql).all(...params)}},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...params).changes)}}}}}
 const db={prepare,async batch(items){sqlite.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 return {db,sqlite,store:retentionStore({db,now:()=>new Date(now)})};
}
const request=id=>new Request('https://judge.example/api/judge',{headers:id?{cookie:`resolve_judge=${id}`}:{}});
test('judge sessions are opaque, expire and reject forged cookies',async()=>{
 const {db}=fixture();assert.equal(await judgeSession(request(),db,false,now),null);
 const a=await judgeSession(request(),db,true,now),b=await judgeSession(request(),db,true,now);
 assert.match(a.id,/^[a-f0-9]{64}$/);assert.notEqual(a.id,b.id);
 assert.equal((await judgeSession(request(a.id),db,false,now)).workspace,a.workspace);
 assert.equal(await judgeSession(request('0'.repeat(64)),db,false,now),null);
 assert.equal(await judgeSession(request(a.id),db,false,now+3600001),null);
 assert.match(judgeCookie(a.id,request()),/HttpOnly; SameSite=Strict; Max-Age=3600; Secure$/);
});
test('judge reset preserves a different session and merchant records',async()=>{
 const {db,sqlite,store}=fixture();const a=await judgeSession(request(),db,true,now),b=await judgeSession(request(),db,true,now);
 await store.seed(false,a.workspace);await store.seed(false,b.workspace);await store.seed();
 const otherBefore=JSON.stringify(await store.profile(`${b.workspace}:checkout`));
 let p=await store.profile(`${a.workspace}:checkout`);p=await store.analyze(p.account.id,p.account.version);p=await store.execute(p.account.id,p.account.version);p=await store.reengage(p.account.id,p.account.version);assert.equal(p.risk.score,0);
 await store.seed(true,a.workspace);assert.equal((await store.profile(p.account.id)).risk.score,45);
 assert.equal(JSON.stringify(await store.profile(`${b.workspace}:checkout`)),otherBefore);
 assert.equal(sqlite.prepare("SELECT count(*) AS n FROM retention_accounts WHERE workspace='resolve-demo'").get().n,6);
 assert.equal((await store.list([a.workspace])).length,7);assert.equal((await store.list([b.workspace])).length,7);
});
test('public demo has atomic per-session analysis and reset budgets',async()=>{
 const {db}=fixture();const a=await judgeSession(request(),db,true,now);
 const analyses=await Promise.allSettled(Array.from({length:12},()=>consumeJudgeAction(db,a.id,'analyze',now)));
 assert.equal(analyses.filter(r=>r.status==='fulfilled').length,10);
 for(let i=0;i<3;i++)await consumeJudgeAction(db,a.id,'reset_demo',now);
 await assert.rejects(consumeJudgeAction(db,a.id,'reset_demo',now),e=>e.status===429);
 await assert.rejects(consumeJudgeAction(db,a.id,'approve',now+3600001),e=>e.status===429);
});
test('judge session creation cap prevents unlimited public workspace creation',async()=>{
 const {db}=fixture();const sessions=await Promise.allSettled(Array.from({length:32},()=>judgeSession(request(),db,true,now)));
 assert.equal(sessions.filter(r=>r.status==='fulfilled').length,30);
 assert.equal(sessions.filter(r=>r.status==='rejected'&&r.reason.status===429).length,2);
});

test('judge examples expose realistic shopping sequences and suppress inappropriate outreach',async()=>{
 const {store}=fixture();const workspace=`judge:${'a'.repeat(64)}`;await store.seed(false,workspace);
 const expected={checkout:'checkout_recovery',bluepeak:'no_action',meridian:'no_action',pine:'post_cancellation_followup',harbor:'internal_review',luma:'no_action',northstar:'troubleshoot'};
 for(const [id,action] of Object.entries(expected)){
  let profile=await store.profile(`${workspace}:${id}`);
  assert(profile.events.every(event=>event.synthetic===true));
  assert(profile.account.email.endsWith('@example.com'));
  profile=await store.analyze(profile.account.id,profile.account.version);
  assert.equal(profile.decision.diagnosis.action,action,id);
  if(['no_action','internal_review'].includes(action))assert.equal(profile.decision.diagnosis.message,'');
 }
 const shopper=await store.profile(`${workspace}:checkout`);
 assert.deepEqual(shopper.events.map(event=>event.kind),['product_viewed','product_added_to_cart','checkout_started','checkout_abandoned']);
 assert.equal(shopper.risk.score,45);
 const started=shopper.events.find(e=>e.kind==='checkout_started'),abandoned=shopper.events.find(e=>e.kind==='checkout_abandoned');
 assert.equal((Date.parse(abandoned.at)-Date.parse(started.at))/3600000,4);
 const completed=await store.profile(`${workspace}:meridian`);assert.equal(completed.risk.score,0);
});
