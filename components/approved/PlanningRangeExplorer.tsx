"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  EMPTY_REFINEMENTS, NOT_A_QUOTE_NOTICE, buildEstimateDisclosure,
  calculateEstimate, formatPlanningCurrency, getProjectSizeConfig,
  type FinishLevel, type LayoutChanges,
} from "@/shared/estimateEngine";
import styles from "./PlanningRangeExplorer.module.css";

const PROJECTS = [
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "whole-home", label: "Whole home" },
] as const;
const FINISHES: { value: FinishLevel; label: string }[] = [
  { value: "refresh", label: "Refresh" },
  { value: "mid-range", label: "Mid-range" },
  { value: "high-end", label: "High-end" },
  { value: "luxury", label: "Luxury" },
];
const LAYOUTS: { value: LayoutChanges; label: string }[] = [
  { value: "none", label: "Keep the layout" },
  { value: "moderate", label: "Some layout changes" },
  { value: "major", label: "Major layout changes" },
];
const STEPS = ["Project", "Size", "Finish", "Layout", "Review"];
const STORAGE_KEY = "brc-home-planning-v1";
type Project = (typeof PROJECTS)[number]["value"];
type Plan = { project: Project; sqft: number; finish: FinishLevel; layout: LayoutChanges; step: number };
const DEFAULT: Plan = { project: "kitchen", sqft: 250, finish: "mid-range", layout: "none", step: 0 };

