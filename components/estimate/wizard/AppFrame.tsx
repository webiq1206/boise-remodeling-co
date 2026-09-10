"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { requestHideMobileNavBar } from "@/lib/mobileNavBar";

export interface AppFrameStep {
  id: string;
  label: string;
}

export interface AppFrameProps {
  /** The page's single H1. Short: it shares one screen with the step. */
  title: ReactNode;
  eyebrow?: string;
  steps: AppFrameStep[];
  currentIndex: number;
  /** The step itself. Designed to fit; scrolls inside the frame only as a last resort. */
  children: ReactNode;
  /** Back / Continue. Rendered in flow inside the pinned footer, never sticky. */
  footer?: ReactNode;
  /** Optional one-line strip above the footer (a live range, a disclaimer). */
  footerAccessory?: ReactNode;
  /** Hide the step rail (results and success screens). */
  hideProgress?: boolean;
  className?: string;
}

/**
 * ONE SCREEN. The estimator as an app, not a form on a page.
 *
 * The frame is fixed to the viewport below the site header and owns everything
 * beneath it: a compact header (eyebrow, the page's H1, the step counter and a
 * slim progress rail), the step body, and a footer with Back and Continue
 * pinned to the bottom edge. Nothing on the page behind it can scroll - the
 * document scroll is locked while the frame is mounted - and the mobile
 * Call/Text bar steps aside so it never stacks on the footer.
 *
 * Measured before this existed: the /estimate page scrolled to 5,110px on a
 * phone and the first choice sat at 558px, under a hero. The brief for this
 * frame was "no scrolling whatsoever", and every step is designed to fit a
 * 390x844 phone with the browser chrome open. The body keeps `overflow-y:
 * auto` purely as a safety net for an unusually short viewport, because content
 * that cannot be reached at all is worse than content that scrolls.
 *
 * The same frame on all four sites: family rhythm and type, each site's own
 * ground and accent.
 */
export function AppFrame({
  title,
  eyebrow,
  steps,
  currentIndex,
  children,
  footer,
  footerAccessory,
  hideProgress = false,
  className,
}: AppFrameProps) {
  // Own the screen: lock the document scroll and hide the global mobile bar for
  // as long as the frame is mounted. Both are released on unmount.
  useEffect(() => {
    const release = requestHideMobileNavBar();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
      release();
    };
  }, []);

  const total = steps.length;
  const clamped = Math.min(Math.max(currentIndex, 0), Math.max(total - 1, 0));
  const current = steps[clamped];

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[90] flex flex-col bg-inverse text-inverse-foreground",
        "top-[var(--app-header-h,60px)]",
        className,
      )}
      id="calculator"
      data-testid="estimate-app-frame"
    >
      {/* HEADER - shrink-0, never scrolls. */}
      <header className="ed-shell shrink-0 pt-[clamp(12px,2.2vh,22px)] pb-[clamp(8px,1.4vh,14px)]">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && (
                <p className="ed-eyebrow !mb-1.5" style={{ color: "var(--ed-accent)" }}>
                  {eyebrow}
                </p>
              )}
              <h1 className="ed-h3 truncate !leading-[1.05]" data-testid="app-frame-title">
                {title}
              </h1>
            </div>
            {!hideProgress && total > 0 && (
              <p
                className="shrink-0 whitespace-nowrap text-[0.6875rem] uppercase tracking-[0.16em] text-inverse-muted"
                data-testid="app-frame-counter"
              >
                <span className="text-inverse-foreground">{clamped + 1}</span> of {total}
              </p>
            )}
          </div>
          {!hideProgress && total > 0 && (
            <>
              <ol className="mt-3 flex items-center gap-1" aria-hidden="true">
                {steps.map((s, i) => (
                  <li key={s.id} className="flex-1">
                    <span
                      className={cn(
                        "block h-[3px] w-full transition-colors duration-300",
                        i < clamped ? "bg-accent-legible" : i === clamped ? "bg-accent-legible/70" : "bg-inverse-foreground/15",
                      )}
                    />
                  </li>
                ))}
              </ol>
              <p className="sr-only" aria-live="polite" role="status">
                Step {clamped + 1} of {total}: {current?.label}
              </p>
            </>
          )}
        </div>
      </header>

      {/* BODY - the step. Fills the space between header and footer. Short steps
          centre vertically so a two-choice question does not sit in the top
          third of an empty screen; tall steps top-align and fall back to an
          internal scroll rather than clipping. */}
      <div className="ed-shell min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="app-frame-body">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center py-1">
          {children}
        </div>
      </div>

      {/* FOOTER - pinned to the bottom edge, safe-area aware. */}
      {(footer || footerAccessory) && (
        <footer
          className="ed-shell shrink-0 border-t border-inverse-foreground/[0.12] bg-inverse pb-safe pt-2 backdrop-blur-md"
          data-testid="app-frame-footer"
        >
          <div className="mx-auto w-full max-w-3xl">
            {footerAccessory && <div className="mb-2">{footerAccessory}</div>}
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}
