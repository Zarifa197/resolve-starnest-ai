import {env} from '@resolve/runtime';
import {equal} from '@/lib/webhooks';
import {database} from '@/lib/storage';
import {agentTick} from '@/lib/agent-runtime';
export const maxDuration=300;
export async function GET(req:Request){if(!env.CRON_SECRET||!equal(req.headers.get('authorization')||'',`Bearer ${env.CRON_SECRET}`))return new Response('Unauthorized',{status:401});const rows=await database().prepare('SELECT shop FROM merchant_connections WHERE revoked_at IS NULL').all(),shops=new Set(rows.results.map(r=>String(r.shop)));if(env.SHOPIFY_SHOP_DOMAIN)shops.add(env.SHOPIFY_SHOP_DOMAIN);let completed=0;for(const shop of shops){await agentTick(shop);completed++;}return Response.json({completed});}
