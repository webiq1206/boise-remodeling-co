import {SCOPE_FIELDS} from './scope.ts';
import {suggestedTrade} from './trades.ts';
/**
 * What a section means to the reader. Every consumer (estimator, email, PDF,
 * admin preview) labels sections by kind so excluded work is never shown as
 * included work, and assumptions are never shown as confirmed scope.
 */
export type SectionKind='glance'|'brief'|'included'|'category'|'excluded'|'allowance'|'assumption'|'info';
export type EstimateSection={title:string;kind?:SectionKind;text?:string;bullets?:string[];rows?:[string,string][]};
export const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export const readable=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
// Preserve original wording, numbers and exclusions. Never split decimal values or URLs.
export const scopeBullets=(s:string)=>s.split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map(x=>x.trim().replace(/^[•*]\s*/, '')).filter(Boolean);
const overview=new Set(['service','location','address','sqft','garageSqft','coveredOutdoorSqft','rooms','bathrooms','stories','schedule','urgency','complexity','finish']);
export const FIELD_CATEGORY_TITLES:Record<string,string>={site:'Site & utilities',utilities:'Site & utilities',access:'Site & utilities',demolition:'Demolition',structural:'Structure',mechanical:'Heating & Cooling',plumbing:'Plumbing',electrical:'Electrical',appliances:'Appliances',permits:'Permits & design',engineering:'Permits & design',materials:'Materials & finishes',fixtures:'Fixtures & finishes',allowances:'Allowances & selections',exclusions:'Excluded work',ownerSupplied:'Owner responsibilities',alternates:'Alternates'};
const FIELD_SECTION_KIND:Record<string,SectionKind>={'Excluded work':'excluded','Allowances & selections':'allowance','Owner responsibilities':'info','Alternates':'info'};
/** Section titles used by consumers that group by kind; kept in one place. */
export const SECTION_TITLES={included:'Included work',excluded:'Excluded work',responsibilities:'Responsibilities',buildings:'Buildings and floors',questions:'Scope questions requiring clarification',coverage:'Document review coverage',buildingPrices:'Separate building prices',pricingBasis:'Pricing basis',allowances:'Included preliminary allowances',verify:'Items to verify before a firm proposal',categoriesIntro:'Included scope by category',requestedIntro:'Requested scope by category'} as const;
const PRIVATE_PRICING_TEXT=/\b(?:direct (?:project |labor |material )?(?:unit[- ]?)?(?:rate|cost|price)|catalog(?:ued)? (?:unit[- ]?)?(?:rate|cost|price)|(?:actual|net|loaded|landed) (?:unit[- ]?)?cost|unit[- ]cost|owner[- ]average cost|owner[- ]approved estimating schedule|cost[- ]book|risk[- ]adjusted (?:direct )?cost|overhead (?:allocation|recovery|cost|expense|burden|rate|charge|percentage|factor)|profit|divisor|reconciliation|pricing formula|calculation trace|cost ceiling|salary|payroll burden)\b|\b(?:overhead|margin|allocations?|markup)\b\s*(?::|=|\bis\b|\bof\b)?\s*(?:\$[\d,.]+|\d+(?:\.\d+)?\s*%)|(?:\$[\d,.]+|\d+(?:\.\d+)?\s*%)\s*(?:(?:for|in|as)\s+)?\b(?:overhead|margin|allocations?|markup)\b|(?:\+|÷|\/)\s*(?:overhead|profit|margin|contingency)|\bdivid(?:e|ed|ing)\s+by\b|\bpercent(?:age)?\s+of\s+(?:cost|revenue)\b/i;
/**
 * Repair prose produced by older pricing runs before it reaches any customer
 * presenter. Generated verification notes sometimes combine useful scope with
 * a private cost clause, so remove the clause rather than discarding the whole
 * sentence.
 */
