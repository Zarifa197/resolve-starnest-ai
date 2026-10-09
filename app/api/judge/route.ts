import {z} from 'zod';
import {database,storageError} from '@/lib/storage';
import {retentionStore,RetentionError} from '@/lib/retention-store';
import {analyzeRetention} from '@/lib/retention-ai';
import {env} from '@resolve/runtime';
import {judgeSession,consumeJudgeAction,judgeCookie,JudgeError} from '@/lib/judge-session';
export const dynamic='force-dynamic';
function store(){return retentionStore({db:database(),ai:env.GEMINI_API_KEY?analyzeRetention:undefined});}
const headers={'Cache-Control':'no-store'};
export async function GET(req:Request){try{const session=await judgeSession(req,database());return Response.json({profiles:session?await store().list([session.workspace]):[]},{headers});}catch(e){return failure(e)}}
const schema=z.object({action:z.enum(['start_demo','reset_demo','analyze','approve','reengage']),id:z.string().max(180).optional(),version:z.number().int().positive().optional()}).strict();
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Same-origin demo request required.'},{status:403});
 try {
   if(Number(req.headers.get('content-length')||0)>2000)throw new JudgeError('Request too large.',413);
   const raw=await req.text();if(raw.length>2000)throw new JudgeError('Request too large.',413);
   const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)throw new JudgeError('Invalid demo action.',400);
   const b=parsed.data,db=database(),session=await judgeSession(req,db,b.action==='start_demo');
   if(!session)throw new JudgeError('Start a new judge demo first.',401);
   await consumeJudgeAction(db,session.id,b.action);
   const s=store();let result;
   if(b.action==='start_demo'||b.action==='reset_demo'){
     await s.seed(b.action==='reset_demo',session.workspace);result=await s.profile(`${session.workspace}:checkout`);
   }else{
     if(!b.id||!b.version)throw new JudgeError('Customer and version required.',400);
     const p=await s.profile(b.id);
     if(p.account.workspace!==session.workspace||p.account.source!=='demo')throw new JudgeError('Customer is outside this demo session.');
     if(p.policy.automatic||p.policy.mode!=='simulation')throw new JudgeError('Public demos allow manual simulation only.');
     result=b.action==='analyze'?await s.analyze(b.id,b.version):b.action==='approve'?await s.execute(b.id,b.version):await s.reengage(b.id,b.version);
   }
   return Response.json(result,{headers:{...headers,'Set-Cookie':judgeCookie(session.id,req)}});
 }catch(e){return failure(e)}
}
function failure(e:unknown){return e instanceof RetentionError||e instanceof JudgeError?Response.json({error:e.message},{status:e.status,headers}):e instanceof SyntaxError?Response.json({error:'Invalid JSON.'},{status:400,headers}):storageError(e)}
