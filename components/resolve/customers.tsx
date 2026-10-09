"use client";
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
type Customer={id:string;shopify_id:string;email:string|null;synced_at:string;events:number};
export default function Customers(){const [rows,setRows]=useState<Customer[]>([]);const [company,setCompany]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function load(){const r=await fetch('/api/customers');const d=await r.json() as {customers:Customer[];company?:string;error?:string};if(!r.ok)throw Error(d.error);setRows(d.customers);setCompany(d.company||'')}
 useEffect(()=>{load().catch(()=>setError('Could not load the customer directory.'))},[]);
 async function sync(){setBusy(true);setError('');try{const r=await fetch('/api/customers',{method:'POST'});const d=await r.json() as {customers:Customer[];company?:string;error?:string};if(!r.ok)throw Error(d.error);await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section><p>{company} · {rows.length} customers shown</p><Button disabled={busy} onClick={sync}>{busy?'Syncing…':'Sync from Shopify'}</Button>{error&&<p role="alert">{error}</p>}<div className="customer-table"><table style={{width:'100%',textAlign:'left',marginTop:24}}><thead><tr><th>Customer ID</th><th>Email</th><th>Events</th><th>Last synced</th></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td style={{padding:'16px 8px'}}>{c.shopify_id}</td><td>{c.email||'No email available'}</td><td>{c.events}</td><td>{new Date(c.synced_at).toLocaleString('en-US')}</td></tr>)}</tbody></table></div><p>Email addresses are synced from Shopify. Sending is currently restricted to the configured test recipient.</p></section>
}
