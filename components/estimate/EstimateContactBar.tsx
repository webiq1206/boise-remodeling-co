import { SITE_CONFIG } from "@/shared/siteConfig";

/**
 * Call and text sit above the estimator. The estimator measures a fixed
 * header and insets itself, so this bar stays visible without covering
 * the estimator's own controls.
 */
export function EstimateContactBar() {
  return (
    <header
      data-site-header
      data-testid="estimate-contact-bar"
      className="fixed inset-x-0 top-0 z-[120] flex h-12 items-stretch border-b border-border bg-background"
    >
      <a
        href={SITE_CONFIG.phoneHref}
        className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-foreground"
        data-testid="link-estimate-call"
      >
        Call {SITE_CONFIG.phone}
      </a>
      <a
        href={SITE_CONFIG.phoneSmsHref}
        className="flex flex-1 items-center justify-center gap-2 border-l border-border text-sm font-medium text-foreground"
        data-testid="link-estimate-text"
      >
        Text {SITE_CONFIG.phone}
      </a>
    </header>
  );
}
