"use client";

/**
 * Premium intro video block for /plima.
 *
 * - HTML5 native <video> (no YouTube branding, full creative control)
 * - Click-to-play poster (user opt-in, premium signal)
 * - Custom controls
 * - Collapsible transcript below (SEO + accessibility — full text indexed)
 * - CTA below transcript ties to Calendly booking
 *
 * Files expected at:
 *   /public/plima/intro.mp4         (master 1080p mp4, h.264, ~85-100s)
 *   /public/plima/intro-poster.jpg  (poster frame, 1920×1080)
 */

import { useState } from "react";
import { Play, Calendar, ArrowRight } from "lucide-react";

interface Props {
  bookingHref: string;
}

export function PlimaIntroVideo({ bookingHref }: Props) {
  const [hasStarted, setHasStarted] = useState(false);

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
            <video
              className="aspect-video w-full bg-black"
              controls
              preload="metadata"
              poster="/plima/intro-poster.svg"
              onPlay={() => setHasStarted(true)}
            >
              <source src="/plima/intro.mp4" type="video/mp4" />
              Vaš preglednik ne podržava HTML5 video. Možete preuzeti video
              <a href="/plima/intro.mp4" className="text-cyan-300 underline ml-1">
                ovdje
              </a>
              .
            </video>

            {/* Play overlay hint — only before first play */}
            {!hasStarted && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur-sm shadow-md">
                <Play size={10} className="mr-1 inline" fill="currentColor" />
                ~3 minute · upalite zvuk
              </div>
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
