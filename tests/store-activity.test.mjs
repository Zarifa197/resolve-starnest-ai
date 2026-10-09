import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIVITY_SHOP,projectStoreActivity,readTestStore} from '../lib/store-activity.ts';
const order={id:'gid://shopify/Order/1',name:'#1001',test:true,createdAt:'2026-10-09T09:09:01Z',updatedAt:'2026-10-09T09:10:17Z',displayFinancialStatus:'REFUNDED',cancelledAt:'2026-10-09T09:10:17Z',cancelReason:'CUSTOMER',customer:{email:'private@example.com'},shippingAddress:{address1:'Private street'},lineItems:{nodes:[{title:'Snowboard',quantity:1}]},refunds:[{createdAt:'2026-10-09T09:10:16Z'}],transactions:[{kind:'SALE',status:'SUCCESS',processedAt:'2026-10-09T09:09:02Z',test:true}]};
test('public activity includes only actual test orders and excludes private payload fields',()=>{
 const out=projectStoreActivity([order,{...order,test:false,name:'#real'}],'2026-10-10T00:00:00Z');
 assert.equal(out.records.length,1);assert.equal(out.records[0].synthetic,false);assert.deepEqual(out.records[0].events.map(e=>e.kind),['order_created','order_paid','refund_issued','order_cancelled']);
 const raw=JSON.stringify(out);assert(!raw.includes('private@example.com'));assert(!raw.includes('Private street'));assert(!raw.includes('gid://'));assert.equal(out.source,'recorded');
});
test('payment events require successful test transactions rather than a guessed processing timestamp',()=>{
 const out=projectStoreActivity([{...order,transactions:[{kind:'SALE',status:'FAILURE',processedAt:'2026-10-09T09:09:02Z',test:true}]}],'2026-10-10T00:00:00Z');assert(!out.records[0].events.some(e=>e.kind==='order_paid'));
});
test('test-store reader refuses arbitrary stores and keeps credentials out of the public response',async()=>{
 let calls=0;await assert.rejects(readTestStore({shop:'other.myshopify.com',clientId:'id',clientSecret:'secret'},async()=>{calls++;throw Error('Unexpected call')}));assert.equal(calls,0);
 const out=await readTestStore({shop:ACTIVITY_SHOP,clientId:'id',clientSecret:'secret'},async(url,options)=>{
  calls++;if(url.endsWith('access_token'))return Response.json({access_token:'private-token'});
  assert.equal(options.headers['X-Shopify-Access-Token'],'private-token');return Response.json({data:{orders:{nodes:[order]}}});
 });assert.equal(out.source,'live');assert.equal(calls,2);assert(!JSON.stringify(out).includes('private-token'));
});
test('saved public records and response belong to observed Shopify orders; acceptance is not delivery',()=>{
 const records=JSON.parse(readFileSync(new URL('../public/store-activity.json',import.meta.url)));const previews=JSON.parse(readFileSync(new URL('../public/store-responses.json',import.meta.url)));
 assert(records.records.every(r=>r.test===true&&r.synthetic===false&&r.source==='Shopify Admin API'));
 for(const p of previews.responses){const order=records.records.find(r=>r.reference===p.reference);assert(order);assert.equal(p.orderUpdatedAt,order.updatedAt);assert.equal(p.customerSending,false);assert.equal(p.customerConsent,'unknown');assert.equal(p.purpose,'operator_test_preview');assert(p.evidenceKinds.every(k=>order.events.some(e=>e.kind===k)));assert.match(p.delivery.note,/not.*verified/i);}
 assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(JSON.stringify({records,previews})));
});
