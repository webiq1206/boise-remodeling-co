'use client';
import Link from 'next/link';
import {type CSSProperties, type ReactNode} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '@/components/ui/accordion';
import {FAQSection} from '@/components/FAQSection';
import {FeaturedProjectRoomsSection} from '@/components/sections/FeaturedProjectRoomsSection';
import {StatementBandSection} from '@/components/sections/StatementBandSection';
import {PlanningRangeExplorer} from './PlanningRangeExplorer';
import {brands,cities} from './family-content';
import {SITE_IMAGES, FEATURED_BOISE_BENCH_IMAGES, GALLERY_IMAGES} from '@/shared/siteImages';

const Arrow=()=> <ArrowUpRight size={18} aria-hidden="true"/>;
const PHOTO_ALT:Record<string,string>={
 'kitchen-remodel':'White kitchen with a wood island, brass lights, and a view to the living room',
 'bathroom-remodel':'Bathroom with a freestanding tub, glass shower, and double wood vanity',
 'whole-home-remodel':'Living room with wood floors, a gray sofa, and windows looking onto a patio',
 'room-addition':'House exterior with horizontal siding and a covered porch',
 'basement-remodel':'Finished lower-level room with light wood floors and a wall of windows',
 'outdoor-living':'Covered patio with a wood dining table and a stone fireplace',
};
function photoAlt(slug:string){return PHOTO_ALT[slug]??'Photograph of a remodeling project';}
function Title({lines}:{lines:string[]}){return <>{lines[0]}<br/><em>{lines[1]}</em></>}
function Rows({items,numbered=false}:{items:[string,string][];numbered?:boolean}){return <Accordion type="single" collapsible defaultValue="0" className="f-accordion">{items.map(([title,copy],i)=><AccordionItem value={String(i)} key={title}><AccordionTrigger>{numbered&&<span className="f-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>}<span>{title}</span></AccordionTrigger><AccordionContent>{copy}</AccordionContent></AccordionItem>)}</Accordion>}

const PHOTO_BREAKS = [
  {
    src: FEATURED_BOISE_BENCH_IMAGES.kitchen,
    alt: 'Bright kitchen remodel with sage island and white cabinetry in the Treasure Valley',
    label: 'Kitchen',
  },
  {
    src: FEATURED_BOISE_BENCH_IMAGES.bath,
    alt: 'Primary bathroom remodel with freestanding tub and wood vanity',
    label: 'Bath',
  },
  {
    src: FEATURED_BOISE_BENCH_IMAGES.greatRoom,
    alt: 'Open great room after a whole-home remodel with warm wood floors',
    label: 'Living',
  },
] as const;

const DESIGN_STRIP = [
  {
    src: GALLERY_IMAGES.kitchen.after,
    alt: 'Kitchen remodel design idea with white cabinets and warm wood',
    href: '/design-ideas',
    label: 'Kitchen ideas',
  },
  {
    src: GALLERY_IMAGES.bathroom.after,
    alt: 'Bathroom remodel design idea with tile shower and wood vanity',
    href: '/services/bathroom-remodel',
    label: 'Bath ideas',
  },
  {
    src: GALLERY_IMAGES.wholeHome.after,
    alt: 'Whole-home remodel design idea with connected living spaces',
    href: '/services/whole-home-remodel',
    label: 'Whole home',
  },
  {
    src: SITE_IMAGES.processInProgress,
    alt: 'Kitchen remodel craftsmanship in progress on site',
    href: '/about',
    label: 'How we build',
  },
] as const;

export function ApprovedHome({hero}:{hero:ReactNode}){const b=brands['remodeling'];const home='';
 const processBlock=<section className="f-section f-container f-two" id="how-we-build"><div className="f-sticky"><p className="f-eyebrow">KNOW WHAT HAPPENS NEXT</p><h2>A clear plan.<br/><em>At every step.</em></h2><p>Good work starts with a shared understanding of the scope, the decisions, and the next step.</p><img className="f-process-photo" src={SITE_IMAGES.process} alt="Design review materials on a kitchen counter during remodel planning" loading="lazy" width="1000" height="750"/></div><Rows items={b.process} numbered/></section>;
 const approachBlock=<section className="f-section f-container f-two" id="why-choose-us"><div className="f-sticky"><p className="f-eyebrow">THE WAY WE WORK</p><h2>Good work.<br/><em>A better experience.</em></h2><p>Clear expectations, thoughtful decisions, and someone accountable for the work. That is the P5 standard.</p><img className="f-process-photo" src={SITE_IMAGES.value} alt="Cabinet craftsmanship and materials during a kitchen remodel" loading="lazy" width="1000" height="750"/></div><Rows items={b.approach}/></section>;

return <div className={`family-site family-${b.id}`} style={{'--f-accent':b.accent} as CSSProperties}>
 {hero}
 <div className="f-proof">{b.proof.map((p,i)=><div key={p}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><p>{p}</p></div>)}</div>

 <section className="f-photo-triptych" aria-label="Remodel photography">
  {PHOTO_BREAKS.map((shot)=>(
    <figure key={shot.label} className="f-photo-triptych-item">
      <img src={shot.src} alt={shot.alt} loading="lazy" width="1200" height="900"/>
      <figcaption>{shot.label}</figcaption>
    </figure>
  ))}
 </section>

 <section className="f-section f-container" id="services"><div className="f-section-top"><div><p className="f-eyebrow">FIND YOUR STARTING POINT</p><h2><Title lines={b.serviceTitle}/></h2></div><p>{b.serviceIntro}</p></div><Tabs defaultValue={b.services[0].slug} className="f-explorer"><TabsList className="f-tabs">{b.services.slice(0,3).map(s=><TabsTrigger value={s.slug} key={s.slug}>{s.name}</TabsTrigger>)}</TabsList>{b.services.slice(0,3).map((s,i)=><TabsContent key={s.slug} value={s.slug}><div className="f-scene"><a className="f-scene-image" href={s.live || `/services/${s.slug}`} aria-label={s.slug==='kitchen-remodel'?'Kitchen remodeling in Boise':`Explore ${s.name.toLowerCase()}`}><img src={s.image} alt={photoAlt(s.slug)} loading="lazy" width="1000" height="750"/></a><div className="f-scene-copy"><p className="f-eyebrow"><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span> / {b.name.replace('Boise ','')}</p><h3>{s.name}</h3><p>{s.summary}</p><ul>{s.includes.slice(0,2).map(t=><li key={t}>{t}</li>)}</ul><a className="f-link" href={s.live || `/services/${s.slug}`}>{s.slug==='kitchen-remodel'?'Kitchen remodeling in Boise':'Explore this service'} <Arrow/></a></div></div></TabsContent>)}</Tabs><a className="f-link f-browse-all" href={`${home}/services`}>View all services <Arrow/></a></section>

 <section className="f-section f-container" id="design-ideas-strip">
  <div className="f-section-top">
    <div>
      <p className="f-eyebrow">DESIGN DIRECTION</p>
      <h2>Rooms worth<br/><em>coming home to.</em></h2>
    </div>
    <p>
      Browse illustrative design ideas while our first Boise Remodeling Co projects finish. Ask for
      references and we will connect you with past clients.
    </p>
  </div>
  <div className="f-design-strip">
    {DESIGN_STRIP.map((item)=>(
      <a key={item.label} className="f-design-strip-card" href={item.href}>
        <img src={item.src} alt={item.alt} loading="lazy" width="800" height="600"/>
        <span>{item.label} <Arrow/></span>
      </a>
    ))}
  </div>
  <a className="f-link f-browse-all" href="/design-ideas">Browse all design ideas <Arrow/></a>
 </section>

 {processBlock}

 <section className="f-value"><img src={b.valueImage} alt="Kitchen counter with wood cabinets, a white countertop, and a tile backsplash" loading="lazy" width="1200" height="900"/><div><p className="f-eyebrow">WHERE YOUR MONEY GOES</p><h2><Title lines={b.valueTitle}/></h2><p>{b.value}</p><Link className="f-link" href="/#request">Request a quote<Arrow/></Link></div></section>

 <PlanningRangeExplorer />

 <section className="f-section f-container" id="who-you-are-hiring">
  <div className="f-two family-founder-block">
   <img
     className="family-people-photo"
     src="/images/about/perkins-family-full.webp"
     alt="Nick Perkins with his wife and five children at a pumpkin patch in Meridian, Idaho"
     width="2048"
     height="2048"
     loading="lazy"
   />
   <div>
    <p className="f-eyebrow">WHO YOU ARE HIRING</p>
    <h2>Nick Perkins,<br/><em>founder.</em></h2>
    <p>Construction project manager with a bachelor&apos;s degree in Construction with an emphasis in Project Management, and more than a decade of custom homes, remodels and developments. Husband, father of five. The family moved to Meridian in 2025.</p>
    <p>&ldquo;Work hard. Keep your word. Treat people right.&rdquo;</p>
    <a className="f-link" href="/about">Read Nick&apos;s story <Arrow/></a>
   </div>
  </div>
 </section>

 {approachBlock}
 <StatementBandSection />
 <FeaturedProjectRoomsSection compact />
 <section className="f-area f-section f-container"><p className="f-eyebrow">AT HOME IN IDAHO</p><h2>Local people.<br/><em>Valley-wide reach.</em></h2><p>Serving homeowners throughout the Treasure Valley.</p><div>{cities.map(city=><a key={city} href={`/areas/${city.toLowerCase().replaceAll(" ","-")}`}>{`Remodeling contractors in ${city}`}<Arrow/></a>)}</div></section>
 <FAQSection/>
 </div>;}
