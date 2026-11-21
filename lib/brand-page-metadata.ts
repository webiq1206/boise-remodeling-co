import type {Metadata} from 'next';
import {publishFoundingCopy} from '../shared/publicClaims.ts';
import {ESTIMATOR_BRAND as brand} from './p5/brand.ts';
import {publicPreviewPath} from '@/shared/foundingClaim';

/** Branded sharing previews are the owner's preference. Product/article schema
 * retains its real subject image. Neither favicon nor preview display is guaranteed.
 * page-preview.png is the seal, whose lower arc reads EST 2020, so it is
 * withheld with the founding-year flag. */
export const BRAND_PAGE_IMAGE=`https://${brand.domain}${publicPreviewPath()}`;
export const BRAND_SEARCH_ICON=`https://${brand.domain}/brand/search-icon-96.png`;
type Copy={title:string;description:string};
const COPY:Record<string,Record<string,Copy>>={
 construction:{
  '/':{title:'Custom Home Builder in Boise, ID',description:'Build a custom or semi-custom home in Boise and the Treasure Valley. Explore design-build services, build-on-your-lot options and clear project budgets.'},
  '/services':{title:'Home Building & Design-Build Services',description:'Explore custom homes, semi-custom homes, additions and build-on-your-lot services across Boise and the Treasure Valley. Plan your project with our team.'},
  '/about':{title:'About Our Boise Home Building Team',description:'Learn how Boise Construction Co plans and manages Treasure Valley home builds, from lot evaluation and design through permits, construction and handover.'},
  '/contact':{title:'Contact a Boise Home Builder',description:'Discuss your new home, building lot or addition with Boise Construction Co. Call our team or request project guidance for Boise and the Treasure Valley.'},
  '/resources':{title:'Home Building Worksheets & Guides',description:'Download home-building budget worksheets and lot evaluation checklists. Compare Ada and Canyon County permit steps before planning your Idaho build.'},
  '/blog':{title:'Idaho Home Building Advice & Guides',description:'Read practical Idaho home-building guides on budgets, land, permits, design choices and construction timelines from the Boise Construction Co team.'}},
 // Founding-year source stays in this file and is omitted while the flag is off:
 // Design-build remodeler since 2020. Design-build remodeler founded in 2020.
 remodeling:{
  "/guides/boise-remodeling-cost-guide":{title:"Boise Remodeling Costs (2026)",description:"Compare Boise kitchen, bathroom, whole-home and addition remodeling budgets. Plan your scope, allowances and contingency, and see what changes the price."},
  "/blog/kitchen-remodel-cost-boise":{title:"Boise Kitchen Remodel Costs (2026)",description:"Compare Boise kitchen remodel costs by scope and finish level. Review cabinet, countertop and labor budgets, project timelines and ways to manage costs."},
  "/blog/bathroom-remodel-cost-boise":{title:"Boise Bathroom Remodel Costs (2026)",description:"Compare Boise bathroom remodel costs for showers, tile, vanities and layout changes. Review planning ranges, cost drivers and questions to ask before starting."},
  "/blog/home-addition-cost-boise":{title:"Boise Home Addition Costs (2026)",description:"Plan a Boise home addition with cost ranges for bedrooms, suites and second stories. Review structural work, permits, site conditions and budget allowances."},
  "/blog/adu-cost-boise":{title:"ADU conversion costs in Boise (2026)",description:"Compare Boise ADU conversion costs for garage, basement and attached units. Review plumbing, finish levels and permits. Detached ADUs: Boise Construction Co."},
  '/':{title:'Boise Home Remodeling Contractors',description:'Boise home remodeling from one design-build team: kitchens, baths and whole-home remodels. Free in-home visit, a written scope, and calls or texts welcome.'},
  '/services':{title:'Kitchen, Bath & Home Remodeling',description:'Explore kitchen, bathroom and whole-home remodeling, additions and ADUs in Boise and the Treasure Valley. See the scope of our design-build services.'},
  '/about':{title:'About Our Design-Build Team',description:'Meet the design-build team behind Boise Remodeling Co, a P5 Home Co company. See how we plan, price and manage remodels for Ada and Canyon County homes.'},
  '/blog':{title:'Remodeling Advice and Ideas',description:'Practical remodeling advice for Treasure Valley homeowners: budgets, timelines, permits and design ideas, written by the Boise Remodeling Co design team.'},
  '/contact':{title:'Contact Boise Remodeling Co | Call, Text or Request a Visit',description:'Call or text Boise Remodeling Co, or book a free in-home visit for your kitchen, bath or whole-home project in Ada or Canyon County. No pressure, no pitch.'}},
 handyman:{
  '/':{title:'Handyman & Home Repairs in Boise, ID',description:'Get help with repairs, installations and home maintenance in Boise and the Treasure Valley. Describe your project or send a repair list for an estimate.'},
  '/services':{title:'Handyman Repair & Installation Services',description:'Explore drywall repair, painting, carpentry, mounting and maintenance services in Boise and the Treasure Valley. Send your repair list to our local team.'},
  '/about':{title:'About Our Boise Handyman Team',description:'Learn how Boise Handyman Co handles Treasure Valley home repairs and installations, with clear project scopes, scheduling and attention to small jobs.'},
  '/contact':{title:'Contact a Boise Handyman',description:'Contact Boise Handyman Co about your repair list, installation or maintenance project. Call our team or send your scope for a Treasure Valley estimate.'}},
 cabinet:{
  '/':{title:'Kitchen Cabinets & Vanities in Boise',description:'Explore kitchen cabinets, bathroom vanities and built-in storage for Boise and the Treasure Valley. Review finishes, design options and installation.'},
  '/about':{title:'About Our Boise Cabinet Team',description:'Learn how Boise Cabinet Co helps Treasure Valley homeowners and contractors with cabinet layouts, finish selections, supply and installation planning.'},
  '/contact':{title:'Contact Our Boise Cabinet Team',description:'Discuss cabinet layouts, finishes, supply or installation with Boise Cabinet Co. Call our team or request help with your Treasure Valley cabinet project.'},
  '/resources':{title:'Cabinet Planning Worksheets & Guides',description:'Plan your cabinetry with budget worksheets, kitchen and bath checklists, and local permit guidance from Boise Cabinet Co in Idaho’s Treasure Valley.'}},
 p5:{
  '/':{title:'Boise Home Construction, Remodeling & Repairs',description:'Find the P5 Home Co team for new construction, remodeling, home repairs or cabinets in Boise and the Treasure Valley. Compare services and plan your project.'},
  '/quote':{title:'Get a Home Project Estimate in Boise',description:'Describe your remodel, new home, cabinet or repair project and attach plans or a scope. Start your Treasure Valley estimate with the right P5 Home Co team.'},
  '/sitemap':{title:'P5 Home Co Pages & Company Directory',description:'Find P5 Home Co pages, project estimate forms and links to our Boise construction, remodeling, handyman and cabinet companies in Idaho’s Treasure Valley.'}}
};
function titleText(meta:Metadata):string{
 const value=meta.title;
 return typeof value==='string'?value:value&&'absolute' in value?value.absolute||brand.name:value&&'default' in value?value.default||brand.name:brand.name;
}
function pagePath(meta:Metadata,hint?:string):string{
 const canonical=meta.alternates?.canonical;
 const value=typeof canonical==='string'?canonical:canonical instanceof URL?canonical.toString():canonical&&typeof canonical==='object'&&'url' in canonical?String(canonical.url):'';
 if(value){try{return new URL(value,`https://${brand.domain}`).pathname.replace(/\/$/,'')||'/';}catch{}}
 return hint&&!hint.includes('[')&&hint!=='__layout__'?(hint.replace(/\/$/,'')||'/'):'';
}
export function withBrandPageMetadata(meta:Metadata,routeHint?:string):Metadata{
 const override=routeHint==='__layout__'?undefined:COPY[brand.id]?.[pagePath(meta,routeHint)];
 const original=publishFoundingCopy(titleText(meta));
 const overrideTitle=override?publishFoundingCopy(override.title):'';
 const title=override?(overrideTitle.includes(brand.name)?overrideTitle:`${overrideTitle} | ${brand.name}`):original.includes(brand.name)?original:`${original} | ${brand.name}`;
 const description=publishFoundingCopy(override?.description||meta.description||'')||undefined;
 const image={url:BRAND_PAGE_IMAGE,width:1200,height:630,alt:brand.name};
 const icons=routeHint==='__layout__'?{
  ...(typeof meta.icons==='object'&&!Array.isArray(meta.icons)&&!(meta.icons instanceof URL)?meta.icons:{}),
  icon:[{url:BRAND_SEARCH_ICON,sizes:'96x96',type:'image/png'}],
  apple:[{url:`https://${brand.domain}/brand/search-icon-180.png`,sizes:'180x180',type:'image/png'}],
 }:meta.icons;
 return {
  ...meta,
  ...(override?{title:{absolute:title},description}:{}),
  ...(icons?{icons}:{}),
  openGraph:{...meta.openGraph,title,description,siteName:brand.name,images:[image]},
  twitter:{...meta.twitter,card:'summary_large_image',title,description,images:[BRAND_PAGE_IMAGE]},
 } as Metadata;
}
