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
 * Shared car-tail panel scaffold — Audi-style trunk/tail surface used by
 * both Before and After. Both inherit the SAME geometry (taillights,
 * trunk seam, badge plate, shut line) so the slider wipe visibly shows
 * the SAME panel transformed, not two different things.
 *
 * Layout (clockwise from top-left of frame):
 *   - Two red taillight clusters (left + right edge), connected by a
 *     full-width chrome strip across the top
 *   - Trunk lid seam horizontal at ~28% (separates upper light bar from
 *     trunk lid body)
 *   - Body line crease at ~55% (Audi-style horizontal accent)
 *   - Faux "RS·BW" emboss badge in the center of trunk
 *   - Subtle license-plate frame hint at bottom center
 */
function CarTailScaffold({ variant }: { variant: "before" | "after" }) {
  const isBefore = variant === "before";
  return (
    <>
      {/* Taillight strip — full-width thin chrome bar at very top */}
      <div
        className="absolute inset-x-0 top-0 h-[6%]"
        style={{
          background: isBefore
            ? "linear-gradient(180deg, rgba(120,30,30,0.6) 0%, rgba(60,15,15,0.8) 100%)"
            : "linear-gradient(180deg, rgba(180,40,40,0.9) 0%, rgba(80,15,15,1) 100%)",
        }}
      />
      {/* LEFT taillight cluster — rounded red shape with inner glow */}
      <div
        className="absolute left-0 top-[6%] h-[20%] w-[28%]"
        style={{
          background: isBefore
            ? "radial-gradient(ellipse at 30% 50%, rgba(160,30,30,0.85) 0%, rgba(90,20,20,0.7) 50%, rgba(40,10,10,0.5) 100%)"
            : "radial-gradient(ellipse at 30% 50%, rgba(220,40,40,1) 0%, rgba(140,20,20,0.95) 50%, rgba(60,10,10,0.85) 100%)",
          borderRadius: "0 0 60% 30% / 0 0 90% 50%",
          boxShadow: isBefore
            ? "inset 0 0 20px rgba(0,0,0,0.4)"
            : "inset 0 0 30px rgba(0,0,0,0.5), 0 0 30px rgba(220,40,40,0.15)",
        }}
      />
      {/* RIGHT taillight cluster — mirrored */}
      <div
        className="absolute right-0 top-[6%] h-[20%] w-[28%]"
        style={{
          background: isBefore
            ? "radial-gradient(ellipse at 70% 50%, rgba(160,30,30,0.85) 0%, rgba(90,20,20,0.7) 50%, rgba(40,10,10,0.5) 100%)"
            : "radial-gradient(ellipse at 70% 50%, rgba(220,40,40,1) 0%, rgba(140,20,20,0.95) 50%, rgba(60,10,10,0.85) 100%)",
          borderRadius: "0 0 30% 60% / 0 0 50% 90%",
          boxShadow: isBefore
            ? "inset 0 0 20px rgba(0,0,0,0.4)"
            : "inset 0 0 30px rgba(0,0,0,0.5), 0 0 30px rgba(220,40,40,0.15)",
        }}
      />
      {/* Trunk lid seam — horizontal panel gap at ~28% */}
      <div
        className="absolute inset-x-0 top-[27%] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.7) 15%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.7) 85%, transparent 100%)",
          boxShadow: isBefore
            ? "0 1px 0 rgba(255,255,255,0.08)"
            : "0 1px 0 rgba(255,255,255,0.18)",
        }}
      />
      {/* Body line crease — Audi-style at ~55% */}
      <div
        className="absolute inset-x-0 top-[55%] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(0,0,0,0.5) 25%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.5) 75%, transparent 95%)",
          boxShadow: isBefore
            ? "0 1px 0 rgba(255,255,255,0.05)"
            : "0 1px 0 rgba(200,220,255,0.18)",
        }}
      />
      {/* Center badge plate emboss — faux "RS·BW" Audi-style */}
      <div className="absolute left-1/2 top-[38%] flex h-[10%] w-[18%] -translate-x-1/2 items-center justify-center">
        <div
          className="flex h-full w-full items-center justify-center rounded-sm font-black tracking-tighter"
          style={{
            background: isBefore
              ? "linear-gradient(180deg, rgba(80,80,80,0.4), rgba(40,40,40,0.5))"
              : "linear-gradient(180deg, rgba(60,60,60,0.6), rgba(20,20,20,0.8))",
            boxShadow: isBefore
              ? "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.4)"
              : "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.4)",
            color: isBefore ? "rgba(180,30,30,0.6)" : "rgba(220,40,40,0.95)",
            fontSize: "clamp(14px, 2.2vw, 28px)",
          }}
        >
          <span>RS</span>
          <span className="ml-1 text-current/70">•</span>
          <span className="ml-1">BW</span>
        </div>
      </div>
      {/* License plate frame hint — thin recess at bottom center */}
      <div
        className="absolute bottom-[12%] left-1/2 h-[8%] w-[35%] -translate-x-1/2 rounded-sm"
        style={{
          background: isBefore
            ? "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.75) 100%)",
          boxShadow: isBefore
            ? "inset 0 1px 2px rgba(0,0,0,0.5)"
            : "inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(200,220,255,0.1)",
        }}
      />
    </>
  );
}

