'use client';
import Link from 'next/link';
import {type CSSProperties, type ReactNode} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '@/components/ui/accordion';
import {FAQSection} from '@/components/FAQSection';
import {PlanningRangeExplorer} from './PlanningRangeExplorer';
import {InstantEstimateBand} from './InstantEstimateBand';
import {brands,cities,serviceExtras} from './family-content';
import {DesignGallery} from '@/components/sections/DesignGallery';
import {ServiceArea} from '@/components/family/ServiceArea';

const Arrow=()=> <ArrowUpRight size={18} aria-hidden="true"/>;

const PHOTO_ALT:Record<string,string>={
 'kitchen-remodel':'White shaker kitchen with a sage green island, brass pulls, and a black-framed window',
 'bathroom-remodel':'Bathroom with a white vanity, a brass-framed mirror, and a glass walk-in shower',
 'whole-home-remodel':'Living room with wood floors, a gray sofa, and a view into the kitchen',
 'room-addition':'Single-story house with a new addition, a sliding glass door, and a concrete patio',
 'basement-remodel':'Finished lower-level room with light wood floors, a gray sectional, and a carpeted stair',
 'outdoor-living':'Covered patio with a wood dining table and square black posts',
};
function photoAlt(slug:string){return PHOTO_ALT[slug]??'Photograph of a remodeling project';}
function Title({lines}:{lines:string[]}){return <>{lines[0]}<br/><em>{lines[1]}</em></>}

