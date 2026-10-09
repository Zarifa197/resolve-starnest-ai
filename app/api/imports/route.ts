import { z } from 'zod';
import { database,safeMutation,storageError } from '@/lib/storage';
import { parseCsv,normalizeCsv } from '@/lib/csv';
import { recommend } from '@/lib/recovery';
export async function GET(){try{return Response.json((await database().prepare('SELECT * FROM imports ORDER BY created_at DESC LIMIT 50').all()).results,{headers:{'Cache-Control':'no-store'}})}catch(e){return storageError(e)}}
export async function POST(req:Request){
 if(!safeMutation(req))return Response.json({error:'This request origin is not allowed.'},{status:403});
 const body=await req.text();if(body.length>2500000)return Response.json({error:'The file exceeds 2 MB.'},{status:413});
 let input;try{input=JSON.parse(body)}catch{return Response.json({error:'Invalid JSON.'},{status:400})}
 const parsed=z.object({csv:z.string().max(2000000),filename:z.string().min(1).max(200),source:z.enum(['csv','ibm_sample']),mapping:z.object({id:z.string(),name:z.string().optional(),signal:z.string().optional()})}).safeParse(input);
 if(!parsed.success)return Response.json({error:'Check the file and column mapping.'},{status:400});
 let rows;try{rows=normalizeCsv(parseCsv(parsed.data.csv),parsed.data.mapping)}catch(e){return Response.json({error:e instanceof Error?e.message:'Could not read the CSV.'},{status:400})}
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(parsed.data.csv+JSON.stringify(parsed.data.mapping)+parsed.data.source));const id=Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('');
 try{const db=database();const old=await db.prepare('SELECT * FROM imports WHERE id = ?').bind(id).first();if(old?.status==='complete')return Response.json({id,count:old.row_count,duplicate:true});
 const now=new Date().toISOString();await db.prepare('INSERT OR IGNORE INTO imports (id,filename,source,row_count,status,created_at) VALUES (?,?,?,?,?,?)').bind(id,parsed.data.filename,parsed.data.source,rows.length,'processing',now).run();
 for(let i=0;i<rows.length;i+=50){await db.batch(rows.slice(i,i+50).map((r,j)=>db.prepare('INSERT OR IGNORE INTO recovery_records (id,customer_id,name,signal,context,status,decision,source,import_id,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)').bind(`${id}-${i+j}`,r.customerId,r.name.slice(0,200),r.signal,JSON.stringify(r.context),'pending',JSON.stringify(recommend(r.signal,r.context)),parsed.data.source,id,now,now)))}
 await db.prepare('UPDATE imports SET status = ? WHERE id = ?').bind('complete',id).run();return Response.json({id,count:rows.length,duplicate:false});
 }catch(e){return storageError(e)}
}
