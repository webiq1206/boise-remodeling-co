"use client";

import { useEffect } from "react";
import { reportEstimatorProgress, type EstimatorFlow, type EstimatorProgress } from "@/lib/estimatorSession";
import { AbandonmentPrompt } from "./AbandonmentPrompt";
import { useAbandonmentRecovery } from "./useAbandonmentRecovery";

export interface EstimatorRecoveryProps extends Omit<EstimatorProgress, "flow"> {
  flow: EstimatorFlow;
  /** The visitor has done enough that leaving is worth a prompt (default: step index > 0). */
  engaged?: boolean;
  /** Submitted: nothing to recover, tracking reports completion. */
  submitted?: boolean;
  inactivitySeconds?: number;
}

/**
 * Drop-in for any wizard or lead form: reports progress to the server for
 * partial-completion tracking and shows the abandonment prompt when an engaged
 * visitor is about to leave without submitting.
 */
export function EstimatorRecovery({ flow, engaged, submitted = false, inactivitySeconds, ...progress }: EstimatorRecoveryProps) {
  const isEngaged = engaged ?? progress.currentStepIndex > 0;
  const armed = isEngaged && !submitted;

  useEffect(() => {
    reportEstimatorProgress({ flow, ...progress, status: submitted ? "completed" : "active" });
    // Serialise the selections so a new object with the same content does not re-report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, submitted, progress.currentStep, progress.currentStepIndex, progress.totalSteps, progress.lastCompletedStep, JSON.stringify(progress.selections ?? {}), JSON.stringify(progress.validationErrors ?? [])]);

  const recovery = useAbandonmentRecovery({
    armed,
    inactivitySeconds,
    ignoreWithin: ['[data-testid="estimate-app-frame"]', "[data-estimator-root]"],
  });

  return (
    <AbandonmentPrompt
      open={recovery.open}
      flow={flow}
      method={recovery.method}
      leaving={recovery.method === "navigation" || recovery.method === "exit_control"}
      onStay={recovery.stay}
      onContinue={recovery.proceed}
    />
  );
}
