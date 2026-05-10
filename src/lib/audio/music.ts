/**
 * Procedural ambient music — Iron-Man workshop / Fallout-Shelter Vault
 * vibe. Three layers that fade in/out based on raid state:
 *
 *   - idle    Low drone (40Hz triangle + 80Hz sine + filtered noise) +
 *             metallic ping arpeggio on slow beat. Calm, focused,
 *             "Tony Stark working in his lab."
 *   - combat  Adds 110Hz pulsing bass, faster pings in minor key, low
 *             rhythmic hit. "Raiders are at the door."
 *   - critical Adds high-frequency sweep + urgent kick pattern. "The
 *             Vault is on fire."
 *
 * All synthesized via Web Audio — no asset files. Layers crossfade
 * smoothly so transitions don't startle.
 */
import { ensureAudio, getCtx, getMusicGain } from "./context";

type MusicState = "off" | "idle" | "combat" | "critical";

interface LayerHandle {
  nodes: AudioNode[];
  gain: GainNode;
  stop: () => void;
}

const layers: { idle?: LayerHandle; combat?: LayerHandle; critical?: LayerHandle } = {};
let currentState: MusicState = "off";
let pingScheduler: number | null = null;
let combatScheduler: number | null = null;

const NOTES_MAJOR = [261.63, 329.63, 392.0, 523.25, 659.25]; // C E G C E
const NOTES_MINOR = [220.0, 261.63, 329.63, 415.3, 523.25]; // A C E Ab C

function fadeIn(layer: LayerHandle, target: number, durSec = 1.5) {
  const ctx = getCtx();
  if (!ctx) return;
  layer.gain.gain.cancelScheduledValues(ctx.currentTime);
  layer.gain.gain.setValueAtTime(layer.gain.gain.value, ctx.currentTime);
  layer.gain.gain.linearRampToValueAtTime(target, ctx.currentTime + durSec);
}

function fadeOut(layer: LayerHandle, durSec = 1.5, thenStop = false) {
  const ctx = getCtx();
  if (!ctx) return;
  layer.gain.gain.cancelScheduledValues(ctx.currentTime);
  layer.gain.gain.setValueAtTime(layer.gain.gain.value, ctx.currentTime);
  layer.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + durSec);
  if (thenStop) {
    setTimeout(() => layer.stop(), durSec * 1000 + 100);
  }
}

// =====================================================================
// Layer constructors
// =====================================================================

