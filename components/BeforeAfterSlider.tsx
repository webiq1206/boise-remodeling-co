"use client";

import { useId, useRef, useState } from "react";
import type { PointerEvent } from "react";
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
  beforeSrc, afterSrc, beforeAlt, afterAlt, caption,
  className = "", aspectClass = "aspect-[4/3]",
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 75vw, 1200px",
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const gestureRef = useRef<"pending" | "dragging" | "scrolling">("pending");
  const startRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState(50);
  const instructionsId = useId();

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  };

  const releasePointer = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== e.pointerId) return;
    pointerRef.current = null;
    gestureRef.current = "pending";
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative isolate w-full overflow-hidden select-none touch-pan-y touch-pinch-zoom cursor-ew-resize ${aspectClass} ${className}`}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (!e.isPrimary || e.button !== 0 || pointerRef.current !== null) return;
        pointerRef.current = e.pointerId;
        startRef.current = { x: e.clientX, y: e.clientY };
        gestureRef.current = e.pointerType === "mouse" ? "dragging" : "pending";
        e.currentTarget.setPointerCapture(e.pointerId);
        if (gestureRef.current === "dragging") updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (pointerRef.current !== e.pointerId) return;
        if (gestureRef.current === "pending") {
          const dx = Math.abs(e.clientX - startRef.current.x);
          const dy = Math.abs(e.clientY - startRef.current.y);
          if (dy > 8 && dy >= dx) gestureRef.current = "scrolling";
          else if (dx > 8) gestureRef.current = "dragging";
        }
        if (gestureRef.current === "dragging") updateFromClientX(e.clientX);
      }}
      onPointerUp={(e) => {
        if (pointerRef.current !== e.pointerId) return;
        if (gestureRef.current !== "scrolling") updateFromClientX(e.clientX);
        releasePointer(e);
      }}
      onPointerCancel={releasePointer}
      onLostPointerCapture={releasePointer}
      data-testid="slider-before-after"
    >
      <p id={instructionsId} className="sr-only">
        {beforeAlt} on the left, {afterAlt} on the right. Drag horizontally or
        tap the image to compare. Use the arrow keys, Home, and End with a keyboard.
      </p>
      <Image src={afterSrc} alt={afterAlt} fill sizes={sizes} quality={75}
        draggable={false} className="object-cover pointer-events-none" />
      <div aria-hidden="true" data-testid="before-image-layer"
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={beforeSrc} alt={beforeAlt} fill sizes={sizes} quality={75}
          draggable={false} className="object-cover pointer-events-none" />
      </div>
      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-sm bg-inverse text-inverse-foreground text-sm pointer-events-none">Before</div>
      <div className="absolute top-3 right-3 px-3 py-1.5 rounded-sm bg-inverse text-inverse-foreground text-sm pointer-events-none">After</div>
      <div aria-hidden="true"
        className="absolute inset-y-0 z-10 w-0.5 bg-inverse-foreground pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
        style={{ left: `${pos}%`, transform: "translateX(-1px)" }} />
      <button
        type="button" role="slider" aria-label="Compare before and after"
        aria-orientation="horizontal" aria-describedby={instructionsId}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% before image, ${100 - Math.round(pos)}% after image`}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2;
          if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            if (e.key === "Home") setPos(0);
            else if (e.key === "End") setPos(100);
            else setPos((p) => Math.max(0, Math.min(100,
              p + (["ArrowRight", "ArrowUp"].includes(e.key) ? step : -step))));
          }
        }}
        className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-inverse-foreground text-inverse shadow-md cursor-ew-resize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse"
        style={{ left: `clamp(28px, ${pos}%, calc(100% - 28px))` }}
        data-testid="handle-before-after"
      >
        <MoveHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {caption && <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-inverse/80 to-transparent pointer-events-none" />}
      {caption && <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 pointer-events-none">{caption}</div>}
    </div>
  );
}
