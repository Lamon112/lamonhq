"use client";

/**
 * Defense modal — shows all active (or filtered to a single room) raids
 * as story cards with 2-4 defense buttons each. Click defense fires
 * `defendRaid()` server action; the modal then animates the outcome
 * (won/lost) inline, applies the activity feed entry, and the card
 * fades out.
 *
 * Drives the gameplay loop. Designed to feel like Fallout-Shelter
 * raider attacks: time pressure (countdown), choice trade-offs, dice
 * outcome.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Sword,
  Smile,
  Ghost,
  Zap,
  Wallet,
  Phone,
  Mail,
  Ban,
  EyeOff,
  Scroll,
  Sparkles,
  X,
} from "lucide-react";
import {
  RAID_ARCHETYPES,
  SEVERITY_COLOR,
  type RaidArchetype,
  type RaidDefense,
  type RaidType,
} from "@/lib/raids";
import { defendRaid, type ActiveRaid } from "@/app/actions/raids";
import { playSfx } from "@/lib/audio/sfx";

const ICON_MAP = {
  shield: Shield,
  sword: Sword,
  smile: Smile,
  ghost: Ghost,
  zap: Zap,
  wallet: Wallet,
  phone: Phone,
  mail: Mail,
  ban: Ban,
  "eye-off": EyeOff,
  scroll: Scroll,
  sparkles: Sparkles,
} as const;

interface Props {
  open: boolean;
  raids: ActiveRaid[];
  /** If set, only show raids whose target_room matches */
  filterRoom?: string | null;
  onClose: () => void;
}

interface ResolvedDisplay {
  raidId: string;
  outcome: "won" | "lost";
  rewardLabel: string;
  penaltyLabel: string;
  xpDelta: number;
  cashDelta: number;
}

