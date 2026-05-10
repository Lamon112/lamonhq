/**
 * Procedural SFX library — pure Web Audio synthesis (no asset files).
 *
 * Each function builds a small graph of oscillators / noise + envelope,
 * plays it once through the shared sfxGain, and disposes itself. Cheap,
 * instant, no network.
 *
 * Sound design philosophy: short bursts (40-400ms), distinct character
 * per event so Leonardo's ear can read what just happened without
 * looking at the screen.
 */
import { ensureAudio, getCtx, getSfxGain } from "./context";

function withCtx<T>(
  fn: (ctx: AudioContext, sfx: GainNode) => T,
): T | undefined {
  const ctx = getCtx();
  const sfx = getSfxGain();
  if (!ctx || !sfx) return undefined;
  return fn(ctx, sfx);
}

/** White noise buffer, cached. */
let noiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

// =====================================================================
// UI
// =====================================================================

/** Soft UI tap — for hover/secondary actions. */
export function sfxClickSoft() {
  withCtx((ctx, sfx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g).connect(sfx);
    o.start();
    o.stop(ctx.currentTime + 0.1);
  });
}

/** Metallic vault button. */
export function sfxClickMetal() {
  withCtx((ctx, sfx) => {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 6;
    o1.type = "square";
    o1.frequency.value = 420;
    o2.type = "triangle";
    o2.frequency.value = 1300;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o1.connect(filter);
    o2.connect(filter);
    filter.connect(g).connect(sfx);
    o1.start();
    o2.start();
    o1.stop(ctx.currentTime + 0.2);
    o2.stop(ctx.currentTime + 0.2);
  });
}

/** Door / panel open — descending swoosh. */
export function sfxRoomOpen() {
  withCtx((ctx, sfx) => {
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    noise.connect(filter).connect(g).connect(sfx);
    noise.start();
    noise.stop(ctx.currentTime + 0.42);
  });
}

// =====================================================================
// RAID — alarms + impacts
// =====================================================================

/** Klaxon alarm — 2 high-low cycles. Fired when raid spawns. */
export function sfxRaidIncoming() {
  withCtx((ctx, sfx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(620, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(380, ctx.currentTime + 0.18);
    o.frequency.linearRampToValueAtTime(620, ctx.currentTime + 0.36);
    o.frequency.linearRampToValueAtTime(380, ctx.currentTime + 0.54);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.45, ctx.currentTime + 0.04);
    g.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(g).connect(sfx);
    o.start();
    o.stop(ctx.currentTime + 0.62);
  });
}

/** Critical raid siren — urgent, pulsing, 1.2s. */
export function sfxRaidCritical() {
  withCtx((ctx, sfx) => {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = "square";
    o2.type = "sawtooth";
    o1.frequency.setValueAtTime(880, ctx.currentTime);
    o2.frequency.setValueAtTime(440, ctx.currentTime);
    // 4 quick pulses
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * 0.3;
      o1.frequency.linearRampToValueAtTime(1200, t + 0.08);
      o1.frequency.linearRampToValueAtTime(880, t + 0.18);
      o2.frequency.linearRampToValueAtTime(600, t + 0.08);
      o2.frequency.linearRampToValueAtTime(440, t + 0.18);
    }
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.04);
    g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.25);
    o1.connect(g);
    o2.connect(g);
    g.connect(sfx);
    o1.start();
    o2.start();
    o1.stop(ctx.currentTime + 1.3);
    o2.stop(ctx.currentTime + 1.3);
  });
}

/** Defense pick swoosh — short whoosh. */
export function sfxDefenseSwoosh() {
  withCtx((ctx, sfx) => {
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    noise.connect(filter).connect(g).connect(sfx);
    noise.start();
    noise.stop(ctx.currentTime + 0.24);
  });
}

/** Dice roll — quick rattle. */
export function sfxDiceRoll() {
  withCtx((ctx, sfx) => {
    for (let i = 0; i < 6; i++) {
      const t = ctx.currentTime + i * 0.06;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = 1200 + Math.random() * 800;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.connect(g).connect(sfx);
      o.start(t);
      o.stop(t + 0.06);
    }
  });
}

