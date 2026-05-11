"use client";

/**
 * Premium intro video block for /plima.
 *
 * - Lazy YouTube embed pattern: shows custom Plima-branded SVG poster
 *   until user clicks Play, then swaps in YouTube iframe with autoplay.
 *   Best of both worlds — premium poster visual + YouTube's CDN/hosting.
 * - CTA below player ties to Calendly booking.
 *
 * YouTube video: https://youtu.be/DM8ftVskWNE
 * Custom poster: /public/plima/intro-poster.svg
 */

import { useState } from "react";
import { Play, Calendar, ArrowRight } from "lucide-react";

interface Props {
  bookingHref: string;
}

const YT_VIDEO_ID = "DM8ftVskWNE";

export function PlimaIntroVideo({ bookingHref }: Props) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="relative border-y border-cyan-500/15 bg-gradient-to-b from-[#020617] via-[#01101f] to-[#020617]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-cyan-400/80">
            Pogledajte prije razgovora
          </p>
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            3 minute koje će vam reći je li{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-sky-300 bg-clip-text text-transparent">
              Plima fit za vašu kliniku
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            Direktno, bez prodajnog jezika. Što vidim u premium klinikama, što
            preporučam, koliko košta, i je li smisla razgovarati.
          </p>
        </div>

        {/* Video player wrapper with premium glow */}
        <div className="relative mx-auto max-w-4xl">
          <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-transparent to-cyan-500/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-xl border-2 border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.25)]">
            {!showVideo ? (
              // === Custom poster click-to-play (lazy YouTube) ===
              <button
                onClick={() => setShowVideo(true)}
                className="group relative block aspect-video w-full overflow-hidden bg-black"
                aria-label="Pokreni Plima intro video (3 minute)"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/plima/intro-poster.svg"
                  alt="Plima — premium partner za rast privatnih klinika · intro video"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {/* Big play button overlay (in addition to poster's own play icon, this is hover-state UX hint) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.8)] transition-all group-hover:scale-110 group-hover:bg-cyan-400">
                    <Play size={36} fill="#0c1f3d" className="ml-1" />
                  </div>
                </div>
                {/* Bottom hint */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur-sm shadow-md">
                  ~3 minute · upalite zvuk
                </div>
              </button>
            ) : (
              // === YouTube iframe (loads only after click) ===
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube.com/embed/${YT_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&color=white`}
                title="Plima — premium partner za rast privatnih klinika"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        </div>

        {/* CTA below player — primary action while interest is hot */}
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3 text-center">
          <p className="text-sm text-slate-300">
            Vidite sebe u onome što sam opisao? Dogovorite 30-minutni razgovor.
          </p>
          <a
            href={bookingHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 px-6 py-3 font-semibold text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.45)] transition-all hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)]"
          >
            <Calendar size={16} />
            Dogovori razgovor
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-1"
            />
          </a>
          <p className="text-[11px] text-slate-500">
            Bez obveze · ja sam vam ravno u lice ako nismo fit
          </p>
        </div>
      </div>
    </section>
  );
}
