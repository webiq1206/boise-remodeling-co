"use client";

import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/shared/siteConfig";

interface EmailLinkProps {
  className?: string;
  label?: string;
}

/** Renders a mailto trigger without exposing the address in static HTML. */
export function EmailLink({
  className = "",
  label = "Email us",
}: EmailLinkProps) {
  const [user, domain] = SITE_CONFIG.email.split("@");

  const handleClick = () => {
    window.location.href = `mailto:${user}@${domain}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      /* Callers supply the typography; the tap target is not theirs to forget.
         Measured at 26px tall on /contact before this. */
      className={cn("inline-flex items-center min-h-11 lg:min-h-0", className)}
      aria-label={`${label} - send email to ${SITE_CONFIG.name}`}
    >
      {label}
    </button>
  );
}
