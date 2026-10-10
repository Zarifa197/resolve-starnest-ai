import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {eligibleCancellation,ownerRecoveryCycle,projectOwnerRecovery,validateOwnerDraft,OWNER_SHOP} from '../lib/owner-cancellation.mjs';
const participant={id:'893b88e2-875d-4c1f-bd27-70a83724b8f0',shop:OWNER_SHOP,email:'owner@example.com',consent:'explicit_owner_trial',created_at:'2026-10-09T23:21:00Z'};
const order={reference:'#1003',test:true,synthetic:false,cancelled:true,cancelReason:'CUSTOMER',customerId:'12345',participantId:participant.id,updatedAt:'2026-10-09T23:50:15Z',products:[{title:'Ski Wax',quantity:1}],events:[{kind:'order_created',at:'2026-10-09T23:48:37Z',summary:'Order created'},{kind:'order_cancelled',at:'2026-10-09T23:50:15Z',summary:'Customer cancelled'}]};
const draft={subject:'Can we help with your cancelled order?',message:'Your order #1003 was cancelled. Did anything go wrong? We would be happy to help.',explanation:'A cancellation event warrants asking whether support is needed.',uncertainty:'Unknown motive',evidenceKinds:['order_cancelled']};
function fixture(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0007_test_participant.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../drizzle/0008_owner_recovery.sql',import.meta.url),'utf8'));db.prepare('INSERT INTO test_participants VALUES(?,?,?,?,?)').run(participant.id,participant.shop,participant.email,participant.consent,participant.created_at);return db;}
const config={email:participant.email,geminiKey:'test-gemini-key',resendKey:'test-resend-key'};
const activity={shop:OWNER_SHOP,source:'live',records:[order]};
test('only actual owner-matched cancellations after consent qualify',()=>{
 assert(eligibleCancellation(order,participant));
 for(const patch of [{participantId:null},{test:false},{synthetic:true},{cancelled:false},{cancelReason:'FRAUD'},{cancelReason:'INVENTORY'},{customerId:null},{events:[{kind:'order_cancelled',at:'2020-01-01T00:00:00Z'}]}])assert(!eligibleCancellation({...order,...patch},participant));
});
test('first cycle sends once; replays and changed order revisions never send again',async()=>{
 const db=fixture();let posts=0,keys=[];
 const transport=async(url,options)=>{if(url.includes('generateContent'))return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(draft)}]}}]});if(url==='https://api.resend.com/emails'){posts++;keys.push(options.headers['Idempotency-Key']);assert.deepEqual(JSON.parse(options.body).to,[participant.email]);return Response.json({id:'private-provider-id'});}return Response.json({last_event:'sent'});};
 const args={db,activity,participant,config,transport};assert.equal(await ownerRecoveryCycle(args),1);assert.equal(await ownerRecoveryCycle(args),0);assert.equal(await ownerRecoveryCycle({...args,activity:{...activity,records:[{...order,updatedAt:'2026-10-10T00:00:00Z'}]}}),0);assert.equal(posts,1);assert(keys[0].startsWith('resolve-owner-'));const out=projectOwnerRecovery(db,participant,'2026-10-10T00:00:00Z');assert.equal(out.responses[0].delivery.status,'accepted');assert.match(out.responses[0].delivery.note,/not.*confirmed/);assert(!JSON.stringify(out).includes('private-provider-id'));assert(!JSON.stringify(out).includes(participant.email));db.close();
});
test('send timeout is reserved persistently and is never blindly retried',async()=>{
 const db=fixture();let sends=0;const transport=async(url)=>{if(url.includes('generateContent'))return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(draft)}]}}]});sends++;throw Error('Simulated timeout');};
 const args={db,activity,participant,config,transport};await ownerRecoveryCycle(args);await ownerRecoveryCycle(args);assert.equal(sends,1);assert.equal(projectOwnerRecovery(db,participant,'now').responses[0].delivery.status,'unknown');db.close();
});
test('generation failure or unsupported content cannot send email',async()=>{
 for(const response of [Response.json({error:'failure'},{status:500}),Response.json({candidates:[{content:{parts:[{text:JSON.stringify({...draft,message:'Visit https://evil.test for a coupon'})}]}}]})]){const db=fixture();let sends=0;await ownerRecoveryCycle({db,activity,participant,config,transport:async(url)=>{if(url.includes('generateContent'))return response;sends++;throw Error('Must not send')}});assert.equal(sends,0);assert.equal(projectOwnerRecovery(db,participant,'now').responses[0].delivery.status,'generation_failed');db.close();}
 assert.throws(()=>validateOwnerDraft({...draft,evidenceKinds:['fake_reason']},order));
});
test('wrong store, wrong recipient, missing explicit consent and recorded snapshots fail closed',async()=>{
 for(const patch of [{activity:{...activity,source:'recorded'}},{activity:{...activity,shop:'other.myshopify.com'}},{participant:{...participant,consent:'unknown'}},{config:{...config,email:'someone@example.com'}}]){const db=fixture();let calls=0;await assert.rejects(ownerRecoveryCycle({db,activity,participant,config,transport:async()=>{calls++;throw Error('Must not call')},...patch}));assert.equal(calls,0);db.close();}
});
test('delivery is reported only after an actual provider receipt',async()=>{
 const db=fixture();const transport=async(url)=>url.includes('generateContent')?Response.json({candidates:[{content:{parts:[{text:JSON.stringify(draft)}]}}]}):url==='https://api.resend.com/emails'?Response.json({id:'private'}):Response.json({last_event:'delivered'});await ownerRecoveryCycle({db,activity,participant,config,transport});assert.equal(projectOwnerRecovery(db,participant,'now').responses[0].delivery.status,'delivered');db.close();
});
