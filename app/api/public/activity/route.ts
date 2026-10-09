import {env} from '@resolve/runtime';
import {readTestStore,type PublicActivity} from '@/lib/store-activity';
import snapshot from '@/public/store-activity.json';
import participant from '@/public/test-participant.json';
let cached:{at:number;value:PublicActivity}|undefined;
let pending:Promise<PublicActivity>|undefined;
export async function GET(){
 try{
  if(cached&&Date.now()-cached.at<30000)return Response.json(cached.value,{headers:{'Cache-Control':'no-store'}});
  pending??=readTestStore({shop:env.SHOPIFY_SHOP_DOMAIN,clientId:env.SHOPIFY_CLIENT_ID,clientSecret:env.SHOPIFY_CLIENT_SECRET,ownerEmail:env.EMAIL_TEST_TO,participantId:participant.id});
  const value=await pending;cached={at:Date.now(),value};return Response.json(value,{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.warn('Public test-store read unavailable:',error instanceof Error?error.message:'Unknown read failure');return Response.json({...snapshot,source:'recorded',connectionNote:'Saved Shopify records. Live connection is unavailable; new actions will not appear until it is connected.'},{headers:{'Cache-Control':'no-store'}});}
 finally{pending=undefined;}
}
