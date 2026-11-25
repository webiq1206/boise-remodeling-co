/** Preliminary customer selling floors for legacy planning tools. The business cost book stays private.
 * The authenticated estimator verifies selections, site costs and the current finance allocation. */
const rates={
  newHome:[275.0, 366.67, 495.0, 559.17],
  addition:[183.34, 247.5, 311.67, 403.34],
  detached:[183278.34, 227516.67, 278080.0, 347600.0],
  attached:[167200.0, 236866.67, 320466.67, 418000.0],
  basement:[53.23, 79.84, 120.65, 143.71],
  wholeHome:[111.84, 201.67, 256.67, 339.17],
  kitchen:[170.33, 257.26, 390.33, 532.26],
  structuralKitchen:[176.0, 265.84, 403.34, 550.0],
  bathroom:[19214.52, 27038.71, 38056.46, 56082.26],
} as const;
type Scope = {project:string;finish:string;sqft:number;refinements?:{aduConfig?:string|null;layoutChanges?:string|null}};
export function protectedPlanningRange(input:Scope,oldLow:number,oldHigh:number,oldCenter:number) {
  const tier=({"refresh":0,"mid-range":1,"high-end":2,"luxury":3} as Record<string,number>)[input.finish]??1;
  let quantity=input.sqft;
  let key:keyof typeof rates;
  let keepCenter=false;
  switch(input.project) {
    case "bathroom": key="bathroom";quantity=1;break;
    case "kitchen": key=input.refinements?.layoutChanges==="none"?"kitchen":"structuralKitchen";break;
    case "whole-home":key="wholeHome";break;
    case "basement":key="basement";break;
    case "addition":key="addition";keepCenter=true;break;
    case "adu":key=input.refinements?.aduConfig==="attached"?"attached":"detached";quantity=key==="detached"?Math.max(1,input.sqft/600):1;keepCenter=true;break;
    default:key="newHome";keepCenter=true;
  }
  const low=Math.ceil(Math.max(oldLow,quantity*rates[key][tier],keepCenter?oldCenter:0)/100)*100;
  return {priceLow:low,priceHigh:Math.max(low,oldHigh)};
}
