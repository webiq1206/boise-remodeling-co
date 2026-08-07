import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { clientKeyFrom, rateLimit } from "@/lib/rateLimit";
import {
  ASSISTANT_TOOL_DEFINITIONS,
  emptySessionState,
  executeAssistantTool,
  type AssistantSessionState,
} from "@/server/services/assistantTools";
import {
  extractDollarAmounts,
  findUngroundedPrices,
  signTranscript,
  verifyTranscript,
} from "@/server/services/assistantGuard";
import { buildAssistantSystemPrompt } from "@/server/services/assistantPrompt";
import { logPricingAlert } from "@/server/services/pricingAlerts";
import { SITE_CONFIG } from "@/shared/siteConfig";

/**
 * The estimating assistant's single endpoint.
 *
 * Stateless by design: the client holds the conversation and posts it back,
 * HMAC-signed so the server only ever continues a history it wrote itself.
 * Every price the assistant can say is computed server-side by the same
 * engines the estimator pages run (see assistantTools.ts), and the reply is
 * scanned before it leaves: a dollar figure no tool returned and no customer
 * typed kills the reply, not the other way round.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

/* Each accepted message costs model tokens and can run several tool calls.
   Generous enough for a real conversation, tight enough that a loop cannot
   burn the account. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const MAX_TURNS = 40;
const MAX_TOOL_ROUNDS = 5;
const MODEL = "claude-sonnet-5";

const transcriptMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const sessionStateSchema = z.object({
  groundedPrices: z.array(z.number()).max(200),
  lastEstimate: z
    .object({
      kind: z.enum(["remodel", "repairs"]),
      label: z.string().max(300),
      priceLow: z.number(),
      priceHigh: z.number(),
      detail: z.string().max(600),
    })
    .nullable(),
  leadCaptured: z.boolean(),
});

const transcriptPayloadSchema = z.object({
  messages: z.array(transcriptMessageSchema).max(MAX_TURNS),
  state: sessionStateSchema,
});

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  transcript: z
    .object({
      payload: z.string().max(300_000),
      signature: z.string().max(200),
    })
    .optional(),
  /**
   * What the visitor was doing on the site when they opened the chat. Names
   * and settings only - deliberately NO prices, so a tampered client cannot
   * seed the conversation with a number the guard would then have to trust.
   */
  context: z
    .object({
      page: z.string().max(200).optional(),
      estimator: z
        .object({
          project: z.string().max(30).optional(),
          finish: z.string().max(20).optional(),
          sqft: z.number().positive().max(100_000).optional(),
        })
        .optional(),
    })
    .optional(),
});

const FALLBACK_UNAVAILABLE = `The assistant is offline right now. The project estimator on this site prices remodels instantly, or call us at ${SITE_CONFIG.phone} - a real person answers during business hours.`;

