import {d1Http} from '../lib/d1-http';
let database:D1Database|undefined;
// Credentials are read at request time, server-side only. Never NEXT_PUBLIC_*.
export const env=new Proxy({} as Cloudflare.Env,{get(_target,key){if(key==='DB'){
 const {CLOUDFLARE_ACCOUNT_ID,D1_DATABASE_ID,CLOUDFLARE_D1_TOKEN}=process.env;
 if(!CLOUDFLARE_ACCOUNT_ID||!D1_DATABASE_ID||!CLOUDFLARE_D1_TOKEN)return undefined;
 return database??=d1Http(CLOUDFLARE_ACCOUNT_ID,D1_DATABASE_ID,CLOUDFLARE_D1_TOKEN);
 }return process.env[String(key)];}});
