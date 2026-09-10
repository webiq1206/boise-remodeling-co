import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-normal transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
  " hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border",
        outline:
          // Shows the background color of whatever card / sidebar / accent background it is inside of.
          // Inherits the current text color.
          " border [border-color:var(--button-outline)]  shadow-xs active:shadow-none ",
        secondary: "border bg-secondary text-secondary-foreground border border-secondary-border ",
        // Add a transparent border so that when someone toggles a border on later, it doesn't shift layout/size.
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        brand:
          "rounded-none bg-primary text-primary-foreground border border-primary-border min-h-[58px] px-8 text-[11px] font-bold uppercase tracking-[0.16em] gap-5",
        brandOutline:
          "rounded-none border border-foreground/80 bg-transparent text-foreground min-h-[58px] px-8 text-[11px] font-bold uppercase tracking-[0.16em] gap-5 hover:bg-foreground hover:text-background",
        /** Ghost CTA for use over dark hero imagery / inverse bands. */
        heroGhost:
          "rounded-sm border border-inverse-foreground/30 bg-inverse-foreground/10 text-inverse-foreground backdrop-blur-sm min-h-11 px-6 py-3.5",
        /** The hero's secondary CTA: same 58px uppercase format as `brand` so the
            pair reads as a pair, with inverse colours for use over photography. */
        heroOutline:
          "rounded-none border border-inverse-foreground/70 bg-inverse-foreground/[0.08] text-inverse-foreground backdrop-blur-sm min-h-[58px] px-8 text-[11px] font-bold uppercase tracking-[0.16em] gap-5 hover:bg-inverse-foreground hover:text-inverse",
        /** @deprecated Marketing uses brand only. Kept for backward compatibility. */
        brandGhost:
          "rounded-sm border border-transparent text-foreground min-h-11 px-6 py-3.5",
        /** @deprecated Marketing uses brand (charcoal) for primary CTAs. */
        brandAccent:
          "rounded-none bg-primary text-primary-foreground border border-primary-border min-h-[58px] px-8 text-[11px] font-bold uppercase tracking-[0.16em] gap-5",
        /** @deprecated Use brandOutline on light backgrounds. */
        brandInverseOutline:
          "rounded-none border border-foreground/80 bg-transparent text-foreground min-h-[58px] px-8 text-[11px] font-bold uppercase tracking-[0.16em] gap-5 hover:bg-foreground hover:text-background",
      },
      // Heights are set as "min" heights, because sometimes Ai will place large amount of content
      // inside buttons. With a min-height they will look appropriate with small amounts of content,
      // but will expand to fit large amounts of content.
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-11 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    /*
     * The marketing variants each declare min-h-11 (44px, the accessibility
     * touch target), but `size` is merged AFTER `variant`, so the default
     * size's min-h-9 silently won and every marketing CTA rendered at 36px.
     * On a phone the homepage's primary "Get an estimate" button measured 38px
     * including its border, under the 44px minimum.
     *
     * Restated here as a compound variant so it merges last and wins. Scoped to
     * the marketing variants on purpose: raising `size.default` globally would
     * also inflate the dense admin and form buttons, where 36px is correct.
     */
    compoundVariants: [
      {
        variant: [
          "brand",
          "brandOutline",
          "heroGhost",
          "heroOutline",
          "brandGhost",
          "brandAccent",
          "brandInverseOutline",
        ],
        size: "default",
        class: "min-h-11 px-6 py-3.5",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
