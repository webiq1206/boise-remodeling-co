import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        md: "2rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      borderRadius: {
        lg: "4px",
        md: "2px",
        sm: "1px",
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        // Sage kept AA-legible on the dark ground. Same value as --accent now
        // that the brand kit uses a single sage (#9AA098); the token name is
        // kept because a lot of markup asks for it by intent.
        "accent-legible": "hsl(var(--accent-legible) / <alpha-value>)",
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          soft: "hsl(var(--success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          soft: "hsl(var(--warning-soft) / <alpha-value>)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        brass: {
          DEFAULT: "hsl(var(--brass) / <alpha-value>)",
          foreground: "hsl(var(--brass-foreground) / <alpha-value>)",
          border: "var(--brass-border)",
        },
        inverse: {
          DEFAULT: "hsl(var(--inverse) / <alpha-value>)",
          foreground: "hsl(var(--inverse-foreground) / <alpha-value>)",
          muted: "hsl(var(--inverse-muted) / <alpha-value>)",
        },
        "surface-muted": "hsl(var(--surface-muted) / <alpha-value>)",
        "surface-greige": "hsl(var(--surface-greige) / <alpha-value>)",
        "tint-warm": "hsl(var(--tint-warm) / <alpha-value>)",
        "tint-cool": "hsl(var(--tint-cool) / <alpha-value>)",
        "tint-blush": "hsl(var(--tint-blush) / <alpha-value>)",
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Helvetica Neue", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["Menlo", "Monaco", "monospace"],
      },
      /**
       * THE TYPE SCALE. Seven steps, and nothing outside them.
       *
       * WHY THIS EXISTS. An audit found 316 hardcoded pixel sizes across 28
       * files spanning fifteen distinct values from 9px to 22px - 93 of them
       * at 11px or smaller. That is not a system, it is drift, and it is the
       * measurable reason body text read as too small. Six adjacent labels
       * could be 11px, 11.5px, 12px and 12.5px with no rule saying which was
       * right, so every new component picked a number by eye.
       *
       * THE FLOOR IS 13px AND BODY IS 16px, deliberately. Below about 13px
       * text stops being comfortably readable for anyone over forty, and a
       * marketing site cannot assume young eyes. `body` at 16px matters twice
       * over: it is the readability baseline AND the point below which mobile
       * Safari zooms the viewport when an input takes focus, which is the
       * single most common cause of a form feeling broken on a phone.
       *
       * Line heights ride with the size because they are not independent -
       * small text needs proportionally more leading to stay scannable, and
       * headings need less to stay tight.
       */
      fontSize: {
        /**
         * Tailwind's own small steps, RAISED to the floor.
         *
         * `text-xs` is used 179 times across the site as "small label", and
         * its stock 12px sits below the readability floor. Redefining it here
         * lifts every one of those at once and keeps them consistent; editing
         * 179 call sites would have drifted again within a month. `text-sm`
         * becomes the label size for the same reason.
         */
        xs: ["0.8125rem", { lineHeight: "1.45" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.65" }],
        /** Fine print: timestamps, legal, source citations. The floor. */
        caption: ["0.8125rem", { lineHeight: "1.45" }],
        /** Field labels, eyebrows, badges, table headers. */
        label: ["0.875rem", { lineHeight: "1.4" }],
        /** Supporting copy that sits beside the main text. */
        "body-sm": ["0.9375rem", { lineHeight: "1.6" }],
        /** Default reading size, and the mobile input floor. */
        body: ["1rem", { lineHeight: "1.65" }],
        /** Lead paragraphs and intros. */
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        /** Card and step titles. */
        "title-sm": ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        /** Sub-section headings. */
        title: ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.015em" }],
        display: ["clamp(2.5rem,6vw,4.5rem)", { lineHeight: "1.04", letterSpacing: "-0.025em" }],
        "section-title": ["1.875rem", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
        "section-title-lg": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
