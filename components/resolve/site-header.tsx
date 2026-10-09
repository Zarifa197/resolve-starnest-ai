'use client';
import {useState} from 'react';
import {ArrowUpRight,Menu,Moon,Sun,X} from 'lucide-react';
export default function SiteHeader({dark,onTheme}:{dark:boolean;onTheme:()=>void}){
 const [open,setOpen]=useState(false);
 return <header className="rl-header"><a href="/" className="rl-logo" aria-label="Resolve home">resolve<span>.</span></a><button className="rl-mobile" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav className={open?'rl-nav open':'rl-nav'} aria-label="Main navigation">{[['Home','/#home'],['How it works','/#demo'],['Product','/#platform'],['FAQ','/#faq']].map(([label,href])=><a key={href} href={href} onClick={()=>setOpen(false)}>{label}</a>)}<button className="rl-theme" aria-label={dark?'Switch to light theme':'Switch to dark theme'} onClick={onTheme}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button><a className="rl-button" href="/demo">Open workspace <ArrowUpRight size={16}/></a></nav></header>;
}
