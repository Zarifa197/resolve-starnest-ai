import Retention from '@/components/resolve/retention';
import Link from 'next/link';
export default function JudgeDemo(){return <main style={{maxWidth:1440,margin:'auto',padding:'24px clamp(16px,4vw,56px)'}}><nav style={{display:'flex',justifyContent:'space-between',gap:16,marginBottom:24}}><Link href="/" style={{fontWeight:700}}>resolve.</Link><span style={{fontSize:13,color:'#63617a'}}>Private demo session · synthetic data · no email sent</span></nav><Retention judge/></main>}
