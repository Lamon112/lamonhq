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

const ITEM_STYLES: Record<ItemKind, { class: string; label: string }> = {
  small: { class: "mr-coin mr-coin-bronze", label: "€10" },
  medium: { class: "mr-coin mr-coin-silver", label: "€100" },
  big: { class: "mr-bar", label: "€1K" },
  huge: { class: "mr-bills", label: "€10K" },
  legendary: { class: "mr-briefcase", label: "€100K" },
  tax: { class: "mr-tax", label: "TAX" },
  scam: { class: "mr-scam", label: "SCAM" },
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
    setItems((arr) => arr.filter((it) => it.id !== id));
  }, []);

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

      {/* Game container */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-gold/40 shadow-2xl shadow-gold/20 mr-game-bg"
        style={{ aspectRatio: "9 / 14", maxHeight: "65vh", touchAction: "manipulation" }}
      >
        {/* Debug counter — top-left, small. Stays visible so Leonardo can
            tell at a glance whether spawn loop is alive (spawned should
            increment ~every 400ms) and whether items render (alive should
            be 5-15 normally). If alive=0 but spawned>0, animation isn't
            rendering. If both stay 0, spawn loop dead. */}
        <div className="pointer-events-none absolute left-2 top-2 z-30 rounded bg-bg/70 px-2 py-0.5 text-[10px] font-mono text-text-dim backdrop-blur">
          spawned: {debugInfo.spawned} · alive: {debugInfo.alive}
        </div>

        {/* Items */}
        {items.map((item) => {
          const sty = ITEM_STYLES[item.kind];
          return (
            <div
              key={item.id}
              className={`mr-item ${sty.class} ${paused ? "mr-paused" : ""}`}
              style={{
                left: `${item.xPercent}%`,
                animationDuration: `${item.fallDuration}s`,
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                collectItem(item.id, item.value, item.kind, e.clientX, e.clientY);
              }}
              onAnimationEnd={() => onItemAnimEnd(item.id)}
            >
              <span className="mr-label">{sty.label}</span>
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

        .mr-item {
          position: absolute;
          top: 0;
          width: 64px;
          height: 64px;
          margin-left: -32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: manipulation;
          user-select: none;
          -webkit-user-select: none;
          will-change: transform;
          animation-name: mr-fall;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        .mr-paused {
          animation-play-state: paused !important;
        }
        @keyframes mr-fall {
          from { transform: translate3d(0, -80px, 0); }
          to { transform: translate3d(0, 110vh, 0); }
        }

        .mr-label {
          font-weight: 900;
          font-size: 13px;
          text-align: center;
          line-height: 1;
        }

        /* Coins */
        .mr-coin {
          border-radius: 50%;
          box-shadow:
            inset -2px -3px 6px rgba(0, 0, 0, 0.5),
            inset 2px 3px 6px rgba(255, 255, 255, 0.4),
            0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .mr-coin-bronze {
          background: radial-gradient(circle at 35% 30%, #fdebb3 0%, #c9a84c 50%, #5e4717 100%);
          color: #1a1209;
        }
        .mr-coin-silver {
          background: radial-gradient(circle at 35% 30%, #fff5d8 0%, #e0bf5e 50%, #5a4318 100%);
          color: #1a1209;
        }

        /* Gold bar */
        .mr-bar {
          width: 80px; margin-left: -40px; height: 50px;
          background: linear-gradient(180deg, #ffe896 0%, #e0bf5e 40%, #a07d2c 80%, #6b4f15 100%);
          clip-path: polygon(5% 5%, 95% 5%, 90% 95%, 10% 95%);
          color: #fff7d6;
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.5);
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
        }

        /* Bills stack */
        .mr-bills {
          width: 80px; height: 56px; margin-left: -40px;
          background: linear-gradient(180deg, #36955b 0%, #1a5e3a 100%);
          color: #d2f5dc;
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          box-shadow:
            6px 6px 0 -1px #2a7a4a,
            10px 10px 0 -2px #1f5f3a,
            14px 14px 18px rgba(0, 0, 0, 0.5);
        }

        /* Briefcase */
        .mr-briefcase {
          width: 84px; height: 64px; margin-left: -42px;
          background: linear-gradient(180deg, #3a1830 0%, #2a0e22 50%, #1a0614 100%);
          border: 1.5px solid rgba(255, 108, 216, 0.7);
          border-radius: 6px;
          color: #ff6cd8;
          box-shadow: 0 0 30px rgba(255, 108, 216, 0.5);
        }
        .mr-briefcase::after {
          content: "";
          position: absolute;
          left: 50%; top: 14px; margin-left: -10px;
          width: 20px; height: 8px;
          background: #e0bf5e;
          border-radius: 1px;
        }

        /* TAX */
        .mr-tax {
          width: 70px; height: 56px; margin-left: -35px;
          background: linear-gradient(180deg, #f5e8d0 0%, #a08866 100%);
          border-radius: 2px;
          position: relative;
          box-shadow: 3px 4px 8px rgba(0, 0, 0, 0.4);
          color: #fff;
          align-items: flex-end;
          padding-bottom: 2px;
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
          padding: 2px 8px;
          color: #fff;
          font-size: 10px;
        }

        /* SCAM */
        .mr-scam {
          width: 70px; height: 64px; margin-left: -35px;
          background: linear-gradient(180deg, #ff7a45 0%, #a8351a 100%);
          clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
          color: #fff;
          align-items: flex-end;
          padding-bottom: 4px;
          filter: drop-shadow(0 4px 6px rgba(168, 53, 26, 0.6));
        }
        .mr-scam .mr-label { font-size: 10px; }

        /* DEBT */
        .mr-debt {
          width: 78px; height: 50px; margin-left: -39px;
          background: linear-gradient(180deg, #7a45e0 0%, #2e1655 100%);
          border-radius: 8px;
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          color: #fff;
          box-shadow: 0 4px 10px rgba(46, 22, 85, 0.5);
        }

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
