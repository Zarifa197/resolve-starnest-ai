import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
const variables=Object.fromEntries(readFileSync('.dev.vars','utf8').split(/\r?\n/).filter(s=>s.includes('=')&&!s.startsWith('#')).map(s=>{const i=s.indexOf('=');return [s.slice(0,i).trim(),s.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
if(!variables.SHOPIFY_CLIENT_SECRET)throw Error('Configure the local Shopify connection first.');
let stopped=false;process.on('SIGINT',()=>{stopped=true});
console.log('Resolve background agent started. Polling independently of the dashboard every 60 seconds.');
while(!stopped){const time=String(Date.now());try{const r=await fetch('http://127.0.0.1:5173/api/internal/agent',{method:'POST',headers:{'x-resolve-time':time,'x-resolve-signature':createHmac('sha256',variables.SHOPIFY_CLIENT_SECRET).update(`agent:${time}`).digest('hex')},signal:AbortSignal.timeout(180000)});console.log(new Date().toISOString(),r.ok?'Background cycle completed.':'Background cycle failed. Check operator diagnostics.');}catch{console.log('Background endpoint unavailable; retrying next cycle.')}if(!stopped)await new Promise(resolve=>setTimeout(resolve,60000));}
