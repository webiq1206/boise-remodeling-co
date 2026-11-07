import { isEstimatorPath } from "@/lib/p5/estimatorRoutes";
import { isPortalPath } from "@/lib/portalRoutes";

/** Exact public wording. No parenthetical, no env var. */
export const REGISTRATION_LINE = "Idaho Registered Contractor #8381215";

/** Idaho DOPL public search. There is no direct record URL. */
export const DOPL_LICENSE_SEARCH = "https://edopl.idaho.gov/OnlineServices/?link=PubSearch";

/** Sitemap pages link the line. Estimator funnel pages keep the same words as plain text. */
function withoutTrailingSlash(pathname: string | null | undefined): string {
  if (!pathname) return "";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function registrationPresentation(pathname: string | null | undefined): "link" | "plain" | "hidden" {
  if (isPortalPath(pathname)) return "hidden";
  if (isEstimatorPath(pathname)) return "plain";
  return "link";
}

const lineClass = "inline overflow-visible whitespace-normal break-words [overflow-wrap:anywhere] [text-overflow:clip]";

export function RegistrationLine({ plain = false }: { plain?: boolean }) {
  if (plain) {
    return (
      <span data-testid="registration-line" className={lineClass}>
        {REGISTRATION_LINE}
      </span>
    );
  }
  return (
    <a
      data-testid="registration-line"
      href={DOPL_LICENSE_SEARCH}
      target="_blank"
      rel="noopener noreferrer"
      title="Idaho contractor registration 8381215"
      aria-label="Idaho contractor registration 8381215, opens in a new tab"
      className={`${lineClass} underline underline-offset-2 transition-colors hover:text-inverse-foreground`}
    >
      {REGISTRATION_LINE}
    </a>
  );
}
