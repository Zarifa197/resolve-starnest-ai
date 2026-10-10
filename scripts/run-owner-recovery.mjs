import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,rmSync,mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {readTestStore} from '../lib/store-activity.ts';
import {ownerRecoveryCycle,projectOwnerRecovery,OWNER_SHOP} from '../lib/owner-cancellation.mjs';
const env=Object.fromEntries(readFileSync('.dev.vars','utf8').split(/\r?\n/).filter(s=>s.includes('=')&&!s.startsWith('#')).map(s=>{const i=s.indexOf('=');return[s.slice(0,i).trim(),s.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const directory='.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const files=readdirSync(directory).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite');
if(files.length!==1)throw Error('Expected one initialized local database');
const db=new DatabaseSync(`${directory}/${files[0]}`);db.exec('PRAGMA busy_timeout=5000');db.exec(readFileSync('drizzle/0008_owner_recovery.sql','utf8'));
const participant=db.prepare('SELECT * FROM test_participants WHERE shop=? AND email=?').get(OWNER_SHOP,env.EMAIL_TEST_TO?.trim().toLowerCase());
if(!participant)throw Error('Register the consenting owner first');
// Atomic lock prevents multiple background agents. A crashed process needs explicit operator restart.
const lock='.wrangler/owner-recovery.lock';mkdirSync(lock);
const publish=process.argv.includes('--publish'),watch=process.argv.includes('--watch');let stopped=false;
process.on('SIGTERM',()=>{stopped=true});process.on('SIGINT',()=>{stopped=true});
function publishRecords(){
 const tmp=mkdtempSync(`${tmpdir()}/resolve-owner-publish-`),index=`${tmp}/index`;
 try{
  const git=(args,extra={})=>execFileSync('git',args,{encoding:'utf8',env:{...process.env,GIT_INDEX_FILE:index},...extra}).trim();
  git(['fetch','origin','main']);const base=git(['rev-parse','origin/main']);git(['read-tree',base]);
  git(['add','public/owner-recovery.json','public/store-activity.json']);
  if(git(['diff','--cached','--name-only',base])){const tree=git(['write-tree']);const sha=git(['commit-tree',tree,'-p',base],{input:'Record actual owner cancellation email and Shopify evidence\n'});git(['push','origin',`${sha}:refs/heads/main`]);console.log('Published confirmed owner recovery records.');}
 }finally{rmSync(tmp,{recursive:true,force:true})}
}
let lastPublished;
if(watch&&publish){try{lastPublished=JSON.stringify(JSON.parse(readFileSync('public/owner-recovery.json','utf8')).responses)}catch{/* First cycle will publish the initial records. */}}
try{
 do{
  try{
   const activity=await readTestStore({shop:env.SHOPIFY_SHOP_DOMAIN,clientId:env.SHOPIFY_CLIENT_ID,clientSecret:env.SHOPIFY_CLIENT_SECRET,ownerEmail:env.EMAIL_TEST_TO,participantId:participant.id});
   const sends=await ownerRecoveryCycle({db,activity,participant,config:{email:env.EMAIL_TEST_TO,geminiKey:env.GEMINI_API_KEY,resendKey:env.RESEND_API_KEY}});
   const projection=projectOwnerRecovery(db,participant,activity.checkedAt),signature=JSON.stringify(projection.responses);
   if(signature!==lastPublished){writeFileSync('public/owner-recovery.json',JSON.stringify(projection,null,2)+'\n');writeFileSync('public/store-activity.json',JSON.stringify({...activity,source:'recorded',connectionNote:'Saved actual Shopify records. The live API supplies current orders.'},null,2)+'\n');if(publish)publishRecords();lastPublished=signature;}
   console.log(`${new Date().toISOString()} Owner cycle: ${sends} newly accepted email(s), ${projection.responses.length} persisted record(s).`);
  }catch{console.error('Owner recovery cycle could not complete. Credentials and contact details are withheld.');if(!watch)process.exitCode=1;}
  if(watch&&!stopped)await new Promise(resolve=>setTimeout(resolve,60000));
 }while(watch&&!stopped);
}finally{db.close();rmSync(lock,{recursive:true,force:true})}
