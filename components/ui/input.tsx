import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        className={cn(
          /* 44px on a phone, 36px on desktop. h-9 everywhere put EVERY input
             on the site below the 44px touch minimum - a 36px target is a
             miss-and-retry on a thumb, and the address field on the estimate
             gate was exactly that. A mouse is precise enough for 36. */
          "flex h-11 md:h-9 w-full rounded-sm border border-input bg-background px-3 py-2 text-base ring-offset-background transition-colors duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