function Rows({items,numbered=false}:{items:[string,string][];numbered?:boolean}){
 return <Accordion type="single" collapsible defaultValue="0" className="f-accordion">
  {items.map(([title,copy],i)=><AccordionItem value={String(i)} key={title}>
   <AccordionTrigger>{numbered&&<span className="f-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>}<span>{title}</span></AccordionTrigger>
   <AccordionContent>{copy}</AccordionContent>
  </AccordionItem>)}
 </Accordion>;
}

/**
 * The homepage below the hero, in the order a homeowner has the conversation:
 * the instant estimate (the band that sells the central estimator), what we do (picture cards), what it can look like (showcase), what it costs
 * (planning ranges, on their own dark band so the number is the one thing on
 * screen), what happens next (process), why the price is fair (value band),
 * who you are hiring (founder), the way we work, where we work, and the last
 * objections. The request form follows in app/page.tsx.
 */
export function ApprovedHome({hero}:{hero:ReactNode}){
 const b=brands['remodeling'];

 return <div className={`family-site family-${b.id}`} style={{'--f-accent':b.accent} as CSSProperties}>
  {hero}

  {/* The central estimator, sold right under the hero (owner decision, 13 November 2026). */}
  <InstantEstimateBand />

  {/* 1. Services as picture cards: six rooms, one photograph each, sentence case. */}
  <section className="f-section f-container" id="services">
   <div className="f-section-top">
    <div><p className="f-eyebrow">FIND YOUR STARTING POINT</p><h2><Title lines={b.serviceTitle}/></h2></div>
    <div>
     <p>{b.serviceIntro}</p>
     <p>Start with {b.services.slice(0,3).map((s,i,all)=><span key={s.slug}>{i>0?(i===all.length-1?' or ':', '):''}<a className="underline underline-offset-2" href={s.live || `/services/${s.slug}`}>{s.name.toLowerCase()}</a></span>)}.</p>
    </div>
   </div>
   <div className="fr-cards" tabIndex={0} aria-label="Services">
    {b.services.map((s,i)=><a className="fr-card" key={s.slug} href={s.live || `/services/${s.slug}`} aria-label={s.slug==='kitchen-remodel'?'Kitchen remodeling in Boise':s.name}>
     <span className="fr-card-media"><img src={s.image} alt={photoAlt(s.slug)} loading={i<3?'eager':'lazy'} width="1000" height="750"/></span>
     <span className="fr-card-body">
      <h3>{s.name}</h3>
      <p>{s.summary}</p>
      <span className="f-link">{s.slug==='kitchen-remodel'?'Kitchen remodeling in Boise':'Explore this service'} <Arrow/></span>
     </span>
    </a>)}
   </div>
   <div className="fr-cards-more">
    <span>Also:</span>
    {serviceExtras.remodeling.map(([label,href])=><a className="f-link" key={href} href={href}>{label} <Arrow/></a>)}
    <a className="f-link" href="/services">View all services <Arrow/></a>
   </div>
  </section>

  {/* 2. The look: six photographs from the company's own campaign library. */}
  <DesignGallery
   id="our-work"
   eyebrow="DESIGN IDEAS"
   title="See what a remodel"
   accent="can become."
   intro="Warm white oak, quiet tile and light that lands well. Kitchens and baths planned around the way you actually use them, finished with the small details you notice every day."
   photos={[
    {src:'/family/drive/landscape-1-white-and-oak-kitchen-island.webp',alt:'White kitchen with a white oak island, two oak stools and a plaster range hood',label:'Kitchen',wide:true},
    {src:'/family/drive/square-1-kitchen-counter-detail.webp',alt:'White quartz counter corner with a glazed tile backsplash and brass cabinet knobs',label:'Counter detail'},
    {src:'/family/drive/square-2-powder-room-vessel-sink.webp',alt:'Powder room with a marble vessel sink, brass wall faucet and an oak-framed mirror',label:'Powder room'},
    {src:'/family/drive/landscape-2-freestanding-soaking-tub.webp',alt:'Freestanding white soaking tub against a marble-look tile wall with a brass floor-mounted faucet',label:'Primary bath',wide:true},
    {src:'/family/drive/landscape-3-double-vanity-and-walk-in-shower.webp',alt:'Floating white oak double vanity with round black mirrors beside a glass walk-in shower',label:'Double vanity',wide:true},
    {src:'/family/drive/square-3-tiled-shower-bench.webp',alt:'Tiled shower bench with a stone top, a wall niche and a brass handheld shower',label:'Shower bench'},
   ]}
  />

  {/* 3. The number, on its own band. */}
  <PlanningRangeExplorer />

  {/* 4. What happens next. */}
  <section className="f-section f-container f-two" id="how-we-build">
   <div className="f-sticky"><p className="f-eyebrow">KNOW WHAT HAPPENS NEXT</p><h2>A clear plan.<br/><em>At every step.</em></h2><p>Good work starts with a shared understanding of the scope, the decisions, and the next step.</p></div>
   <Rows items={b.process} numbered/>
  </section>

  {/* 5. Why the price is fair. */}
  <section className="f-value">
   <img src={b.valueImage} alt="Kitchen mid-remodel with open cabinet boxes and tools on a plywood work top" loading="lazy" width="1200" height="900"/>
   <div><p className="f-eyebrow">WHERE YOUR MONEY GOES</p><h2><Title lines={b.valueTitle}/></h2>{b.value.split(/(?<=\.)\s+/).filter(Boolean).map((sentence)=><p key={sentence}>{sentence}</p>)}<Link className="f-link" href="/#request">Request a quote<Arrow/></Link></div>
  </section>

  {/* 6. Who you are hiring. */}
  <section className="f-section f-container" id="who-you-are-hiring">
   <div className="fr-founder">
    <img className="family-people-photo" src="/images/about/perkins-family-full.webp" alt="Nick Perkins with his wife and five children at a pumpkin patch in Meridian, Idaho" width="2048" height="2048" loading="lazy"/>
    <div>
     <p className="f-eyebrow">WHO YOU ARE HIRING</p>
     <h2>Nick Perkins, founder.</h2>
     <p>Construction project manager with a bachelor&apos;s degree in Construction with an emphasis in Project Management.</p>
     <p>More than a decade of custom homes, remodels and developments.</p>
     <p>Husband, father of five. The family moved to Meridian in 2025.</p>
     <blockquote>&ldquo;Work hard. Keep your word. Treat people right.&rdquo;</blockquote>
     <p><a className="f-link" href="/about">Read Nick&apos;s story <Arrow/></a></p>
    </div>
   </div>
  </section>

  {/* 7. A quiet ask halfway down, for the reader who is already convinced. */}
  <section className="fr-cta-strip" aria-label="Request a quote">
   <div className="f-container">
    <div><h2>Ready to talk about your home?</h2><p>A free in-home visit, a written scope, and a firm price. No pressure to decide on the spot.</p></div>
    <div className="fr-cta-strip-actions"><Link className="f-button f-dark" href="/#request">Request a quote</Link><a className="f-link" href="/contact">Call or text us <Arrow/></a></div>
   </div>
  </section>

  {/* 8. The way we work. */}
  <section className="f-section f-container f-two" id="why-choose-us">
   <div className="f-sticky"><p className="f-eyebrow">THE WAY WE WORK</p><h2>Good work.<br/><em>A better experience.</em></h2><p>Clear expectations, thoughtful decisions, and someone accountable for the work. That is the P5 standard.</p></div>
   <Rows items={b.approach}/>
  </section>

  {/* 9. Where we work: one line of linked cities. */}
  <ServiceArea image={{src:'/family/drive/landscape-3-double-vanity-and-walk-in-shower.webp',alt:'Oak double vanity beside a tiled walk-in shower',width:1200,height:628}}>
   <p className="f-eyebrow">AT HOME IN IDAHO</p>
   <h2>Local people.<br/><em>Valley-wide reach.</em></h2>
   <p>Serving homeowners throughout the Treasure Valley.</p>
   <nav className="fr-cities" aria-label="Service area cities">{cities.map(city=><a key={city} href={`/areas/${city.toLowerCase().replaceAll(" ","-")}`} aria-label={`Remodeling contractors in ${city}`}>{city}</a>)}</nav>
  </ServiceArea>

  <FAQSection/>
 </div>;
}
