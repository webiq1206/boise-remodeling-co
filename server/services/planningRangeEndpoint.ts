import { z } from "zod";
import { calculateEstimate } from "../../shared/estimateEngine";
import { EMPTY_REFINEMENTS, getProjectSizeConfig } from "../../shared/estimatePresentation";

const refinements = z.object({
  layoutChanges: z.enum(["none", "moderate", "major"]).nullable().optional(),
  plumbingElectrical: z.enum(["cosmetic", "partial", "full"]).nullable().optional(),
  cabinetTier: z.enum(["standard", "semi-custom", "custom"]).nullable().optional(),
  fixtureCount: z.number().int().min(1).max(8).nullable().optional(),
  stories: z.number().int().min(1).max(2).nullable().optional(),
  roomCount: z.number().int().min(1).max(12).nullable().optional(),
  bathroomCount: z.number().int().min(0).max(12).nullable().optional(),
  kitchenIncluded: z.boolean().nullable().optional(),
  aduConfig: z.enum(["detached", "attached"]).nullable().optional(),
  upgradeScope: z.array(z.enum(["cabinets", "counters", "flooring", "lighting", "shower", "tub", "vanity", "tile"])).max(8).nullable().optional(),
}).strict();
const input = z.object({
  project: z.enum(["kitchen", "bathroom", "whole-home", "addition", "adu", "basement"]),
  finish: z.enum(["refresh", "mid-range", "high-end", "luxury"]),
  sqft: z.number().int().positive().max(8000),
  refinements: refinements.optional(),
}).strict().superRefine((value, context) => {
  const size = getProjectSizeConfig(value.project);
  if (value.sqft < size.min || value.sqft > size.max) context.addIssue({ code: "custom", path: ["sqft"], message: "Area outside this project's supported range" });
  const scope = value.refinements?.upgradeScope;
  const allowed = value.project === "kitchen" ? ["cabinets", "counters", "flooring", "lighting"] : value.project === "bathroom" ? ["shower", "tub", "vanity", "tile"] : [];
  if (scope && (new Set(scope).size !== scope.length || scope.some(choice => !allowed.includes(choice)))) context.addIssue({ code: "custom", path: ["refinements", "upgradeScope"], message: "Choose each supported project component once" });
});
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

/** Public computation only: no customer data, persistence, credentials, or providers. */
export async function planningRangePost(request: Request): Promise<Response> {
  try {
    if ((request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() !== "application/json") return reply({ error: "Send a JSON planning selection." }, 415);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Choose a project, size and finish." }, 400);
    const parts: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 4096) { await reader.cancel(); return reply({ error: "Planning selections are too large." }, 413); }
      parts.push(chunk.value);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
    const selection = input.safeParse(JSON.parse(new TextDecoder().decode(body)));
    if (!selection.success) return reply({ error: "Check your project, size and finish selections." }, 400);
    const value = selection.data;
    const result = calculateEstimate({ ...value, refinements: { ...EMPTY_REFINEMENTS, ...value.refinements } });
    return reply({ priceLow: result.priceLow, priceHigh: result.priceHigh });
  } catch {
    return reply({ error: "This planning range is unavailable. Check your selections and try again." }, 400);
  }
}
