import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  EMPTY_REFINEMENTS,
  NOT_A_QUOTE_NOTICE,
  ONSITE_REQUIRED_NOTICE,
  PROJECT_LABELS,
  buildEstimateDisclosure,
  calculateEstimate,
  countVisibleUserRefinements,
  getAvailableFinishLevels,
  getProjectSizeConfig,
  getSetRefinementKeys,
  type EstimateRefinements,
  type ProjectType,
} from "@/shared/estimateEngine";
import { resolveQuotedRange } from "@/shared/costs/resolve";
import {
  RECIPES,
  TRADE_LABELS,
  estimateRe10,
  type RepairItemInput,
  type RepairKind,
} from "@/shared/costs/re10Repairs";
import { EXTRACTABLE_KINDS } from "@/shared/re10/extraction";
import { ASSISTANT_PROJECTS } from "@/shared/assistant/knowledge";
import {
  IMPLAUSIBLE_QUOTE_CEILING,
  logPricingAlert,
} from "@/server/services/pricingAlerts";
import { deliverAssistantLead } from "@/server/services/assistantLead";

/**
 * The assistant's tools ARE the estimators.
 *
 * Every number the assistant can utter is computed here, by the same
 * `calculateEstimate`/`resolveQuotedRange` pair the calculator page runs and
 * the same `estimateRe10` the RE-10 wizard runs. The model gathers inputs in
 * conversation; the price comes from a tool call or it does not exist. Tool
 * results carry the customer-safe shape only - range, scope, assumptions,
 * caveats - never cost, margin, or a line item, so the disclosure wall holds
 * in chat exactly as it does in email.
 *
 * Every dollar figure a tool returns is also collected into `groundedPrices`,
 * which the guard uses to reject any reply that states a number no tool
 * produced. Grounding is enforced, not requested.
 */

/** What the loop carries between requests, inside the signed transcript. */
export interface AssistantSessionState {
  /** Dollar figures tools have returned this conversation; the guard's allowlist. */
  groundedPrices: number[];
  /** The most recent priced result, for the CRM record at lead capture. */
  lastEstimate: {
    kind: "remodel" | "repairs";
    label: string;
    priceLow: number;
    priceHigh: number;
    detail: string;
  } | null;
  leadCaptured: boolean;
}

export function emptySessionState(): AssistantSessionState {
  return { groundedPrices: [], lastEstimate: null, leadCaptured: false };
}

const refinementsSchema = z
  .object({
    layoutChanges: z.enum(["none", "moderate", "major"]).nullable().optional(),
    plumbingElectrical: z.enum(["cosmetic", "partial", "full"]).nullable().optional(),
    cabinetTier: z.enum(["standard", "semi-custom", "custom"]).nullable().optional(),
    fixtureCount: z.number().int().min(1).max(8).nullable().optional(),
    stories: z.number().int().min(1).max(2).nullable().optional(),
    roomCount: z.number().int().min(1).max(12).nullable().optional(),
    bathroomCount: z.number().int().min(0).max(12).nullable().optional(),
    kitchenIncluded: z.boolean().nullable().optional(),
    aduConfig: z.enum(["detached", "attached"]).nullable().optional(),
    upgradeScope: z.array(z.string().max(24)).max(8).nullable().optional(),
  })
  .optional()
  .nullable();

const remodelInputSchema = z.object({
  project: z.enum(ASSISTANT_PROJECTS as [ProjectType, ...ProjectType[]]),
  finish: z.enum(["refresh", "mid-range", "high-end", "luxury"]),
  sqft: z.number().positive(),
  refinements: refinementsSchema,
});

