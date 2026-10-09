import {env} from '@resolve/runtime';
import {verifyShopify} from '@/lib/webhooks';
import {database,storageError} from '@/lib/storage';
import {shopDomain} from '@/lib/merchant-policy';
const topics=new Set(['orders/create','orders/paid','orders/updated','orders/cancelled','orders/fulfilled','refunds/create','customers/create','customers/update','customers/delete','app/uninstalled']);
export async function POST(req:Request){
 if(!env.SHOPIFY_CLIENT_SECRET)return new Response('Not configured',{status:503});const raw=await req.text();if(raw.length>1000000)return new Response('Too large',{status:413});if(!await verifyShopify(raw,req.headers.get('x-shopify-hmac-sha256')||'',env.SHOPIFY_CLIENT_SECRET))return new Response('Invalid signature',{status:401});
 let shop;try{shop=shopDomain(req.headers.get('x-shopify-shop-domain')||'')}catch{return new Response('Invalid store',{status:400})}const connected=shop===env.SHOPIFY_SHOP_DOMAIN||await database().prepare('SELECT shop FROM merchant_connections WHERE shop=? AND revoked_at IS NULL').bind(shop).first();if(!connected)return new Response('Unconnected store',{status:403});const id=req.headers.get('x-shopify-webhook-id'),topic=req.headers.get('x-shopify-topic')||'';if(!id||id.length>150)return new Response('Invalid receipt ID',{status:400});if(!topics.has(topic))return Response.json({received:true,ignored:true});
 try{const body=JSON.parse(raw),resource=topic==='refunds/create'?body.order_id:body.id;if(topic!=='app/uninstalled'&&!/^\d+$/.test(String(resource)))return new Response('Invalid resource',{status:400});
 if(topic==='customers/delete'){const customer=`shopify:${shop}:${resource}`;await database().prepare('UPDATE retention_accounts SET email=NULL,profile=json_set(profile,\'$.emailConsent\',\'opted_out\'),version=version+1 WHERE id=? AND workspace=?').bind(customer,shop).run();}
 else await database().prepare('INSERT OR IGNORE INTO webhook_inbox(shop,event_id,topic,resource_id,created_at) VALUES(?,?,?,?,?)').bind(shop,id,topic,resource?String(resource):null,new Date().toISOString()).run();return Response.json({received:true});}catch(e){return storageError(e)}
}
