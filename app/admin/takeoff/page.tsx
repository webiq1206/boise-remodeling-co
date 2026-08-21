"use client";

/**
 * Bidding a takeoff by answering questions.
 *
 * WHAT THIS PAGE IS FOR. The extractor can read a hundred-sheet commercial set
 * and produce a quantified takeoff for any trade. What it cannot do is invent
 * what this company charges. So the gap between "a complete takeoff" and "a
 * bid" is closed here, one question at a time, by the person who knows the
 * numbers - and every answer is kept, so the same question is never asked
 * twice and the rate book is assembled out of jobs actually bid.
 *
 * Paste the takeoff from an analysed plan set, classify it, then answer. The
 * price builds as you go and the page says plainly how much of the scope is
 * covered, so it is obvious when there is enough to send and when there is not.
 */

import { useCallback, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClarifyInterview, type InterviewProgress } from "@/components/takeoff/ClarifyInterview";
import { nextQuestion, type ClarifyingQuestion } from "@/shared/takeoff/clarify";
import { TRADE_LABELS } from "@/shared/takeoff/units";

interface BidSummary {
  pricedCount: number;
  measuredUnpricedCount: number;
  unmeasuredCount: number;
  allowanceCount: number;
  alternateCount: number;
  excludedCount: number;
  directCost: number;
  generalConditions: number;
  contingency: number;
  totalCost: number;
  sellingPrice: number;
  scopeCoverage: number;
  completeBid: boolean;
  warnings: string[];
  lines: {
    description: string;
    quantity: number;
    unit: string;
    rateLabel: string;
    unitCost: number;
    cost: number;
    caveat: string | null;
    stale: boolean;
  }[];
}

export default function AdminTakeoffPage() {
  const [raw, setRaw] = useState("");
  const [items, setItems] = useState<unknown[]>([]);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [bid, setBid] = useState<BidSummary | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateCount, setRateCount] = useState(0);

  const question = useMemo(() => nextQuestion(questions, handled), [questions, handled]);

  const progress: InterviewProgress = {
    coverage: bid?.scopeCoverage ?? 0,
    pricedCount: bid?.pricedCount ?? 0,
    remainingCount: (bid?.measuredUnpricedCount ?? 0) + (bid?.unmeasuredCount ?? 0),
    sellingPrice: bid?.sellingPrice ?? 0,
  };

  /** Re-classify and re-price. Called on load and after every answer. */
  const classify = useCallback(async (payload: unknown[]) => {
    const res = await fetch("/api/takeoff/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? data.error ?? "Classification failed");
    setItems(data.items);
    setQuestions(data.questions);
    setBid(data.bid);
    setRateCount(data.rateCount ?? 0);
    return data;
  }, []);

  async function loadTakeoff() {
    setBusy(true);
    setError(null);
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed.scopeItems;
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error("That did not contain a scope item list.");
      }
      setHandled(new Set());
      await classify(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that takeoff.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(q: ClarifyingQuestion, value: string) {
    setBusy(true);
    setError(null);
    try {
      if (q.kind === "rate" && q.workType) {
        const res = await fetch("/api/takeoff/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workType: q.workType,
            trade: q.trade,
            // The classifier's grade rides on the question's work type; custom
            // is the safe default for drawn-to-order work, and a wrong grade
            // only ever produces a caveat rather than a silent mismatch.
            grade: "custom",
            unit: q.unit,
            unitCost: Number(value.replace(/[$,\s]/g, "")),
            label: q.workType.replace(/-/g, " "),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "The rate could not be saved.");
        setRateCount(data.rateCount ?? rateCount);
        // Re-price against the book that now includes this answer.
        await classify(items);
      }
      setHandled((prev) => new Set(prev).add(q.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That answer could not be applied.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell variant="admin">
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Load a takeoff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              Paste the scope items from an analysed plan set. Every rate you answer below is kept, so
              the next job that carries the same work is priced without asking again.
              {rateCount > 0 ? ` The book currently holds ${rateCount} rate${rateCount === 1 ? "" : "s"}.` : ""}
            </p>
            <textarea
              data-testid="takeoff-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={6}
              placeholder='[{"description":"Bar front millwork","trade":"millwork","quantity":22.69,"unit":"LF","sheet":"A403","commercialStatus":"base","inContract":true}]'
              className="w-full rounded-sm border border-border bg-background p-2 font-mono text-label"
            />
            <button
              type="button"
              onClick={() => void loadTakeoff()}
              disabled={busy || !raw.trim()}
              data-testid="takeoff-load"
              className="rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {busy ? "Working..." : "Classify and start"}
            </button>
            {error ? (
              <p className="text-body-sm text-destructive" data-testid="takeoff-error">
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {bid ? (
          <ClarifyInterview
            question={question}
            progress={progress}
            answeredCount={handled.size}
            totalQuestions={questions.length}
            busy={busy}
            onAnswer={answer}
            onSkip={(q) => setHandled((prev) => new Set(prev).add(q.id))}
          />
        ) : null}

        {bid ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">The bid so far</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-body-sm">
                <Stat label="Priced" value={String(bid.pricedCount)} />
                <Stat label="No rate yet" value={String(bid.measuredUnpricedCount)} />
                <Stat label="Not measured" value={String(bid.unmeasuredCount)} />
                <Stat label="Scope covered" value={`${Math.round(bid.scopeCoverage * 100)}%`} />
                <Stat label="Direct cost" value={`$${bid.directCost.toLocaleString("en-US")}`} />
                <Stat label="Selling price" value={`$${bid.sellingPrice.toLocaleString("en-US")}`} />
              </div>

              {!bid.completeBid ? (
                <p className="rounded-sm border border-amber-400/40 bg-amber-400/[0.08] p-3 text-body-sm leading-relaxed">
                  This is a PARTIAL total. {bid.measuredUnpricedCount + bid.unmeasuredCount} item(s) are
                  not in it. Do not send it as a bid until everything is priced or deliberately excluded.
                </p>
              ) : (
                <p className="rounded-sm border border-border bg-muted/40 p-3 text-body-sm">
                  Every base item is priced. This total covers the whole takeoff.
                </p>
              )}

              {bid.lines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-1 pr-2 font-medium">Item</th>
                        <th className="py-1 pr-2 font-medium">Qty</th>
                        <th className="py-1 pr-2 font-medium">Rate</th>
                        <th className="py-1 font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody data-testid="bid-lines">
                      {bid.lines.map((l, i) => (
                        <tr key={i} className="border-b border-border/50 align-top">
                          <td className="py-1.5 pr-2">
                            {l.description.slice(0, 70)}
                            {l.caveat ? (
                              <span className="block text-label text-amber-700">{l.caveat}</span>
                            ) : null}
                          </td>
                          <td className="py-1.5 pr-2 whitespace-nowrap">
                            {l.quantity} {l.unit}
                          </td>
                          <td className="py-1.5 pr-2 whitespace-nowrap">${l.unitCost}</td>
                          <td className="py-1.5 whitespace-nowrap">${l.cost.toLocaleString("en-US")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {bid.warnings.length > 0 ? (
                <ul className="space-y-1 text-body-sm text-muted-foreground">
                  {bid.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PortalShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border p-2">
      <div className="text-label uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-body font-semibold">{value}</div>
    </div>
  );
}

void TRADE_LABELS;