export function publicPricingText(value:unknown):string{
 const text=typeof value==='string'?value.trim():'';
 if(!text)return '';
 const repairSentence=(sentence:string):string[]=>{
   let safe=sentence
    .replace(/\s*\(([^)]*)\)/g,(whole,body)=>PRIVATE_PRICING_TEXT.test(body)?'':whole)
   .replace(/:\s*(?:mapped to|catalog(?:ued)? as)\s+[^.]+/gi,'');
  if(!PRIVATE_PRICING_TEXT.test(safe)){
   safe=safe.replace(/\s+/g,' ').replace(/\s+([,.;:])/g,'$1').trim();
   return safe?[safe]:[];
  }
  const clauses=safe.split(/(?<=[,;])\s+|\s+(?=(?:and|but)\s+)/i).flatMap(clause=>{
   let part=clause.trim().replace(/[,;]\s*$/,'');
   if(!PRIVATE_PRICING_TEXT.test(part))return part?[part]:[];
   // Retain the useful scope before a private basis/rate appended to it.
   const introduced=part.match(/^(.+?)\s+(?:at|using|from|based on|with)\s+.+$/i);
   if(introduced&&!PRIVATE_PRICING_TEXT.test(introduced[1])&&!/^(?:the )?(?:rate|cost|price|pricing|formula|calculation)\b/i.test(introduced[1].trim()))return [introduced[1].trim()];
   // A private evidence sentence may also state a useful limitation. Keep that
   // limitation rather than treating the whole sentence as disposable.
   const limitation=part.match(/\b((?:(?:the )?(?:source|evidence|rate) date|effective date)[^.;]*(?:not stated|not supplied|unknown|unavailable|expired|out of date)[^.;]*)/i);
   return limitation?[limitation[1].trim()]:[];
  });
  safe=clauses.join(', ').replace(/\s+/g,' ').replace(/\s+([,.;:])/g,'$1').replace(/[,;:]\s*$/,'').trim();
  if(!safe)return [];
  if(/[.!?]$/.test(sentence)&&!/[.!?]$/.test(safe))safe+='.';
  return [safe];
 };
 return text.split('\n').map(line=>scopeBullets(line).flatMap(repairSentence).filter(Boolean).join(' ')).filter(Boolean).join('\n');
}
const publicTextList=(value:unknown):string[]=>Array.isArray(value)?value.map(publicPricingText).filter(Boolean):[];
/**
 * Allowlisted customer projection used for current and previously persisted
 * results. Unknown/private fields never cross this presentation boundary.
 */
