"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

/**
 * C14 interactive proof: sourced Treasure Valley planning bands from the cost
 * guide. No email gate before the result. Contact capture stays on /estimate.
 */
const RANGES = [
  {
    id: "kitchen",
    title: "Kitchen",
    range: "$37,000 to $110,000+",
    detail:
      "Most full Treasure Valley kitchens with new cabinets and layout changes. Cosmetic refreshes land lower; luxury gut renovations run higher.",
    sourceHref: "/guides/boise-remodeling-cost-guide",
    sourceLabel: "Cost guide kitchen band",
  },
  {
    id: "bathroom",
    title: "Primary bath",
    range: "$35,000 to $85,000+",
    detail:
      "Primary baths with new fixtures, waterproofing, and finishes. Guest baths and refreshes plan lower; layout moves and custom tile push higher.",
    sourceHref: "/guides/boise-remodeling-cost-guide",
    sourceLabel: "Cost guide bath band",
  },
  {
    id: "whole-home",
    title: "Whole home",
    range: "Written master scope",
    detail:
      "Whole-home programs vary with room count and phasing. We plan a written master scope after a visit rather than a single public band.",
    sourceHref: "/guides/boise-remodeling-cost-guide",
    sourceLabel: "Cost guide whole-home notes",
  },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

export function PlanningRangeExplorer() {
  const [selected, setSelected] = useState<RangeId>("kitchen");
  const labelId = useId();
  const active = RANGES.find((item) => item.id === selected) ?? RANGES[0];

  return (
    <section className="f-section f-container planning-range-explorer" id="planning-ranges">
      <p className="f-eyebrow">PLANNING RANGES</p>
      <h2>What Treasure Valley remodels typically plan.</h2>
      <p>
        Choose a project type for the published planning band from our cost guide. These are planning
        ranges, not bids. A written scope comes after your visit.
      </p>

      <div
        className="planning-range-choices"
        role="radiogroup"
        aria-labelledby={labelId}
      >
        <span id={labelId} className="sr-only">
          Project type
        </span>
        {RANGES.map((option) => {
          const isOn = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isOn}
              className={`planning-range-card${isOn ? " is-selected" : ""}`}
              onClick={() => setSelected(option.id)}
            >
              <span className="planning-range-card-title">{option.title}</span>
              <span className="planning-range-card-check" aria-hidden="true">
                {isOn ? <Check size={14} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="planning-range-result" aria-live="polite">
        <p className="planning-range-result-label">{active.title}</p>
        <p className="planning-range-result-figure">{active.range}</p>
        <p className="planning-range-result-detail">{active.detail}</p>
        <p className="planning-range-result-source">
          Source:{" "}
          <Link href={active.sourceHref}>{active.sourceLabel}</Link>
          {" · "}
          As of 2026, Treasure Valley.
        </p>
      </div>

      <div className="planning-range-actions">
        <a className="f-link" href="#request">
          Request a quote <ArrowUpRight size={18} aria-hidden="true" />
        </a>
        <Link className="f-link" href="/guides/boise-remodeling-cost-guide">
          Read the full cost guide <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
