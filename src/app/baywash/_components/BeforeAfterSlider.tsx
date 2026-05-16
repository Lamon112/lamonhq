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

const BEFORE_IMG: string | null = null; // CSS panel until real photo lands
const AFTER_IMG: string | null = null;

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
        {/* POSLIJE badge — big green pill bottom-right */}
        <div className="absolute bottom-6 right-6 rounded-2xl bg-green-600 px-5 py-2.5 text-lg font-black uppercase tracking-wider text-white shadow-2xl shadow-green-900/40 sm:px-7 sm:py-3 sm:text-2xl">
          POSLIJE
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
        {/* PRIJE badge — big red pill bottom-left (clipped with the before layer so it follows the wipe) */}
        <div className="absolute bottom-6 left-6 rounded-2xl bg-red-600 px-5 py-2.5 text-lg font-black uppercase tracking-wider text-white shadow-2xl shadow-red-900/40 sm:px-7 sm:py-3 sm:text-2xl">
          PRIJE
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

/**
 * BEFORE — original simpler placeholder: dull metallic paint with
 * swirl marks + scratches + haze. Subtle car-body cues (roofline
 * highlight, body line crease, door handle hint) so it reads as a
 * panel but stays minimal — no taillights / badge / license plate.
 */
function PlaceholderBefore() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-700">
      {/* Base dull metallic paint */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 110%, rgba(40,40,40,0.6) 0%, transparent 50%),
            linear-gradient(180deg,
              #4a4a4a 0%,
              #6b6b6b 15%,
              #5a5a5a 35%,
              #4a4a4a 50%,
              #3a3a3a 75%,
              #2a2a2a 100%
            )
          `,
        }}
      />
      {/* Roofline / top highlight (curved car body cue) */}
      <div
        className="absolute inset-x-0 top-0 h-1/4"
        style={{
          background:
            "linear-gradient(180deg, rgba(220,220,220,0.35) 0%, rgba(180,180,180,0.15) 40%, transparent 100%)",
        }}
      />
      {/* Body line crease across middle (door/fender body line) */}
      <div
        className="absolute inset-x-0 top-1/2 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 20%, rgba(0,0,0,0.6) 80%, transparent 100%)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.15)",
        }}
      />
      {/* Door handle hint */}
      <div className="absolute right-[8%] top-[58%] h-2 w-12 rounded-full bg-black/40 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
      {/* SWIRL MARKS */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-overlay"
        style={{
          background: `
            repeating-conic-gradient(from 0deg at 20% 30%, transparent 0deg, rgba(255,255,255,0.18) 4deg, transparent 8deg),
            repeating-conic-gradient(from 45deg at 65% 65%, transparent 0deg, rgba(255,255,255,0.12) 3deg, transparent 7deg),
            repeating-conic-gradient(from 90deg at 80% 25%, transparent 0deg, rgba(255,255,255,0.10) 5deg, transparent 11deg)
          `,
        }}
      />
      {/* Linear micro-scratches */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "repeating-linear-gradient(15deg, transparent 0px, transparent 2px, rgba(255,255,255,0.12) 2px, rgba(255,255,255,0.12) 3px)",
        }}
      />
      {/* Haze overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-white/[0.08]" />
    </div>
  );
}

/**
 * AFTER — original simpler placeholder: deep gloss black with sky
 * reflection, specular highlight sweep, warm yellow + cool blue bounces.
 * Same body cues as Before for continuity. No taillights / badge.
 */
function PlaceholderAfter() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg,
              #1a1f2e 0%,
              #0f1422 25%,
              #050810 50%,
              #0a0e1c 75%,
              #1a1f2e 100%
            )
          `,
        }}
      />
      {/* Horizon line — env reflection */}
      <div
        className="absolute inset-x-0 top-[45%] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(120,140,180,0.5) 30%, rgba(140,160,200,0.7) 50%, rgba(120,140,180,0.5) 70%, transparent 100%)",
        }}
      />
      {/* Roofline highlight */}
      <div
        className="absolute inset-x-0 top-0 h-1/4"
        style={{
          background:
            "linear-gradient(180deg, rgba(180,200,240,0.4) 0%, rgba(100,120,160,0.15) 60%, transparent 100%)",
        }}
      />
      {/* Body line crease (same position as Before for continuity) */}
      <div
        className="absolute inset-x-0 top-1/2 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.7) 20%, rgba(0,0,0,0.8) 80%, transparent 100%)",
          boxShadow: "0 1px 0 rgba(200,220,255,0.25)",
        }}
      />
      {/* Door handle */}
      <div className="absolute right-[8%] top-[58%] h-2 w-12 rounded-full bg-black shadow-[0_1px_0_rgba(200,220,255,0.3)]" />
      {/* Specular highlight sweep */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)",
        }}
      />
      {/* Yellow Baywash reflection accent */}
      <div
        aria-hidden="true"
        className="absolute right-[10%] top-[15%] h-16 w-24 rounded-full bg-yellow-300/30 blur-2xl"
      />
      {/* Cool blue garage light reflection */}
      <div
        aria-hidden="true"
        className="absolute bottom-[20%] left-[15%] h-20 w-32 rounded-full bg-blue-300/15 blur-3xl"
      />
    </div>
  );
}
