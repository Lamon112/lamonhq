"use client";

/**
 * Audio HUD widget — first-click unlocks AudioContext, then exposes
 * mute toggle + master volume slider. Lives in the Vault top bar.
 *
 * Design:
 *   - Compact: button + popover
 *   - Persists volume + mute to localStorage
 *   - Triggers idle music as soon as audio is unlocked (so Leonardo
 *     hears the workshop drone immediately)
 */
import { useEffect, useState, useRef } from "react";
import { Volume2, VolumeX, Music, Music2, ChevronDown } from "lucide-react";
import {
  ensureAudio,
  readPersistedSettings,
  setMasterVolume,
  setMute,
  setMusicVolume,
  setSfxVolume,
} from "@/lib/audio/context";
import { setMusicState } from "@/lib/audio/music";
import { playSfx } from "@/lib/audio/sfx";

interface Props {
  /** Whether any raid is currently active — drives auto music switch. */
  hasActiveRaid: boolean;
  /** Whether any active raid is critical severity. */
  hasCriticalRaid: boolean;
}

export function AudioController({ hasActiveRaid, hasCriticalRaid }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [vol, setVol] = useState(0.6);
  const [musicVol, setMusicVolState] = useState(0.45);
  const [sfxVol, setSfxVolState] = useState(0.7);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage on mount. Can't run in initial useState
  // because localStorage is unavailable during SSR. Single batched setState
  // via combined object would still trigger the lint, so we suppress.
  useEffect(() => {
    const p = readPersistedSettings();
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsMuted(p.mute);
    setVol(p.volume);
    setMusicVolState(p.musicVol);
    setSfxVolState(p.sfxVol);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Drive music state from raid props once unlocked
  useEffect(() => {
    if (!unlocked || isMuted) return;
    const target = hasCriticalRaid
      ? "critical"
      : hasActiveRaid
        ? "combat"
        : "idle";
    setMusicState(target);
  }, [hasActiveRaid, hasCriticalRaid, unlocked, isMuted]);

  // When unmute happens, resume music; when mute, switch to off
  useEffect(() => {
    if (!unlocked) return;
    if (isMuted) {
      setMusicState("off");
    } else {
      const target = hasCriticalRaid
        ? "critical"
        : hasActiveRaid
          ? "combat"
          : "idle";
      setMusicState(target);
    }
  }, [isMuted, unlocked, hasActiveRaid, hasCriticalRaid]);

  async function handleEnable() {
    try {
      await ensureAudio();
      setUnlocked(true);
      // Pop a quick test SFX so Leonardo hears it works
      playSfx("click_metal");
      // Kick off idle music
      setMusicState(
        hasCriticalRaid ? "critical" : hasActiveRaid ? "combat" : "idle",
      );
    } catch {
      // ignore — browser blocked or unsupported
    }
  }

  function handleToggleMute() {
    const next = !isMuted;
    setIsMuted(next);
    setMute(next);
    if (!next) playSfx("click_soft");
  }

  function handleVol(v: number) {
    setVol(v);
    setMasterVolume(v);
    if (isMuted) {
      setIsMuted(false);
      setMute(false);
    }
  }
  function handleMusicVol(v: number) {
    setMusicVolState(v);
    setMusicVolume(v);
  }
  function handleSfxVol(v: number) {
    setSfxVolState(v);
    setSfxVolume(v);
  }

  if (!unlocked) {
    return (
      <button
        onClick={handleEnable}
        className="flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-950/30 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-300 transition-all hover:scale-[1.03] hover:bg-amber-900/40"
        title="Klikni za uključivanje audio sustava (zvučni efekti + ambient music)"
      >
        <Volume2 size={12} />
        Enable audio
      </button>
    );
  }

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all hover:scale-[1.03] " +
          (isMuted
            ? "border-stone-700 bg-stone-900/80 text-stone-400"
            : "border-amber-500/50 bg-amber-950/30 text-amber-300")
        }
      >
        {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        <span>audio</span>
        <ChevronDown size={10} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border-2 border-amber-700/50 bg-stone-950/95 p-3 shadow-2xl backdrop-blur-md">
          <button
            onClick={handleToggleMute}
            className={
              "mb-3 flex w-full items-center justify-between rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors " +
              (isMuted
                ? "border-rose-700/50 bg-rose-950/40 text-rose-200 hover:bg-rose-900/40"
                : "border-emerald-700/50 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/40")
            }
          >
            <span className="flex items-center gap-2">
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              {isMuted ? "muted" : "audio on"}
            </span>
            <span className="text-[9px] opacity-70">
              {isMuted ? "click to unmute" : "click to mute"}
            </span>
          </button>

          <div className="space-y-2.5">
            <Slider
              label="Master"
              value={vol}
              onChange={handleVol}
              icon={<Volume2 size={11} />}
            />
            <Slider
              label="Music"
              value={musicVol}
              onChange={handleMusicVol}
              icon={<Music size={11} />}
            />
            <Slider
              label="SFX"
              value={sfxVol}
              onChange={handleSfxVol}
              icon={<Music2 size={11} />}
            />
          </div>

          <p className="mt-3 border-t border-amber-700/30 pt-2 font-mono text-[8px] uppercase tracking-wider text-amber-400/50">
            ironman workshop · ambient drone
          </p>
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-amber-300/70">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="text-amber-300/90">{Math.round(value * 100)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
      />
    </div>
  );
}
