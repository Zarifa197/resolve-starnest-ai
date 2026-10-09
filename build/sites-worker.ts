import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

import {agentTick} from "../lib/agent-runtime";
import {merchantSession,localOperator} from "../lib/merchant-auth";

export default {
  async scheduled(_event: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    const rows=env.DB?await env.DB.prepare("SELECT shop FROM merchant_connections WHERE revoked_at IS NULL").all():{results:[]};
    const shops=new Set(rows.results.map(r=>String(r.shop))); if(env.SHOPIFY_SHOP_DOMAIN)shops.add(env.SHOPIFY_SHOP_DOMAIN);
    ctx.waitUntil((async()=>{for(const shop of shops){try{await agentTick(shop)}catch{console.error("Agent cycle failed for a connected merchant.")}}})());
  },
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const path=new URL(request.url).pathname;
    const publicRoute=path.startsWith('/auth/shopify/')||path==='/api/pixel'||path==='/api/unsubscribe'||path==='/api/cron'||path.startsWith('/api/webhooks/');
    if((path.startsWith('/api/')||path.startsWith('/dashboard'))&&!publicRoute&&!localOperator(request)){
      const shop=env.SESSION_SECRET?await merchantSession(request,env.SESSION_SECRET):null;
      if(!shop)return Response.json({error:'Authenticate your Shopify merchant account.'},{status:401});
      // Legacy demo/import endpoints are local-only until they support merchant scoping.
      if(path.startsWith('/api/')&&!['/api/agent','/api/retention'].includes(path))return new Response('This operator endpoint is local-only.',{status:403});
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};