const repairInputSchema = z.object({
  repairs: z
    .array(
      z.object({
        description: z.string().min(1).max(2000),
        kind: z.enum(EXTRACTABLE_KINDS as [RepairKind, ...RepairKind[]]),
        quantity: z.number().positive().max(100_000).nullable().optional(),
        location: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(80),
  occupancy: z.enum(["occupied", "vacant", "unknown"]).optional(),
  access: z.enum(["standard", "limited", "difficult"]).optional(),
  daysToDeadline: z.number().int().min(0).max(3650).nullable().optional(),
  hasInspectionReport: z.boolean().optional(),
});

const captureLeadSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email().max(200).optional(),
    phone: z.string().min(10).max(40).optional(),
    preferredContact: z.enum(["email", "phone", "text"]),
    projectSummary: z.string().min(5).max(2000),
    timeline: z.string().max(200).optional(),
    propertyAddress: z.string().max(300).optional(),
    zip: z.string().max(10).optional(),
    conversationSummary: z.string().min(5).max(4000),
  })
  .refine((b) => (b.preferredContact === "email" ? Boolean(b.email) : Boolean(b.phone)), {
    message: "The preferred contact method needs its matching detail (email address or phone number).",
  });

/**
 * Tool definitions sent to the model. Enums are derived from the same engine
 * configs the estimators run on, so an option the model can select is always
 * an option the engine accepts.
 */
export const ASSISTANT_TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "price_remodel_estimate",
    description:
      "Compute the planning range for a remodel or build project using the real pricing engine. " +
      "Call this whenever the customer wants a number and you know project type, finish level and approximate square footage. " +
      "Re-call it after any change of scope; never adjust a previous number yourself. " +
      "For kitchens and bathrooms, upgradeScope lists only what they are redoing (omit or null = full remodel).",
    input_schema: {
      type: "object" as const,
      properties: {
        project: { type: "string", enum: ASSISTANT_PROJECTS },
        finish: { type: "string", enum: ["refresh", "mid-range", "high-end", "luxury"] },
        sqft: { type: "number", description: "Approximate square footage of the project area." },
        refinements: {
          type: "object",
          description: "Optional details; every answered one tightens the range.",
          properties: {
            layoutChanges: { type: "string", enum: ["none", "moderate", "major"] },
            plumbingElectrical: { type: "string", enum: ["cosmetic", "partial", "full"] },
            cabinetTier: { type: "string", enum: ["standard", "semi-custom", "custom"] },
            fixtureCount: { type: "number" },
            stories: { type: "number" },
            roomCount: { type: "number" },
            bathroomCount: { type: "number" },
            kitchenIncluded: { type: "boolean" },
            aduConfig: { type: "string", enum: ["detached", "attached"] },
            upgradeScope: {
              type: "array",
              items: { type: "string" },
              description:
                "Kitchen: cabinets, counters, flooring, lighting. Bathroom: shower, vanity, tub, tile. Only what they are redoing.",
            },
          },
        },
      },
      required: ["project", "finish", "sqft"],
    },
  },
  {
    name: "price_repair_list",
    description:
      "Compute a firm price for a list of inspection/RE-10 style repairs using the real repair engine. " +
      "Map each repair the customer describes to the closest kind; if nothing fits, leave it OFF the list and tell the customer it needs an onsite look. " +
      "Quantities: only pass a number the customer actually gave; omit it otherwise and the engine prices the typical size and says so.",
    input_schema: {
      type: "object" as const,
      properties: {
        repairs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "The repair in the customer's own words." },
              kind: { type: "string", enum: EXTRACTABLE_KINDS },
              quantity: { type: "number", description: "Only if the customer stated a measurement." },
              location: { type: "string" },
            },
            required: ["description", "kind"],
          },
        },
        occupancy: { type: "string", enum: ["occupied", "vacant", "unknown"] },
        access: { type: "string", enum: ["standard", "limited", "difficult"] },
        daysToDeadline: { type: "number", description: "Days until the repair deadline, if any." },
        hasInspectionReport: { type: "boolean" },
      },
      required: ["repairs"],
    },
  },
  {
    name: "capture_lead",
    description:
      "Save the customer's contact details so the team follows up. Call ONLY after the customer has explicitly shared " +
      "their name and a way to reach them and agreed to be contacted. Never invent or assume contact details.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        preferredContact: { type: "string", enum: ["email", "phone", "text"] },
        projectSummary: { type: "string", description: "One or two sentences on what they want done." },
        timeline: { type: "string" },
        propertyAddress: { type: "string" },
        zip: { type: "string" },
        conversationSummary: {
          type: "string",
          description: "Faithful recap of the conversation for the team: scope discussed, numbers given, open questions.",
        },
      },
      required: ["name", "preferredContact", "projectSummary", "conversationSummary"],
    },
  },
];

