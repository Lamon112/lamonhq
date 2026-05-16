"use client";

/**
 * HeroMedia — handles all hero card media interactively:
 *
 * 1. Static fallback layer (Baywash yellow logo on dark gradient) so the
 *    hero is NEVER the same Ferrari image as the International section
 *    card, even if video fails to autoplay.
 *
 * 2. Live workshop video (Baywash Video 5.mp4 from Drive) playing as
 *    background — autoPlay + muted + playsInline + JS-forced play() on
 *    mount to handle desktop browsers that ignore the autoplay attribute
 *    despite muted flag.
 *
 * 3. Baywash Pjesma MP3 audio element + floating tap-to-play button.
 *    Browser-blocked autoplay for audio is the universal rule — so we
 *    expose a small "🔊 Pjesma" button bottom-right that the user can
 *    tap. Once clicked, the song loops for the duration of the visit.
 */

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Force video to play after mount. Some desktop browsers (Chrome/Firefox
  // when "media autoplay policy" is set to "Document user activation
  // required") will ignore the autoplay attribute even with muted. A
  // manual .play() call right after mount tells the browser this is
  // intentional and bypasses the gate (since muted videos are exempt
  // when explicitly requested via JS).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      v.play().catch(() => {
        // Silently swallow — fallback layer (logo bg) covers this case.
      });
    };
    tryPlay();
    // Also retry on the first user interaction anywhere on the page in
    // case the initial play() was rejected.
    const onFirstInteraction = () => {
      tryPlay();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  const toggleAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (audioPlaying) {
      a.pause();
      setAudioPlaying(false);
    } else {
      a.play().then(() => setAudioPlaying(true)).catch(() => {
        // Audio blocked even with user gesture — unlikely but possible
        setAudioPlaying(false);
      });
    }
  };

  return (
    <>
      {/* Static fallback layer — Baywash yellow logo on dark gradient. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 50% 50%, rgba(250,204,21,0.18) 0%, transparent 60%),
            url(/baywash/baywash-profilna.jpg)
          `,
          backgroundSize: "auto, 60% auto",
          backgroundPosition: "center, center",
          backgroundRepeat: "no-repeat, no-repeat",
          filter: "saturate(0.9)",
        }}
      />

      {/* Live Baywash workshop video — background, muted, looping */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
        <source src="/baywash/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Baywash brand song — user-controlled (browsers block audio autoplay) */}
      <audio ref={audioRef} loop preload="auto">
        <source src="/baywash/baywash-pjesma.mp3" type="audio/mpeg" />
      </audio>

      {/* Floating sound toggle — bottom-right of hero, above the info card */}
      <button
        type="button"
        onClick={toggleAudio}
        aria-label={audioPlaying ? "Zaustavi pjesmu" : "Pusti Baywash pjesmu"}
        className="group absolute right-4 top-14 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg backdrop-blur transition hover:bg-black/90"
      >
        {audioPlaying ? (
          <>
            <Volume2 className="h-3.5 w-3.5 text-yellow-400" />
            <span>Pjesma</span>
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
          </>
        ) : (
          <>
            <VolumeX className="h-3.5 w-3.5" />
            <span className="opacity-80 group-hover:opacity-100">
              Pusti pjesmu
            </span>
          </>
        )}
      </button>
    </>
  );
}
