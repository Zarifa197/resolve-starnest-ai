import {env} from '@resolve/runtime';
import {authorizedShop} from '@/lib/agent-runtime';
import {database,safeMutation,storageError} from '@/lib/storage';
import {prepareCollector,trackingStatus,PixelError} from '@/lib/pixel-collector';
export async function GET(req:Request){const shop=await authorizedShop(req);if(!shop)return Response.json({error:'Authenticate your merchant account.'},{status:401});try{return Response.json({shop,...await trackingStatus(database(),shop)},{headers:{'Cache-Control':'no-store'}})}catch(e){return storageError(e)}}
export async function POST(req:Request){
  if(!safeMutation(req))return new Response('Cross-origin request rejected',{status:403});
  const shop=await authorizedShop(req);if(!shop)return new Response('Authenticate your merchant account.',{status:401});
  try{const row=await database().prepare('SELECT revoked_at FROM merchant_connections WHERE shop=?').bind(shop).first();if(row?.revoked_at)return new Response('Store connection was revoked',{status:403});
    if(!env.PUBLIC_APP_URL)return Response.json({error:'Configure PUBLIC_APP_URL with the deployed Resolve HTTPS origin first.'},{status:503});
    return Response.json({settings:await prepareCollector(database(),shop,env.PUBLIC_APP_URL),note:'Collector prepared. Deploy and register the Shopify extension, then verify real storefront events. This is not proof of live tracking.'},{headers:{'Cache-Control':'no-store'}});
  }catch(e){if(e instanceof PixelError)return Response.json({error:e.message},{status:e.status});return storageError(e)}
}