export interface ToolExecution {
  /** JSON string handed back to the model as the tool result. */
  resultJson: string;
  /** True when validation failed; the payload then carries the reason. */
  isError: boolean;
}

function toolError(message: string): ToolExecution {
  return { resultJson: JSON.stringify({ error: message }), isError: true };
}

function runRemodelTool(input: unknown, state: AssistantSessionState): ToolExecution {
  const parsed = remodelInputSchema.safeParse(input);
  if (!parsed.success) {
    return toolError(
      "Invalid inputs: " +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  const { project, finish } = parsed.data;

  if (!getAvailableFinishLevels(project).includes(finish)) {
    return toolError(
      `The ${finish} finish level is not offered for ${project}. Offered: ${getAvailableFinishLevels(project).join(", ")}.`,
    );
  }

  // Clamp exactly as the lead routes do, and SAY so, so the assistant relays
  // the bounds instead of silently pricing a different project than asked.
  const sizeConfig = getProjectSizeConfig(project);
  const requestedSqft = Math.round(parsed.data.sqft);
  const sqft = Math.min(sizeConfig.max, Math.max(sizeConfig.min, requestedSqft));

  const refinements: EstimateRefinements = {
    ...EMPTY_REFINEMENTS,
    ...(parsed.data.refinements ?? {}),
  } as EstimateRefinements;

  const detailCount = countVisibleUserRefinements(project, getSetRefinementKeys(refinements));
  const guide = calculateEstimate({ project, finish, sqft, refinements }, detailCount);
  const lineItemRange = resolveQuotedRange(project, finish, sqft, refinements);
  const result = { ...guide, ...(lineItemRange ?? {}) };
  const disclosure = buildEstimateDisclosure({ project, finish, sqft, refinements });

  if (result.priceLow <= 0 || result.priceHigh <= 0) {
    logPricingAlert("zero-total", { route: "assistant", project, finish, sqft });
    return toolError("The engine could not price this combination. Offer the free consultation instead.");
  }
  if (result.priceHigh > IMPLAUSIBLE_QUOTE_CEILING) {
    logPricingAlert("implausible-total", { route: "assistant", project, finish, sqft, priceHigh: result.priceHigh });
    return toolError("The computed number failed a sanity check. Offer the free consultation instead.");
  }

  state.groundedPrices.push(result.priceLow, result.priceHigh);
  state.lastEstimate = {
    kind: "remodel",
    label: `${PROJECT_LABELS[project].label} - ${finish} - ${sqft.toLocaleString()} sqft`,
    priceLow: result.priceLow,
    priceHigh: result.priceHigh,
    detail:
      `Planning range $${result.priceLow.toLocaleString()} to $${result.priceHigh.toLocaleString()} ` +
      `(${result.confidenceLabel}; ${result.refinementsApplied} detail answers applied)`,
  };

  return {
    isError: false,
    resultJson: JSON.stringify({
      priceLow: result.priceLow,
      priceHigh: result.priceHigh,
      confidence: result.confidenceLabel,
      refinementsApplied: result.refinementsApplied,
      ...(sqft !== requestedSqft
        ? {
            sqftAdjusted: `We price ${project} projects between ${sizeConfig.min} and ${sizeConfig.max} sqft; ${requestedSqft} was adjusted to ${sqft}. Tell the customer.`,
          }
        : {}),
      included: result.included,
      excludes: disclosure.excludes,
      assumptions: disclosure.assumptions,
      whatRaisesIt: disclosure.increases,
      whatLowersIt: disclosure.decreases,
      notices: [NOT_A_QUOTE_NOTICE, ONSITE_REQUIRED_NOTICE],
    }),
  };
}

function runRepairTool(input: unknown, state: AssistantSessionState): ToolExecution {
  const parsed = repairInputSchema.safeParse(input);
  if (!parsed.success) {
    return toolError(
      "Invalid inputs: " +
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }

  const items: RepairItemInput[] = parsed.data.repairs.map((r, i) => ({
    id: `assistant-${i}`,
    description: r.description,
    kind: r.kind,
    location: r.location,
    quantity: r.quantity ?? null,
  }));

  const estimate = estimateRe10(items, {
    occupancy: parsed.data.occupancy ?? "unknown",
    access: parsed.data.access ?? "standard",
    daysToDeadline: parsed.data.daysToDeadline ?? null,
    hasInspectionReport: parsed.data.hasInspectionReport ?? false,
  });

  const clamped = estimate.priced.filter((p) => p.quantityClamped);
  if (clamped.length > 0) {
    logPricingAlert("quantity-clamped", {
      route: "assistant",
      items: clamped.map((p) => ({ kind: p.input.kind, requested: p.input.quantity, used: p.quantity })),
    });
  }
  if (estimate.priced.length > 0 && estimate.quotedPrice <= 0) {
    logPricingAlert("zero-total", { route: "assistant", pricedCount: estimate.priced.length });
    return toolError("The engine could not price this list. Offer the free consultation instead.");
  }
  if (estimate.quotedPrice > IMPLAUSIBLE_QUOTE_CEILING) {
    logPricingAlert("implausible-total", { route: "assistant", quotedPrice: estimate.quotedPrice });
    return toolError("The computed number failed a sanity check. Offer the free consultation instead.");
  }

  if (estimate.quotedPrice > 0) {
    state.groundedPrices.push(estimate.quotedPrice);
    state.lastEstimate = {
      kind: "repairs",
      label: `Repair list - ${estimate.priced.length} priced item(s)`,
      priceLow: estimate.quotedPrice,
      priceHigh: estimate.quotedPrice,
      detail:
        `Firm $${estimate.quotedPrice.toLocaleString()} for ${estimate.priced.length} repair(s); ` +
        `${estimate.review.length} need an onsite look`,
    };
  }

  // Customer-safe shape only: no cost, no margin, no internal band, no line item.
  return {
    isError: false,
    resultJson: JSON.stringify({
      firmPrice: estimate.quotedPrice,
      validDays: estimate.quoteValidDays,
      confidence: estimate.confidence,
      categories: estimate.trades.map((t) => ({
        trade: TRADE_LABELS[t.trade],
        items: t.repairs.map((p) => ({
          description: p.input.description,
          pricedAs: p.recipe.label,
          quantity: p.quantity,
          unit: p.recipe.unit,
          quantityAssumed: p.quantityAssumed || p.quantityClamped,
        })),
      })),
      needsOnsite: estimate.review.map((r) => ({ description: r.input.description, why: r.text })),
      uncertainty: estimate.uncertainty,
      assumptions: estimate.assumptions,
      note:
        estimate.review.length > 0
          ? "Items under needsOnsite are NOT in the price; say so plainly."
          : undefined,
    }),
  };
}

async function runCaptureLead(
  input: unknown,
  state: AssistantSessionState,
): Promise<ToolExecution> {
  const parsed = captureLeadSchema.safeParse(input);
  if (!parsed.success) {
    return toolError(
      "Invalid inputs: " +
        parsed.error.issues.map((i) => `${i.path.join(".") || "contact"}: ${i.message}`).join("; "),
    );
  }

  // The estimate on the lead comes from session state the SERVER wrote when a
  // pricing tool ran - never from the model's arguments - so a lead cannot
  // carry a number no engine produced.
  const delivered = await deliverAssistantLead({
    ...parsed.data,
    estimate: state.lastEstimate,
  });

  if (!delivered.ok) {
    return toolError(
      "The lead could not be saved right now. Apologise and give the customer our phone number and email instead.",
    );
  }

  state.leadCaptured = true;
  return {
    isError: false,
    resultJson: JSON.stringify({
      saved: true,
      followUp: "within one business day",
    }),
  };
}

export async function executeAssistantTool(
  name: string,
  input: unknown,
  state: AssistantSessionState,
): Promise<ToolExecution> {
  switch (name) {
    case "price_remodel_estimate":
      return runRemodelTool(input, state);
    case "price_repair_list":
      return runRepairTool(input, state);
    case "capture_lead":
      return runCaptureLead(input, state);
    default:
      return toolError(`Unknown tool "${name}".`);
  }
}

/** Sanity export for the verify suite: every kind offered is a real recipe. */
export function assistantRepairKinds(): RepairKind[] {
  return (EXTRACTABLE_KINDS as RepairKind[]).filter((k) => Boolean(RECIPES[k]));
}
