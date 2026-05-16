"use client";

/**
 * MONEY RUSH v5 — pure CSS animation approach.
 *
 * v3 (canvas) and v4 (DOM rAF) both stuck at 10-11fps on Leonardov
 * dev server. Root cause: Next.js dev mode + requestAnimationFrame
 * loops fight each other (HMR checks, React Strict Mode double-renders,
 * source map overhead). Even DOM transform writes inside rAF were slow.
 *
 * v5 architecture: NO rAF loop. Every falling item is a single <div>
 * with a CSS `@keyframes fall` animation. The browser's compositor
 * handles all motion on the GPU — totally independent of JS thread.
 * JS only does:
 *   - setInterval to spawn items (every 380ms)
 *   - onClick to collect items
 *   - onAnimationEnd to remove off-screen items
 *
 * Result: animation runs at native 60-120fps regardless of dev/prod
 * because CSS animations don't go through React/JS at all.
 *
 * Debug counter visible top-left so Leonardo can confirm spawn loop
 * is actually firing (if items=0, spawn isn't running; if items=10
 * but visually empty, animation/CSS isn't rendering).
 */

import { useEffect, useState, useCallback, useRef } from "react";

const SPAWN_INIT_MS = 420;
const SPAWN_MIN_MS = 200;
const SPAWN_RAMP_PER_5S = 30;
const FALL_DURATION_INIT = 4.5; // sec to traverse full height
const FALL_DURATION_MIN = 1.8;
const FALL_RAMP_PER_5S = 0.3;
const COMBO_WINDOW_MS = 750;
const HUD_SYNC_MS = 500;

type ItemKind =
  | "small" | "medium" | "big" | "huge" | "legendary"
  | "tax" | "scam" | "debt";

interface FallingItem {
  id: number;
  kind: ItemKind;
  value: number;
  xPercent: number;
  fallDuration: number;
  spawnedAt: number;
}

const TIERS = [
  { min: 0, label: "SIDE HUSTLER", color: "#a3a3a3" },
  { min: 1_000, label: "FREELANCER", color: "#7bb663" },
  { min: 10_000, label: "FOUNDER", color: "#4a9eff" },
  { min: 100_000, label: "CEO", color: "#c9a84c" },
  { min: 1_000_000, label: "MOGUL", color: "#e0bf5e" },
  { min: 10_000_000, label: "EMPIRE", color: "#ff6cd8" },
];

function getTierIdx(money: number): number {
  for (let i = TIERS.length - 1; i >= 0; i--) if (money >= TIERS[i].min) return i;
  return 0;
}
function fmtMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}€${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 10_000) return `${sign}€${(a / 1_000).toFixed(1)}K`;
  if (a >= 1_000) return `${sign}€${(a / 1_000).toFixed(2)}K`;
  return `${sign}€${Math.round(a)}`;
}
function valueOf(kind: ItemKind): number {
  switch (kind) {
    case "small": return 10; case "medium": return 100;
    case "big": return 1_000; case "huge": return 10_000;
    case "legendary": return 100_000;
    case "tax": return -500; case "scam": return -2_000; case "debt": return -5_000;
  }
}
function pickKind(elapsedSec: number): ItemKind {
  const r = Math.random();
  const badThreshold = 0.18 + Math.min(0.10, elapsedSec / 250);
  if (r < badThreshold) {
    const b = Math.random();
    if (b < 0.55) return "tax";
    if (b < 0.85) return "scam";
    return "debt";
  }
  const m = Math.random();
  if (elapsedSec > 18 && m < 0.014) return "legendary";
  if (m < 0.05) return "huge";
  if (m < 0.20) return "big";
  if (m < 0.55) return "medium";
  return "small";
}

