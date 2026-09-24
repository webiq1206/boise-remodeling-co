'use client';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {isEstimatorPath} from '@/lib/p5/estimatorRoutes';

/** Keep the approved marketing palette outside estimators, portals and admin tools. */
export function ApprovedShell({children}:{children:ReactNode}){
 const path=usePathname()||'/';
 const application=isEstimatorPath(path)||/^\/(admin|portal|subcontractor|design-studio|login|dealer|installer)(\/|$)/.test(path);
 return application?<>{children}</>:<div className="approved-shell">{children}</div>;
}
