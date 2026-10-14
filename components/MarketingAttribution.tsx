'use client';
import {useEffect} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {captureMarketingAttribution,setMarketingConsent} from '@/lib/marketingAttributionBrowser';
import {ATTRIBUTION_KEY} from '@/lib/p5/marketingAttribution';

/** Invisible observer only. It never intercepts a form, link, fetch, or vendor tag. */
export function MarketingAttribution(){
 const path=usePathname(),search=useSearchParams();
 useEffect(()=>{captureMarketingAttribution();},[path,search]);
 useEffect(()=>{
  const consent=(event:Event)=>{
   const value=(event as CustomEvent).detail;
   if(value==='granted'||value==='denied'||value==='unknown')setMarketingConsent(value);
  };
  const refresh=()=>captureMarketingAttribution();
  const storage=(event:StorageEvent)=>{
   // Withdrawal in another tab must not be undone by this tab's cached touch.
   if((event.key===ATTRIBUTION_KEY||event.key===null)&&event.newValue===null)setMarketingConsent('unknown');
   else refresh();
  };
  window.addEventListener('p5:marketing-consent',consent);
  window.addEventListener('pageshow',refresh);
  window.addEventListener('storage',storage);
  // Consent Mode updates may arrive after hydration.
  const timer=window.setInterval(refresh,2000);
  return ()=>{window.removeEventListener('p5:marketing-consent',consent);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',storage);window.clearInterval(timer);};
 },[]);
 return null;
}