/** Homepage-only proof. Reuses the unchanged local engine; never calls an API or sends a lead. */
export function PlanningRangeExplorer() {
  const [plan, setPlan] = useState<Plan>(DEFAULT);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Plan>(DEFAULT);
  const [direction, setDirection] = useState(1);
  const [editFromSummary, setEditFromSummary] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    if (card.current) observer.observe(card.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (saved && PROJECTS.some(p => p.value === saved.project) && FINISHES.some(f => f.value === saved.finish)
        && LAYOUTS.some(l => l.value === saved.layout) && Number.isInteger(saved.step) && saved.step >= 0 && saved.step < STEPS.length) {
        const size = getProjectSizeConfig(saved.project);
        if (Number.isFinite(saved.sqft) && saved.sqft >= size.min && saved.sqft <= size.max && (saved.sqft - size.min) % size.step === 0) setPlan(saved);
      }
    } catch { /* Storage is optional. The calculator works without it. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); } catch { /* Optional storage. */ } }
  }, [plan, ready]);
  const shown = editing === null ? plan : draft;
  const shownStep = editing ?? plan.step;
  const change = editing === null ? setPlan : setDraft;
  const size = getProjectSizeConfig(shown.project);
  const input = { project: plan.project, sqft: plan.sqft, finish: plan.finish,
    refinements: { ...EMPTY_REFINEMENTS, layoutChanges: plan.layout } };
  // Do not tighten the range based on preselected answers or claim increased confidence.
  const result = calculateEstimate(input, 0);
  const disclosure = buildEstimateDisclosure(input);
  const projectLabel = PROJECTS.find(p => p.value === plan.project)!.label;
  const finishLabel = FINISHES.find(f => f.value === plan.finish)!.label;
  const layoutLabel = LAYOUTS.find(l => l.value === plan.layout)!.label;
  const range = `${formatPlanningCurrency(result.priceLow)} to ${formatPlanningCurrency(result.priceHigh)}`;
  function go(step: number) {
    setDirection(step >= plan.step ? 1 : -1);
    setSummaryOpen(false);
    setEditing(null);
    setPlan(p => ({ ...p, step }));
    requestAnimationFrame(() => {
      const headerHeight = document.querySelector("[data-family-header]")?.getBoundingClientRect().height ?? 76;
      if (card.current) window.scrollBy({ top: card.current.getBoundingClientRect().top - headerHeight - 16, behavior: "instant" });
      card.current?.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true });
    });
  }
  function edit(index: number) {
    setEditFromSummary(summaryOpen);
    setDraft(plan);
    setEditing(index);
    setSummaryOpen(false);
    requestAnimationFrame(() => card.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true }));
  }
  function finishEdit(save: boolean) {
    const index = editing;
    if (save) setPlan({ ...draft, step: plan.step });
    setEditing(null);
    setSummaryOpen(editFromSummary);
    requestAnimationFrame(() => {
      if (index !== null) card.current?.querySelector<HTMLElement>(`button[aria-label="Edit ${STEPS[index].toLowerCase()}"]`)?.focus({ preventScroll: true });
    });
  }
  const review = <dl className={styles.review}>{[projectLabel, `${plan.sqft.toLocaleString()} sq ft`, finishLabel, layoutLabel].map((value, index) => <div key={index}>
    <dt>{STEPS[index]}</dt><dd>{value}</dd><button type="button" onClick={() => edit(index)} aria-label={`Edit ${STEPS[index].toLowerCase()}`}>Edit</button>
  </div>)}</dl>;
  function options<T extends string>(label: string, values: readonly { value: T; label: string }[], selected: T, onChange: (value: T) => void) {
    return <fieldset className={styles.fieldset}><legend>{label}</legend><div className={styles.choices}>
      {values.map(option => <label key={option.value} className={styles.choice}>
        <input data-clarity-mask="True" type="radio" name={`${id}-${label}`} value={option.value} checked={selected === option.value} onChange={() => onChange(option.value)} />
        <span>{option.label}</span>
      </label>)}
    </div></fieldset>;
  }
  return <section className={`fr-band planning-range-explorer ${styles.section}`} id="planning-ranges" aria-labelledby="planning-ranges-title">
    <div className="f-section f-container">
      <div className={styles.intro}>
        <div><p className="f-eyebrow">PLANNING RANGES</p><h2 id="planning-ranges-title">Your remodel.<br /><em>A clearer starting point.</em></h2></div>
        <p>Compare project size, finishes and layout changes. See a modeled budget immediately, without sharing contact details.</p>
      </div>
      <div className={styles.grid}>
        <div ref={card} className={`${styles.card}${active ? ` ${styles.active}` : ""}`} data-testid="planning-step" data-family-bar-yield="" onKeyDown={event => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type === "range") {
            event.preventDefault();
            if (editing !== null) finishEdit(true);
            else go(Math.min(4, plan.step + 1));
          }
        }}>
          <div className={styles.cardHeader}><p className={styles.progress}>Step {plan.step + 1} of {STEPS.length} · {STEPS[plan.step]}</p>
          {plan.step < 4 && editing === null && <button className={styles.summaryToggle} type="button" aria-expanded={summaryOpen} onClick={() => setSummaryOpen(value => !value)}>{summaryOpen ? "Hide selections" : "Your selections"}</button>}</div>
          <div className={styles.step} style={{ "--step-direction": direction } as React.CSSProperties} key={`${shownStep}-${editing}`}>
            {summaryOpen ? review : <>

            {shownStep === 0 && options("What are you remodeling?", PROJECTS, shown.project, project => change(p => ({ ...p, project, sqft: getProjectSizeConfig(project).baselineSqft })))}
            {shownStep === 1 && <fieldset className={styles.fieldset}><legend>How much space?</legend>
              <div className={styles.sizeControls}><label htmlFor={`${id}-size`}>{projectLabel} area: <strong>{shown.sqft.toLocaleString()} sq ft</strong></label>
              <input data-clarity-mask="True" id={`${id}-size`} className={styles.slider} type="range" min={size.min} max={size.max} step={size.step} value={shown.sqft} onChange={e => change(p => ({ ...p, sqft: Number(e.target.value) }))} aria-valuetext={`${shown.sqft} square feet`} />
              <div className={styles.ends}><span>{size.min.toLocaleString()} sq ft</span><span>{size.max.toLocaleString()} sq ft</span></div>
              <p className={styles.help}>Use the area being remodeled, not the whole property.</p></div>
            </fieldset>}
            {shownStep === 2 && options("Choose a finish level", FINISHES, shown.finish, finish => change(p => ({ ...p, finish })))}
            {shownStep === 3 && options("Will the layout change?", LAYOUTS, shown.layout, layout => change(p => ({ ...p, layout })))}
            {shownStep === 4 && <div><h3 className={styles.reviewTitle}>Review your starting point</h3>
              {review}
            </div>}
            </>}
          </div>
          <div className={`${styles.compactResult}${plan.step === 4 && editing === null ? ` ${styles.reviewRange}` : ""}`} aria-live="polite"><span>Modeled planning range</span><strong>{range}</strong></div>
          <div className={styles.navigation}>
            <button type="button" className={styles.back} onClick={() => editing !== null ? finishEdit(false) : summaryOpen ? setSummaryOpen(false) : go(Math.max(0, plan.step - 1))} disabled={plan.step === 0 && editing === null && !summaryOpen}>{editing !== null ? "Cancel" : "Back"}</button>
            {editing !== null ? <button type="button" className={styles.next} onClick={() => finishEdit(true)}>Save changes</button> : summaryOpen ? <button type="button" className={styles.next} onClick={() => setSummaryOpen(false)}>Continue planning</button> : plan.step < STEPS.length - 1 ? <button type="button" className={styles.next} onClick={() => go(plan.step + 1)}>Next</button> : <a className={styles.next} href="/#request">Request a quote</a>}
          </div>
          {(plan.step < STEPS.length - 1 || editing !== null) && <a className={styles.contact} href="/#request">Request a quote <ArrowUpRight size={16} aria-hidden="true" /></a>}
        </div>
        <aside className={styles.result} aria-label="Your modeled planning range">
          <p className={styles.resultLabel}>{projectLabel} · modeled planning range</p>
          <p className={styles.figure} aria-live="polite" data-testid="planning-figure">{range}</p>
          <p className={styles.summary}>{plan.sqft.toLocaleString()} sq ft · {finishLabel} · {layoutLabel}</p>
          <p className={styles.notice}>{NOT_A_QUOTE_NOTICE}</p>
          <a className={`f-button f-dark ${styles.quote}`} href="/#request" data-family-bar-yield="">Request a quote</a>
          <p className={styles.help}>A site visit and written scope come before a firm construction price.</p>
        </aside>
        <div className={styles.disclosures} aria-label="Planning range details">
          <details className={styles.details}><summary>What the model includes</summary><ul>{disclosure.includes.map(item => <li key={item}>{item}</li>)}</ul></details>
          <details className={styles.details}><summary>Assumptions and exclusions</summary>
            <p>Other scope details use the estimator's baseline assumptions. Plumbing, electrical, cabinet specifications and room counts are not customized in this quick planner.</p>
            <ul>{[...disclosure.assumptions, ...disclosure.excludes].map(item => <li key={item}>{item}</li>)}</ul>
          </details>
          <details className={styles.details}><summary>What can change the budget</summary><ul>{disclosure.increases.map(item => <li key={item}>{item}</li>)}</ul></details>
          <p className={styles.source}>Method: our existing remodeling estimate engine, using project type, area, finish and layout. <Link href="/guides/boise-remodeling-cost-guide">Read the cost guide</Link>.</p>
        </div>
      </div>
    </div>
  </section>;
}
