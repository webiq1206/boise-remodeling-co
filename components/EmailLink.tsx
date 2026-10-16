import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/shared/siteConfig";

interface EmailLinkProps {
  className?: string;
  /** Visible text. Defaults to the address itself so the mailto is readable without JavaScript. */
  label?: string;
}

/** A real mailto link. The address is text in the HTML, not assembled on click. */
export function EmailLink({
  className = "",
  label,
}: EmailLinkProps) {
  const address = SITE_CONFIG.email;
  return (
    <a
      href={`mailto:${address}`}
      className={cn("inline-flex items-center min-h-11 lg:min-h-0", className)}
    >
      {label ?? address}
    </a>
  );
}
