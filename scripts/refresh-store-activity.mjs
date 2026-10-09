import {readFileSync,writeFileSync} from 'node:fs';
import {readTestStore} from '../lib/store-activity.ts';
const values=Object.fromEntries(readFileSync('.dev.vars','utf8').split(/\r?\n/).filter(s=>s.includes('=')&&!s.startsWith('#')).map(s=>{const i=s.indexOf('=');return[s.slice(0,i).trim(),s.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const data=await readTestStore({shop:values.SHOPIFY_SHOP_DOMAIN,clientId:values.SHOPIFY_CLIENT_ID,clientSecret:values.SHOPIFY_CLIENT_SECRET});
data.source='recorded';data.connectionNote='Saved Shopify records. Live updates require the server-side Shopify connection.';
writeFileSync('public/store-activity.json',JSON.stringify(data,null,2)+'\n');
console.log(`Saved ${data.records.length} actual Shopify test orders and ${data.records.reduce((n,o)=>n+o.events.length,0)} observed events. Contact details excluded.`);
