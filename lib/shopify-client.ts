import {shopDomain} from './merchant-policy.ts';
export const SHOPIFY_VERSION='2026-10';
export class ShopifyError extends Error {retryable:boolean;constructor(message:string,retryable=false){super(message);this.retryable=retryable}}
export function shopifyClient(shop:string,token:string,transport:typeof fetch=fetch){
 shopDomain(shop);
 return async function graphql<T=Record<string,unknown>>(query:string,variables:Record<string,unknown>={}):Promise<T>{
 const r=await transport(`https://${shop}/admin/api/${SHOPIFY_VERSION}/graphql.json`,{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});
 const b=await r.json() as {data?:T;errors?:{extensions?:{code?:string};message:string}[]};if(!r.ok||b.errors?.length||!b.data){const throttle=r.status===429||b.errors?.some(e=>e.extensions?.code==='THROTTLED');throw new ShopifyError(throttle?'Shopify rate limit; retry later.':`Shopify query failed: ${b.errors?.map(e=>e.message).join('; ').slice(0,500)||r.status}`,!!throttle||r.status>=500)}return b.data;
 };
}
export const CUSTOMER_FIELDS='id firstName lastName createdAt updatedAt tags numberOfOrders amountSpent {amount currencyCode} defaultEmailAddress {emailAddress marketingState marketingUpdatedAt}';
export const ORDER_FIELDS='id name createdAt updatedAt processedAt cancelledAt cancelReason displayFinancialStatus displayFulfillmentStatus customer {id} totalPriceSet {shopMoney {amount currencyCode}} lineItems(first:50){nodes{title quantity originalUnitPriceSet{shopMoney{amount currencyCode}}}} refunds{id createdAt}';
export const CHECKOUT_FIELDS='id createdAt updatedAt completedAt abandonedCheckoutUrl customer {id} totalPriceSet{shopMoney{amount currencyCode}} lineItems(first:50){nodes{title quantity}}';
export const STREAM_QUERY={customers:`query($after:String,$query:String){customers(first:50,after:$after,query:$query,sortKey:UPDATED_AT){nodes{${CUSTOMER_FIELDS}} pageInfo{hasNextPage endCursor}}}`,orders:`query($after:String,$query:String){orders(first:50,after:$after,query:$query,sortKey:UPDATED_AT){nodes{${ORDER_FIELDS}} pageInfo{hasNextPage endCursor}}}`,checkouts:`query($after:String,$query:String){abandonedCheckouts(first:50,after:$after,query:$query,sortKey:ID){nodes{${CHECKOUT_FIELDS}} pageInfo{hasNextPage endCursor}}}`};

export const CUSTOMER_MINIMAL_FIELDS=CUSTOMER_FIELDS.replace('firstName lastName ','');
