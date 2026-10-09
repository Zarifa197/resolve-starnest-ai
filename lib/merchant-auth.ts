import {signature,equal} from './webhooks.ts';
import {shopDomain} from './merchant-policy.ts';
const encode=(value:string)=>btoa(value).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode=(value:string)=>atob(value.replaceAll('-','+').replaceAll('_','/'));
export async function signedValue(secret:string,value:unknown){const body=encode(JSON.stringify(value));return `${body}.${await signature(secret,body,'hex')}`;}
export async function readSigned(secret:string,value:string){const [body,mac,...extra]=value.split('.');if(extra.length||!body||!mac||!equal(await signature(secret,body,'hex'),mac))return null;try{return JSON.parse(decode(body)) as Record<string,unknown>}catch{return null}}
export async function encryptToken(secret:string,token:string){const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)),{name:'AES-GCM'},false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(token));return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(bytes)))}`;}
export async function decryptToken(secret:string,value:string){const [a,b]=value.split('.');const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)),{name:'AES-GCM'},false,['decrypt']);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(atob(a),c=>c.charCodeAt(0))},key,Uint8Array.from(atob(b),c=>c.charCodeAt(0))));}
export async function verifyOAuth(params:URLSearchParams,secret:string){const mac=params.get('hmac')||'';const entries=[...params].filter(([k])=>k!=='hmac'&&k!=='signature').sort(([a],[b])=>a.localeCompare(b));return equal(await signature(secret,entries.map(([k,v])=>`${k}=${v}`).join('&'),'hex'),mac);}
export async function verifyProxy(params:URLSearchParams,secret:string,now=Date.now()){
 const timestamp=Number(params.get('timestamp'));if(!timestamp||Math.abs(now/1000-timestamp)>300)return false;
 const keys=[...new Set([...params.keys()])].filter(k=>k!=='signature').sort();return equal(await signature(secret,keys.map(k=>`${k}=${params.getAll(k).join(',')}`).join(''),'hex'),params.get('signature')||'');
}
export async function merchantSession(req:Request,secret:string){const cookie=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('resolve_merchant='))?.slice(17);if(!cookie)return null;const session=await readSigned(secret,cookie);if(!session||Number(session.expires)<Date.now()||typeof session.shop!=='string')return null;try{return shopDomain(session.shop)}catch{return null}}
export function localOperator(req:Request){const u=new URL(req.url);return ['127.0.0.1','localhost','[::1]'].includes(u.hostname)&&(!req.headers.get('origin')||req.headers.get('origin')===u.origin)&&req.headers.get('sec-fetch-site')!=='cross-site';}
