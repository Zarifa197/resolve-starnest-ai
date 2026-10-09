import {pixelSchema,ingestPixel} from './pixel-ingestion.ts';
import {shopDomain} from './merchant-policy.ts';

export class PixelError extends Error {
  status:number;
  constructor(message:string,status:number){super(message);this.status=status;}
}
export function collectorEndpoint(value:string,shop:string){
  const u=new URL(value);shopDomain(shop);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.hostname===shop||u.hostname.endsWith('.myshopify.com'))throw new PixelError('Use the deployed Resolve HTTPS origin, separate from the Shopify storefront.',400);
  return new URL('/api/pixel/collect',u.origin).href;
}
export async function prepareCollector(db:D1Database,shop:string,origin:string,clock=()=>new Date()){
  shopDomain(shop);const endpoint=collectorEndpoint(origin,shop);
  const key=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  await db.prepare('INSERT OR IGNORE INTO pixel_collectors(shop,collector_key,created_at) VALUES(?,?,?)').bind(shop,key,clock().toISOString()).run();
  const row=await db.prepare('SELECT collector_key,enabled FROM pixel_collectors WHERE shop=?').bind(shop).first<{collector_key:string;enabled:number}>();
  if(!row?.enabled)throw new PixelError('The collector is disabled.',403);
  const url=new URL(endpoint);url.search=new URLSearchParams({shop,key:row.collector_key}).toString();
  return {endpointUrl:url.href,shopDomain:shop};
}
export async function collectAnonymous(db:D1Database,shop:string,key:string,input:unknown,clock=()=>new Date()){
  shopDomain(shop);if(!/^[a-f0-9]{64}$/.test(key))throw new PixelError('Invalid collector.',403);
  // The public routing key cannot prove that a request came from Shopify.
  // Ignore no identity fields: strict validation rejects them instead.
  const event=pixelSchema.parse(input),at=clock().toISOString();
  if(!event.marketingAllowed)throw new PixelError('Required pixel permission is missing.',400);
  if(Math.abs(new Date(at).getTime()-new Date(event.at).getTime())>86400000)throw new PixelError('Event timestamp is outside the ingestion window.',400);
  const result=await db.prepare(`UPDATE pixel_collectors SET
    quota_count=CASE WHEN quota_day=? THEN quota_count+1 ELSE 1 END, quota_day=?,
    minute_count=CASE WHEN quota_minute=? THEN minute_count+1 ELSE 1 END, quota_minute=?
    WHERE shop=? AND collector_key=? AND enabled=1
    AND (quota_day<>? OR quota_count<10000) AND (quota_minute<>? OR minute_count<120)`)
    .bind(at.slice(0,10),at.slice(0,10),at.slice(0,16),at.slice(0,16),shop,key,at.slice(0,10),at.slice(0,16)).run();
  if(!result.meta.changes)throw new PixelError('Collector unavailable or event budget exhausted.',429);
  // Hash the browser identifier per merchant. Never join it to customer IDs.
  const clientId=event.clientId?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${shop}:${event.clientId}`))),b=>b.toString(16).padStart(2,'0')).join(''):undefined;
  const receipt=await ingestPixel(db,shop,{...event,...(clientId?{clientId}:{})},null,clock);
  await db.prepare('UPDATE pixel_collectors SET last_received_at=? WHERE shop=?').bind(at,shop).run();
  return {...receipt,verification:'public_pixel_self_reported'};
}
export async function trackingStatus(db:D1Database,shop:string){
  const collector=await db.prepare('SELECT enabled,last_received_at FROM pixel_collectors WHERE shop=?').bind(shop).first();
  const counts=await db.prepare("SELECT kind,COUNT(*) AS events FROM shopping_events WHERE shop=? AND identity_basis='anonymous' GROUP BY kind ORDER BY kind").bind(shop).all();
  return {collectorPrepared:!!collector,collectorEnabled:collector?.enabled===1,lastReceivedAt:collector?.last_received_at||null,eventCounts:counts.results,registrationVerified:false};
}