const ITEM_STYLES: Record<ItemKind, { class: string; label: string; sub?: string }> = {
  small: { class: "mr-coin mr-coin-bronze", label: "10", sub: "€" },
  medium: { class: "mr-coin mr-coin-silver", label: "100", sub: "€" },
  big: { class: "mr-bar", label: "€1K" },
  huge: { class: "mr-bills", label: "€10K" },
  legendary: { class: "mr-briefcase", label: "€100K" },
  tax: { class: "mr-tax", label: "TAX" },
  scam: { class: "mr-scam", label: "FOREX", sub: "100%" },
  debt: { class: "mr-debt", label: "DEBT" },
};

export function MoneyRushGame() {
  const [items, setItems] = useState<FallingItem[]>([]);
  const [tierIdx, setTierIdx] = useState(0);
  const [displayMoney, setDisplayMoney] = useState(0);
  const [bestMoney, setBestMoney] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tierFlashKey, setTierFlashKey] = useState(0);
  const [comboFlash, setComboFlash] = useState<{ key: number; mult: number } | null>(null);
  const [floatTexts, setFloatTexts] = useState<Array<{ id: number; x: number; y: number; text: string; pos: boolean }>>([]);
  const [debugInfo, setDebugInfo] = useState({ spawned: 0, alive: 0 });

  const moneyRef = useRef(0);
  const lastTapAtRef = useRef(0);
  const comboCountRef = useRef(1);
  const lastTierIdxRef = useRef(0);
  const startedAtRef = useRef(0);
  const nextIdRef = useRef(1);
  const totalSpawnedRef = useRef(0);
  const itemsRef = useRef<FallingItem[]>([]);
  const pausedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Per-item DOM refs so the delegated handler can hit-test against
  // each item's CURRENT (animated) bounding box, not its static CSS box.
  const itemDomRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Sync paused
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Best score
  useEffect(() => {
    const saved = parseFloat(localStorage.getItem("money_rush_best") ?? "0");
    if (!isNaN(saved)) setBestMoney(saved);
  }, []);

  // Auto-pause on tab hidden
  useEffect(() => {
    function onVis() { if (document.hidden) setPaused(true); }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Spawn loop — setInterval (NOT rAF). Adaptive interval reduces over time.
  useEffect(() => {
    startedAtRef.current = performance.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    function spawn() {
      if (pausedRef.current) {
        timeoutId = setTimeout(spawn, 200);
        return;
      }
      const elapsedSec = (performance.now() - startedAtRef.current) / 1000;
      const interval = Math.max(SPAWN_MIN_MS, SPAWN_INIT_MS - Math.floor(elapsedSec / 5) * SPAWN_RAMP_PER_5S);
      const duration = Math.max(FALL_DURATION_MIN, FALL_DURATION_INIT - Math.floor(elapsedSec / 5) * FALL_RAMP_PER_5S);
      const kind = pickKind(elapsedSec);
      const item: FallingItem = {
        id: nextIdRef.current++,
        kind,
        value: valueOf(kind),
        xPercent: 8 + Math.random() * 84,
        fallDuration: duration,
        spawnedAt: performance.now(),
      };
      totalSpawnedRef.current++;
      setItems((prev) => [...prev.slice(-29), item]); // cap at 30 alive
      timeoutId = setTimeout(spawn, interval);
    }
    timeoutId = setTimeout(spawn, 400);
    return () => clearTimeout(timeoutId);
  }, []);

  // HUD + debug refresh
  useEffect(() => {
    const i = setInterval(() => {
      const cur = moneyRef.current;
      setDisplayMoney(cur);
      if (cur > bestMoney) {
        setBestMoney(cur);
        try { localStorage.setItem("money_rush_best", String(cur)); } catch {}
      }
      setDebugInfo({ spawned: totalSpawnedRef.current, alive: itemsRef.current.length });
    }, HUD_SYNC_MS);
    return () => clearInterval(i);
  }, [bestMoney]);

  // Cleanup expired float texts
  useEffect(() => {
    if (floatTexts.length === 0) return;
    const t = setTimeout(() => {
      const cutoff = Date.now() - 1100;
      setFloatTexts((arr) => arr.filter((f) => f.id > cutoff));
    }, 1200);
    return () => clearTimeout(t);
  }, [floatTexts]);

  // Item collect
  const collectItem = useCallback((id: number, value: number, kind: ItemKind, x: number, y: number) => {
    const now = performance.now();
    if (now - lastTapAtRef.current < COMBO_WINDOW_MS) {
      comboCountRef.current = Math.min(10, comboCountRef.current + 1);
    } else {
      comboCountRef.current = 1;
    }
    lastTapAtRef.current = now;

    const isPos = value > 0;
    const mult = isPos && comboCountRef.current >= 3 ? 1 + (comboCountRef.current - 2) * 0.25 : 1;
    const earned = Math.round(value * mult);
    moneyRef.current = Math.max(0, moneyRef.current + earned);

    // Remove item from list
    setItems((arr) => arr.filter((it) => it.id !== id));

    // Float text
    setFloatTexts((arr) => [
      ...arr.slice(-10),
      {
        id: Date.now() + Math.random() * 100,
        x, y,
        text: (isPos ? "+" : "") + fmtMoney(earned) + (mult > 1 ? ` ×${comboCountRef.current}` : ""),
        pos: isPos,
      },
    ]);

    // Combo flash
    if (mult > 1) setComboFlash({ key: Date.now(), mult: comboCountRef.current });

    // Haptic
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(isPos ? 10 : 18); } catch {}
    }

    // Tier-up
    const newTier = getTierIdx(moneyRef.current);
    if (newTier > lastTierIdxRef.current) {
      lastTierIdxRef.current = newTier;
      setTierIdx(newTier);
      setTierFlashKey(Date.now());
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate([20, 30, 40]); } catch {}
      }
    }
    // Suppress unused 'kind' lint
    void kind;
  }, []);

  // Auto-remove items when CSS animation ends (off-screen)
  const onItemAnimEnd = useCallback((id: number) => {
    itemDomRefs.current.delete(id);
    setItems((arr) => arr.filter((it) => it.id !== id));
  }, []);

  /**
   * Delegated container hit-tester. Single listener attached to the
   * game container catches every tap, then iterates all alive items
   * and picks the closest one within a generous radius (HIT_RADIUS_PX).
   *
   * Why this beats per-item onPointerDown:
   *   - CSS animation hit-test on per-element pointerdown can race the
   *     compositor — element rect "in CSS" may differ from rendered px
   *     for one frame. Container handler hit-tests against rendered DOM
   *     rect at tap time which is always pixel-accurate.
   *   - Generous radius (80px = bigger than visual + wrapper combined)
   *     forgives fast-moving items where finger lands "near" the coin.
   *   - One handler ≪ 30 handlers = fewer event registrations,
   *     fewer chances for synthetic event quirks on iOS Safari.
   */
  const HIT_RADIUS_PX = 80;
  const handleContainerTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (pausedRef.current) return;
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;

    let closestId: number | null = null;
    let closestDist = HIT_RADIUS_PX;

    for (const item of itemsRef.current) {
      const dom = itemDomRefs.current.get(item.id);
      if (!dom) continue;
      const rect = dom.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - x, cy - y);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = item.id;
      }
    }

    if (closestId !== null) {
      const item = itemsRef.current.find((it) => it.id === closestId);
      if (item) collectItem(item.id, item.value, item.kind, x, y);
    }
  }, [collectItem]);

  const tier = TIERS[tierIdx];
  const nextTier = TIERS[tierIdx + 1];
  const tierProgress = nextTier
    ? Math.min(100, ((displayMoney - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  return (
    <div className="w-full max-w-md select-none">
      {/* HUD */}
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0 flex-1">
          <span
            className="text-base font-black tracking-wider"
            style={{ color: tier.color, textShadow: `0 0 12px ${tier.color}55` }}
          >
            {tier.label}
          </span>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${tierProgress}%`,
                background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})`,
                boxShadow: `0 0 8px ${tier.color}99`,
              }}
            />
          </div>
          {nextTier && (
            <p className="mt-0.5 text-[9px] text-text-muted">
              → <span className="font-bold" style={{ color: nextTier.color }}>{nextTier.label}</span> @ {fmtMoney(nextTier.min)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Bilanca</p>
          <p
            className="text-2xl font-black tabular-nums"
            style={{ color: "#e0bf5e", textShadow: "0 0 10px rgba(224,191,94,0.4)" }}
          >
            {fmtMoney(displayMoney)}
          </p>
          <p className="text-[9px] tabular-nums text-text-dim">best {fmtMoney(bestMoney)}</p>
        </div>
      </div>

      {/* Game container — delegated tap handler catches every tap and
          hit-tests against all alive items. No per-item handlers needed. */}
      <div
        ref={containerRef}
        onPointerDown={handleContainerTap}
        className="relative w-full overflow-hidden rounded-2xl border border-gold/40 shadow-2xl shadow-gold/20 mr-game-bg"
        style={{ aspectRatio: "9 / 14", maxHeight: "65vh", touchAction: "none" }}
      >
        {/* Debug counter — top-left, small. Stays visible so Leonardo can
            tell at a glance whether spawn loop is alive (spawned should
            increment ~every 400ms) and whether items render (alive should
            be 5-15 normally). If alive=0 but spawned>0, animation isn't
            rendering. If both stay 0, spawn loop dead. */}
        <div className="pointer-events-none absolute left-2 top-2 z-30 rounded bg-bg/70 px-2 py-0.5 text-[10px] font-mono text-text-dim backdrop-blur">
          spawned: {debugInfo.spawned} · alive: {debugInfo.alive}
        </div>

        {/* Items — pointer-events: none on the wrapper too (handled by
            container delegate). Each div just registers its DOM ref so
            the container handler can hit-test it. */}
        {items.map((item) => {
          const sty = ITEM_STYLES[item.kind];
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) itemDomRefs.current.set(item.id, el);
                else itemDomRefs.current.delete(item.id);
              }}
              className={`mr-hitbox ${paused ? "mr-paused" : ""}`}
              style={{
                left: `${item.xPercent}%`,
                animationDuration: `${item.fallDuration}s`,
                pointerEvents: "none",
              }}
              onAnimationEnd={() => onItemAnimEnd(item.id)}
            >
              <div className={`mr-visual ${sty.class}`}>
                {sty.sub && <span className="mr-sub">{sty.sub}</span>}
                <span className="mr-label">{sty.label}</span>
              </div>
            </div>
          );
        })}

        {/* Tier flash */}
        {tierFlashKey > 0 && (
          <div
            key={tierFlashKey}
            className="pointer-events-none absolute inset-0 mr-tier-flash"
            style={{
              background: `radial-gradient(circle, ${tier.color}66, transparent 70%)`,
            }}
          />
        )}

        {/* Combo flash */}
        {comboFlash && (
          <div
            key={comboFlash.key}
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 mr-combo-pop"
          >
            <span className="text-2xl font-black text-gold drop-shadow-lg">
              COMBO ×{comboFlash.mult}
            </span>
          </div>
        )}

        {/* Floating texts */}
        {floatTexts.map((f) => (
          <div
            key={f.id}
            className="pointer-events-none fixed z-40 mr-float"
            style={{
              left: f.x,
              top: f.y,
              color: f.pos ? "#7bb663" : "#e04545",
            }}
          >
            <span className="text-lg font-black drop-shadow">{f.text}</span>
          </div>
        ))}

        {/* Pause overlay */}
        {paused && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/85 backdrop-blur-sm">
            <button
              onClick={() => setPaused(false)}
              className="rounded-full bg-gold px-7 py-3 text-base font-black text-bg shadow-lg shadow-gold/30"
            >
              ▶ NASTAVI
            </button>
          </div>
        )}

        <button
          onClick={() => setPaused((p) => !p)}
          className="absolute right-2 top-2 z-30 rounded-full bg-bg/70 px-2.5 py-1 text-xs font-bold text-text-dim backdrop-blur active:bg-bg/90 active:text-text"
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused ? "▶" : "⏸"}
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] leading-relaxed text-text-muted">
        Tap € coine · 3+ tap u nizu = <span className="font-bold text-gold">COMBO multiplier</span><br />
        Izbjegni TAX / SCAM / DEBT
      </p>

      <style jsx global>{`
        .mr-game-bg {
          background:
            radial-gradient(ellipse 100% 60% at 50% 100%, rgba(224, 191, 94, 0.18), transparent 70%),
            linear-gradient(180deg, #1a1a24 0%, #0e0e16 50%, #06060a 100%);
        }

        /* === Hitbox wrapper — generous 96x96 invisible touch area.
              Visual coin/card sits centered inside. Mobile thumbs find
              this much easier than a 64x64 visual hit area. === */
        .mr-hitbox {
          position: absolute;
          top: 0;
          width: 96px;
          height: 96px;
          margin-left: -48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          will-change: transform;
          animation-name: mr-fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        .mr-paused {
          animation-play-state: paused !important;
        }
        @keyframes mr-fall {
          from { transform: translate3d(0, -100px, 0); }
          to { transform: translate3d(0, 110vh, 0); }
        }

        /* Visual sits inside hitbox — pointer-events: none so all clicks
           hit the wrapper instead. */
        .mr-visual {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .mr-label {
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .mr-sub {
          font-weight: 700;
          line-height: 1;
          opacity: 0.85;
        }

        /* === €10 + €100 COINS — clear money look, prominent value === */
        .mr-coin {
          border-radius: 50%;
          box-shadow:
            inset -3px -4px 8px rgba(0, 0, 0, 0.55),
            inset 3px 4px 6px rgba(255, 255, 255, 0.5),
            0 3px 8px rgba(0, 0, 0, 0.45);
          position: relative;
        }
        /* Decorative outer ring (engraved coin edge) */
        .mr-coin::before {
          content: "";
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          border: 1.5px dashed rgba(0, 0, 0, 0.25);
          pointer-events: none;
        }
        .mr-coin .mr-sub {
          font-size: 14px;
          margin-bottom: -2px;
        }
        .mr-coin-bronze {
          width: 56px; height: 56px;
          background: radial-gradient(circle at 32% 28%, #ffe1a0 0%, #d59a3c 45%, #7a5418 100%);
          color: #2a1808;
        }
        .mr-coin-bronze .mr-label { font-size: 18px; }
        .mr-coin-silver {
          width: 70px; height: 70px;
          background: radial-gradient(circle at 32% 28%, #fff7c8 0%, #e8c869 45%, #5a4318 100%);
          color: #2a1808;
        }
        .mr-coin-silver .mr-label { font-size: 22px; }

        /* === €1K Gold bar === */
        .mr-bar {
          width: 78px; height: 44px;
          background: linear-gradient(180deg, #ffe896 0%, #e0bf5e 40%, #a07d2c 80%, #6b4f15 100%);
          clip-path: polygon(5% 5%, 95% 5%, 90% 95%, 10% 95%);
          color: #fff7d6;
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }
        .mr-bar .mr-label { font-size: 16px; }

        /* === €10K Bills stack === */
        .mr-bills {
          width: 78px; height: 52px;
          background: linear-gradient(180deg, #36955b 0%, #1a5e3a 100%);
          color: #d2f5dc;
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          box-shadow:
            5px 5px 0 -1px #2a7a4a,
            9px 9px 0 -2px #1f5f3a,
            12px 12px 14px rgba(0, 0, 0, 0.4);
        }
        .mr-bills .mr-label { font-size: 16px; }

        /* === €100K Briefcase legendary === */
        .mr-briefcase {
          width: 84px; height: 60px;
          background: linear-gradient(180deg, #3a1830 0%, #2a0e22 50%, #1a0614 100%);
          border: 1.5px solid rgba(255, 108, 216, 0.7);
          border-radius: 6px;
          color: #ff6cd8;
          box-shadow:
            0 0 24px rgba(255, 108, 216, 0.5),
            inset 0 1px 0 rgba(255, 108, 216, 0.6);
        }
        .mr-briefcase::after {
          content: "";
          position: absolute;
          left: 50%; top: 12px; margin-left: -10px;
          width: 20px; height: 7px;
          background: #e0bf5e;
          border-radius: 1px;
        }
        .mr-briefcase .mr-label { font-size: 14px; padding-top: 8px; }

        /* === TAX === */
        .mr-tax {
          width: 68px; height: 54px;
          background: linear-gradient(180deg, #f5e8d0 0%, #a08866 100%);
          border-radius: 2px;
          box-shadow: 3px 4px 6px rgba(0, 0, 0, 0.4);
          justify-content: flex-end;
          padding-bottom: 0;
        }
        .mr-tax::before {
          content: "";
          position: absolute;
          top: 0; right: 0;
          border-style: solid;
          border-width: 14px 14px 0 0;
          border-color: #7a6648 transparent transparent transparent;
        }
        .mr-tax .mr-label {
          background: #a8351a;
          padding: 2px 10px;
          color: #fff;
          font-size: 12px;
          letter-spacing: 0.05em;
        }

        /* === SCAM v2 — FOREX trading scam card === */
        .mr-scam {
          width: 80px; height: 60px;
          background: linear-gradient(180deg, #2a0a0a 0%, #6e1f1f 100%);
          border: 1.5px solid #ff4545;
          border-radius: 4px;
          padding: 4px 6px;
          color: #ffd2d2;
          box-shadow: 0 4px 8px rgba(168, 53, 26, 0.5);
          align-items: stretch;
          justify-content: space-between;
          overflow: hidden;
        }
        /* Fake trading chart line — jagged red downward */
        .mr-scam::before {
          content: "";
          position: absolute;
          left: 6px;
          right: 6px;
          top: 22px;
          height: 18px;
          background-image:
            linear-gradient(135deg, transparent 45%, #ff4545 45%, #ff4545 55%, transparent 55%);
          background-size: 8px 100%;
          background-repeat: repeat-x;
          opacity: 0.7;
          pointer-events: none;
        }
        /* Down arrow */
        .mr-scam::after {
          content: "▼";
          position: absolute;
          right: 6px;
          top: 4px;
          font-size: 10px;
          color: #ff4545;
        }
        .mr-scam .mr-label {
          font-size: 11px;
          letter-spacing: 0.08em;
          color: #ff7a7a;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
          z-index: 1;
        }
        .mr-scam .mr-sub {
          font-size: 14px;
          color: #fff;
          font-weight: 900;
          margin-top: auto;
          z-index: 1;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
        }

        /* === DEBT === */
        .mr-debt {
          width: 76px; height: 48px;
          background: linear-gradient(180deg, #7a45e0 0%, #2e1655 100%);
          border-radius: 8px;
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          color: #fff;
          box-shadow: 0 4px 8px rgba(46, 22, 85, 0.5);
        }
        .mr-debt .mr-label { font-size: 14px; letter-spacing: 0.05em; }

        /* === Animations === */
        .mr-tier-flash {
          animation: mr-flash 700ms ease-out forwards;
        }
        @keyframes mr-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .mr-combo-pop {
          animation: mr-combo 400ms ease-out forwards;
        }
        @keyframes mr-combo {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          30% { transform: translateX(-50%) scale(1.2); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 0; }
        }
        .mr-float {
          animation: mr-float-up 1s ease-out forwards;
          font-family: system-ui, sans-serif;
        }
        @keyframes mr-float-up {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-50px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
