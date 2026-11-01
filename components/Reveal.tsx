"use client";

import { useRef, useEffect, useState } from "react";
import { observeFirstVisible } from "@/lib/sharedVisibility";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  threshold?: number;
}

export function Reveal({ children, className = "", style, delay = 0, threshold = 0.12 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    // A 0 entry alongside the visible-share threshold: a wrapper taller than
    // about eight viewports (a long grid on a phone) can never reach 12%
    // visible, and would otherwise stay at opacity 0 forever. One observer is
    // shared by every Reveal with the same options (lib/sharedVisibility).
    return observeFirstVisible(el, { threshold: [0, threshold], rootMargin: "0px 0px -8% 0px" }, () => setVisible(true));
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`reveal-init ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
