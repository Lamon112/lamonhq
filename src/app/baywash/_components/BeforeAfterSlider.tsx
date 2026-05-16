"use client";

/**
 * Interactive Before/After paint correction slider.
 *
 * Drag the handle (or move mouse over the image) to wipe between
 * "swirl-damaged" and "Stage 4 mirror finish". Touch-friendly.
 *
 * V1: uses CSS-generated visuals (gradient + noise pattern) as a stand-in
 * for real photos — Leonardo can swap in Drive footage by setting
 * BEFORE_IMG / AFTER_IMG to actual /public/baywash/* paths.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const BEFORE_IMG: string | null = null; // e.g. "/baywash/before.jpg"
const AFTER_IMG: string | null = null; // e.g. "/baywash/after.jpg"

export function BeforeAfterSlider() {
  const [pos, setPos] = useState(50); // percent
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const clientX =
        "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      updateFromClientX(clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateFromClientX]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-3xl border border-black/10 bg-neutral-900"
      onMouseDown={(e) => {
        dragging.current = true;
        updateFromClientX(e.clientX);
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        updateFromClientX(e.touches[0]?.clientX ?? 0);
      }}
    >
      {/* AFTER layer (full width, base) */}
      <div className="absolute inset-0">
        {AFTER_IMG ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={AFTER_IMG}
            alt="Nakon Stage 4 paint correction"
            className="h-full w-full object-cover"
          />
        ) : (
          <PlaceholderAfter />
        )}
        <div className="absolute right-5 top-5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase tracking-widest text-black">
          Nakon
        </div>
      </div>

      {/* BEFORE layer (clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {BEFORE_IMG ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BEFORE_IMG}
            alt="Prije — swirl-marks i kontaminacija"
            className="h-full w-full object-cover"
          />
        ) : (
          <PlaceholderBefore />
        )}
        <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-widest text-neutral-900">
          Prije
        </div>
      </div>

      {/* Handle */}
      <div
        className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-yellow-400 shadow-xl ring-4 ring-white/20">
          <div className="flex items-center gap-0.5 text-black">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Hint label */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-white backdrop-blur-sm">
        Povuci da vidiš razliku
      </div>
    </div>
  );
}

/** CSS-only "swirl-damaged paint" placeholder until real photo lands. */
function PlaceholderBefore() {
  return (
    <div className="relative h-full w-full bg-neutral-700">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, rgba(255,255,255,0.06) 0%, transparent 40%),
            radial-gradient(circle at 50% 80%, rgba(255,255,255,0.04) 0%, transparent 30%),
            repeating-conic-gradient(from 0deg at 30% 40%, transparent 0deg, rgba(255,255,255,0.04) 5deg, transparent 10deg),
            repeating-conic-gradient(from 45deg at 65% 65%, transparent 0deg, rgba(255,255,255,0.03) 4deg, transparent 8deg),
            linear-gradient(135deg, #3a3a3a 0%, #1a1a1a 60%, #2a2a2a 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(15deg, transparent 0px, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px)",
        }}
      />
    </div>
  );
}

/** CSS-only "mirror finish" placeholder. */
function PlaceholderAfter() {
  return (
    <div className="relative h-full w-full bg-black">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25) 0%, transparent 40%),
            radial-gradient(ellipse at 70% 80%, rgba(250,204,21,0.15) 0%, transparent 50%),
            linear-gradient(135deg, #1a1a1a 0%, #050505 40%, #0f0f0f 100%)
          `,
        }}
      />
      {/* Reflective shine sweep */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
        }}
      />
    </div>
  );
}
