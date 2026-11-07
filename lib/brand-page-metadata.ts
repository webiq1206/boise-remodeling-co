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
type Copy={title:string;description:string;absolute?:boolean};
const COPY:Record<string,Record<string,Copy>>={
 construction:{
  '/':{title:'Custom Home Builder in Boise, ID',description:'Build a custom or semi-custom home in Boise and the Treasure Valley. Explore design-build services, build-on-your-lot options and clear project budgets.'},
  '/services':{title:'Home Building & Design-Build Services',description:'Explore custom homes, semi-custom homes, additions and build-on-your-lot services across Boise and the Treasure Valley. Plan your project with our team.'},
  '/about':{title:'About Our Boise Home Building Team',description:'Learn how Boise Construction Co plans and manages Treasure Valley home builds, from lot evaluation and design through permits, construction and handover.'},
  '/contact':{title:'Contact a Boise Home Builder',description:'Discuss your new home, building lot or addition with Boise Construction Co. Call our team or request project guidance for Boise and the Treasure Valley.'},
  '/resources':{title:'Home Building Worksheets & Guides',description:'Download home-building budget worksheets and lot evaluation checklists. Compare Ada and Canyon County permit steps before planning your Idaho build.'},
  '/blog':{title:'Idaho Home Building Advice & Guides',description:'Read practical Idaho home-building guides on budgets, land, permits, design choices and construction timelines from the Boise Construction Co team.'}},
 remodeling:{
  "/guides/boise-remodeling-cost-guide":{title:"Boise Remodeling Costs: Kitchens, Baths, Additions",description:"Plan your Boise remodel budget with confidence: what drives kitchen, bath, whole-home and addition costs, and how to set scope, allowances and contingency.",absolute:true},
  "/blog/kitchen-remodel-cost-boise":{title:"Boise Kitchen Remodel Costs (2026)",description:"Compare Boise kitchen remodel costs by scope and finish level. Review cabinet, countertop and labor budgets, project timelines and ways to manage costs."},
  "/blog/bathroom-remodel-cost-boise":{title:"Boise Bathroom Remodel Costs (2026)",description:"Compare Boise bathroom remodel costs for showers, tile, vanities and layout changes. Review planning ranges, cost drivers and questions to ask before starting."},
  "/blog/home-addition-cost-boise":{title:"Boise Home Addition Costs (2026)",description:"Plan a Boise home addition with cost ranges for bedrooms, suites and second stories. Review structural work, permits, site conditions and budget allowances."},
  "/blog/adu-cost-boise":{title:"Boise ADU Costs (2026)",description:"Compare Boise ADU costs for detached units, garage conversions and interior suites. Review utilities, site work, finish levels and permit considerations."},
  '/':{title:'Boise Home Remodeling Contractors',description:'Remodel your kitchen, bath or whole home with one design-build team in Boise. Free in-home visit, a written scope before any price, and a written warranty.'},
  '/services':{title:'Kitchen, Bath and Home Remodeling',description:'Kitchens, bathrooms, whole homes and bump-outs, each planned in writing and built by one design-build team. Start with a free in-home visit and scope.'},
  '/about':{title:'About Boise Remodeling Co: Design-Build Remodelers in Boise',description:'Meet the design-build team behind your remodel: a written scope before work, dust and floor protection, Ada and Canyon permits, and a written warranty.',absolute:true},
  '/contact':{title:'Contact Boise Remodeling Co: Free In-Home Visit',description:'Tell us about your kitchen, bath or whole-home remodel. Call or text us about your project to book a free in-home visit and a written scope before price.',absolute:true},
  '/areas':{title:'Remodeling Contractors Near You in the Treasure Valley',description:'Find your city and get kitchen, bath and whole-home remodeling from one local design-build team. Free in-home visit and a written scope before any price.',absolute:true},
  '/areas/eagle':{title:'Eagle, ID Kitchen and Bath Remodeling',description:'Kitchen, bath and whole-home remodeling in Eagle, Idaho from one design-build team. Free in-home visit, written scope and a written workmanship guarantee.'},
  '/areas/kuna':{title:'Kuna, ID Kitchen and Bath Remodeling',description:'Kitchen, bath and whole-home remodeling in Kuna, Idaho with one design-build team. Free in-home visit, a written scope and budget ranges before you commit.'},
  '/areas/nampa':{title:'Nampa, ID Remodeling Contractors',description:'Kitchen, bath and whole-home remodeling in Nampa with one design-build team. Free in-home visit, written scope, Canyon County permits handled for you.'},
  '/areas/meridian':{title:'Meridian, ID Remodeling Contractors',description:'Kitchen, bath and whole-home remodeling in Meridian, Idaho from one design-build team. Free in-home visit, a written scope and a workmanship guarantee.'},
  '/areas/caldwell':{title:'Caldwell, ID Remodeling Contractors',description:'Kitchen, bath and whole-home remodeling in Caldwell, Idaho from one design-build team. Free in-home visit, a written scope and a workmanship guarantee.'},
  '/areas/middleton':{title:'Middleton, ID Remodeling Contractors',description:'Kitchen, bath and whole-home remodeling in Middleton, Idaho from one design-build team. Free in-home visit, a written scope and a workmanship guarantee.'},
  '/areas/boise':{title:'Boise, ID Remodeling Contractors',description:'Kitchen, bath and whole-home remodeling in Boise, Idaho from one design-build team. Free in-home visit, a written scope and a written workmanship warranty.'},
  '/services/bathroom-remodel':{title:'Bathroom Remodeling in Boise, ID',description:'A bathroom that works for your mornings, planned in writing before demo. Design-build bath remodels in Boise with permits handled and one project manager.'},
  '/services/kitchen-remodel':{title:'Kitchen Remodeling in Boise, ID',description:'A kitchen that fits how you cook and gather, planned in writing and built by one design-build team. Free in-home visit and a written scope before price.'},
  '/services/adu':{title:'ADUs in Boise: Start With Boise ADU Co',description:'Start your Boise ADU request with the right P5 team. Our sister company Boise ADU Co plans and builds ADUs. Begin at p5homeco.com/quote/adu with your project.'},
  '/services/room-addition':{title:'Room Additions and Bump-Outs in Boise',description:'Gain space without moving: bump-outs and in-footprint additions planned in a written scope and built by one design-build team. Start with a free visit.'},
  '/services/room-addition/kuna':{title:'Room Additions in Kuna, ID',description:'More room in your Kuna home without moving: bump-outs and in-footprint additions, design-build, with a written scope and a free in-home visit to start.'},
  '/design-ideas':{title:'Remodeling Ideas for Boise Homes',description:'See kitchen, bath and whole-home ideas for Treasure Valley homes, then turn the ones you love into a written scope with a free in-home visit from our team.'},
  '/blog':{title:'Boise Remodeling Advice: Budgets, Permits, Timelines',description:'Plan your remodel with honest advice on budgets, timelines and permits for Treasure Valley homes, plus design-build planning tips for every stage of it.',absolute:true},
  '/guides':{title:'Boise Remodeling Guides: Costs, Kitchens, Baths',description:'Plan with confidence using Treasure Valley guides to remodeling costs, kitchens, baths, additions and choosing a contractor, written for Boise homeowners.',absolute:true},
  '/guides/boise-bathroom-remodeling-guide':{title:'Boise Bathroom Remodel Guide: Costs, Showers, Permits',description:'Plan a Boise bathroom remodel you will love: shower and layout choices, aging-in-place ideas, permits and the cost factors for Treasure Valley homes today.',absolute:true},
  '/guides/boise-kitchen-remodeling-guide':{title:'Boise Kitchen Remodel Guide: Layouts, Costs, Timeline',description:'Plan a kitchen that fits how you cook and gather: layouts, cabinets, timelines, ROI and design-build planning, written for Treasure Valley homeowners.',absolute:true},
  '/blog/category/remodeling-costs':{title:'Boise Remodeling Cost Articles',description:'Budget your remodel with articles on planning ranges, cost drivers and contingency, for homeowners planning a remodel in Boise and the Treasure Valley.'},
  '/blog/energy-efficiency-roi':{title:'Energy Upgrades for Boise Homes',description:'Compare insulation, windows, HVAC and air sealing upgrades for Boise homes, with what each one involves and the questions to ask before you plan the work.'},
  '/blog/adu-guide-boise':{title:'Boise ADU Guide: Rules, Sizes, Costs and Permits',description:'Plan a Boise ADU with answers on zoning, size limits, permits and attached vs detached vs garage conversion. Start your request at p5homeco.com/quote/adu.',absolute:true},
  '/guides/boise-adu-guide':{title:'Boise ADU Guide: Rules, Sizes, Costs and Permits',description:'Plan a Boise ADU with answers on zoning, size limits, permits and attached vs detached vs garage conversion. Start your request at p5homeco.com/quote/adu.',absolute:true}},
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
 const stem=override?publishFoundingCopy(override.title):'';
 const title=override?(override.absolute?stem:`${stem} | ${brand.name}`):original.includes(brand.name)?original:`${original} | ${brand.name}`;
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
