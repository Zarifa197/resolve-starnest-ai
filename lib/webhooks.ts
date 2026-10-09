export async function signature(secret:string,body:string,encoding:'hex'|'base64'){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body)));
 return encoding==='hex'?Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join(''):btoa(String.fromCharCode(...bytes));
}
export function equal(a:string,b:string){if(a.length!==b.length)return false;let different=0;for(let i=0;i<a.length;i++)different|=a.charCodeAt(i)^b.charCodeAt(i);return different===0}
export async function verifyStripe(raw:string,header:string,secret:string,now=Date.now()){
 const parts=header.split(',');const timestamp=parts.find(p=>p.startsWith('t='))?.slice(2);if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)return false;
 const expected=await signature(secret,`${timestamp}.${raw}`,'hex');return parts.filter(p=>p.startsWith('v1=')).some(p=>equal(p.slice(3),expected));
}
export async function verifyShopify(raw:string,header:string,secret:string){return equal(await signature(secret,raw,'base64'),header)}
