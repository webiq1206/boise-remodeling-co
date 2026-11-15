"use client";

import { useEffect, useState } from "react";
import type { EstimateInput } from "@/shared/estimatePresentation";

type Range = { priceLow: number; priceHigh: number };

/** Debounce selections and ignore every result that no longer matches them. */
export function usePlanningRange(input: EstimateInput) {
  const key = JSON.stringify(input);
  const [attempt, setAttempt] = useState(0);
  const [reply, setReply] = useState<{ key: string; range?: Range; error?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      deadline = setTimeout(() => {
        if (!controller.signal.aborted) {
          setReply({ key, error: "Range unavailable. Try again." });
          controller.abort();
        }
      }, 10_000);
      try {
        const response = await fetch("/api/planning-range", { method: "POST", headers: { "Content-Type": "application/json" }, body: key, signal: controller.signal });
        const value = await response.json();
        if (!response.ok || !Number.isFinite(value.priceLow) || !Number.isFinite(value.priceHigh) || value.priceLow < 0 || value.priceHigh < value.priceLow) throw new Error("Planning range unavailable");
        if (!controller.signal.aborted) setReply({ key, range: { priceLow: value.priceLow, priceHigh: value.priceHigh } });
      } catch {
        if (!controller.signal.aborted) setReply({ key, error: "Range unavailable. Try again." });
      } finally { clearTimeout(deadline); }
    }, 180);
    return () => { clearTimeout(timer); clearTimeout(deadline); controller.abort(); };
  }, [key, attempt]);
  const current = reply?.key === key ? reply : undefined;
  return {
    range: current?.range,
    error: current?.error,
    loading: !current,
    retry: () => { setReply(undefined); setAttempt(value => value + 1); },
  };
}
