"use client";

import { useState } from "react";
import { ApprovedEstimate } from "./ApprovedEstimate";

/** The multi-step intake stays available, but it is not the first ask. */
export function OptionalIntake() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <section className="fold-optional" id="planning-range">
        <div className="f-container">
          <p className="f-eyebrow">OPTIONAL</p>
          <h2>A planning range, when you want one.</h2>
          <p>
            Call, chat, or the short request is enough for us to look at the work. This guided
            intake asks more questions, and you can skip it.
          </p>
          <button type="button" className="fold-optional-open" onClick={() => setOpen(true)}>
            Open the optional intake
          </button>
        </div>
      </section>
    );
  }
  return (
    <div id="planning-range">
      <ApprovedEstimate />
    </div>
  );
}
