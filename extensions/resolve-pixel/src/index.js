import {register} from '@shopify/web-pixels-extension';
register(({analytics,settings,init,customerPrivacy})=>{
 let privacy=init.customerPrivacy;
 customerPrivacy.subscribe('visitorConsentCollected',event=>{privacy=event.customerPrivacy;});
 let endpoint;try{endpoint=new URL(settings.endpointUrl);}catch{return;}
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.hostname.endsWith('.myshopify.com')||endpoint.pathname!=='/api/pixel/collect')return;
 if(endpoint.searchParams.get('shop')!==settings.shopDomain||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(settings.shopDomain)||!/^[a-f0-9]{64}$/.test(endpoint.searchParams.get('key')||''))return;
 for(const kind of ['page_viewed','product_viewed','collection_viewed','product_added_to_cart','product_removed_from_cart','cart_viewed','checkout_started','checkout_contact_info_submitted','checkout_completed','search_submitted']){
 analytics.subscribe(kind,event=>{
 if(!privacy?.analyticsProcessingAllowed||!privacy?.marketingAllowed)return;
 const variant=event.data?.productVariant||event.data?.cartLine?.merchandise;
 // No email, address, phone, search terms, URL queries, or raw checkout payloads.
 const payload={id:event.id,kind,at:event.timestamp,clientId:event.clientId,analyticsAllowed:true,marketingAllowed:privacy.marketingAllowed,...(variant?.product?.title?{product:String(variant.product.title).slice(0,150)}:{}),...(variant?.id?{variantId:String(variant.id)}:{}),...(event.data?.checkout?.token?{checkoutId:String(event.data.checkout.token).slice(0,100)}:{})};
 // Strict pixels use the separate app origin. Public reports are anonymous;
 // no cookie or client-supplied customer ID can establish customer identity.
 fetch(endpoint.href,{method:'POST',mode:'cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload),credentials:'omit',keepalive:true}).catch(()=>{});
 });
 }
});