export function customerPresentation(result:any):any{
 const source=result&&typeof result==='object'?result:{};
 const range=source.range&&Number.isFinite(source.range.low)&&Number.isFinite(source.range.high)?{low:Number(source.range.low),high:Number(source.range.high)}:null;
 const categoryRanges=Array.isArray(source.categoryRanges)?source.categoryRanges.filter((x:any)=>x&&typeof x.category==='string'&&Number.isFinite(x.low)&&Number.isFinite(x.high)).map((x:any)=>({category:publicPricingText(x.category),low:Number(x.low),high:Number(x.high)})).filter((x:any)=>x.category):[];
  const lineItems=Array.isArray(source.lineItems)?source.lineItems.map((x:any,index:number)=>{
   const category=publicPricingText(x?.category)||'Other scope';
   const description=publicPricingText(x?.description)||`Priced scope item${category==='Other scope'?'':` - ${category}`}`;
   return {
   id:String(x?.id||`priced-line-${index+1}`),category,description,
  quantity:Number(x?.quantity),unit:String(x?.unit||''),low:Number(x?.low),high:Number(x?.high),unitLow:Number(x?.unitLow),unitHigh:Number(x?.unitHigh),
  ...(x?.building?{building:publicPricingText(x.building)}:{}),...(x?.floor?{floor:publicPricingText(x.floor)}:{}),
  ...(x?.quantityRange&&Number.isFinite(x.quantityRange.low)&&Number.isFinite(x.quantityRange.high)?{quantityRange:{low:Number(x.quantityRange.low),high:Number(x.quantityRange.high)}}:{}),
  ...(x?.pricingStatus?{pricingStatus:String(x.pricingStatus)}:{}),...(publicPricingText(x?.verification)?{verification:publicPricingText(x.verification)}:{}),
  ...(publicPricingText(x?.rateLocation)?{rateLocation:publicPricingText(x.rateLocation)}:{}),...(x?.rateDate?{rateDate:String(x.rateDate).slice(0,10)}:{})
   };
  }).filter((x:any)=>Number.isFinite(x.quantity)&&Number.isFinite(x.low)&&Number.isFinite(x.high)):[];
 const allowances=Array.isArray(source.allowances)?source.allowances.map((x:any)=>typeof x==='string'?publicPricingText(x):{
  description:publicPricingText(x?.description),...(x?.amount!=null&&Number.isFinite(Number(x.amount))?{amount:Number(x.amount)}:{}),includes:publicTextList(x?.includes),
  taxIncluded:Boolean(x?.taxIncluded),freightIncluded:Boolean(x?.freightIncluded),deliveryIncluded:Boolean(x?.deliveryIncluded),installationIncluded:Boolean(x?.installationIncluded),wasteIncluded:Boolean(x?.wasteIncluded),
  selectionDeadline:String(x?.selectionDeadline||''),adjustment:publicPricingText(x?.adjustment)
 }).filter((x:any)=>typeof x==='string'?Boolean(x):Boolean(x.description)):[];
 const instructions=source.instructions&&typeof source.instructions==='object'?{
  inclusions:publicTextList(source.instructions.inclusions),exclusions:publicTextList(source.instructions.exclusions),responsibilities:publicTextList(source.instructions.responsibilities),
  floors:publicTextList(source.instructions.floors),buildings:publicTextList(source.instructions.buildings),questions:publicTextList(source.instructions.questions),
  laborOnly:Boolean(source.instructions.laborOnly),materialsOnly:Boolean(source.instructions.materialsOnly)
 }:undefined;
 const documentCoverage=source.documentCoverage&&typeof source.documentCoverage==='object'?{
  expectedPages:Number(source.documentCoverage.expectedPages)||0,complete:Boolean(source.documentCoverage.complete),
  pages:Array.isArray(source.documentCoverage.pages)?source.documentCoverage.pages.map((p:any)=>({source:publicPricingText(p?.source),page:Number(p?.page)||0,...(p?.sheet?{sheet:publicPricingText(p.sheet)}:{}),status:String(p?.status||''),notes:publicTextList(p?.notes)})):[]
 }:undefined;
 return {
  status:String(source.status||''),range,summary:publicPricingText(source.summary),includedCategories:publicTextList(source.includedCategories),categoryRanges,lineItems,allowances,
  assumptions:publicTextList(source.assumptions),exclusions:publicTextList(source.exclusions),factors:publicTextList(source.factors),
  nextStep:publicPricingText(source.nextStep),message:publicPricingText(source.message),disclaimer:publicPricingText(source.disclaimer),
  verificationItems:publicTextList(source.verificationItems),
  scopeTasks:Array.isArray(source.scopeTasks)?source.scopeTasks.map((x:any)=>({description:publicPricingText(x?.description),category:publicPricingText(x?.category)})).filter((x:any)=>x.description):[],
  ...(instructions?{instructions}:{}),...(documentCoverage?{documentCoverage}:{})
 };
}
function itemPriceText(item:any){
 const quantity=`${Number(item.quantity).toLocaleString('en-US')} ${item.unit}${item.quantityRange?` modeled allowance (${item.quantityRange.low.toLocaleString('en-US')} to ${item.quantityRange.high.toLocaleString('en-US')} ${item.unit} to verify)`:''}`;
 const total=`${money(item.low)} to ${money(item.high)} total`;
 // A one-package price is already its unit price. Avoid repeating it.
 if(item.quantity===1&&!item.quantityRange)return `${quantity} • ${total}`;
 const unit=`${Number(item.unitLow).toLocaleString('en-US',{style:'currency',currency:'USD'})} to ${Number(item.unitHigh).toLocaleString('en-US',{style:'currency',currency:'USD'})} / ${item.unit}${item.quantityRange?' at the modeled quantity':''}`;
 return `${quantity}\n${total}\n${unit}`;
}
export function summarySections(summary:string):EstimateSection[]{
 const groups=new Map<string,[string,string][]>(); const original:string[]=[];
 let active:[string,string]|undefined;
 for(const line of summary.split('\n')){
  const entry=Object.entries(SCOPE_FIELDS).find(([,v])=>line.startsWith(v.label+': '));
  if(!entry){if(active)active[1]+='\n'+line;else original.push(line);continue;}
  const [key,definition]=entry;let value=line.slice(definition.label.length+2);
  if(definition.kind==='number'&&/^\d[\d,.]*$/.test(value))value=Number(value.replaceAll(',','')).toLocaleString('en-US');
  if(definition.kind==='choice')value=readable(value);
  const title=overview.has(key)?'Project at a glance':FIELD_CATEGORY_TITLES[key]||'Additional scope details';
  const rows=groups.get(title)||[];active=[definition.label,value];rows.push(active);groups.set(title,rows);
 }
 const sections:EstimateSection[]=[];
 if(groups.has('Project at a glance')){sections.push({title:'Project at a glance',kind:'glance',rows:groups.get('Project at a glance')});groups.delete('Project at a glance');}
 if(original.join('\n').trim())sections.push({title:'Project brief',kind:'brief',bullets:scopeBullets(original.join('\n'))});
 for(const [title,rows]of groups)sections.push({title,kind:FIELD_SECTION_KIND[title]||'info',rows});return sections;
}
/** Merge sections that share a title so one heading never appears twice. */
function mergeByTitle(sections:EstimateSection[]):EstimateSection[]{
 const merged:EstimateSection[]=[];
 for(const section of sections){
  const existing=merged.find(s=>s.title===section.title);
  if(!existing){merged.push({...section});continue;}
  existing.kind=existing.kind||section.kind;
  existing.text=[existing.text,section.text].filter(Boolean).join('\n')||undefined;
  if(section.bullets?.length)existing.bullets=[...new Set([...(existing.bullets||[]),...section.bullets])];
  if(section.rows?.length)existing.rows=[...(existing.rows||[]),...section.rows];
 }
 return merged;
}
/** Remove repeated presentation text without merging distinct scope or prices. */
function uniqueCustomerSections(sections:EstimateSection[]):EstimateSection[]{
 const key=(s:string)=>s.normalize('NFKC').replace(/\s+/g,' ').trim().replace(/[.!;]+$/,'').toLowerCase();
 const seen=new Map<string,Set<string>>();
 const normalized=sections.map(s=>s.kind==='excluded'?{...s,title:SECTION_TITLES.excluded,bullets:[...(s.bullets||[]),...(s.rows||[]).flatMap(([name,value])=>name==='Excluded work'?scopeBullets(value):[`${name}: ${value}`])],rows:undefined}:s);
 return mergeByTitle(normalized).map(section=>{
  const bucket=section.kind==='assumption'?'assumption':section.title;
  const used=seen.get(bucket)||new Set<string>();seen.set(bucket,used);
  const bullets=(section.bullets||[]).filter(b=>{const k=key(b);if(used.has(k))return false;used.add(k);return true;});
  const rows=(section.rows||[]).filter(([a,b])=>{const k=key(a)+'\n'+key(b);if(used.has(k))return false;used.add(k);return true;});
  return {...section,bullets,rows};
 }).filter(s=>s.text||s.bullets?.length||s.rows?.length);
}
export function estimateSections(result:any):EstimateSection[]{
 result=customerPresentation(result);
 const sections=summarySections(result.summary||'');
 const lines:any[]=result.lineItems||[], tasks:any[]=result.scopeTasks||[];
 const suppliedInstructions=result.instructions;
 const list=(value:unknown):string[]=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&item.trim().length>0):[];
 const instructions=suppliedInstructions?{...suppliedInstructions,...Object.fromEntries(['inclusions','exclusions','responsibilities','floors','buildings','questions'].map(key=>[key,list(suppliedInstructions[key])]))}:null;
 if(instructions){
  // Inclusions and exclusions are separate sections. Excluded work must never
  // sit inside a list labeled as included work.
  const included=[...instructions.inclusions,...(instructions.laborOnly?['Labor only; materials are not charged.']:[]),...(instructions.materialsOnly?['Materials only; labor is not charged.']:[])];
  const leading:EstimateSection[]=[];
  if(included.length)leading.push({title:SECTION_TITLES.included,kind:'included',bullets:included});
  if(instructions.exclusions.length)leading.push({title:SECTION_TITLES.excluded,kind:'excluded',bullets:instructions.exclusions});
  if(instructions.responsibilities.length)leading.push({title:SECTION_TITLES.responsibilities,kind:'info',bullets:instructions.responsibilities});
  if(instructions.buildings.length||instructions.floors.length)leading.push({title:SECTION_TITLES.buildings,kind:'info',bullets:[...instructions.buildings.map((x:string)=>`Building: ${x}`),...instructions.floors.map((x:string)=>`Floor: ${x}`)]});
  sections.unshift(...leading);
  if(instructions.questions.length)sections.push({title:SECTION_TITLES.questions,kind:'assumption',bullets:instructions.questions});
 }
 if(result.documentCoverage){const c=result.documentCoverage;const expected=Number(c.expectedPages)||0;const pages:any[]=Array.isArray(c.pages)?c.pages:[];
  // A typed scope has no pages; a coverage line for it only confuses the reader.
  if(expected>0||pages.length>0)sections.push({title:SECTION_TITLES.coverage,kind:'info',text:`${pages.filter((p:any)=>p.status==='read').length} of ${expected||pages.length} pages fully read. ${c.complete?'Every page has a completed review record.':'Analysis is incomplete; review the exceptions below.'}`,bullets:pages.filter((p:any)=>p.status!=='read').map((p:any)=>`${p.source}, page ${p.page}${p.sheet?` (${p.sheet})`:''}: ${p.status}. ${(p.notes||[]).join(' ')}`)});}
 // A placeholder label ("unspecified building") is no building at all and never counts; a default one ("main") counts toward
 // building totals when another named building exists but is not repeated on every row.
 const placeholderBuilding=(b?:string)=>!b||/^(unspecified(?: building)?|unknown|not specified|n\/a|none|same|whole project)$/i.test(b.trim());
 const realBuilding=(b?:string)=>placeholderBuilding(b)?'':b!;
 const namedBuilding=(b?:string)=>placeholderBuilding(b)||/^(main(?: residence| house| building| home)?|default)$/i.test(b!.trim())?'':b!;
 const namedFloor=(f?:string)=>f&&!/^(unspecified(?: floor)?|unknown|not specified|n\/a|none|floor not specified)$/i.test(f.trim())?f:'';
 const buildings=[...new Set<string>(lines.map(l=>realBuilding(l.building)).filter(Boolean))];
 // One unnamed or default building is the whole project; a per-building table repeats the total.
 if(buildings.length>1)sections.push({title:SECTION_TITLES.buildingPrices,kind:'included',rows:buildings.map(b=>[b,`${money(lines.filter(l=>l.building===b).reduce((n,l)=>n+l.low,0))} to ${money(lines.filter(l=>l.building===b).reduce((n,l)=>n+l.high,0))}`]),text:'Building totals are included in, not added to, the overall estimate.'});
 const estimated=lines.filter(l=>l.pricingStatus==='estimated-allowance');
 if(lines.some(l=>l.pricingStatus==='owner-planning-rate'))sections.push({title:SECTION_TITLES.pricingBasis,kind:'assumption',text:'Owner planning rates provide the foundation for this preliminary range. They are not current supplier quotes; verify local availability, selections and trade pricing before a firm proposal.'});
 if(estimated.length){
  const notes=[...new Set<string>(estimated.map(l=>l.verification).filter(Boolean))];
  sections.push({title:SECTION_TITLES.allowances,kind:'allowance',text:`These amounts are included in the range as preliminary allowances. ${notes.length===1?notes[0]:'Confirm quantities, selections and current supplier and trade pricing before a firm proposal.'}`,rows:estimated.map(l=>[[namedBuilding(l.building),namedFloor(l.floor)?`Floor ${namedFloor(l.floor)}`:'',l.description].filter(Boolean).join(' / '),`${money(l.low)} to ${money(l.high)}${l.rateLocation?` · cost location: ${l.rateLocation}`:''}${l.rateDate?` · researched ${String(l.rateDate).slice(0,10)}`:''}`])});
 }
 if(result.verificationItems?.length)sections.push({title:SECTION_TITLES.verify,kind:'assumption',bullets:[...new Set<string>(result.verificationItems)]});
 const categories=[...new Set<string>([...(result.includedCategories||[]),...lines.map(x=>x.category),...tasks.map(x=>x.category||suggestedTrade(x.description))])];
 const breakdown:EstimateSection[]=categories.map(category=>{
  const range=result.categoryRanges?.find((x:any)=>x.category===category);
  return {title:category,kind:'category',text:range?`${money(range.low)} to ${money(range.high)}`:undefined,
   bullets:[...new Set<string>(tasks.filter(x=>(x.category||suggestedTrade(x.description))===category).map(x=>x.description))],
   rows:lines.filter(x=>x.category===category).map(x=>[[namedBuilding(x.building),namedFloor(x.floor)?`Floor ${namedFloor(x.floor)}`:'',x.description].filter(Boolean).join(' / '),itemPriceText(x)])};
 });
 if(breakdown.length){
  const at=sections.findIndex(s=>s.kind==='glance');
  sections.splice(at>=0?at+1:0,0,{title:result.range?SECTION_TITLES.categoriesIntro:SECTION_TITLES.requestedIntro,kind:'info',text:result.range?'Category and item ranges are parts of the overall range, not additional charges. Where several tasks share an assembly, its price is shown once.':'Scope details are organized below. Pricing coverage still requires review.'});
  for(const category of breakdown){const existing=sections.find(s=>s.title===category.title);if(existing){existing.kind='category';existing.text=category.text;existing.rows=[...(existing.rows||[]),...(category.rows||[])];existing.bullets=category.bullets;}else sections.push(category);}
 }
 for(const [title,key,kind] of [['Allowances','allowances','allowance'],['Planning assumptions','assumptions','assumption'],['Exclusions','exclusions','excluded'],['Factors that may change the range','factors','assumption']] as [string,string,SectionKind][]){
  const values=result[key]||[];if(!values.length)continue;
  sections.push({title,kind,bullets:values.map((x:any)=>typeof x==='string'?x:`${x.description}${x.amount!=null?`: ${money(x.amount)} included`:': selection to confirm'}. Includes ${(x.includes||[]).join(', ')}. ${['tax','freight','delivery','installation','waste'].map(k=>`${k}: ${x[k+'Included']?'included':'excluded'}`).join('; ')}. Selection deadline: ${x.selectionDeadline}. ${x.adjustment}`)});
 }
 return uniqueCustomerSections(sections);
}
export interface GroupedSections{glance?:EstimateSection;brief?:EstimateSection;categoriesIntro?:EstimateSection;included:EstimateSection[];categories:EstimateSection[];excluded:EstimateSection[];allowances:EstimateSection[];assumptions:EstimateSection[];info:EstimateSection[]}
/**
 * Reading order for every customer-facing output: what the project is, what
 * is included, what it costs by category, what is excluded, what is carried
 * as an allowance, what still needs confirming, then supporting notes.
 */
