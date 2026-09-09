"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { MoveHorizontal } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  caption?: React.ReactNode;
  className?: string;
  aspectClass?: string;
  sizes?: string;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  caption,
  className = "",
  aspectClass = "aspect-[4/3]",
  sizes = "(max-width: 768px) 100vw, 1200px",
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  // Touch gesture arbitration: don't hijack a vertical page scroll. We only
  // start scrubbing once the finger moves clearly horizontally.
  const pendingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const [pos, setPos] = useState(50);
  const instructionsId = useId();

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, next)));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none touch-pan-y cursor-ew-resize ${aspectClass} ${className}`}
      onPointerDown={(e) => {
        if (!e.isPrimary || e.button !== 0 || activePointerRef.current !== null) return;
        activePointerRef.current = e.pointerId;
        handleRef.current?.focus({ preventScroll: true });
        movedRef.current = false;
        if (e.pointerType === "mouse") {
          // Mouse has no scroll-gesture conflict: capture and jump immediately.
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromClientX(e.clientX);
        } else {
          // Touch/pen: wait to see if the gesture is horizontal (scrub) or
          // vertical (let the page scroll) before capturing.
          pendingRef.current = true;
          startRef.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== activePointerRef.current) return;
        if (draggingRef.current) {
          updateFromClientX(e.clientX);
          return;
        }
        if (pendingRef.current) {
          const dx = e.clientX - startRef.current.x;
          const dy = e.clientY - startRef.current.y;
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
            // Horizontal intent: take over the gesture.
            pendingRef.current = false;
            draggingRef.current = true;
            movedRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromClientX(e.clientX);
          } else if (Math.abs(dy) > 8) {
            // Vertical intent: release to the browser for scrolling.
            pendingRef.current = false;
          }
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== activePointerRef.current) return;
        // A tap (no drag) still positions the divider where the user tapped.
        if (pendingRef.current && !movedRef.current) {
          updateFromClientX(e.clientX);
        }
        activePointerRef.current = null;
        draggingRef.current = false;
        pendingRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={() => {
        activePointerRef.current = null;
        draggingRef.current = false;
        pendingRef.current = false;
      }}
      onLostPointerCapture={(e) => {
        // Touch starts with implicit capture on the hit target. Its transfer
        // to this container bubbles a lost event from the handle; that is not
        // the end of our drag.
        if (e.target !== e.currentTarget) return;
        activePointerRef.current = null;
        draggingRef.current = false;
        pendingRef.current = false;
      }}
      data-testid="slider-before-after"
    >
      <p id={instructionsId} className="sr-only">
        {beforeAlt} on the left, {afterAlt} on the right. Drag the handle, or
        use the arrow keys, Home, and End to reveal the transformation.
      </p>

      {/* After image (base layer) */}
      <Image
        src={afterSrc}
        alt={afterAlt}
        fill
        sizes={sizes}
        quality={70}
        className="object-cover pointer-events-none"
      />

      {/* Before image (clipped overlay, revealed on the left) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <Image
          src={beforeSrc}
          alt={beforeAlt}
          fill
          loading="lazy"
          sizes={sizes}
          quality={70}
          className="object-cover"
        />
      </div>

      {/* Corner labels */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 px-2.5 py-1 rounded-sm bg-inverse text-inverse-foreground text-caption tracking-[0.12em] uppercase font-normal pointer-events-none">
        Before
      </div>
      <div className="absolute top-3 right-3 md:top-4 md:right-4 px-2.5 py-1 rounded-sm bg-inverse text-inverse-foreground text-caption tracking-[0.12em] uppercase font-normal pointer-events-none">
        After
      </div>

      {/* Divider line + drag handle */}
      <div
        className="absolute inset-y-0 z-10 w-px bg-inverse-foreground/90 pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-0.5px)" }}
      />
        <button
          ref={handleRef}
          style={{ left: `clamp(24px, ${pos}%, calc(100% - 24px))` }}
          type="button"
          role="slider"
          aria-label="Compare before and after"
          aria-orientation="horizontal"
          aria-describedby={instructionsId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${Math.round(pos)}% before image visible`}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              setPos((p) => Math.max(0, p - 4));
            } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              setPos((p) => Math.min(100, p + 4));
            } else if (e.key === "Home") {
              e.preventDefault();
              setPos(0);
            } else if (e.key === "End") {
              e.preventDefault();
              setPos(100);
            }
          }}
          className="absolute z-20 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-inverse-foreground text-inverse shadow-md pointer-events-auto cursor-ew-resize focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          data-testid="handle-before-after"
        >
          <MoveHorizontal className="h-4 w-4" />
        </button>

      {/* Caption */}
      {caption && (
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-inverse/70 via-inverse/20 to-transparent pointer-events-none" />
      )}
      {caption && (
        <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 pointer-events-none">
          {caption}
        </div>
      )}
    </div>
  );
}
