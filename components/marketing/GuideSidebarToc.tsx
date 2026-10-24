"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocHeading } from "@/lib/content-utils";

interface GuideSidebarTocProps {
  headings: TocHeading[];
}

interface TocGroup {
  heading: TocHeading;
  children: TocHeading[];
}

/** H2s are the numbered entries; H3s nest under the H2 they follow. */
function groupHeadings(headings: TocHeading[]): TocGroup[] {
  const groups: TocGroup[] = [];
  for (const h of headings) {
    const last = groups[groups.length - 1];
    if (h.level === 3 && last) last.children.push(h);
    else groups.push({ heading: h, children: [] });
  }
  return groups;
}

/** The nearest ancestor that actually scrolls (the sticky article rail). */
function scrollBox(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Sidebar table of contents with a reading-position indicator: the section
 * currently on screen is highlighted, and the list keeps that entry in view.
 * The list is never height-capped on its own; the sticky rail around it scrolls
 * as one, so no item is hidden in a nested box. Without JS (or before
 * hydration) it renders as plain links. (BHC-10, BCONC-19, BCONC-23, BRC-21, BCC-48)
 */
export function GuideSidebarToc({ headings }: GuideSidebarTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const groups = useMemo(() => groupHeadings(headings ?? []), [headings]);

  useEffect(() => {
    if (!headings || headings.length < 2) return;

    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    /* "Active" = the last heading that has scrolled up past the reading line
       (a band ~35% down the viewport). Positions are read fresh on every
       recompute: expanding a collapsed section reflows everything below it,
       so cached tops go stale. An rAF-throttled scroll listener over about a
       dozen rect reads is cheap. */
    const recompute = () => {
      let current: string | null = null;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.35) {
          current = el.id;
        }
      }
      setActiveId(current ?? els[0].id);
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        recompute();
      });
    };

    recompute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [headings]);

  /* Keep the active entry inside the rail's visible area. Only the rail
     scrolls; the page never moves. */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !activeId) return;
    const link = nav.querySelector<HTMLElement>('[data-active="true"]');
    if (!link) return;
    const box = scrollBox(nav);
    if (!box) return;
    const margin = 32;
    const l = link.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (l.top < b.top + margin) box.scrollTop -= b.top + margin - l.top;
    else if (l.bottom > b.bottom - margin) box.scrollTop += l.bottom - (b.bottom - margin);
  }, [activeId]);

  if (!headings || headings.length < 2) return null;

  const entry = (h: TocHeading) => {
    const active = h.id === activeId;
    return (
      <a
        href={`#${h.id}`}
        data-active={active ? "true" : undefined}
        aria-current={active ? "location" : undefined}
        className={cn(
          "leading-snug transition-colors",
          active ? "text-accent-legible" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {h.text}
      </a>
    );
  };

  return (
    <nav
      ref={navRef}
      className="rounded-lg border border-border p-4 mb-4"
      aria-label="Table of contents"
      data-testid="guide-toc"
    >
      <p className="text-xs font-normal uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </p>
      <ol className="space-y-1 text-sm">
        {groups.map(({ heading, children }) => (
          <li
            key={heading.id}
            className={cn(
              heading.level === 3 ? "ml-3 list-[circle]" : "list-decimal ml-4",
              heading.id === activeId && "marker:text-accent-legible",
            )}
          >
            {entry(heading)}
            {children.length > 0 && (
              <ol className="mt-1 space-y-1">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className={cn("ml-3 list-[circle]", child.id === activeId && "marker:text-accent-legible")}
                  >
                    {entry(child)}
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
