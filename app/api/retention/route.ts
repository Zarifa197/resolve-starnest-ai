import {authorizedShop,agentRuntime} from '@/lib/agent-runtime';
import {localOperator} from '@/lib/merchant-auth';
import {env} from '@resolve/runtime';
import {z} from 'zod';
import {database,safeMutation,storageError} from '@/lib/storage';
import {retentionStore,RetentionError} from '@/lib/retention-store';
import {analyzeRetention} from '@/lib/retention-ai';
import {sendTestEmail} from '@/lib/email';
function store(){return retentionStore({db:database(),ai:env.GEMINI_API_KEY?analyzeRetention:undefined,deliver:env.RESEND_API_KEY&&env.EMAIL_TEST_TO?async(key,d)=>sendTestEmail(key,{tool:d.action,title:d.subject,reason:d.explanation,message:d.message,execution:'Restricted test email'}):undefined});}
async function authorize(id:string,req:Request){const shop=await authorizedShop(req),s=shop?agentRuntime(shop).store:store(),p=await s.profile(id);if(!(localOperator(req)&&p.account.workspace==='resolve-demo')&&p.account.workspace!==shop)throw new RetentionError('Customer is outside this workspace.',403);return s;}
export async function GET(req:Request){try{const shop=await authorizedShop(req),s=shop?agentRuntime(shop).store:store();const id=new URL(req.url).searchParams.get('id');if(id){await authorize(id,req);return Response.json(await s.profile(id),{headers:{'Cache-Control':'no-store'}})}return Response.json({profiles:await s.list([...(localOperator(req)?['resolve-demo']:[]),shop||''])},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
const bodySchema=z.object({action:z.enum(['start_demo','reset_demo','analyze','approve','reengage','policy']),id:z.string().max(180).optional(),version:z.number().int().positive().optional(),policy:z.object({automatic:z.boolean(),mode:z.enum(['simulation','test_email']),cooldownHours:z.number().int().min(24).max(168)}).optional()}).strict();
export async function POST(req:Request){if(!safeMutation(req))return Response.json({error:'Request origin is not allowed.'},{status:403});let raw;try{raw=await req.json()}catch{return Response.json({error:'Invalid JSON.'},{status:400})}const result=bodySchema.safeParse(raw);if(!result.success)return Response.json({error:'Invalid retention action.'},{status:400});const b=result.data;
 try{const s=store();if(b.action==='start_demo'||b.action==='reset_demo'){if(!localOperator(req))throw new RetentionError('Demo controls are local-only.',403);await s.seed(b.action==='reset_demo');return Response.json(await s.profile('demo:northstar'));}if(b.action==='policy'){if(!localOperator(req))throw new RetentionError('Demo policy is local-only.',403);if(!b.policy)throw new RetentionError('Policy is required.',400);await s.setPolicy('resolve-demo',b.policy);return Response.json({saved:true});}if(!b.id||!b.version)throw new RetentionError('Customer and version are required.',400);const authorized=await authorize(b.id,req);const p=b.action==='analyze'?await authorized.analyze(b.id,b.version):b.action==='approve'?await authorized.execute(b.id,b.version):await authorized.reengage(b.id,b.version);return Response.json(p);
 }catch(e){return failure(e)}
}
function failure(e:unknown){return e instanceof RetentionError?Response.json({error:e.message},{status:e.status}):storageError(e)}
