import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const env=Object.fromEntries(readFileSync('.dev.vars','utf8').split(/\r?\n/).filter(s=>s.includes('=')&&!s.startsWith('#')).map(s=>{const i=s.indexOf('=');return[s.slice(0,i).trim(),s.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const shop='resolve-test-xsmzpr1z.myshopify.com';
if(env.SHOPIFY_SHOP_DOMAIN!==shop||!env.EMAIL_TEST_TO||!env.RESEND_API_KEY)throw Error('The named test store and existing owner test recipient must be configured.');
const directory='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const files=readdirSync(directory).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite');
if(files.length!==1)throw Error('Expected one initialized local Resolve database.');
const db=new DatabaseSync(`${directory}/${files[0]}`);db.exec(readFileSync('drizzle/0007_test_participant.sql','utf8'));
const email=env.EMAIL_TEST_TO.trim().toLowerCase(),createdAt=new Date().toISOString();
db.prepare('INSERT OR IGNORE INTO test_participants(id,shop,email,consent,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),shop,email,'explicit_owner_trial',createdAt);
const participant=db.prepare('SELECT * FROM test_participants WHERE shop=? AND email=?').get(shop,email);
const activity=JSON.parse(readFileSync('public/store-activity.json','utf8'));
if(activity.shop===shop)for(const order of activity.records.filter(r=>r.test===true&&r.synthetic===false&&r.participantId===participant.id&&/^\d+$/.test(r.customerId||''))){db.prepare('INSERT INTO test_participant_links(participant_id,shopify_customer_id,order_reference,checked_at) VALUES(?,?,?,?) ON CONFLICT(participant_id,order_reference) DO UPDATE SET checked_at=excluded.checked_at').run(participant.id,order.customerId,order.reference,activity.checkedAt)}
const links=db.prepare('SELECT shopify_customer_id,order_reference,checked_at FROM test_participant_links WHERE participant_id=? ORDER BY checked_at DESC').all(participant.id);
let record=db.prepare('SELECT * FROM test_participant_messages WHERE participant_id=? AND purpose=?').get(participant.id,'registration_confirmation');
if(!record){
 const id=randomUUID(),subject='Your Resolve test customer profile is ready';
 const message=`Your real Resolve test customer profile has been registered.\n\nCustomer ID: ${participant.id}\n\nUse this same email address at checkout in the Resolve Shopify test store so your test orders can be matched to this profile.\n\nThis confirms registration only. It does not mean browsing or cart tracking is connected, and it is not a recovery email. No dissatisfaction has been recorded.\n\nWorkspace: https://resolve-starnest-ai.vercel.app/demo\n\n— Resolve`;
 // Reserve the send before contacting the provider. A crash/timeout must not cause a second send.
 db.prepare('INSERT INTO test_participant_messages(id,participant_id,purpose,subject,message,status,created_at) VALUES(?,?,?,?,?,?,?)').run(id,participant.id,'registration_confirmation',subject,message,'sending',createdAt);
 try{
  const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`resolve-registration-${id}`},body:JSON.stringify({from:'Resolve <onboarding@resend.dev>',to:[email],subject,text:message})});
  const receipt=await r.json();
  db.prepare('UPDATE test_participant_messages SET status=?,provider_id=?,checked_at=? WHERE id=?').run(r.ok&&receipt.id?'accepted':'not_accepted',r.ok&&receipt.id?receipt.id:null,new Date().toISOString(),id);
 }catch{db.prepare('UPDATE test_participant_messages SET status=?,checked_at=? WHERE id=?').run('unknown',new Date().toISOString(),id)}
 record=db.prepare('SELECT * FROM test_participant_messages WHERE id=?').get(id);
}
if(record.provider_id){
 try{const r=await fetch(`https://api.resend.com/emails/${encodeURIComponent(record.provider_id)}`,{headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`},signal:AbortSignal.timeout(10000)});const b=await r.json();if(r.ok&&['delivered','bounced','complained'].includes(b.last_event)){db.prepare('UPDATE test_participant_messages SET status=?,checked_at=? WHERE id=?').run(b.last_event,new Date().toISOString(),record.id);record=db.prepare('SELECT * FROM test_participant_messages WHERE id=?').get(record.id)}}catch{/* Keep the confirmed acceptance when receipt lookup is unavailable. */}
}
const projection={version:1,id:participant.id,shop,createdAt:participant.created_at,consent:'Explicit permission for the owner’s own test email',source:'Actual Resolve database registration',storage:'Recorded from the local persistent Resolve database',shopifyCustomerId:links[0]?.shopify_customer_id||null,shopifyMatched:links.length>0,matchedOrders:links.map(l=>l.order_reference),dissatisfaction:'Not established — no shopper feedback or matched problem evidence yet.',email:{purpose:'registration_confirmation',subject:record.subject,message:record.message,status:record.status,createdAt:record.created_at,checkedAt:record.checked_at,note:record.status==='delivered'?'Resend reports delivered. This confirms the registration email, not a recovery intervention.':record.status==='accepted'?'Resend accepted the registration email. Inbox delivery is not yet confirmed.':'Email status is unconfirmed. No automatic retry is performed.'}};
// Private email and provider IDs stay in the database. Only this allowlisted projection is published.
writeFileSync('public/test-participant.json',JSON.stringify(projection,null,2)+'\n');db.close();
console.log(`Actual test customer registered; registration email status: ${record.status}. No Shopify behaviour was invented.`);
