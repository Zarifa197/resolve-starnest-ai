import {register} from '@shopify/web-pixels-extension';
register(({analytics,settings,init,customerPrivacy})=>{
 let privacy=init.customerPrivacy;
 customerPrivacy.subscribe('visitorConsentCollected',event=>{privacy=event.customerPrivacy;});
 const origin=new URL(settings.storeOrigin);
 if(origin.protocol!=='https:'||!origin.hostname.endsWith('.myshopify.com'))return;
 const path=String(settings.proxyPath||'/apps/resolve');
 if(!path.startsWith('/apps/')||path.includes('?')||path.includes('//'))return;
 for(const kind of ['page_viewed','product_viewed','collection_viewed','product_added_to_cart','product_removed_from_cart','cart_viewed','checkout_started','checkout_contact_info_submitted','checkout_completed','search_submitted']){
 analytics.subscribe(kind,event=>{
 if(!privacy?.analyticsProcessingAllowed||!privacy?.marketingAllowed)return;
 const variant=event.data?.productVariant||event.data?.cartLine?.merchandise;
 // No email, address, phone, search terms, URL queries, or raw checkout payloads.
 const payload={id:event.id,kind,at:event.timestamp,clientId:event.clientId,analyticsAllowed:true,marketingAllowed:privacy.marketingAllowed,...(variant?.product?.title?{product:String(variant.product.title).slice(0,150)}:{}),...(variant?.id?{variantId:String(variant.id)}:{}),...(event.data?.checkout?.token?{checkoutId:String(event.data.checkout.token).slice(0,100)}:{})};
 // Identity comes only from Shopify's signed logged_in_customer_id at the proxy.
 // Checkout sandbox requests may lack login cookies: they correctly remain anonymous.
 fetch(`${origin.origin}${path}`,{method:'POST',mode:'no-cors',body:JSON.stringify(payload),credentials:'include',keepalive:true}).catch(()=>{});
 });
 }
});
