import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** Public-page layout. Application routes retain their dedicated interfaces. */
export function InteriorPage({children,kind='detail'}:{children:ReactNode;kind?:string}) {
  return <div className={`approved-interior interior-${kind}`}>{children}</div>;
}

export function InteriorEstimateLink({label='Get my online estimate'}:{label?:string}) {
  return <a className="interior-estimate-link" href="/estimate">{label}<ArrowUpRight size={18} aria-hidden="true"/></a>;
}

/** The approved split-detail and editorial-introduction compositions. */
export function InteriorHero({children,imageSrc,imageAlt='',layout='split',estimateAction=false}:{children:ReactNode;imageSrc?:string;imageAlt?:string;layout?:'split'|'editorial'|'contact';estimateAction?:boolean}) {
  return <section className={`interior-hero interior-hero-${layout}${imageSrc?'':' interior-hero-text'}`}>
    <div className="interior-hero-copy">{children}{estimateAction&&<div className="interior-hero-action"><InteriorEstimateLink/></div>}</div>
    {imageSrc&&<div className="interior-hero-image"><img src={imageSrc} alt={imageAlt} width={1400} height={1100} fetchPriority="high"/></div>}
  </section>;
}

/** Reusable secondary column, with the estimator as its single dominant action. */
export function InteriorProjectAside({children}:{children?:ReactNode}) {
  return <aside className="interior-project-aside"><p className="interior-eyebrow">YOUR PROJECT. ESTIMATED ONLINE.</p><h2>Start with<br/><em>what you know.</em></h2><p>Describe your project, share plans or photos, and get a preliminary estimate online.</p><InteriorEstimateLink/>{children}<a className="interior-text-link" href="/contact">Talk through the details<ArrowUpRight size={16} aria-hidden="true"/></a></aside>;
}

export function InteriorDocument({heading,children,contents=[]}:{heading:ReactNode;children:ReactNode;contents?:{id:string;label:string}[]}) {
  return <div className="interior-document"><header className="interior-document-heading">{heading}</header><div className="interior-document-grid"><aside className="interior-document-index">{contents.length>0&&<nav aria-label="On this page"><p className="interior-eyebrow">ON THIS PAGE</p>{contents.map(item=><a href={`#${item.id}`} key={item.id}>{item.label}</a>)}</nav>}<InteriorEstimateLink/></aside><div className="interior-document-main">{children}</div></div></div>;
}
