import { Contact } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_VCARD_PATH } from "@/lib/vcard";

interface SaveContactLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string;
  /** When true, show the contact-card icon before the label. */
  showIcon?: boolean;
  children?: React.ReactNode;
}

/**
 * Link to the business vCard. On iPhone Safari, tapping opens Contacts with
 * "Add to Contacts" - no app install required.
 */
export function SaveContactLink({
  className,
  showIcon = false,
  children = "Save our contact",
  ...props
}: SaveContactLinkProps) {
  return (
    <a
      href={BUSINESS_VCARD_PATH}
      className={cn(
        showIcon && "inline-flex items-center gap-1.5",
        className,
      )}
      data-testid="link-save-contact"
      {...props}
    >
      {showIcon && <Contact className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} aria-hidden />}
      {children}
    </a>
  );
}
