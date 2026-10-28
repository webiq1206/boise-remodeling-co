import {approvedBrand} from './brand';

/** Approved October 2026 outlined lockup; preserve its original proportions. */
export function ApprovedBrand({dark=true}:{dark?:boolean}){
 return <span className="approved-brand" role="img" aria-label={`${approvedBrand.name}, a P5 Home Company`}>
  <img className="approved-family-lockup" src={`/brand/approved-lockup-${dark?'light':'dark'}.svg`} alt="" aria-hidden="true"/>
 </span>;
}
