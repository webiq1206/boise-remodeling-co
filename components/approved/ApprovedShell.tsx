'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,type ReactNode} from 'react';
import {isEstimatorPath} from '@/lib/p5/estimatorRoutes';

/** The fields that hide the mobile action bar while they hold focus (audit-accessibility.css). */
const TEXT_FIELD='input,textarea,select,[contenteditable=true]';

/** Keep the approved marketing palette outside estimators, portals and admin tools. */
export function ApprovedShell({children}:{children:ReactNode}){
 const path=usePathname()||'/';
 const application=isEstimatorPath(path)||/^\/(admin|portal|subcontractor|design-studio|login|dealer|installer)(\/|$)/.test(path);
 const shell=useRef<HTMLDivElement>(null);
 // data-field-focus marks a focused form field inside the shell, so the phone
 // action bar can step aside for the keyboard. This replaced a
 // `.approved-shell:has(input:focus, ...)` rule: every input React inserted or
 // updated made Chrome re-check that :has() and restyle the whole page, about
 // 100 ms of blocking work at 4x CPU right after hydration.
 useEffect(()=>{
  const root=shell.current;
  if(!root)return;
  const sync=(target:EventTarget|null)=>{
   if(target instanceof Element&&root.contains(target)&&target.matches(TEXT_FIELD))root.setAttribute('data-field-focus','');
   else root.removeAttribute('data-field-focus');
  };
  const focusIn=(event:FocusEvent)=>sync(event.target);
  const focusOut=(event:FocusEvent)=>sync(event.relatedTarget);
  sync(document.activeElement);
  document.addEventListener('focusin',focusIn);
  document.addEventListener('focusout',focusOut);
  return ()=>{document.removeEventListener('focusin',focusIn);document.removeEventListener('focusout',focusOut);root.removeAttribute('data-field-focus');};
 },[application]);
 return application?<>{children}</>:<div ref={shell} className="approved-shell site-remodeling">{children}</div>;
}
