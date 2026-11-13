"use client";

import { usePathname } from "next/navigation";
import { useModals } from "./modalsContext";
import { CTA_PRIMARY, CTA_SECONDARY, ESTIMATOR_PATH } from "@/shared/ctaCopy";

const cls =
  "text-sm text-inverse-muted hover:text-inverse-foreground transition-colors text-left";

export function FooterCTAs() {
  const { openConsult } = useModals();
  const isHome = usePathname() === "/";

  return (
    <>
      <li>
        <a href={ESTIMATOR_PATH} className={cls}>
          {CTA_PRIMARY}
        </a>
      </li>
      <li>
        {isHome ? (
          <a href="/#consult" className={cls}>
            {CTA_SECONDARY}
          </a>
        ) : (
          <button onClick={openConsult} className={cls}>
            {CTA_SECONDARY}
          </button>
        )}
      </li>
    </>
  );
}
