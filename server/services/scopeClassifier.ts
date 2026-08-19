import Anthropic from "@anthropic-ai/sdk";
import { mapWithConcurrency } from "@/server/services/documentSplit";
import {
  COMMON_WORK_TYPES,
  canonicalWorkType,
  type ClassifiedWork,
} from "@/shared/takeoff/workTypes";
import { TRADES, type Trade } from "@/shared/takeoff/units";

/**
 * Working out what each extracted scope item actually IS, so it can be priced
 * or asked about precisely.
 *
 * WHY THIS IS A SEPARATE PASS AND NOT PART OF EXTRACTION. Two reasons, both
 * practical. The plan schema sits exactly at the API's 16 union-typed
 * parameter ceiling, so it has no room for the fields this produces. And
 * classification is cheap, re-runnable, and depends only on text - so when the
 * rate book grows, or a work type is renamed, the whole corpus can be
 * reclassified without re-reading a single drawing.
 *
 * WHAT IT MUST NOT DO. It must not invent quantities, and it must not claim
 * confidence it does not have. A wrongly classified item priced at a confident
 * rate is worse than an unclassified one, because the first produces a number
 * and the second produces a question.
 */

const MODEL = "claude-sonnet-5";
const BATCH_SIZE = 12;
const CONCURRENCY = 4;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description: "One entry per item supplied, in the same order. Never skip or merge.",
      items: {
        type: "object",
        properties: {
          position: { type: "integer", description: "1-based position of the item in this request." },
          workType: {
            type: "string",
            description:
              "Slug naming what this assembly IS, lowercase and hyphenated, e.g. \"bar-front\" or \"base-cabinet-run\". REUSE one of the known work types when it fits - a synonym hides a rate the company already has. Coin a new slug only for work genuinely not in the list.",
          },
          trade: { type: "string", enum: TRADES },
          grade: {
            type: "string",
            enum: ["economy", "standard", "premium", "custom", ""],
            description:
              "Quality tier, where the drawings imply one. Custom millwork drawn as a one-off is \"custom\"; a catalogue cabinet is \"standard\". Use \"\" when the sheets genuinely do not say.",
          },
          material: { type: "string", description: "Primary material as the drawings name it, or \"\"." },
          finish: { type: "string", description: "Finish or coating, or \"\"." },
          size: { type: "string", description: "Size or height class where it changes the method, or \"\"." },
          confidence: {
            type: "number",
            description:
              "0 to 1: how sure you are this is the right work type. Be honest - below 0.6 routes this to a question instead of a price, which is the correct outcome for a guess.",
          },
          needsToKnow: {
            type: "array",
            items: { type: "string" },
            description:
              "What a pricer would still need to know, each as one short question. Empty when the description is sufficient to price from. Do not list things the description already answers.",
          },
        },
        required: ["position", "workType", "trade", "grade", "material", "finish", "size", "confidence", "needsToKnow"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

function buildPrompt(knownTypes: string): string {
  return `You are an estimator classifying construction scope so it can be priced.

For each item you are given, decide what the work ACTUALLY IS at the level a price depends on, and how confident you are.

The work type is the assembly, not the trade. "Millwork" is a trade; "bar-front", "base-cabinet-run" and "glass-shelving" are work types, and they differ in price by an order of magnitude. Getting this level right is the whole job.

KNOWN WORK TYPES - reuse one of these whenever it fits, exactly as spelled:
${knownTypes}

If the item is genuinely not one of those, coin a new slug in the same style: lowercase, hyphenated, naming the assembly rather than its location ("wine-display-cabinet", not "cabinet-by-window").

Grade matters more than material inside one work type. Custom-drawn architectural woodwork is "custom"; a catalogue unit is "standard". Where the drawings say "per interior designer" without specifying, the grade is usually "custom" for a restaurant or hospitality fit-out and "standard" for a production house - but only say so if the drawings support it, and lower your confidence when they do not.

confidence is a real judgement, not a formality. Set it below 0.6 when you are inferring rather than reading, because a low score sends the item to a human question instead of to a price, and that is the right outcome for a guess.

needsToKnow is what a pricer would still have to ask. Be specific and short: "Is the bar front paneled or slab?" beats "more detail needed". Leave it empty when the description already says enough.`;
}

interface RawClassification {
  position: number;
  workType: string;
  trade: Trade;
  grade: string;
  material: string;
  finish: string;
  size: string;
  confidence: number;
  needsToKnow: string[];
}

export interface ClassifierInput {
  description: string;
  trade: Trade;
  sheet: string | null;
}

/**
 * Classify every item. Falls back to a usable classification rather than
 * throwing: an unclassified item still needs to reach the question queue,
 * and losing it because a model call failed would be a silent vanish.
 */
export async function classifyScope(
  items: ClassifierInput[],
  client: Anthropic,
): Promise<ClassifiedWork[]> {
  if (items.length === 0) return [];

  const knownTypes = Object.entries(COMMON_WORK_TYPES)
    .map(([slug, meta]) => `  ${slug} (${meta.trade}, ${meta.unit}) - ${meta.label}`)
    .join("\n");
  const system = buildPrompt(knownTypes);

  const batches: { start: number; items: ClassifierInput[] }[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push({ start: i, items: items.slice(i, i + BATCH_SIZE) });
  }

  const out: ClassifiedWork[] = items.map((item) => fallback(item));

  await mapWithConcurrency(batches, CONCURRENCY, async (batch) => {
    try {
      const listing = batch.items
        .map((item, i) => `${i + 1}. [${item.trade}${item.sheet ? `, ${item.sheet}` : ""}] ${item.description}`)
        .join("\n");

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system,
        output_config: {
          format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> },
        },
        messages: [{ role: "user", content: `Classify these ${batch.items.length} items:\n\n${listing}` }],
      } as Anthropic.Messages.MessageCreateParamsNonStreaming);

      if (message.stop_reason === "max_tokens") throw new Error("classification truncated");
      const text = message.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new Error("no text");
      const parsed = JSON.parse(text.text) as { items: RawClassification[] };

      for (const raw of parsed.items) {
        const ordinal = Math.round(raw.position);
        if (!Number.isFinite(ordinal) || ordinal < 1 || ordinal > batch.items.length) continue;
        out[batch.start + ordinal - 1] = {
          workType: canonicalWorkType(raw.workType),
          trade: TRADES.includes(raw.trade) ? raw.trade : batch.items[ordinal - 1].trade,
          attributes: {
            grade: (["economy", "standard", "premium", "custom"] as const).includes(raw.grade as never)
              ? (raw.grade as ClassifiedWork["attributes"]["grade"])
              : undefined,
            material: raw.material || undefined,
            finish: raw.finish || undefined,
            size: raw.size || undefined,
          },
          confidence: clamp01(raw.confidence),
          needsToKnow: Array.isArray(raw.needsToKnow) ? raw.needsToKnow.filter(Boolean).slice(0, 4) : [],
        };
      }
    } catch (err) {
      // The fallback classification is already in place; the item reaches the
      // question queue as low-confidence rather than disappearing.
      console.error("[scopeClassifier] batch failed:", err);
    }
    return null;
  });

  return out;
}

function fallback(item: ClassifierInput): ClassifiedWork {
  return {
    workType: "unclassified",
    trade: item.trade,
    attributes: {},
    // Deliberately below the scope-question threshold: an item we could not
    // classify must be asked about, never priced off a default.
    confidence: 0,
    needsToKnow: [],
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
