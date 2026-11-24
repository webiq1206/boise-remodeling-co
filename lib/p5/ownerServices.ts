/** Owner-authorized client rates. Never apply tier, remodel, risk or margin multipliers. */
export const OWNER_SERVICE_RATE = 120;
export const OWNER_SERVICE_BOOK_COST = 120 / 1.6176;
export const OWNER_SERVICES = [
  {code:'01-31-03',label:'Project management',qboServiceId:'48',minimum:.25,share:.50},
  {code:'01-31-04',label:'Project administration',qboServiceId:'49',minimum:.125,share:.20},
  {code:'01-31-05',label:'Project accounting',qboServiceId:'47',minimum:.125,share:.10},
] as const;
export type OwnerServiceCode = typeof OWNER_SERVICES[number]['code'];
export interface OwnerServiceSchedule {
  version: 'owner-services-v1'|'owner-services-v2';
  baselineOutsideCost?:number;
  /** Explicit internal override, in dollars; otherwise credit overlapping book labor
   * up to the salary-containing overhead actually recovered. Never credit profit. */
  salaryOverheadCredit?:number;
  milestones: {name:string; outsideCost?:number; hours:Record<OwnerServiceCode,number>}[];
  reason:string;
}
export interface ScopeWork {id?:string;code?:string;description:string;quantity:number;unit?:string;uom?:string;unitCost?:number;cost?:number;category?:string;evidence?:{reference:string};landed?:{tax:number};supervisionTreatment?:'outside-distinct'|'owner-overlap'}
export function isOwnerOrOverlappingService(line:ScopeWork):boolean {
  const code=`${line.id||''} ${line.code||''} ${line.evidence?.reference||''}`;
  if(/01-31-0[345]\b/.test(code))return true;
  if(line.supervisionTreatment==='outside-distinct')return false;
  return line.supervisionTreatment==='owner-overlap'||/(?:01-31-0[12]|L-03-00)\b/.test(code)
    || /^(?:project[- ]management(?: and supervision)?|project administration|project accounting|project supervision(?: \/ superintendent)?|superintendent(?:, hourly)?)$/i.test(line.description.trim());
}
/** P5 authorized estimating assumption, outside dollars only. Project minimums are
 * applied once before milestone distribution. Internal overrides are snapshots. */
export function defaultOwnerServiceSchedule(work:ScopeWork[],service:string,options:{
  preOwnerDirectCost?:number; milestones?:{name:string;outsideCost?:number}[];override?:OwnerServiceSchedule;
}={}):OwnerServiceSchedule {
  if(options.override){ownerServiceTotals(options.override);return options.override;}
  const scoped=work.filter(line=>!isOwnerOrOverlappingService(line)&&
    !/^(?:owner-production|overhead|profit|tax|taxes)$/.test(line.category||'')&&
    !/^(?:sales tax|taxes|overhead|profit)(?:$|\s)/i.test(line.description));
  const hasDetail=scoped.length>0&&scoped.every(line=>Number.isFinite(line.cost)||Number.isFinite(line.unitCost));
  const base=hasDetail?scoped.reduce((sum,line)=>sum+Math.max(0,(line.cost??line.quantity*(line.unitCost||0))-line.quantity*(line.landed?.tax||0)),0):options.preOwnerDirectCost;
  if(base===undefined||!Number.isFinite(base)||base<0)throw new Error('Owner services need outside direct costs or a pre-owner direct-cost estimate.');
  const milestones=options.milestones?.length?options.milestones:[{name:'Project delivery'}];
  const weighted=milestones.every(m=>Number.isFinite(m.outsideCost)&&m.outsideCost!>=0);
  const weightSum=weighted?milestones.reduce((sum,m)=>sum+m.outsideCost!,0):0;
  return {version:'owner-services-v2',baselineOutsideCost:base,
    reason:`${service}: editable P5 assumption; outside direct cost $${base.toFixed(2)}; 0.50/0.20/0.10 hours per $1,000, project-level minimums only.`,
    milestones:milestones.map(m=>({...m,hours:Object.fromEntries(OWNER_SERVICES.map(s=>[
      s.code,Math.max(s.minimum,base/1000*s.share)*(weightSum?m.outsideCost!/weightSum:1/milestones.length),
    ])) as Record<OwnerServiceCode,number>}))};
}
export function ownerServiceTotals(schedule:OwnerServiceSchedule) {
  if(!['owner-services-v1','owner-services-v2'].includes(schedule.version)||!schedule.reason?.trim()||!Array.isArray(schedule.milestones)||!schedule.milestones.length)
    throw new Error('Owner service schedule needs milestones and an internal reason.');
  const names=new Set<string>();
  for(const milestone of schedule.milestones) {
    if(!milestone.name?.trim()||names.has(milestone.name.trim()))throw new Error('Milestones need unique names.');
    names.add(milestone.name.trim());
    for(const s of OWNER_SERVICES)if(!Number.isFinite(milestone.hours?.[s.code])||milestone.hours[s.code]<(schedule.version==='owner-services-v1'?s.minimum:0))
      throw new Error(`${s.code}: invalid milestone hours.`);
  }
  return OWNER_SERVICES.map(s=>{
    const hours=schedule.milestones.reduce((sum,m)=>sum+m.hours[s.code],0);
    if(hours<=0)throw new Error(`${s.code}: project hours must be positive.`);
    return {...s,hours};
  });
}
export function ownerSalaryCredit(schedule:OwnerServiceSchedule|undefined,bookLabor:number,recoveredOverhead:number){
  if(!schedule||schedule.version==='owner-services-v1')return 0;
  const requested=schedule.salaryOverheadCredit??bookLabor;
  if(!Number.isFinite(requested)||requested<0)throw new Error('Salary overhead credit must be nonnegative.');
  return Math.min(requested,bookLabor,Math.max(0,recoveredOverhead));
}