function buildIdleLayer(): LayerHandle {
  const ctx = getCtx()!;
  const out = getMusicGain()!;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(out);

  // Faux reverb — feedback delay for "big space" cinematic feel
  const reverb = ctx.createDelay(2);
  reverb.delayTime.value = 0.18;
  const reverbFb = ctx.createGain();
  reverbFb.gain.value = 0.32;
  const reverbFilter = ctx.createBiquadFilter();
  reverbFilter.type = "lowpass";
  reverbFilter.frequency.value = 1800;
  const reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.45;
  reverb.connect(reverbFilter).connect(reverbFb).connect(reverb);
  reverbFilter.connect(reverbWet).connect(gain);

  // === SUB DRONE — deep cinematic foundation (E1 + B1 fifth) ===
  const sub1 = ctx.createOscillator();
  sub1.type = "sine";
  sub1.frequency.value = 41.2; // E1
  const sub1G = ctx.createGain();
  sub1G.gain.value = 0.55;
  sub1.connect(sub1G).connect(gain);

  const sub2 = ctx.createOscillator();
  sub2.type = "triangle";
  sub2.frequency.value = 61.74; // B1 (perfect fifth above E1)
  const sub2G = ctx.createGain();
  sub2G.gain.value = 0.28;
  sub2.connect(sub2G).connect(gain);

  // === CELLO-LIKE SUSTAIN — sawtooth + lowpass + slow vibrato (E2) ===
  const cello = ctx.createOscillator();
  cello.type = "sawtooth";
  cello.frequency.value = 82.4; // E2
  const celloFilter = ctx.createBiquadFilter();
  celloFilter.type = "lowpass";
  celloFilter.frequency.value = 520;
  celloFilter.Q.value = 2.5;
  const celloG = ctx.createGain();
  celloG.gain.value = 0.18;
  cello.connect(celloFilter).connect(celloG).connect(gain);
  celloG.connect(reverb);
  // Slow vibrato (~5Hz, ±3 cents)
  const vib = ctx.createOscillator();
  vib.frequency.value = 5;
  const vibG = ctx.createGain();
  vibG.gain.value = 1.2;
  vib.connect(vibG).connect(cello.frequency);

  // === BRASS-LIKE SWELL — periodic Hans Zimmer "BWAHHH" every ~14s ===
  const brass1 = ctx.createOscillator();
  brass1.type = "sawtooth";
  brass1.frequency.value = 82.4; // E2
  const brass2 = ctx.createOscillator();
  brass2.type = "sawtooth";
  brass2.frequency.value = 82.4 * 1.498; // ~B2 perfect fifth
  brass2.detune.value = -8;
  const brassFilter = ctx.createBiquadFilter();
  brassFilter.type = "lowpass";
  brassFilter.frequency.value = 280;
  brassFilter.Q.value = 4;
  const brassG = ctx.createGain();
  brassG.gain.value = 0.0001;
  brass1.connect(brassFilter);
  brass2.connect(brassFilter);
  brassFilter.connect(brassG).connect(gain);
  brassG.connect(reverb);

  // Schedule swell envelope: every 14s, ramp filter 280→1400Hz +
  // gain 0→0.35→0 over 6s. Sounds like a brass section breathing in
  // and exhaling.
  const scheduleSwell = (startAt: number) => {
    brassG.gain.setValueAtTime(0.0001, startAt);
    brassG.gain.exponentialRampToValueAtTime(0.32, startAt + 2.5);
    brassG.gain.linearRampToValueAtTime(0.32, startAt + 4);
    brassG.gain.exponentialRampToValueAtTime(0.0001, startAt + 6.5);
    brassFilter.frequency.setValueAtTime(280, startAt);
    brassFilter.frequency.linearRampToValueAtTime(1400, startAt + 3);
    brassFilter.frequency.linearRampToValueAtTime(280, startAt + 6.5);
  };
  // Pre-schedule 8 swells; refresh interval will keep adding
  const swellPeriodSec = 14;
  for (let i = 0; i < 8; i++) {
    scheduleSwell(ctx.currentTime + 3 + i * swellPeriodSec);
  }
  const swellIntervalId = window.setInterval(() => {
    // Always look 30s ahead
    const startAt = ctx.currentTime + 30;
    scheduleSwell(startAt);
  }, swellPeriodSec * 1000);

  // === HEARTBEAT PULSE — subtle Inception-style sub kick every 4s ===
  const scheduleHeartbeat = (startAt: number) => {
    const k = ctx.createOscillator();
    const kg = ctx.createGain();
    k.type = "sine";
    k.frequency.setValueAtTime(55, startAt);
    k.frequency.exponentialRampToValueAtTime(28, startAt + 0.4);
    kg.gain.setValueAtTime(0.001, startAt);
    kg.gain.exponentialRampToValueAtTime(0.5, startAt + 0.012);
    kg.gain.exponentialRampToValueAtTime(0.001, startAt + 0.5);
    k.connect(kg).connect(gain);
    k.start(startAt);
    k.stop(startAt + 0.55);
    // Ghost / second beat 0.18s later, quieter
    const k2 = ctx.createOscillator();
    const k2g = ctx.createGain();
    k2.type = "sine";
    k2.frequency.setValueAtTime(48, startAt + 0.18);
    k2.frequency.exponentialRampToValueAtTime(24, startAt + 0.55);
    k2g.gain.setValueAtTime(0.001, startAt + 0.18);
    k2g.gain.exponentialRampToValueAtTime(0.28, startAt + 0.195);
    k2g.gain.exponentialRampToValueAtTime(0.001, startAt + 0.6);
    k2.connect(k2g).connect(gain);
    k2.start(startAt + 0.18);
    k2.stop(startAt + 0.65);
  };
  const heartbeatPeriodSec = 4;
  for (let i = 0; i < 16; i++) {
    scheduleHeartbeat(ctx.currentTime + 1 + i * heartbeatPeriodSec);
  }
  const heartbeatIntervalId = window.setInterval(() => {
    scheduleHeartbeat(ctx.currentTime + 30);
  }, heartbeatPeriodSec * 1000);

  // === ROOM TONE — very quiet filtered noise for "air" ===
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.18;
  noise.buffer = buf;
  noise.loop = true;
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = "lowpass";
  nFilter.frequency.value = 350;
  nFilter.Q.value = 1;
  const nGain = ctx.createGain();
  nGain.gain.value = 0.08;
  noise.connect(nFilter).connect(nGain).connect(gain);

  sub1.start();
  sub2.start();
  cello.start();
  vib.start();
  brass1.start();
  brass2.start();
  noise.start();

  return {
    nodes: [sub1, sub2, cello, vib, brass1, brass2, noise],
    gain,
    stop: () => {
      try {
        sub1.stop();
        sub2.stop();
        cello.stop();
        vib.stop();
        brass1.stop();
        brass2.stop();
        noise.stop();
      } catch {
        /* noop */
      }
      window.clearInterval(swellIntervalId);
      window.clearInterval(heartbeatIntervalId);
      gain.disconnect();
    },
  };
}

