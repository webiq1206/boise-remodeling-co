import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  meta?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  align = "center",
  className,
}: PageHeaderProps) {
  const centered = align === "center";

  return (
    <header
      className={cn(
        "max-w-3xl",
        centered && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <p className={cn("brc-label mb-4", centered && "justify-center")}>{eyebrow}</p>
      )}
      <h1
        className={cn(
          "font-serif text-display md:text-[2.75rem] tracking-tight text-foreground",
          description ? "mb-4" : meta ? "mb-4" : "mb-0"
        )}
      >
        {title}
      </h1>
      {description && (
        <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto mb-4">
          {description}
        </p>
      )}
      {meta && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-4 text-sm text-muted-foreground",
            centered && "justify-center"
          )}
        >
          {meta}
        </div>
      )}
    </header>
  );
}
