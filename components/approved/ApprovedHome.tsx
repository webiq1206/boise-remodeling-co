'use client';
import {type CSSProperties, type ReactNode} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '@/components/ui/accordion';
import {FAQSection} from '@/components/FAQSection';
import {FeaturedProjectRoomsSection} from '@/components/sections/FeaturedProjectRoomsSection';
import {StatementBandSection} from '@/components/sections/StatementBandSection';
import {brands,cities} from './family-content';
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

export function ApprovedHome({hero}:{hero:ReactNode}){const b=brands['remodeling'];const home='';
 const processBlock=<section className="f-section f-container f-two" id="how-we-build"><div className="f-sticky"><p className="f-eyebrow">KNOW WHAT HAPPENS NEXT</p><h2>A clear plan.<br/><em>At every step.</em></h2><p>Good work starts with a shared understanding of the scope, the decisions, and the next step.</p></div><Rows items={b.process} numbered/></section>;
 const approachBlock=<section className="f-section f-container f-two" id="why-choose-us"><div className="f-sticky"><p className="f-eyebrow">THE WAY WE WORK</p><h2>Good work.<br/><em>A better experience.</em></h2><p>{b.id==='handyman'?'Small jobs deserve a clear quote, a dependable visit, and a tidy finish.':'Clear expectations, thoughtful decisions, and someone accountable for the work. That is the P5 standard.'}</p></div><Rows items={b.approach}/></section>;

return <div className={`family-site family-${b.id}`} style={{'--f-accent':b.accent} as CSSProperties}>
 {hero}
 <div className="f-proof">{b.proof.map((p,i)=><div key={p}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><p>{p}</p></div>)}</div>
 <section className="f-section f-container" id="services"><div className="f-section-top"><div><p className="f-eyebrow">FIND YOUR STARTING POINT</p><h2><Title lines={b.serviceTitle}/></h2></div><p>{b.serviceIntro}</p></div><Tabs defaultValue={b.services[0].slug} className="f-explorer"><TabsList className="f-tabs">{b.services.slice(0,3).map(s=><TabsTrigger value={s.slug} key={s.slug}>{s.name}</TabsTrigger>)}</TabsList>{b.services.slice(0,3).map((s,i)=><TabsContent key={s.slug} value={s.slug}><div className="f-scene"><a className="f-scene-image" href={s.live || `/services/${s.slug}`} aria-label={s.slug==='kitchen-remodel'?'Kitchen remodeling in Boise':`Explore ${s.name.toLowerCase()}`}><img src={s.image} alt={photoAlt(s.slug)} loading="lazy" width="1000" height="750"/></a><div className="f-scene-copy"><p className="f-eyebrow"><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span> / {b.name.replace('Boise ','')}</p><h3>{s.name}</h3><p>{s.summary}</p><ul>{s.includes.slice(0,2).map(t=><li key={t}>{t}</li>)}</ul><a className="f-link" href={s.live || `/services/${s.slug}`}>{s.slug==='kitchen-remodel'?'Kitchen remodeling in Boise':'Explore this service'} <Arrow/></a></div></div></TabsContent>)}</Tabs><a className="f-link f-browse-all" href={`${home}/services`}>View all services <Arrow/></a></section>
 <section className="f-section f-container" id="projects-honest">
  <p className="f-eyebrow">OUR WORK</p>
  <h2>Completed projects, when they are ready to publish.</h2>
  <p>We publish only our own completed work, and our first projects as Boise Remodeling Co are finishing now. Ask us for references and we will connect you with past clients.</p>
  <a className="f-link" href="/design-ideas">Browse design ideas <Arrow/></a>
 </section>
 {processBlock}
 <section className="f-value"><img src={b.valueImage} alt="Kitchen counter with wood cabinets, a white countertop, and a tile backsplash" loading="lazy" width="1200" height="900"/><div><p className="f-eyebrow">WHERE YOUR MONEY GOES</p><h2><Title lines={b.valueTitle}/></h2><p>{b.value}</p><a className="f-link" href="#request">Request a quote<Arrow/></a></div></section>
 <section className="f-section f-container" id="planning-ranges">
  <p className="f-eyebrow">PLANNING RANGES</p>
  <h2>What Treasure Valley remodels typically plan.</h2>
  <p>Kitchen: $37,000 to $110,000 for most full kitchens. Primary bath: $35,000 to $85,000. Whole-home: ask for a written master scope. Full bands live in the <a href="/guides/boise-remodeling-cost-guide">cost guide</a>.</p>
  <a className="f-link" href="#request">Request a quote <Arrow/></a>
 </section>
 <section className="f-section f-container" id="who-you-are-hiring">
  <div className="f-two" style={{alignItems:'center'}}>
   <img src="/images/about/nick-perkins-portrait-crop.webp" alt="Nick Perkins, founder of Boise Remodeling Co" width="600" height="600" loading="lazy" style={{maxWidth:'280px',width:'100%',height:'auto',borderRadius:'2px'}}/>
   <div>
    <p className="f-eyebrow">WHO YOU ARE HIRING</p>
    <h2>Nick Perkins, founder.</h2>
    <p>Construction project manager, bachelor&apos;s in Construction, more than a decade of custom homes, remodels and developments. Husband, father of five, Meridian.</p>
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
