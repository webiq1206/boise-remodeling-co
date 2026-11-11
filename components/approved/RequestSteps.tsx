import { Check } from "lucide-react";

/**
 * The two steps, always in view: step 1 is the request itself (the only part anyone has to
 * complete), step 2 is optional photos and details. Once the request is saved, step 1 reads
 * "Request sent" with a tick, so nobody is left wondering whether the extra questions are
 * still part of sending it.
 */
export function RequestSteps({ sent }: { sent: boolean }) {
  return (
    <ol className="fold-steps" data-quote-steps="" data-quote-sent={sent ? "true" : "false"}>
      <li className="fold-step is-current-or-done" aria-current={sent ? undefined : "step"}>
        <span className="fold-step-badge" aria-hidden="true">
          {sent ? <Check size={14} /> : "1"}
        </span>
        <span>
          <span className="sr-only">Step 1: </span>
          {sent ? "Request sent" : "Your request"}
        </span>
      </li>
      <li className={sent ? "fold-step is-current" : "fold-step"} aria-current={sent ? "step" : undefined}>
        <span className="fold-step-badge" aria-hidden="true">
          2
        </span>
        <span>
          <span className="sr-only">Step 2: </span>
          Photos and details (optional)
        </span>
      </li>
    </ol>
  );
}