function buildCombatLayer(): LayerHandle {
  const ctx = getCtx()!;
  const out = getMusicGain()!;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(out);

  // Pulsing bass — 110Hz throbbing
  const bass = ctx.createOscillator();
  bass.type = "sawtooth";
  bass.frequency.value = 110;
  const bassFilter = ctx.createBiquadFilter();
  bassFilter.type = "lowpass";
  bassFilter.frequency.value = 320;
  const bassG = ctx.createGain();
  bassG.gain.value = 0.001;
  bass.connect(bassFilter).connect(bassG).connect(gain);

  // Pulsing envelope LFO on bass gain — heart-beat throb
  const pulse = ctx.createOscillator();
  pulse.type = "sine";
  pulse.frequency.value = 1.4; // ~84 BPM
  const pulseG = ctx.createGain();
  pulseG.gain.value = 0.18;
  // Map LFO -1..1 → 0..0.36 by adding offset 0.18
  // Workaround: connect LFO to bassG.gain (additive)
  pulse.connect(pulseG).connect(bassG.gain);

  bass.start();
  pulse.start();

  return {
    nodes: [bass, pulse, bassG, bassFilter, pulseG],
    gain,
    stop: () => {
      try {
        bass.stop();
        pulse.stop();
      } catch {
        /* noop */
      }
      gain.disconnect();
    },
  };
}

function buildCriticalLayer(): LayerHandle {
  const ctx = getCtx()!;
  const out = getMusicGain()!;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(out);

  // High-frequency sawtooth sweep, modulated
  const high = ctx.createOscillator();
  high.type = "sawtooth";
  high.frequency.value = 660;
  const hFilter = ctx.createBiquadFilter();
  hFilter.type = "bandpass";
  hFilter.frequency.value = 1200;
  hFilter.Q.value = 4;
  const hG = ctx.createGain();
  hG.gain.value = 0.07;
  high.connect(hFilter).connect(hG).connect(gain);
  // Slow sweep LFO
  const sweep = ctx.createOscillator();
  sweep.frequency.value = 0.5;
  const sweepG = ctx.createGain();
  sweepG.gain.value = 800;
  sweep.connect(sweepG).connect(hFilter.frequency);

  high.start();
  sweep.start();

  // Schedule periodic kicks (urgent heart-attack rhythm)
  const startKicks = () => {
    const now = ctx.currentTime;
    for (let i = 0; i < 32; i++) {
      const t = now + i * 0.55;
      const k = ctx.createOscillator();
      const kg = ctx.createGain();
      k.type = "sine";
      k.frequency.setValueAtTime(140, t);
      k.frequency.exponentialRampToValueAtTime(40, t + 0.2);
      kg.gain.setValueAtTime(0.001, t);
      kg.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      k.connect(kg).connect(gain);
      k.start(t);
      k.stop(t + 0.27);
    }
  };
  startKicks();
  const kickIntervalId = window.setInterval(startKicks, 32 * 0.55 * 1000);

  return {
    nodes: [high, sweep, hG, hFilter, sweepG],
    gain,
    stop: () => {
      try {
        high.stop();
        sweep.stop();
      } catch {
        /* noop */
      }
      window.clearInterval(kickIntervalId);
      gain.disconnect();
    },
  };
}

