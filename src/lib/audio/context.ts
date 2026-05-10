/**
 * Shared Web Audio context + master gain. Single instance per page.
 *
 * Browsers require a user gesture to start audio — we lazy-init on
 * first ensureAudio() call (which AudioController triggers from a
 * click). Persisted state (volume, mute) lives in localStorage.
 */

type AudioState = {
  ctx: AudioContext | null;
  masterGain: GainNode | null;
  musicGain: GainNode | null;
  sfxGain: GainNode | null;
  unlocked: boolean;
};

const state: AudioState = {
  ctx: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  unlocked: false,
};

const LS_VOLUME = "lamon-audio-volume";
const LS_MUTE = "lamon-audio-mute";
const LS_MUSIC_VOL = "lamon-audio-music-vol";
const LS_SFX_VOL = "lamon-audio-sfx-vol";

export function readPersistedSettings() {
  if (typeof window === "undefined") {
    return { volume: 0.6, mute: false, musicVol: 0.45, sfxVol: 0.7 };
  }
  return {
    volume: Number(localStorage.getItem(LS_VOLUME) ?? "0.6"),
    mute: localStorage.getItem(LS_MUTE) === "1",
    musicVol: Number(localStorage.getItem(LS_MUSIC_VOL) ?? "0.45"),
    sfxVol: Number(localStorage.getItem(LS_SFX_VOL) ?? "0.7"),
  };
}

export function persistSettings(s: {
  volume?: number;
  mute?: boolean;
  musicVol?: number;
  sfxVol?: number;
}) {
  if (typeof window === "undefined") return;
  if (s.volume !== undefined) localStorage.setItem(LS_VOLUME, String(s.volume));
  if (s.mute !== undefined) localStorage.setItem(LS_MUTE, s.mute ? "1" : "0");
  if (s.musicVol !== undefined) localStorage.setItem(LS_MUSIC_VOL, String(s.musicVol));
  if (s.sfxVol !== undefined) localStorage.setItem(LS_SFX_VOL, String(s.sfxVol));
}

/** Ensure AudioContext exists and is running. Must be called from a
 *  user-gesture handler (click/keypress) the first time. */
export async function ensureAudio(): Promise<{
  ctx: AudioContext;
  masterGain: GainNode;
  musicGain: GainNode;
  sfxGain: GainNode;
}> {
  if (!state.ctx) {
    const Ctor = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) throw new Error("Web Audio API not supported");
    state.ctx = new Ctor();

    const persisted = readPersistedSettings();
    state.masterGain = state.ctx.createGain();
    state.masterGain.gain.value = persisted.mute ? 0 : persisted.volume;
    state.masterGain.connect(state.ctx.destination);

    state.musicGain = state.ctx.createGain();
    state.musicGain.gain.value = persisted.musicVol;
    state.musicGain.connect(state.masterGain);

    state.sfxGain = state.ctx.createGain();
    state.sfxGain.gain.value = persisted.sfxVol;
    state.sfxGain.connect(state.masterGain);
  }
  if (state.ctx.state === "suspended") {
    await state.ctx.resume();
  }
  state.unlocked = true;
  return {
    ctx: state.ctx,
    masterGain: state.masterGain!,
    musicGain: state.musicGain!,
    sfxGain: state.sfxGain!,
  };
}

export function isAudioUnlocked(): boolean {
  return state.unlocked && state.ctx?.state === "running";
}

/** Set master volume (0-1). Persists. */
export function setMasterVolume(v: number) {
  const clamped = Math.max(0, Math.min(1, v));
  if (state.masterGain && state.ctx) {
    state.masterGain.gain.setTargetAtTime(clamped, state.ctx.currentTime, 0.05);
  }
  persistSettings({ volume: clamped, mute: false });
}

export function setMusicVolume(v: number) {
  const clamped = Math.max(0, Math.min(1, v));
  if (state.musicGain && state.ctx) {
    state.musicGain.gain.setTargetAtTime(clamped, state.ctx.currentTime, 0.05);
  }
  persistSettings({ musicVol: clamped });
}

export function setSfxVolume(v: number) {
  const clamped = Math.max(0, Math.min(1, v));
  if (state.sfxGain && state.ctx) {
    state.sfxGain.gain.setTargetAtTime(clamped, state.ctx.currentTime, 0.05);
  }
  persistSettings({ sfxVol: clamped });
}

export function setMute(mute: boolean) {
  if (state.masterGain && state.ctx) {
    const persisted = readPersistedSettings();
    state.masterGain.gain.setTargetAtTime(
      mute ? 0 : persisted.volume,
      state.ctx.currentTime,
      0.05,
    );
  }
  persistSettings({ mute });
}

export function getCtx(): AudioContext | null {
  return state.ctx;
}

export function getMusicGain(): GainNode | null {
  return state.musicGain;
}

export function getSfxGain(): GainNode | null {
  return state.sfxGain;
}