/**
 * BEFORE — same scaffold, but dull oxidized paint with swirl marks +
 * scratches + haze. The taillights look murky and the badge is barely
 * visible.
 */
function PlaceholderBefore() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-700">
      {/* Base dull metallic paint */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 120%, rgba(30,30,30,0.7) 0%, transparent 60%),
            linear-gradient(180deg,
              #3a3a3a 0%,
              #4d4d4d 28%,
              #555555 40%,
              #4a4a4a 60%,
              #3a3a3a 80%,
              #2a2a2a 100%
            )
          `,
        }}
      />
      {/* Car tail scaffold — taillights, seams, badge */}
      <CarTailScaffold variant="before" />
      {/* SWIRL MARKS — concentrated around badge area (most visible) */}
      <div
        className="absolute inset-0 opacity-80 mix-blend-overlay"
        style={{
          background: `
            repeating-conic-gradient(from 0deg at 50% 42%, transparent 0deg, rgba(255,255,255,0.18) 3deg, transparent 7deg),
            repeating-conic-gradient(from 30deg at 25% 65%, transparent 0deg, rgba(255,255,255,0.14) 4deg, transparent 9deg),
            repeating-conic-gradient(from 60deg at 75% 70%, transparent 0deg, rgba(255,255,255,0.12) 3deg, transparent 8deg),
            repeating-conic-gradient(from 90deg at 50% 85%, transparent 0deg, rgba(255,255,255,0.10) 5deg, transparent 11deg)
          `,
        }}
      />
      {/* Linear micro-scratches — diagonal across whole panel */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(20deg, transparent 0px, transparent 3px, rgba(255,255,255,0.14) 3px, rgba(255,255,255,0.14) 4px)",
        }}
      />
      {/* Haze overlay — flat dull surface */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-white/[0.09]" />
      {/* Random "spots" suggesting tar / contamination */}
      <div className="absolute left-[18%] top-[68%] h-1.5 w-1.5 rounded-full bg-black/30" />
      <div className="absolute left-[42%] top-[78%] h-1 w-1 rounded-full bg-black/30" />
      <div className="absolute left-[70%] top-[62%] h-1.5 w-2 rounded-full bg-black/35" />
      <div className="absolute left-[85%] top-[80%] h-1 w-1.5 rounded-full bg-black/30" />
    </div>
  );
}

/**
 * AFTER — same scaffold, but deep gloss black with horizon reflection,
 * specular highlight sweep, and saturated bright red taillights. Badge
 * "pops" with chromed lettering. NO swirls, NO scratches, NO haze.
 */
function PlaceholderAfter() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Base deep gloss black — sky reflection top, ground bottom */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg,
              #1d2235 0%,
              #131829 22%,
              #060912 50%,
              #0a0e1c 75%,
              #1a1f2e 100%
            )
          `,
        }}
      />
      {/* Horizon line — environment reflection (where sky meets ground in panel reflection) */}
      <div
        className="absolute inset-x-0 top-[48%] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(160,180,220,0.6) 20%, rgba(200,220,255,0.85) 50%, rgba(160,180,220,0.6) 80%, transparent 100%)",
          boxShadow: "0 4px 8px rgba(140,170,220,0.15)",
        }}
      />
      {/* Car tail scaffold — taillights glowing red, seams sharp, badge crisp */}
      <CarTailScaffold variant="after" />
      {/* SPECULAR HIGHLIGHT — diagonal sharp light sweep (mirror finish signature) */}
      <div
        className="absolute inset-0 opacity-65"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0.25) 55%, transparent 70%)",
        }}
      />
      {/* Yellow Baywash reflection accent (top-right) — signature warm bounce */}
      <div
        aria-hidden="true"
        className="absolute right-[8%] top-[33%] h-20 w-32 rounded-full bg-yellow-300/35 blur-3xl"
      />
      {/* Cool blue garage LED reflection (bottom-left) */}
      <div
        aria-hidden="true"
        className="absolute bottom-[18%] left-[12%] h-24 w-40 rounded-full bg-blue-300/20 blur-3xl"
      />
      {/* Subtle "shop ceiling lights" reflection — three small bright points */}
      <div className="absolute left-[20%] top-[68%] h-1 w-8 rounded-full bg-white/40 blur-[1px]" />
      <div className="absolute left-[48%] top-[72%] h-1 w-10 rounded-full bg-white/50 blur-[1px]" />
      <div className="absolute left-[78%] top-[68%] h-1 w-8 rounded-full bg-white/40 blur-[1px]" />
    </div>
  );
}
