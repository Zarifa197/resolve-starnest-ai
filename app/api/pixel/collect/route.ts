import {env} from '@resolve/runtime';
import {database} from '@/lib/storage';
import {shopDomain} from '@/lib/merchant-policy';
import {collectAnonymous,PixelError} from '@/lib/pixel-collector';
const headers={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export function OPTIONS(){return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}})}
export async function POST(req:Request){
  try{
    if(Number(req.headers.get('content-length'))>6000)return new Response('Payload too large',{status:413,headers});
    const params=new URL(req.url).searchParams,shop=shopDomain(params.get('shop')||''),db=database();
    const connection=await db.prepare('SELECT revoked_at FROM merchant_connections WHERE shop=?').bind(shop).first();
    if(connection?.revoked_at||(!connection&&shop!==env.SHOPIFY_SHOP_DOMAIN))return new Response('Store is not connected',{status:403,headers});
    const reader=req.body?.getReader();if(!reader)return new Response('Missing event',{status:400,headers});
    const chunks:Uint8Array[]=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>6000){await reader.cancel();return new Response('Payload too large',{status:413,headers})}chunks.push(value)}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
    return Response.json(await collectAnonymous(db,shop,params.get('key')||'',JSON.parse(new TextDecoder().decode(bytes))),{headers});
  }catch(error){return new Response(error instanceof PixelError?error.message:'Invalid event or collector unavailable',{status:error instanceof PixelError?error.status:400,headers})}
}
