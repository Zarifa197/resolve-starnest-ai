export class JudgeError extends Error {status:number;constructor(message:string,status=403){super(message);this.status=status}}
export async function judgeSession(req:Request,db:D1Database,create=false,now=Date.now()) {
 const cookie=(req.headers.get('cookie')||'').split(';').map(c=>c.trim()).find(c=>c.startsWith('resolve_judge='))?.slice(14);
 if(cookie&&/^[a-f0-9]{64}$/.test(cookie)) {
   const session=await db.prepare('SELECT id FROM judge_sessions WHERE id=? AND expires_at>?').bind(cookie,now).first();
   if(session)return {id:cookie,workspace:`judge:${cookie}`,created:false};
 }
 if(!create)return null;
 const id=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 const result=await db.prepare('INSERT INTO judge_sessions(id,created_at,expires_at) SELECT ?,?,? WHERE (SELECT count(*) FROM judge_sessions WHERE created_at>?)<30').bind(id,now,now+3600000,now-3600000).run();
 if(result.meta.changes!==1)throw new JudgeError('Demo session limit reached. Please try later.',429);
 return {id,workspace:`judge:${id}`,created:true};
}
export async function consumeJudgeAction(db:D1Database,id:string,action:string,now=Date.now()) {
 const analyze=action==='analyze'?1:0,reset=action==='reset_demo'?1:0;
 const result=await db.prepare(`UPDATE judge_sessions SET actions=actions+1,analyses=analyses+?,resets=resets+?
 WHERE id=? AND expires_at>? AND actions<40 AND analyses+?<=10 AND resets+?<=3
 AND (?=0 OR (SELECT coalesce(sum(analyses),0) FROM judge_sessions WHERE created_at>?)<60)`)
 .bind(analyze,reset,id,now,analyze,reset,analyze,now-3600000).run();
 if(result.meta.changes!==1)throw new JudgeError('Demo usage limit reached. Each session allows ten analyses and three resets.',429);
}
export function judgeCookie(id:string,req:Request){return `resolve_judge=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
