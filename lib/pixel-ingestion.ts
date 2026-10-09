import {z} from 'zod';
import {commerceStore} from './shopify-intelligence.ts';
const kinds=['page_viewed','product_viewed','collection_viewed','product_added_to_cart','product_removed_from_cart','cart_viewed','checkout_started','checkout_contact_info_submitted','checkout_completed','search_submitted'] as const;
export const pixelSchema=z.object({id:z.string().min(1).max(100),kind:z.enum(kinds),at:z.string().datetime(),clientId:z.string().max(100).optional(),analyticsAllowed:z.literal(true),marketingAllowed:z.boolean(),product:z.string().max(150).optional(),variantId:z.string().max(100).optional(),checkoutId:z.string().max(100).optional()}).strict();
export async function ingestPixel(db:D1Database,shop:string,input:unknown,verifiedCustomerId:string|null,clock=()=>new Date()){
 const p=pixelSchema.parse(input);if(Math.abs(clock().getTime()-new Date(p.at).getTime())>86400000)throw Error('Event timestamp is outside the ingestion window.');
 const eventId=`pixel:${shop}:${p.id}`,data={...(p.product?{product:p.product}:{}),...(p.variantId?{variantId:p.variantId}:{}),...(p.checkoutId?{checkoutId:p.checkoutId}:{}),analyticsAllowed:true,marketingAllowed:p.marketingAllowed,identityBasis:verifiedCustomerId?'signed_app_proxy':'anonymous'};
 const event={id:eventId,kind:p.kind,at:p.at,summary:`Shopify Web Pixel: ${p.kind}${p.product?` · ${p.product}`:''}`,data,synthetic:false};
 if(verifiedCustomerId)await commerceStore(db,clock).event(shop,verifiedCustomerId,event,'web_pixel','signed_app_proxy');
 else await db.prepare('INSERT OR IGNORE INTO shopping_events(shop,event_id,client_id,kind,occurred_at,source,identity_basis,body) VALUES(?,?,?,?,?,?,?,?)').bind(shop,eventId,p.clientId||null,p.kind,p.at,'web_pixel','anonymous',JSON.stringify(event)).run();
 return {received:true,identity:verifiedCustomerId?'verified_customer':'anonymous'};
}
