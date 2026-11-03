"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

/**
 * C14 interactive proof: sourced Treasure Valley planning bands from the cost
 * guide. No email gate before the result. Contact capture stays on /estimate.
 *
 * Sits on its own dark band (app/family-redesign.css, .fr-band) so the figure
 * is the one bright object on the screen rather than another paper section.
 * Kitchen is selected on arrival, so the panel is never an empty box.
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
    <section className="fr-band planning-range-explorer" id="planning-ranges" aria-labelledby="planning-ranges-title">
      <div className="f-section f-container fr-range">
        <div className="fr-range-intro">
          <p className="f-eyebrow">PLANNING RANGES</p>
          <h2 id="planning-ranges-title">Treasure Valley <em>remodel plans.</em></h2>
          <p>
            Choose a project type for the published planning band from our cost guide. These are planning
            ranges, not bids. A written scope comes after your visit.
          </p>
          <div className="fr-range-choices" role="radiogroup" aria-labelledby={labelId}>
            <span id={labelId} className="sr-only">Project type</span>
            {RANGES.map((option) => {
              const isOn = option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isOn}
                  className={`fr-range-choice${isOn ? " is-selected" : ""}`}
                  onClick={() => setSelected(option.id)}
                >
                  <span>{option.title}</span>
                  <span className="fr-range-choice-check" aria-hidden="true">{isOn ? <Check size={14} /> : null}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="fr-range-result" aria-live="polite">
          <p className="fr-range-result-label">{active.title} · planning range</p>
          <p className="fr-range-result-figure">{active.range}</p>
          <p className="fr-range-result-detail">{active.detail}</p>
          <p className="fr-range-result-source">
            Source: <Link href={active.sourceHref}>{active.sourceLabel}</Link>
            {" · "}As of 2026, Treasure Valley.
          </p>
          <div className="fr-range-result-actions">
            <a className="f-button f-dark" href="#request">Request a quote</a>
            <Link className="f-link" href="/guides/boise-remodeling-cost-guide">
              Read the full cost guide <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
