import {env} from '@resolve/runtime';
import {database,safeMutation,storageError} from '@/lib/storage';
export async function GET(){try{const db=database();const company=env.SHOPIFY_SHOP_DOMAIN;const rows=await db.prepare('SELECT c.*, (SELECT COUNT(*) FROM recovery_records r WHERE r.customer_id=c.shopify_id AND r.source=? AND json_extract(r.context,\'$.shop\')=c.company_id) AS events FROM customers c WHERE company_id=? ORDER BY synced_at DESC LIMIT 500').bind('shopify',company||'').all();return Response.json({customers:rows.results,company},{headers:{'Cache-Control':'no-store'}})}catch(e){return storageError(e)}}
export async function POST(req:Request){
 if(!safeMutation(req))return new Response(null,{status:403});
 const shop=env.SHOPIFY_SHOP_DOMAIN;
 if(!shop||!env.SHOPIFY_CLIENT_ID||!env.SHOPIFY_CLIENT_SECRET)return Response.json({error:'Shopify is not configured'},{status:503});
 try{
 const tr=await fetch(`https://${shop}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.SHOPIFY_CLIENT_ID,client_secret:env.SHOPIFY_CLIENT_SECRET})});
 const t=await tr.json() as {access_token?:string};if(!tr.ok||!t.access_token)throw Error('auth');
 const collected:{id:string;defaultEmailAddress?:{emailAddress:string}|null}[]=[];let cursor:string|null=null;
 for(let page=0;page<100;page++){
 const response=await fetch(`https://${shop}/admin/api/2026-10/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t.access_token},body:JSON.stringify({query:'query($cursor:String){customers(first:100,after:$cursor){nodes{id defaultEmailAddress{emailAddress}} pageInfo{hasNextPage endCursor}}}',variables:{cursor}})});
 const body=await response.json() as {errors?:unknown;data?:{customers:{nodes:typeof collected;pageInfo:{hasNextPage:boolean;endCursor:string}}}};
 if(!response.ok||body.errors||!body.data)throw Error('customer access');
 collected.push(...body.data.customers.nodes);
 if(!body.data.customers.pageInfo.hasNextPage)break;
 if(page===99)throw Error('sync limit');cursor=body.data.customers.pageInfo.endCursor;
 }
 const db=database(),now=new Date().toISOString();
 await db.prepare('INSERT INTO companies(id,shop_domain) VALUES (?,?) ON CONFLICT(id) DO NOTHING').bind(shop,shop).run();
 for(let i=0;i<collected.length;i+=50)await db.batch(collected.slice(i,i+50).map(c=>{const id=c.id.split('/').pop()!;return db.prepare('INSERT INTO customers(id,company_id,shopify_id,email,synced_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,synced_at=excluded.synced_at').bind(`${shop}:${id}`,shop,id,c.defaultEmailAddress?.emailAddress||null,now)}));
 await db.prepare('UPDATE companies SET synced_at=? WHERE id=?').bind(now,shop).run();
 return Response.json({synced:collected.length});
 }catch{return Response.json({error:'Sync did not complete. Check Shopify permissions and the connection.'},{status:502})}
}
