// This public projection is intentionally restricted to the founder's test store.
// Never return customer records, contact details, addresses, checkout URLs or tokens.
export const ACTIVITY_SHOP='resolve-test-xsmzpr1z.myshopify.com';
export const ACTIVITY_QUERY=`query { orders(first:20,sortKey:UPDATED_AT,reverse:true){nodes{id name test customer{id} createdAt updatedAt processedAt cancelledAt cancelReason displayFinancialStatus totalPriceSet{shopMoney{amount currencyCode}} lineItems(first:10){nodes{title quantity}} refunds{createdAt} transactions(first:10){kind status processedAt test}}} }`;
export type ActivityOrder={id:string;name:string;test:boolean;email?:string|null;customer?:{id?:string}|null;createdAt:string;updatedAt:string;processedAt?:string|null;cancelledAt?:string|null;cancelReason?:string|null;displayFinancialStatus?:string;totalPriceSet?:{shopMoney:{amount:string;currencyCode:string}};lineItems?:{nodes:{title:string;quantity:number}[]};refunds?:{createdAt:string}[];transactions?:{kind:string;status:string;processedAt:string;test:boolean}[]};
export type PublicActivity=ReturnType<typeof projectStoreActivity>;
const clean=(value:unknown,max=200)=>String(value||'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[address withheld]').replace(/https?:\/\/\S+/gi,'[link withheld]').slice(0,max);
export function projectStoreActivity(orders:ActivityOrder[],checkedAt:string,owner?:{email:string;id:string}){
 const records=orders.filter(o=>o.test===true).map(o=>{
  const products=(o.lineItems?.nodes||[]).map(p=>({title:clean(p.title),quantity:p.quantity}));
  const events=[{kind:'order_created',at:o.createdAt,summary:`Order ${clean(o.name,40)} created.`}];
  for(const payment of o.transactions||[])if(payment.test===true&&payment.status==='SUCCESS'&&['SALE','CAPTURE'].includes(payment.kind))events.push({kind:'order_paid',at:payment.processedAt,summary:'Shopify confirms a successful test payment transaction.'});
  if(o.cancelledAt)events.push({kind:'order_cancelled',at:o.cancelledAt,summary:`Order cancelled. Shopify reason: ${clean(o.cancelReason||'Not provided',60)}.`});
  for(const refund of o.refunds||[])events.push({kind:'refund_issued',at:refund.createdAt,summary:'A test refund was recorded by Shopify.'});
  events.sort((a,b)=>a.at.localeCompare(b.at));
  const rawId=o.customer?.id?.match(/^gid:\/\/shopify\/Customer\/(\d+)$/)?.[1];
  const participantId=owner&&/^[a-f0-9-]{36}$/i.test(owner.id)&&o.email?.trim().toLowerCase()===owner.email.trim().toLowerCase()?owner.id:null;
  return {reference:clean(o.name,40),customerId:rawId||null,participantId,test:true,products,amount:clean(o.totalPriceSet?.shopMoney.amount,30),currency:clean(o.totalPriceSet?.shopMoney.currencyCode,8),status:clean(o.displayFinancialStatus||'UNKNOWN',40),cancelled:!!o.cancelledAt,updatedAt:o.updatedAt,events,source:'Shopify Admin API',synthetic:false};
 });
 return {version:1,shop:ACTIVITY_SHOP,checkedAt,records,coverage:{orders:'Captured from Shopify',browsing:'No verified browsing events connected',carts:'No verified cart events connected',email:'Automatic customer sending is not enabled'},source:'recorded' as 'live'|'recorded',connectionNote:'Saved Shopify records. Live updates are not connected.'};
}
export async function readTestStore(config:{shop?:string;clientId?:string;clientSecret?:string;ownerEmail?:string;participantId?:string},transport:typeof fetch=fetch){
 if(config.shop!==ACTIVITY_SHOP||!config.clientId||!config.clientSecret)throw Error('Test-store connection is not configured.');
 const auth=await transport(`https://${ACTIVITY_SHOP}/admin/oauth/access_token`,{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify({grant_type:'client_credentials',client_id:config.clientId,client_secret:config.clientSecret})});
 const token=await auth.json() as {access_token?:string};if(!auth.ok||!token.access_token)throw Error('Test-store authentication failed.');
 const response=await transport(`https://${ACTIVITY_SHOP}/admin/api/2026-10/graphql.json`,{method:'POST',signal:AbortSignal.timeout(18000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token.access_token},body:JSON.stringify({query:config.ownerEmail&&config.participantId?ACTIVITY_QUERY.replace('id name test','id name test email'):ACTIVITY_QUERY})});
 const body=await response.json() as {data?:{orders:{nodes:ActivityOrder[]}};errors?:unknown[]};
 if(!response.ok||body.errors?.length||!Array.isArray(body.data?.orders.nodes))throw Error('Shopify order read failed.');
 return {...projectStoreActivity(body.data.orders.nodes,new Date().toISOString(),config.ownerEmail&&config.participantId?{email:config.ownerEmail,id:config.participantId}:undefined),source:'live' as const,connectionNote:'Test orders read directly from Shopify. Refreshes automatically while this page is open.'};
}
