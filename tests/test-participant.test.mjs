import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
test('registration and outbound reservations persist uniquely for each participant',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(readFileSync(new URL('../drizzle/0007_test_participant.sql',import.meta.url),'utf8'));
 const insert=db.prepare('INSERT INTO test_participants VALUES(?,?,?,?,?)');insert.run('one','store','owner@example.com','explicit_owner_trial','now');assert.throws(()=>insert.run('two','store','owner@example.com','explicit_owner_trial','now'));
 const message=db.prepare('INSERT INTO test_participant_messages(id,participant_id,purpose,subject,message,status,created_at) VALUES(?,?,?,?,?,?,?)');message.run('a','one','registration_confirmation','Welcome','Registration only','sending','now');assert.throws(()=>message.run('b','one','registration_confirmation','Welcome','Registration only','sending','now'));
 assert.equal(db.prepare('SELECT status FROM test_participant_messages WHERE id=?').get('a').status,'sending');db.close();
});
test('published participant is a recorded registration and email receipt, not fabricated shopping history',()=>{
 const raw=readFileSync(new URL('../public/test-participant.json',import.meta.url),'utf8'),p=JSON.parse(raw),activity=JSON.parse(readFileSync(new URL('../public/store-activity.json',import.meta.url)));
 assert.match(p.id,/^[a-f0-9-]{36}$/);assert.equal(p.email.purpose,'registration_confirmation');assert.match(p.storage,/local persistent/i);assert.match(p.email.message,/not a recovery email/i);assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw));assert(!raw.includes('provider_id'));
 for(const reference of p.matchedOrders){const order=activity.records.find(r=>r.reference===reference);assert(order);assert.equal(order.participantId,p.id);assert.equal(order.synthetic,false);}
});
