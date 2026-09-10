import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { SaveContactLink } from "@/components/SaveContactLink";

interface BusinessPhoneLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Apply display num typography (large tabular phone). */
  "data-testid"?: string;
  display?: boolean;
  showIcon?: boolean;
  iconClassName?: string;
}

/** Click-to-call link using canonical site phone. */
export function BusinessPhoneLink({
  className,
  display = false,
  showIcon = false,
  iconClassName,
  children,
  "data-testid": testId = "link-phone",
  ...props
}: BusinessPhoneLinkProps) {
  return (
    <a
      href={SITE_CONFIG.phoneHref}
      className={cn(
        showIcon && "inline-flex items-center gap-1.5",
        display && "brc-display-num tabular-nums",
        className,
      )}
      data-testid={testId}
      {...props}
    >
      {showIcon && (
        <Phone className={cn("h-4 w-4 flex-shrink-0", iconClassName)} strokeWidth={1.5} aria-hidden />
      )}
      {children ?? SITE_CONFIG.phone}
    </a>
  );
}

interface BusinessPhoneContactProps {
  className?: string;
  phoneClassName?: string;
  saveClassName?: string;
  iconClassName?: string;
  layout?: "stack" | "inline" | "compact";
  /** Use span wrapper so phone + save can live inside a paragraph. */
  inline?: boolean;
  "data-testid"?: string;
  display?: boolean;
  showPhoneIcon?: boolean;
  showSaveIcon?: boolean;
  saveLabel?: string;
  phoneTestId?: string;
  saveTestId?: string;
}

/**
 * Phone number with an adjacent "Save to contacts" link - use anywhere the
 * business phone is shown on the marketing site.
 */
export function BusinessPhoneContact({
  className,
  phoneClassName,
  saveClassName,
  layout = "stack",
  inline = false,
  display = false,
  showPhoneIcon = false,
  showSaveIcon = false,
  iconClassName,
  saveLabel = "Save to contacts",
  phoneTestId,
  saveTestId,
}: BusinessPhoneContactProps) {
  const Wrapper = inline ? "span" : "div";

  return (
    <Wrapper
      className={cn(
        !inline && layout === "stack" && "flex flex-col items-start gap-1",
        !inline && layout === "inline" && "flex flex-wrap items-center gap-x-3 gap-y-1",
        !inline && layout === "compact" && "flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-3",
        inline && "inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 align-baseline",
        className,
      )}
    >
      <BusinessPhoneLink
        className={phoneClassName}
        display={display}
        showIcon={showPhoneIcon}
        iconClassName={iconClassName}
        data-testid={phoneTestId}
      />
      <SaveContactLink
        className={saveClassName}
        showIcon={showSaveIcon}
        data-testid={saveTestId}
      >
        {saveLabel}
      </SaveContactLink>
    </Wrapper>
  );
}
