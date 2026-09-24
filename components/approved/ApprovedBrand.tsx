import {approvedBrand} from './brand';
/** Original vector wordmark, unchanged. The family icon and endorsement are additive. */
export function ApprovedBrand({dark=true}:{dark?:boolean}){
 return <span className="approved-brand" role="img" aria-label={`${approvedBrand.name}, a P5 Home Company`}>
  <img className="approved-brand-icon" src={`/brand/p5-family-${dark?'light':'dark'}.svg`} width={48} height={48} alt=""/>
  <span className="approved-brand-type"><img src={dark?approvedBrand.wordmarkLight:approvedBrand.wordmarkDark} className="approved-original-wordmark" alt="" width={270} height={28}/><span className="approved-endorsement">A P5 Home Company</span></span>
 </span>;
}
