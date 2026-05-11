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
import { Play, ChevronDown, ChevronUp, Calendar, ArrowRight } from "lucide-react";

interface Props {
  bookingHref: string;
}

export function PlimaIntroVideo({ bookingHref }: Props) {
  const [showTranscript, setShowTranscript] = useState(false);
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
              poster="/plima/intro-poster.jpg"
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

        {/* Transcript — collapsible (SEO + accessibility) */}
        <div className="mx-auto mt-12 max-w-3xl">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-5 py-3 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-950/40"
          >
            <span>📄 Pročitajte transkript videa</span>
            {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTranscript && (
            <article className="mt-4 space-y-5 rounded-lg border border-cyan-500/15 bg-cyan-950/10 p-6 text-sm leading-relaxed text-slate-200">
              <TranscriptBlock label="Hook">
                Ako vodiš privatnu kliniku — dental, estetska, ortopedska,
                ginekologija — i znaš da ti kvaliteta usluge nije problem, ali
                firma ne raste tempom kojim bi trebala... ovaj video je za tebe.
              </TranscriptBlock>

              <TranscriptBlock label="Što vidim u premium klinikama">
                Evo što vidim svaki put kad uđem u premium service biznis u
                regiji.
                <br />
                <br />
                Vlasnik je najbolji u struci. Kvaliteta je top, recenzije su 4.9,
                klijenti zadovoljni. Ali firma raste sporo. I evo zašto.
                <br />
                <br />
                <strong className="text-cyan-200">
                  Tri stvari ti jedu margine svaki mjesec.
                </strong>
                <br />
                <br />
                <strong>Prva — operativna petlja ti jede dan.</strong> Diže
                telefon, hvataj DM, šalji potvrde, podsjećaj pacijente. To su
                4 sata svaki dan koje ne radiš na pacijentima ni na rastu.
                <br />
                <br />
                <strong>Druga — brand ti nije premium koliko ti je
                kvaliteta.</strong>{" "}
                Top doktor s recenzijama 4.9, ali web iz 2019., fotografije iz
                mobitela, copy koji zvuči kao svaka druga klinika. Zato ne
                možeš podići cijene 30%.
                <br />
                <br />
                <strong>Treća — marketing radiš ad-hoc.</strong> Ovaj mjesec si
                platio Google Ads, sljedeći mjesec si zaboravio. Nemaš sustav
                koji konstantno dovodi nove pacijente. Vrtiš se na referrals i
                sreći.
                <br />
                <br />
                Ako se prepoznaješ u bilo kojoj od ovih kategorija — slušaj
                dalje.
              </TranscriptBlock>

              <TranscriptBlock label="Reframe — sustav, ne usluga">
                Većina agencija ti će reći: snimimo tri reels-a tjedno,
                postavimo ads, gotovo.
                <br />
                <br />
                To nije rješenje. To je još jedan trošak.
                <br />
                <br />
                Ono što ti zaista treba nije usluga.
                <br />
                <br />
                <strong className="text-cyan-200 text-lg">
                  Treba ti sistem.
                </strong>
                <br />
                <br />
                Sistem koji radi 24 sata na dan. Sistem koji odgovara umjesto
                tebe. Sistem koji pamti svakog klijenta. Sistem koji konstantno
                producira content u tvom glasu — i koji koristi sve što sam
                naučio gradeći vlastitu publiku od{" "}
                <strong>793 tisuće ljudi</strong>.
                <br />
                <br />
                I to je razlika između nas i bilo koje druge agencije u regiji.
              </TranscriptBlock>

              <TranscriptBlock label="Što očekivati — uvjeti i cijena">
                Što očekivati ako kreneš sa mnom.
                <br />
                <br />
                Krećemo s <strong>minimum tri mjeseca</strong>. Tri mjeseca ti
                je dovoljno da vidiš kako sustav radi, da osjetiš razliku u
                svakodnevnoj operativi, i da dobiješ konkretne rezultate na
                stol.
                <br />
                <br />
                Ako vidim da ti dajem dobre rezultate — a vidjet ćeš ih oboje —
                potpisujemo dalje na <strong>dvanaest mjeseci</strong> kao
                ozbiljna dugoročna suradnja.
                <br />
                <br />
                <strong className="text-amber-200">
                  Postavljanje od €1.997 jednom, plus €1.497 mjesečno
                </strong>{" "}
                za paket Voice. Sve uključeno.
                <br />
                <br />
                Tjedni izvještaj svaki utorak. Bez izgovora.
                <br />
                <br />
                I jedno obećanje — <strong>ne dajem popust na startu</strong>.
                Tri mjeseca rade rezultati za sebe. Tako rade ozbiljni partneri.
              </TranscriptBlock>

              <TranscriptBlock label="Poziv na akciju">
                Ako si vidio sebe u onom što sam opisao — i misliš da si fit —
                bukiraj konzultaciju ispod ovog videa.
                <br />
                <br />
                Trideset minuta, bez obveze. Pričamo o tvom biznisu, ja ti
                kažem direktno da li smo fit ili ne.
                <br />
                <br />
                Ako jesmo — pričamo o sljedećim koracima. Ako nismo — kažem ti
                ravno u lice i poštedim te nepotrebnog troška.
                <br />
                <br />
                <em className="text-cyan-200">Vidimo se na drugoj strani.</em>
              </TranscriptBlock>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

function TranscriptBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400/70">
        ▸ {label}
      </p>
      <p className="text-slate-200">{children}</p>
    </div>
  );
}
