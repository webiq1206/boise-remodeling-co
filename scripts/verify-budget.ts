import { assessBudget, budgetGuidance } from "../shared/costs/budget";
import { resolveQuotedRange, resolveInternalEstimate } from "../shared/costs/resolve";
import { EMPTY_REFINEMENTS, getProjectSizeConfig, type ProjectType, type FinishLevel } from "../shared/estimateEngine";

const PROJECTS: ProjectType[] = ["kitchen","bathroom","whole-home","addition","adu","basement"];
const FINISHES: FinishLevel[] = ["refresh","mid-range","high-end","luxury"];
let checks=0, fails=0;
const fail=(m:string)=>{fails++; if(fails<=25) console.log("FAIL: "+m);};

for (const p of PROJECTS) {
  const cfg = getProjectSizeConfig(p);
  for (const sf of [cfg.min, Math.round((cfg.min+cfg.max)/2), cfg.max]) {
    for (const f of FINISHES) {
      const r = resolveQuotedRange(p, f, sf, EMPTY_REFINEMENTS);
      if (!r) { fail(`no range ${p}/${f}/${sf}`); continue; }
      const internal = resolveInternalEstimate(p, f, sf, EMPTY_REFINEMENTS);
      const trades = internal ? internal.admin.trades.slice(0,2).map(t=>t.division) : [];
      const sel = { quality: f, sqft: sf, ...EMPTY_REFINEMENTS } as never;
      const range = { low: r.priceLow, high: r.priceHigh };
      const budgets = [Math.round(r.priceLow*0.4), Math.round(r.priceLow*0.75), r.priceLow-1, r.priceLow, Math.round((r.priceLow+r.priceHigh)/2), r.priceHigh, Math.round(r.priceHigh*1.4)];
      for (const b of budgets) {
        const a = assessBudget(p, sel, range, b, trades);
        checks++;
        // state correctness
        const want = b>=range.high ? "above" : b>=range.low ? "within" : "below";
        if (a.state!==want) fail(`state ${p}/${f}/${sf} b=${b} got ${a.state} want ${want}`);
        // options only when below
        if (want!=="below" && a.options.length) fail(`options leaked ${p}/${f}/${sf} b=${b}`);
        // every offered option must actually reach the budget
        for (const o of a.options) if (o.low > b) fail(`option misses budget ${p}/${f} "${o.label}" low=${o.low} b=${b}`);
        // options strictly cheaper AND materially so
        for (let i=1;i<a.options.length;i++){
          const save = a.options[i-1].low - a.options[i].low;
          if (save < Math.max(2000, a.options[i-1].low*0.05)) fail(`immaterial option ${p}/${f} save=${save} "${a.options[i].label}"`);
        }
        // no option may exceed the original range (a "saving" that costs more)
        for (const o of a.options) if (o.low >= range.low) fail(`option not cheaper ${p}/${f} ${o.low} >= ${range.low}`);
        // low<=high always
        for (const o of a.options) if (o.low > o.high) fail(`inverted option ${p}/${f}`);
        // unreachable flag consistency
        if (a.unreachable !== (want==="below" && a.options.length===0)) fail(`unreachable flag ${p}/${f} b=${b}`);
        // guidance non-empty exactly when below
        const g = budgetGuidance(a);
        if ((want==="below") !== (g.length>0)) fail(`guidance presence ${p}/${f} b=${b}`);
        // no forbidden vocabulary anywhere in lead-facing text
        const all = [a.headline, a.driver||"", g, a.basisNote, ...a.options.map(o=>o.label)].join(" ").toLowerCase();
        for (const bad of ["margin","markup","overhead","profit","supervision","project management","unit cost","our cost","cost code"])
          if (all.includes(bad)) fail(`vocabulary "${bad}" in ${p}/${f} b=${b}`);
        // headline must never quote a single point price
        if (/\$\d[\d,]*\s*(each|per unit)/.test(all)) fail(`point price ${p}/${f}`);
      }
    }
  }
}
console.log(fails===0 ? `All ${checks} budget-assessment checks passed.` : `${fails} FAILURES across ${checks} checks.`);
process.exit(fails===0?0:1);