export function groupSections(sections:EstimateSection[]):GroupedSections{
 const grouped:GroupedSections={included:[],categories:[],excluded:[],allowances:[],assumptions:[],info:[]};
 for(const section of sections){
  const kind=section.kind||'info';
  if(kind==='glance'&&!grouped.glance)grouped.glance=section;
  else if(kind==='brief'&&!grouped.brief)grouped.brief=section;
  else if(section.title===SECTION_TITLES.categoriesIntro||section.title===SECTION_TITLES.requestedIntro)grouped.categoriesIntro=section;
  else if(kind==='included')grouped.included.push(section);
  else if(kind==='category')grouped.categories.push(section);
  else if(kind==='excluded')grouped.excluded.push(section);
  else if(kind==='allowance')grouped.allowances.push(section);
  else if(kind==='assumption')grouped.assumptions.push(section);
  else grouped.info.push(section);
 }
 return grouped;
}
/** Flat, ordered list for linear outputs such as the PDF and plain-text email. */
export function orderedSections(sections:EstimateSection[]):EstimateSection[]{
 const g=groupSections(sections);
 return [g.glance,g.brief,...g.included,g.categoriesIntro,...g.categories,...g.excluded,...g.allowances,...g.assumptions,...g.info].filter((s):s is EstimateSection=>Boolean(s));
}
export const KIND_LABEL:Record<SectionKind,string>={glance:'',brief:'',included:'Included',category:'Included',excluded:'Excluded',allowance:'Allowance',assumption:'To confirm',info:''};

