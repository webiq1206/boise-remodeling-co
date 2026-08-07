import {
  FINISH_LABELS,
  PROJECT_LABELS,
  getAvailableFinishLevels,
  getProjectSizeConfig,
  getRefinementVisibility,
  type FinishLevel,
  type ProjectType,
} from "../estimateEngine";
import { SITE_CONFIG } from "../siteConfig";
import { CONTACT_FAQS } from "../content/contactFaqs";

/**
 * Everything the estimating assistant is allowed to know, DERIVED from the
 * same modules the estimators run on.
 *
 * The one rule that matters: the assistant never learns a number this file
 * typed by hand. Project types, finish levels, size bounds and refinement
 * questions are all read from the engine config at module load, so the
 * assistant physically cannot offer an option the estimator would reject or
 * miss one it would accept. Prices are not here at all - those only exist in
 * tool results, computed per conversation by the real engines.
 */

export const ASSISTANT_PROJECTS: ProjectType[] = [
  "kitchen",
  "bathroom",
  "whole-home",
  "addition",
  "adu",
  "basement",
];

export interface AssistantProjectOption {
  project: ProjectType;
  label: string;
  sub: string;
  sizeMin: number;
  sizeMax: number;
  sizeBaseline: number;
  finishes: { id: FinishLevel; label: string; sub: string }[];
  /** Which optional detail questions the engine actually uses for this project. */
  refinements: string[];
  /** Partial-scope chip ids the engine's scope rules gate lines on. */
  partialScopeChips: string[];
}

/**
 * The two projects whose upgradeScope chips gate real scope rules. These ids
 * must match `redoing()`'s vocabulary in shared/costs/scopeRules.ts; the
 * verify suite proves each one changes the priced result, so a renamed chip
 * cannot silently turn into an ignored answer.
 */
export const PARTIAL_SCOPE_CHIPS: Partial<Record<ProjectType, string[]>> = {
  kitchen: ["cabinets", "counters", "flooring", "lighting"],
  bathroom: ["shower", "vanity", "tub", "tile"],
};

const REFINEMENT_QUESTIONS: Record<string, string> = {
  layoutChanges: "layoutChanges: none | moderate | major - are walls or the floor plan moving?",
  plumbingElectrical: "plumbingElectrical: cosmetic | partial | full - how much of the plumbing/electrical is being redone?",
  cabinetTier: "cabinetTier: standard | semi-custom | custom",
  fixtureCount: "fixtureCount: 1-8 - how many plumbing fixtures in the bathroom?",
  bathroomCount: "bathroomCount: 0-12 - how many bathrooms are in scope?",
  kitchenIncluded: "kitchenIncluded: true | false - is a kitchen part of this scope?",
  stories: "stories: 1 | 2 - single-story or two-story addition?",
  aduConfiguration: "aduConfig: detached | attached",
};

export function getAssistantProjectOptions(): AssistantProjectOption[] {
  return ASSISTANT_PROJECTS.map((project) => {
    const size = getProjectSizeConfig(project);
    const visibility = getRefinementVisibility(project);
    return {
      project,
      label: PROJECT_LABELS[project].label,
      sub: PROJECT_LABELS[project].sub,
      sizeMin: size.min,
      sizeMax: size.max,
      sizeBaseline: size.baselineSqft,
      finishes: getAvailableFinishLevels(project).map((id) => ({
        id,
        label: FINISH_LABELS[id].label,
        sub: FINISH_LABELS[id].sub,
      })),
      refinements: (Object.entries(visibility) as [string, boolean][])
        .filter(([, visible]) => visible)
        .map(([key]) => REFINEMENT_QUESTIONS[key])
        .filter(Boolean),
      partialScopeChips: PARTIAL_SCOPE_CHIPS[project] ?? [],
    };
  });
}

/** Readable fact sheet for the system prompt. Data only; no instructions. */
export function buildAssistantFactSheet(): string {
  const lines: string[] = [
    `BUSINESS FACTS`,
    `Company: ${SITE_CONFIG.name} (${SITE_CONFIG.legalName})`,
    `Phone: ${SITE_CONFIG.phone}  Email: ${SITE_CONFIG.email}`,
    `Based in ${SITE_CONFIG.address.cityState}; service area: ${SITE_CONFIG.address.serviceArea}`,
    ``,
    `FREQUENTLY ASKED`,
    ...CONTACT_FAQS.map((f) => `Q: ${f.question}\nA: ${f.answer}`),
    ``,
    `PROJECT TYPES THE ESTIMATOR PRICES`,
  ];

  for (const option of getAssistantProjectOptions()) {
    lines.push(
      `- ${option.project} ("${option.label}" - ${option.sub}): ` +
        `${option.sizeMin}-${option.sizeMax} sqft (typical ${option.sizeBaseline}); ` +
        `finishes: ${option.finishes.map((f) => `${f.id} (${f.sub})`).join(", ")}` +
        (option.partialScopeChips.length > 0
          ? `; partial-scope options: ${option.partialScopeChips.join(", ")}`
          : ""),
    );
    if (option.refinements.length > 0) {
      for (const q of option.refinements) lines.push(`    detail: ${q}`);
    }
  }

  return lines.join("\n");
}
