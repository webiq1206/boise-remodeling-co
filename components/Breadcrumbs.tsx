import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="py-3 md:py-4">
      <ol className="flex flex-wrap items-center gap-1.5 md:gap-2 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-1.5 md:gap-2">
              {item.href && !isLast ? (
                <Link 
                  href={item.href}
                  /* 21px tall on a phone before this. A breadcrumb is a real
                     navigation control, so it gets a real target on mobile and
                     keeps its compact desktop rhythm. */
                  className="inline-flex items-center min-h-11 md:min-h-0 hover:text-foreground transition-colors hover:underline"
                >
                  {item.name}
                </Link>
              ) : (
                <span className={isLast ? "text-foreground font-normal" : ""}>
                  {item.name}
                </span>
              )}
              
              {!isLast && (
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