export function RaidDefenseModal({ open, raids, filterRoom, onClose }: Props) {
  const filtered = useMemo(() => {
    if (!filterRoom) return raids;
    return raids.filter((r) => r.target_room === filterRoom);
  }, [raids, filterRoom]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-3xl rounded-xl border-2 border-rose-500/60 bg-gradient-to-b from-stone-950 via-zinc-950 to-black shadow-[0_0_60px_rgba(244,63,94,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-rose-500/50 bg-gradient-to-r from-rose-950/80 via-stone-950 to-stone-950 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
            </span>
            <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-rose-100">
              ⚔ Raid command center · {filtered.length} aktivn{filtered.length === 1 ? "a prijetnja" : filtered.length < 5 ? "e prijetnje" : "ih prijetnji"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-rose-200 hover:bg-rose-500/20"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          {filtered.length === 0 && (
            <p className="py-12 text-center font-mono text-sm text-stone-400">
              Sve čisto. Nema aktivnih prijetnji u ovoj sobi.
            </p>
          )}
          {filtered.map((r) => (
            <RaidCard key={r.id} raid={r} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RaidCard({ raid }: { raid: ActiveRaid }) {
  const arche = RAID_ARCHETYPES[raid.raid_type as RaidType];
  const sev = SEVERITY_COLOR[raid.severity];
  const [resolved, setResolved] = useState<ResolvedDisplay | null>(null);
  const [pending, startTransition] = useTransition();
  const [pickedDefense, setPickedDefense] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const story = arche.story(raid.context ?? {});

  function handleDefend(defense: RaidDefense) {
    setError(null);
    setPickedDefense(defense.id);
    playSfx("defense_swoosh");
    playSfx("dice_roll");
    startTransition(async () => {
      const res = await defendRaid(raid.id, defense.id);
      if (!res.ok) {
        setError(res.error);
        setPickedDefense(null);
        playSfx("raid_hit");
        return;
      }
      const data = res.data!;
      setResolved({ raidId: raid.id, ...data });
      // Outcome SFX cluster
      if (data.outcome === "won") {
        playSfx("defense_win");
        if (data.xpDelta > 0) setTimeout(() => playSfx("xp_gain"), 350);
        if (data.cashDelta > 0) setTimeout(() => playSfx("cash_gain"), 600);
      } else {
        playSfx("defense_lose");
        if (data.cashDelta < 0) setTimeout(() => playSfx("cash_loss"), 350);
      }
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`overflow-hidden rounded-lg border-2 ${sev.border} bg-gradient-to-b from-stone-900/80 to-black shadow-[inset_0_0_30px_rgba(0,0,0,0.6)]`}
    >
      <div className={`flex items-center justify-between border-b ${sev.border} px-4 py-2 ${sev.bg}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{arche.emoji}</span>
          <div className="flex flex-col leading-tight">
            <span className={`font-mono text-xs font-bold uppercase tracking-wider ${sev.text}`}>
              {arche.title}
            </span>
            <span className="text-[10px] text-stone-400">
              cilj: {raid.target_room} · severity: {raid.severity}
            </span>
          </div>
        </div>
        <CountdownBadge expiresAt={raid.expires_at} />
      </div>

      <div className="px-4 py-3">
        <p
          className="text-sm leading-snug text-stone-200"
          dangerouslySetInnerHTML={{
            __html: story.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300">$1</strong>'),
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!resolved && (
          <motion.div
            key="choices"
            exit={{ opacity: 0, height: 0 }}
            className="grid gap-2 border-t border-stone-800 bg-stone-950/60 p-3 sm:grid-cols-2"
          >
            {arche.defenses.map((d) => {
              const Icon = ICON_MAP[d.icon];
              const isPicked = pickedDefense === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => handleDefend(d)}
                  disabled={pending}
                  className={
                    "group relative flex flex-col gap-1 rounded-md border bg-stone-900/80 p-3 text-left transition-all " +
                    (isPicked
                      ? "border-amber-400 ring-2 ring-amber-400/40"
                      : "border-stone-700 hover:border-amber-500/60 hover:bg-stone-900") +
                    (pending && !isPicked ? " opacity-50" : "")
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-amber-300" />
                      <span className="text-sm font-semibold text-stone-100">{d.label}</span>
                    </div>
                    <span className="font-mono text-[9px] uppercase text-stone-500">
                      {Math.round(d.winChance * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-stone-400">{d.hint}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                    {d.costEur > 0 && (
                      <span className="rounded bg-rose-900/50 px-1.5 py-0.5 font-mono text-rose-200">
                        −€{d.costEur}
                      </span>
                    )}
                    {d.xpOnWin > 0 && (
                      <span className="rounded bg-amber-900/50 px-1.5 py-0.5 font-mono text-amber-200">
                        +{d.xpOnWin} XP
                      </span>
                    )}
                    {d.cashOnWin && d.cashOnWin > 0 && (
                      <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 font-mono text-emerald-200">
                        win: +€{d.cashOnWin}
                      </span>
                    )}
                    {d.cashOnLose && d.cashOnLose < 0 && (
                      <span className="rounded bg-rose-900/50 px-1.5 py-0.5 font-mono text-rose-200">
                        lose: €{d.cashOnLose}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
        {resolved && <ResolvedSummary key="resolved" data={resolved} arche={arche} />}
      </AnimatePresence>

      {error && (
        <p className="bg-rose-950/40 px-4 py-2 text-[11px] text-rose-200">⚠ {error}</p>
      )}
    </motion.div>
  );
}

function ResolvedSummary({
  data,
  arche,
}: {
  data: ResolvedDisplay;
  arche: RaidArchetype;
}) {
  const won = data.outcome === "won";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        "border-t-2 px-4 py-4 " +
        (won
          ? "border-emerald-500/60 bg-gradient-to-r from-emerald-950/40 via-stone-950 to-stone-950"
          : "border-rose-600/60 bg-gradient-to-r from-rose-950/40 via-stone-950 to-stone-950")
      }
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl">{won ? "🛡" : "💥"}</span>
        <span className={`font-mono text-xs font-bold uppercase tracking-wider ${won ? "text-emerald-200" : "text-rose-200"}`}>
          {won ? `${arche.title} odbijen!` : `${arche.title} probio obranu.`}
        </span>
      </div>
      <p className="text-sm text-stone-100">
        {won ? data.rewardLabel : data.penaltyLabel}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono">
        {data.xpDelta > 0 && (
          <span className="rounded bg-amber-900/60 px-1.5 py-0.5 text-amber-200">+{data.xpDelta} XP</span>
        )}
        {data.cashDelta !== 0 && (
          <span
            className={
              "rounded px-1.5 py-0.5 " +
              (data.cashDelta > 0
                ? "bg-emerald-900/60 text-emerald-200"
                : "bg-rose-900/60 text-rose-200")
            }
          >
            {data.cashDelta > 0 ? "+" : ""}€{data.cashDelta.toFixed(2)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (remainingMs <= 0) {
    return (
      <span className="rounded border border-stone-700 bg-stone-900 px-2 py-0.5 font-mono text-[10px] uppercase text-stone-400">
        expired
      </span>
    );
  }
  const totalMin = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const sec = Math.floor((remainingMs / 1000) % 60);
  const urgent = remainingMs < 30 * 60 * 1000;
  return (
    <span
      className={
        "rounded border px-2 py-0.5 font-mono text-[10px] uppercase " +
        (urgent
          ? "border-rose-500/60 bg-rose-900/40 text-rose-200 animate-pulse"
          : "border-stone-700 bg-stone-900/80 text-stone-300")
      }
    >
      {hours > 0 ? `${hours}h ` : ""}
      {min}m {hours === 0 ? `${String(sec).padStart(2, "0")}s` : ""}
    </span>
  );
}