// =====================================================================
// Idle pings — slow metallic chimes drifting over the drone
// =====================================================================

function startPingScheduler(notesSet: number[], intervalMs: number, vol = 0.18) {
  if (pingScheduler) window.clearInterval(pingScheduler);
  const fire = () => {
    const ctx = getCtx();
    const out = getMusicGain();
    if (!ctx || !out) return;
    const freq = notesSet[Math.floor(Math.random() * notesSet.length)] * 2; // octave up
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 800;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
    o.connect(filter).connect(g).connect(out);
    o.start();
    o.stop(ctx.currentTime + 1.7);
  };
  fire();
  pingScheduler = window.setInterval(fire, intervalMs);
}

function stopPingScheduler() {
  if (pingScheduler) {
    window.clearInterval(pingScheduler);
    pingScheduler = null;
  }
}

function startCombatScheduler() {
  if (combatScheduler) window.clearInterval(combatScheduler);
  const fire = () => {
    const ctx = getCtx();
    const out = getMusicGain();
    if (!ctx || !out) return;
    // Quick 2-note minor stab
    const root = NOTES_MINOR[Math.floor(Math.random() * 3)];
    [root, root * 1.189].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.08;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.55);
    });
  };
  fire();
  combatScheduler = window.setInterval(fire, 2400);
}

function stopCombatScheduler() {
  if (combatScheduler) {
    window.clearInterval(combatScheduler);
    combatScheduler = null;
  }
}

// =====================================================================
// Public API — state machine
// =====================================================================

export async function setMusicState(target: MusicState) {
  if (target === currentState) return;
  await ensureAudio();
  const ctx = getCtx();
  if (!ctx) return;

  // Build layers lazily
  if (target !== "off" && !layers.idle) {
    layers.idle = buildIdleLayer();
  }
  if ((target === "combat" || target === "critical") && !layers.combat) {
    layers.combat = buildCombatLayer();
  }
  if (target === "critical" && !layers.critical) {
    layers.critical = buildCriticalLayer();
  }

  switch (target) {
    case "off":
      if (layers.idle) fadeOut(layers.idle, 1.2);
      if (layers.combat) fadeOut(layers.combat, 1.2);
      if (layers.critical) fadeOut(layers.critical, 0.8);
      stopPingScheduler();
      stopCombatScheduler();
      break;
    case "idle":
      // Pure ambient drone only — no melodic pings (felt elevator-y)
      if (layers.idle) fadeIn(layers.idle, 0.6);
      if (layers.combat) fadeOut(layers.combat, 1.5);
      if (layers.critical) fadeOut(layers.critical, 0.8);
      stopPingScheduler();
      stopCombatScheduler();
      break;
    case "combat":
      if (layers.idle) fadeIn(layers.idle, 0.5);
      if (layers.combat) fadeIn(layers.combat, 0.5);
      if (layers.critical) fadeOut(layers.critical, 0.8);
      stopPingScheduler();
      startCombatScheduler();
      break;
    case "critical":
      if (layers.idle) fadeIn(layers.idle, 0.4);
      if (layers.combat) fadeIn(layers.combat, 0.55);
      if (layers.critical) fadeIn(layers.critical, 0.45);
      stopPingScheduler();
      startCombatScheduler();
      break;
  }
  currentState = target;
}

export function getMusicState(): MusicState {
  return currentState;
}

export function disposeMusic() {
  stopPingScheduler();
  stopCombatScheduler();
  layers.idle?.stop();
  layers.combat?.stop();
  layers.critical?.stop();
  layers.idle = undefined;
  layers.combat = undefined;
  layers.critical = undefined;
  currentState = "off";
}