const FALLBACK_UNGROUNDED =
  "I don't want to guess at a number for that. Let me run the actual estimate - can you confirm the project type, rough square footage, and the finish level you have in mind? Or book the free in-home consultation and the team will price it properly.";

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKeyFrom(request.headers, "assistant-chat"), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { message: "That's a lot of messages at once. Give it a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ message: FALLBACK_UNAVAILABLE, unavailable: true }, { status: 503 });
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  // Continue only a history this server signed; anything else starts fresh.
  // Client-side tampering is not an error worth reporting, just a reset.
  let history: z.infer<typeof transcriptMessageSchema>[] = [];
  let state: AssistantSessionState = emptySessionState();
  if (body.transcript) {
    if (!verifyTranscript(body.transcript.payload, body.transcript.signature)) {
      return NextResponse.json({ message: "Conversation expired. Say that again to start fresh.", reset: true }, { status: 409 });
    }
    try {
      const payload = transcriptPayloadSchema.parse(JSON.parse(body.transcript.payload));
      history = payload.messages;
      state = payload.state;
    } catch {
      return NextResponse.json({ message: "Conversation expired. Say that again to start fresh.", reset: true }, { status: 409 });
    }
  }

  let system = buildAssistantSystemPrompt();
  if (body.context?.page || body.context?.estimator) {
    const bits: string[] = [];
    if (body.context.page) bits.push(`they are on ${body.context.page}`);
    const est = body.context.estimator;
    if (est && (est.project || est.finish || est.sqft)) {
      bits.push(
        `they were using the estimator with ${[est.project, est.finish, est.sqft ? `${est.sqft} sqft` : null]
          .filter(Boolean)
          .join(", ")} - if relevant, offer to price exactly that (run the tool; the settings alone carry no number)`,
      );
    }
    system += `\n\nVISITOR CONTEXT (from the page, not the customer's words): ${bits.join("; ")}.`;
  }

  const anthropic = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: body.message },
  ];

  let reply = "";
  try {
    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system,
      tools: ASSISTANT_TOOL_DEFINITIONS,
      messages,
    });

    for (let round = 0; round < MAX_TOOL_ROUNDS && response.stop_reason === "tool_use"; round++) {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const execution = await executeAssistantTool(block.name, block.input, state);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: execution.resultJson,
          is_error: execution.isError,
        });
      }
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system,
        tools: ASSISTANT_TOOL_DEFINITIONS,
        messages,
      });
    }

    reply = textOf(response.content);

    // THE GROUNDING GATE. Allowed numbers: what tools returned (all session),
    // and what the customer typed themselves. Everything else is invented.
    const allowed = [
      ...state.groundedPrices,
      ...extractDollarAmounts([...history.filter((m) => m.role === "user").map((m) => m.content), body.message].join("\n")),
    ];
    let ungrounded = findUngroundedPrices(reply, allowed);
    if (ungrounded.length > 0) {
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content:
          `SYSTEM CHECK - the customer has not seen your reply. It contained ${ungrounded.map((n) => `$${n.toLocaleString()}`).join(", ")}, ` +
          `which no pricing tool returned. Rewrite it now, stating only numbers a tool returned in this conversation, ` +
          `or ask for what you need and run the tool. Do not mention this check.`,
      });
      const retry = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system,
        tools: ASSISTANT_TOOL_DEFINITIONS,
        messages,
      });
      // A retry that reaches for a tool is doing the right thing; give it one round.
      let retryResponse = retry;
      if (retryResponse.stop_reason === "tool_use") {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of retryResponse.content) {
          if (block.type !== "tool_use") continue;
          const execution = await executeAssistantTool(block.name, block.input, state);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: execution.resultJson, is_error: execution.isError });
        }
        messages.push({ role: "assistant", content: retryResponse.content });
        messages.push({ role: "user", content: toolResults });
        retryResponse = await anthropic.messages.create({ model: MODEL, max_tokens: 1500, system, tools: ASSISTANT_TOOL_DEFINITIONS, messages });
      }
      const rewritten = textOf(retryResponse.content);
      ungrounded = findUngroundedPrices(rewritten, [...state.groundedPrices, ...allowed]);
      if (ungrounded.length > 0) {
        logPricingAlert("assistant-ungrounded-price", { ungrounded, dropped: true });
        reply = FALLBACK_UNGROUNDED;
      } else {
        logPricingAlert("assistant-ungrounded-price", { ungrounded: [], recovered: true });
        reply = rewritten;
      }
    }
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 429 || status === 529) {
      return NextResponse.json({ message: "We're a bit swamped - give it a minute and try again.", busy: true }, { status: 503 });
    }
    console.error("[assistant-chat] model call failed:", err);
    return NextResponse.json({ message: FALLBACK_UNAVAILABLE, unavailable: true }, { status: 502 });
  }

  if (!reply) reply = FALLBACK_UNGROUNDED;

  // Persist text turns only; tool traffic stays server-side. Cap the window
  // from the front so the signed payload cannot grow without bound.
  const nextHistory = [...history, { role: "user" as const, content: body.message }, { role: "assistant" as const, content: reply.slice(0, 8000) }];
  while (nextHistory.length > MAX_TURNS) nextHistory.shift();
  state.groundedPrices = state.groundedPrices.slice(-200);

  const payload = JSON.stringify({ messages: nextHistory, state });

  return NextResponse.json({
    reply,
    transcript: { payload, signature: signTranscript(payload) },
    leadCaptured: state.leadCaptured,
    lastEstimate: state.lastEstimate
      ? { kind: state.lastEstimate.kind, label: state.lastEstimate.label }
      : null,
  });
}
