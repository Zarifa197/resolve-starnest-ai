import { analyze } from '@/lib/ai';
import { z } from 'zod';
import { database,safeMutation,storageError } from '@/lib/storage';
import { unpack,recommend,type RecoveryDecision } from '@/lib/recovery';
export async function GET(req:Request){try{
 const url=new URL(req.url);const q=(url.searchParams.get('q')||'').slice(0,160);const status=url.searchParams.get('status')||'all';const page=Math.max(0,Math.min(1000,Number(url.searchParams.get('page'))||0));
 const db=database();const where="FROM recovery_records r JOIN imports i ON i.id = r.import_id WHERE i.status = 'complete' AND r.source IN ('stripe','shopify') AND (r.customer_id LIKE ? OR r.name LIKE ?) AND (? = 'all' OR r.status = ?)";
 const values=[`%${q}%`,`%${q}%`,status,status];
 const [rows,total,stats]=await Promise.all([db.prepare(`SELECT r.* ${where} ORDER BY r.created_at DESC,r.id LIMIT 25 OFFSET ?`).bind(...values,page*25).all(),db.prepare(`SELECT COUNT(*) AS total ${where}`).bind(...values).first(),db.prepare("SELECT COUNT(*) AS total, SUM(r.status = 'pending') AS pending, SUM(r.status = 'resolved') AS resolved FROM recovery_records r JOIN imports i ON i.id=r.import_id WHERE i.status='complete' AND r.source IN ('stripe','shopify')").first()]);
 return Response.json({records:rows.results.map(unpack),total:total?.total||0,stats},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return storageError(e)}}
export async function PATCH(req:Request){
 if(!safeMutation(req))return Response.json({error:'This request origin is not allowed.'},{status:403});
 let input;try{input=await req.json()}catch{return Response.json({error:'Invalid JSON.'},{status:400})}
 const parsed=z.object({id:z.string().max(180),version:z.number().int(),action:z.enum(['analyze','execute','resolve','escalate','reply']),reply:z.string().max(1000).optional()}).safeParse(input);if(!parsed.success)return Response.json({error:'Invalid action.'},{status:400});const b=parsed.data;
 try{const db=database();const raw=await db.prepare('SELECT * FROM recovery_records WHERE id = ?').bind(b.id).first();if(!raw)return Response.json({error:'Customer not found.'},{status:404});const row=unpack(raw);if(row.version!==b.version||row.status==='resolved')return Response.json({error:'This record has changed. Refresh the list.'},{status:409});
 if((b.action==='execute'&&row.status!=='pending')||(b.action!=='execute'&&b.action!=='analyze'&&row.status==='pending')||(b.action==='reply'&&!b.reply?.trim()))return Response.json({error:'This action is not available for the current status.'},{status:409});
 let decision:RecoveryDecision=row.decision;let status=row.status;let ticket=row.ticket;const context={...row.context};
 if(b.action==='analyze'){try{decision=await analyze(row)}catch(e){return Response.json({error:e instanceof Error?e.message:'AI analysis failed'},{status:502})}}
 if(b.action==='execute')status=decision.tool==='create_support_ticket'?'escalated':'active';
 if(b.action==='resolve')status='resolved';
 if(b.action==='escalate'){decision={tool:'create_support_ticket',title:'Escalate to support',reason:'The suggested solution was reported as insufficient.',message:'The issue and its earlier context were added to an internal support request.',execution:'An internal support request was created.'};status='escalated'}
 if(b.action==='reply'){context.customer_reply=b.reply!.trim();decision={tool:'create_support_ticket',title:'Forward reply to a specialist',reason:'A customer reply was recorded and forwarded for an internal support review. This action does not run a new AI analysis.',message:'Your explanation was added to the request. The support team can review it in this dashboard.',execution:'The reply was saved and added to the internal support request.'};status='escalated'}
 if(status==='escalated'&&!ticket)ticket='RSL-'+crypto.randomUUID().slice(0,8).toUpperCase();const now=new Date().toISOString();
 const result=await db.prepare('UPDATE recovery_records SET status=?,decision=?,context=?,ticket=?,updated_at=?,version=version+1 WHERE id=? AND version=?').bind(status,JSON.stringify(decision),JSON.stringify(context),ticket,now,row.id,b.version).run();if(result.meta.changes!==1)return Response.json({error:'This record has changed. Refresh and try again.'},{status:409});return Response.json({...row,status,decision,context,ticket,updated_at:now,version:row.version+1});
 }catch(e){return storageError(e)}
}