/** Victory chord — major arpeggio C-E-G. */
export function sfxDefenseWin() {
  withCtx((ctx, sfx) => {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.07;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(g).connect(sfx);
      o.start(t);
      o.stop(t + 0.6);
    });
  });
}

/** Loss thud — minor descending. */
export function sfxDefenseLose() {
  withCtx((ctx, sfx) => {
    const notes = [349.23, 311.13, 261.63]; // F4 Eb4 C4
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.12;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g).connect(sfx);
      o.start(t);
      o.stop(t + 0.5);
    });
    // Add low thud
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(120, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(g).connect(sfx);
    o.start();
    o.stop(ctx.currentTime + 0.65);
  });
}

/** Slash hit — when raid attack lands on you (e.g. raid expired = ignored). */
export function sfxRaidHit() {
  withCtx((ctx, sfx) => {
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    noise.connect(filter).connect(g).connect(sfx);
    noise.start();
    noise.stop(ctx.currentTime + 0.2);

    // Low impact thud
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(80, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);
    og.gain.setValueAtTime(0.001, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.01);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(og).connect(sfx);
    o.start();
    o.stop(ctx.currentTime + 0.32);
  });
}

// =====================================================================
// REWARDS
// =====================================================================

/** XP sparkle — bell-like ascending arpeggio. */
export function sfxXpGain() {
  withCtx((ctx, sfx) => {
    const notes = [880, 1108.73, 1318.51]; // A5 C#6 E6
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.04;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(sfx);
      o.start(t);
      o.stop(t + 0.32);
    });
  });
}

/** Coin / cash gain. */
export function sfxCashGain() {
  withCtx((ctx, sfx) => {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.setValueAtTime(1200, ctx.currentTime);
    o2.frequency.setValueAtTime(1800, ctx.currentTime + 0.05);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o1.connect(g);
    o2.connect(g);
    g.connect(sfx);
    o1.start();
    o2.start(ctx.currentTime + 0.05);
    o1.stop(ctx.currentTime + 0.27);
    o2.stop(ctx.currentTime + 0.27);
  });
}

/** Cash loss — descending. */
export function sfxCashLoss() {
  withCtx((ctx, sfx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(660, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    o.connect(g).connect(sfx);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  });
}

/** AI agent kicks off (agent_actions row created). */
export function sfxAgentStart() {
  withCtx((ctx, sfx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    o.connect(filter).connect(g).connect(sfx);
    o.start();
    o.stop(ctx.currentTime + 0.34);
  });
}

/** Universal helper — play SFX after ensuring audio is unlocked.
 *  Safe to call from anywhere; no-ops if audio not unlocked yet. */
export function playSfx(name: SfxName) {
  // Don't attempt to unlock here — user gesture required. AudioController
  // unlocks on first user click. After that, all SFX play freely.
  const fn = SFX_MAP[name];
  if (fn) fn();
}

export type SfxName =
  | "click_soft"
  | "click_metal"
  | "room_open"
  | "raid_incoming"
  | "raid_critical"
  | "defense_swoosh"
  | "dice_roll"
  | "defense_win"
  | "defense_lose"
  | "raid_hit"
  | "xp_gain"
  | "cash_gain"
  | "cash_loss"
  | "agent_start";

const SFX_MAP: Record<SfxName, () => void> = {
  click_soft: sfxClickSoft,
  click_metal: sfxClickMetal,
  room_open: sfxRoomOpen,
  raid_incoming: sfxRaidIncoming,
  raid_critical: sfxRaidCritical,
  defense_swoosh: sfxDefenseSwoosh,
  dice_roll: sfxDiceRoll,
  defense_win: sfxDefenseWin,
  defense_lose: sfxDefenseLose,
  raid_hit: sfxRaidHit,
  xp_gain: sfxXpGain,
  cash_gain: sfxCashGain,
  cash_loss: sfxCashLoss,
  agent_start: sfxAgentStart,
};

/** Re-export for AudioController one-shot test playback. */
export { ensureAudio };