/** Review-screen grouping for a scope field. */
export function fieldCategory(field:string):string{
 return overview.has(field)?"Project at a glance":FIELD_CATEGORY_TITLES[field]||"Additional scope details";
}
export interface CategoryLine {id:string;label:string;quantity:number;unit:string;quantityRange?:{low:number;high:number};low:number;high:number;unitLow:number;unitHigh:number;status:string;verification?:string;rateLocation?:string;rateDate?:string}
export interface CategoryBreakdown {category:string;low?:number;high?:number;tasks:string[];items:CategoryLine[]}
/** Structured category accordions for the customer result. Same data as estimateSections, without prose. */
export function categoryBreakdown(result:any):CategoryBreakdown[]{
  result=customerPresentation(result);
 const lines:any[]=result?.lineItems||[],tasks:any[]=result?.scopeTasks||[];
 const categories=[...new Set<string>([...(result?.includedCategories||[]),...lines.map(x=>x.category),...tasks.map(x=>x.category||suggestedTrade(x.description))])];
 return categories.map(category=>{
  const range=result?.categoryRanges?.find((x:any)=>x.category===category);
  const items:CategoryLine[]=lines.filter(x=>x.category===category).map(x=>({id:String(x.id),label:[x.building&&!/^(main|default)$/i.test(x.building)?x.building:"",x.floor?`Floor ${x.floor}`:"",x.description].filter(Boolean).join(" / "),quantity:Number(x.quantity),unit:String(x.unit),...(x.quantityRange?{quantityRange:x.quantityRange}:{}),low:Number(x.low),high:Number(x.high),unitLow:Number(x.unitLow),unitHigh:Number(x.unitHigh),status:String(x.pricingStatus||"verified-cost"),...(x.verification?{verification:x.verification}:{}),...(x.rateLocation?{rateLocation:x.rateLocation}:{}),...(x.rateDate?{rateDate:String(x.rateDate).slice(0,10)}:{})}));
  return {category,...(range?{low:range.low,high:range.high}:{}),tasks:[...new Set<string>(tasks.filter(x=>(x.category||suggestedTrade(x.description))===category).map(x=>x.description))],items};
 });
}
