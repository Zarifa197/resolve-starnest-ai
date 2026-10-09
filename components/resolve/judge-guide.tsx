'use client';
import {useState} from 'react';
import {BookOpen,Check,Copy} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {judgeCases,judgeInstructions} from '@/lib/demo-guide';
import {judgeSeed} from '@/lib/retention-seed';

// Fixed fictional times keep this preview reproducible and hydration stable.
const samples=judgeSeed('read-only-preview',new Date('2026-10-09T12:00:00.000Z'));
export default function JudgeGuide(){
 const [active,setActive]=useState<string>('checkout'),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState('');
 const scenario=judgeCases.find(item=>item.id===active)!;
 const sample=samples.find(item=>item.account.id.endsWith(`:${active}`))!;
 async function copy(){try{await navigator.clipboard.writeText(judgeInstructions);setCopied(true);setCopyError('')}catch{setCopyError('Copy is unavailable in this browser. Select the instructions below instead.')}}
 return <section className="rt-panel rt-judge-guide" aria-label="Demo instructions">
  <div className="rt-section-head"><h2><BookOpen size={18}/>How to try Resolve</h2><Button size="sm" variant="outline" onClick={()=>void copy()}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Instructions copied':'Copy instructions'}</Button></div>
  <p>No account or password. Fictional customers. No emails or payments.</p>
  <ol className="rt-guide-steps"><li><strong>Start judge demo</strong><span>Open Ava’s shopping journey.</span></li><li><strong>Analyze with AI</strong><span>Read the evidence, uncertainty, and draft. Check the Gemini or fallback label.</span></li><li><strong>Approve & simulate delivery</strong><span>Record a pretend message; nothing is sent.</span></li><li><strong>Simulate re-engagement</strong><span>Add a fictional completion. Reload to inspect saved history.</span></li></ol>
  {copyError?<p role="status">{copyError}</p>:null}
  <details className="rt-samples"><summary>Read or copy the full walkthrough</summary><pre>{judgeInstructions}</pre></details>
  <p className="rt-muted"><a href="/demo-data.json" download>Download the complete fictional dataset (JSON)</a> · <a href="/guide">Full judge and Shopify instructions</a></p>
  <details className="rt-samples"><summary>Explore the fictional data — available even if the database is offline</summary>
   <p className="rt-muted">This read-only preview requires no database or AI call. It is separate from the interactive, persisted demo. Example timestamps are fixed at October 9, 2026, UTC.</p>
   <div className="rt-scenario-tabs" role="group" aria-label="Fictional scenarios">{judgeCases.map(item=><button key={item.id} aria-pressed={active===item.id} onClick={()=>setActive(item.id)}>{item.name}<small>{item.title}</small></button>)}</div>
   <article className="rt-sample-detail"><h3>{scenario.name}: {scenario.title}</h3><p>{scenario.story}</p><p><strong>Expected response: {scenario.expectedLabel}.</strong> {scenario.reason}</p><p className="rt-muted">Email permission: {sample.account.profile.emailConsent==='opted_out'?'opted out':'allowed in this fictional scenario'}. {active==='luma'?'A simulated previous outreach record is added when the interactive demo starts.':''}</p>
    <ol>{sample.events.map(event=><li key={event.id}><strong>{event.summary}</strong><small>{new Date(event.at).toISOString().replace('T',' ').replace('.000Z',' UTC')} · fictional event</small></li>)}</ol>
    <details><summary>Inspect the normalized event data</summary><pre>{JSON.stringify({account:sample.account,events:sample.events,expectedAction:scenario.expected,previousOutreach:active==='luma'?{status:'simulated',at:'2026-10-09T11:00:00.000Z',emailActuallySent:false}:null},null,2)}</pre></details>
   </article>
  </details>
 </section>;
}
