"use client";

import { useMemo, useState } from "react";
import type { ClarifyingQuestion } from "@/shared/takeoff/clarify";

/**
 * One question. Then the next one.
 *
 * WHY THIS IS NOT A FORM. The honest alternative to guessing a price is
 * asking, but a screen of thirty fields is not asking - it is handing the work
 * back. An estimator answers "what do you charge per linear foot for a custom
 * bar front" in four seconds when it is the only thing on screen, and abandons
 * the same question when it is twelfth in a list. So exactly one question is
 * shown, the answer is applied immediately, and the next question is chosen
 * knowing what the last one settled.
 *
 * Progress is shown honestly: how much of the scope now carries a price, so
 * the person answering can see each answer moving the number and decide when
 * they have done enough. Skipping is always allowed - a question nobody can
 * answer today must not block the rest of the interview.
 */

export interface InterviewProgress {
  /** 0 to 1: share of base scope that now carries a price. */
  coverage: number;
  pricedCount: number;
  remainingCount: number;
  sellingPrice: number;
}

interface Props {
  question: ClarifyingQuestion | null;
  progress: InterviewProgress;
  answeredCount: number;
  totalQuestions: number;
  busy?: boolean;
  /** Resolves when the answer has been applied. */
  onAnswer: (question: ClarifyingQuestion, value: string) => Promise<void> | void;
  onSkip: (question: ClarifyingQuestion) => void;
  /** Shown when every question is answered or skipped. */
  onDone?: () => void;
}

export function ClarifyInterview({
  question,
  progress,
  answeredCount,
  totalQuestions,
  busy = false,
  onAnswer,
  onSkip,
  onDone,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const prompt = useMemo(() => {
    if (!question) return null;
    switch (question.answer.type) {
      case "money-per-unit":
        return { prefix: "$", suffix: `per ${question.answer.unit}`, mode: "number" as const };
      case "quantity":
        return { prefix: "", suffix: question.answer.unit, mode: "number" as const };
      default:
        return { prefix: "", suffix: "", mode: "text" as const };
    }
  }, [question]);

  if (!question) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-6 text-center" data-testid="interview-done">
        <p className="text-sm font-semibold">Nothing left to ask.</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {progress.pricedCount} item{progress.pricedCount === 1 ? "" : "s"} priced,{" "}
          {Math.round(progress.coverage * 100)}% of the scope covered.
        </p>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="mt-4 rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            See the bid
          </button>
        ) : null}
      </div>
    );
  }

  async function submit() {
    if (!question || !prompt) return;
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter an answer, or skip this one.");
      return;
    }
    if (prompt.mode === "number") {
      const n = Number(trimmed.replace(/[$,\s]/g, ""));
      if (!Number.isFinite(n) || n <= 0) {
        setError("That needs to be a number greater than zero.");
        return;
      }
    }
    setError(null);
    await onAnswer(question, trimmed);
    setValue("");
  }

  const kindLabel =
    question.kind === "rate"
      ? "Your price"
      : question.kind === "measurement"
        ? "A measurement we could not read"
        : "What this is";

  return (
    <div className="rounded-md border border-border bg-background p-5" data-testid="interview-question">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {kindLabel}
        </span>
        <span className="text-[11px] text-muted-foreground" data-testid="interview-counter">
          {answeredCount + 1} of {totalQuestions}
        </span>
      </div>

      <p className="mt-2 text-[15px] font-semibold leading-snug" data-testid="interview-prompt">
        {question.question}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground" data-testid="interview-why">
        {question.why}
      </p>

      {question.sheets.length > 0 ? (
        <p className="mt-1 text-[12px] text-muted-foreground">
          Read from {question.sheets.join(", ")}.
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        {prompt?.prefix ? <span className="text-sm text-muted-foreground">{prompt.prefix}</span> : null}
        <input
          data-testid="interview-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          inputMode={prompt?.mode === "number" ? "decimal" : "text"}
          disabled={busy}
          placeholder={prompt?.mode === "number" ? "0.00" : "Describe it in a few words"}
          className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={question.question}
        />
        {prompt?.suffix ? <span className="text-sm text-muted-foreground">{prompt.suffix}</span> : null}
      </div>

      {error ? (
        <p className="mt-1.5 text-[12.5px] text-destructive" data-testid="interview-error">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          data-testid="interview-submit"
          className="rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Applying..." : "Answer and continue"}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue("");
            setError(null);
            onSkip(question);
          }}
          disabled={busy}
          data-testid="interview-skip"
          className="rounded-sm border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          I do not know yet
        </button>
      </div>

      {/* Every answer moves this, which is the reason to answer the next one. */}
      <div className="mt-5 border-t border-border pt-3">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>
            {progress.pricedCount} priced, {progress.remainingCount} still unpriced
          </span>
          <span data-testid="interview-coverage">{Math.round(progress.coverage * 100)}% of scope</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${Math.round(progress.coverage * 100)}%` }}
          />
        </div>
        {progress.sellingPrice > 0 ? (
          <p className="mt-2 text-[13px]" data-testid="interview-running-total">
            Priced so far:{" "}
            <span className="font-semibold">${progress.sellingPrice.toLocaleString("en-US")}</span>
            <span className="text-muted-foreground"> (partial - not a bid until everything is priced)</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
