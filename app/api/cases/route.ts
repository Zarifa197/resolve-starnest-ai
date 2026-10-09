import { z } from 'zod';
import { decide, type Scenario } from '@/lib/agent';
import { database, safeMutation, storageError } from '@/lib/storage';
export async function GET(){try{const rows=await database().prepare('SELECT * FROM cases ORDER BY created_at DESC LIMIT 50').all();return Response.json(rows.results.map(row=>({...row,decision:JSON.parse(row.decision as string)})),{headers:{'Cache-Control':'no-store'}})}catch(e){return storageError(e)}}
export async function PATCH(request:Request){
 if(!safeMutation(request))return Response.json({error:'This request origin is not allowed.'},{status:403});
 let input;try{input=await request.json()}catch{return Response.json({error:'Invalid JSON.'},{status:400})}
 const parsed=z.object({id:z.string().uuid(),outcome:z.enum(['resolved','not_helpful','format','price','server'])}).safeParse(input);
 if(!parsed.success)return Response.json({error:'Invalid outcome.'},{status:400});
 const body=parsed.data;
 try{const db=database();const row=await db.prepare('SELECT * FROM cases WHERE id = ?').bind(body.id).first();if(!row)return Response.json({error:'Event not found.'},{status:404});
 const previous=JSON.parse(row.decision as string);
 if(row.status==='resolved')return Response.json({error:'This event is already resolved.'},{status:409});
 if(['format','price','server'].includes(body.outcome)&&previous.tool!=='ask_user')return Response.json({error:'This event is not awaiting clarification.'},{status:409});
 const decision=body.outcome==='resolved'?previous:decide((['format','price','server'].includes(body.outcome)?body.outcome:row.scenario) as Scenario,body.outcome);
 const status=body.outcome==='resolved'?'resolved':decision.tool==='create_support_ticket'?'escalated':'awaiting';
 const ticket=decision.tool==='create_support_ticket'?(row.ticket||'RSL-'+body.id.slice(0,8).toUpperCase()):row.ticket;
 const updated=await db.prepare('UPDATE cases SET decision = ?, status = ?, ticket = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?').bind(JSON.stringify(decision),status,ticket,new Date().toISOString(),body.id,row.version).run();
 if(updated.meta.changes!==1)return Response.json({error:'The event has changed. Refresh the page.'},{status:409});
 return Response.json({...decision,id:body.id,status,ticket});
 }catch(e){return storageError(e)}
}
