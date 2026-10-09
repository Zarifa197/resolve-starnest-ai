import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../public/submission-evidence.json',import.meta.url),'utf8'),data=JSON.parse(raw);
test('submission walkthrough distinguishes three synthetic journeys and evidence-backed response categories',()=>{
 assert.equal(data.synthetic,true);assert.equal(data.scenarios.length,3);
 const expected={browse:'browsing_followup',cart:'cart_recovery',cancel:'post_cancellation_followup'};
 for(const scenario of data.scenarios){assert.equal(scenario.analysis.action,expected[scenario.id]);assert(scenario.events.length>=3);assert(scenario.events.every(e=>e.synthetic===true));assert(scenario.analysis.evidenceIds.every(id=>scenario.events.some(e=>e.id===id)));assert(scenario.events.some(e=>e.kind===scenario.trigger));assert(scenario.analysis.uncertainty);assert(scenario.analysis.subject);assert(scenario.analysis.message);}
 assert.equal(data.scenarios.find(s=>s.id==='browse').permission.browsingPolicy,'opt_in_example_only');
 assert.equal(new Set(data.scenarios.map(s=>s.analysis.message)).size,3);
});
test('published evidence excludes recipient, credentials and provider IDs; acceptance never asserts delivery',()=>{
 assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw));assert(!/AIza|re_[a-zA-Z0-9]{20}|client_secret|providerId|api[_ -]?key/i.test(raw));
 for(const s of data.scenarios){assert(['accepted','not_sent','unconfirmed'].includes(s.delivery.status));assert.equal(s.delivery.mode,'restricted_test_email');if(s.delivery.status==='accepted'){assert(s.delivery.checkedAt);assert.match(s.delivery.note,/not.*verified/i);}assert(!/https?:\/\/|\b(coupon|discount|hurry)\b/i.test(s.analysis.message));}
});
test('default workspace reads actual Shopify activity and does not render archived fictional histories',()=>{
 const page=readFileSync(new URL('../app/demo/page.tsx',import.meta.url),'utf8'),component=readFileSync(new URL('../components/resolve/store-activity.tsx',import.meta.url),'utf8');
 assert(page.includes('StoreActivity'));assert(!page.includes('SubmissionWalkthrough'));assert(!page.includes('Retention judge'));
 assert(component.includes("@/public/store-activity.json"));assert(component.includes('/api/public/activity'));assert(!component.includes('/api/retention'));assert(!component.includes('/submission-evidence.json'));assert(component.includes('Automatic email sending'));
});
