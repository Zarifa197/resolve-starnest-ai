'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {RefreshCw,Activity} from 'lucide-react';
type Tracking={shop:string;collectorPrepared:boolean;collectorEnabled:boolean;lastReceivedAt:string|null;eventCounts:{kind:string;events:number}[];registrationVerified:boolean};
export default function ShopifyTracking(){
 const [data,setData]=useState<Tracking|null>(null),[settings,setSettings]=useState<unknown>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){const response=await fetch('/api/tracking',{cache:'no-store'}),body=await response.json() as Tracking & {error?:string};if(!response.ok)throw Error(body.error||'Tracking status is unavailable.');setData(body);setError('')}
 useEffect(()=>{let current=true;fetch('/api/tracking',{cache:'no-store'}).then(async response=>{const body=await response.json() as Tracking & {error?:string};if(!response.ok)throw Error(body.error||'Tracking status is unavailable.');if(current)setData(body)}).catch(e=>{if(current)setError(e.message)});return()=>{current=false}},[]);
 async function refresh(){setBusy(true);try{await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function prepare(){setBusy(true);setError('');try{const response=await fetch('/api/tracking',{method:'POST'}),body=await response.json() as {error?:string;settings?:unknown};if(!response.ok)throw Error(body.error||'Could not prepare the collector.');setSettings(body.settings);await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="rt-panel" aria-label="Shopify behavior tracking"><div className="rt-section-head"><h2><Activity size={18}/>Shopify behavior tracking</h2><Button size="sm" variant="outline" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={14}/>Refresh status</Button></div>
 <p>Shopify orders and cancellations can be connected to identified customer profiles. Product views, cart events, and checkout activity require an activated Shopify Web Pixel.</p>
 {error?<p role="alert" className="rt-warning">{error} Check the database and apply the tracking migration before preparing the collector.</p>:null}
 <dl className="rt-context"><div><dt>Collector configuration</dt><dd>{data?data.collectorPrepared?data.collectorEnabled?'Prepared':'Disabled':'Not prepared':'Status unavailable'}</dd></div><div><dt>Live pixel activation</dt><dd>Not verified by Resolve</dd></div><div><dt>Last anonymous receipt</dt><dd>{data?.lastReceivedAt?new Date(data.lastReceivedAt).toLocaleString('en-US'):'No receipt verified'}</dd></div></dl>
 {data?.eventCounts.length?<ul>{data.eventCounts.map(event=><li key={event.kind}>{event.kind.replaceAll('_',' ')}: {event.events} stored receipt{event.events===1?'':'s'}</li>)}</ul>:null}
 <ol><li>Connect the Shopify store and approve the required pixel scopes.</li><li>Configure the deployed HTTPS app URL and persistent database.</li><li>Prepare the collector, deploy the extension, and register its settings in Shopify.</li><li>Use the test storefront with the required consent, view a product, and add it to the cart.</li><li>Refresh status and inspect the received event types. Test an order and cancellation separately.</li></ol>
 <p className="rt-muted">Anonymous browsing is kept separate from identified customers. A public pixel receipt is self-reported; it is not verified identity and never authorizes an email.</p>
 <div className="rt-top-actions"><Button disabled={busy||!data} onClick={()=>void prepare()}>Prepare collector settings</Button><a href="/guide#shopify">Read the Shopify setup guide</a></div>
 {settings?<details open><summary>Extension settings for Shopify registration</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12,marginTop:12}}>{JSON.stringify(settings,null,2)}</pre><p className="rt-muted">Preparing these settings does not deploy or activate the extension.</p></details>:null}
 </section>;
}
