/**
 * Bio link page — Leonardov own "Linktree" on quiz.lamon.io/links.
 *
 * Why this exists:
 * Linktree terminated linktr.ee/lamon for community-standards breach
 * (playsmania.click gambling affiliate violates their TOS). Owning the
 * bio link page eliminates compliance risk forever, restores sponsor
 * traffic, and gives real per-click analytics via Supabase later.
 *
 * URL: https://quiz.lamon.io/links (works as soon as deployed; add a
 * bio.lamon.io CNAME later if we want a cleaner domain in IG/TT bio).
 *
 * To edit links, swap entries in LINKS below. Order = display order.
 * Spinova goes through /spin route (preserves ?inf=LAMON affiliate).
 *
 * Click tracking: deferred to V2. For V1 we rely on Vercel function logs
 * + the Quiz Funnel panel's existing UTM tracking (link includes
 * utm_source=bio).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Instagram, Youtube, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Leonardo Lamon — Plima & SideHustle",
  description:
    "Premium partner za rast privatnih klinika + AI side hustle mentorstvo. Sve veze na jednom mjestu.",
  openGraph: {
    title: "Leonardo Lamon",
    description:
      "Premium partner za rast privatnih klinika + AI side hustle mentorstvo.",
    type: "profile",
    locale: "hr_HR",
  },
  // Don't let search engines treat this as the primary lamon.io presence —
  // it's a bio aggregator, not a landing page.
  robots: {
    index: false,
    follow: true,
  },
};

interface BioLink {
  emoji: string;
  label: string;
  sublabel?: string;
  href: string;
  accent?: "default" | "primary" | "warm";
}

// Display order matters — top = highest priority.
// Quiz first (active funnel), Plima second (B2B flagship), then social
// proof / utility, sponsor at the bottom.
const LINKS: BioLink[] = [
  {
    emoji: "🎯",
    label: "Quiz: tvoj 30-dnevni AI plan zarade",
    sublabel: "Side Hustle Match — besplatno, 2 min",
    href: "/quiz?utm_source=bio&utm_medium=links",
    accent: "primary",
  },
  {
    emoji: "🌊",
    label: "Plima — kompletan pristup",
    sublabel: "Vanjski tim za rast privatnih klinika",
    href: "https://lamon.io/plima",
    accent: "default",
  },
  {
    emoji: "📊",
    label: "Što sve propušta tvoja klinika",
    sublabel: "5-minutni audit za vlasnike",
    href: "https://lamon.io/plima",
    accent: "default",
  },
  {
    emoji: "🎙",
    label: "Riva — AI asistent demo",
    sublabel: "Diže telefon 24/7, govori hr/en/de/it",
    href: "https://lamon.io/plima",
    accent: "default",
  },
  {
    emoji: "📞",
    label: "Bookiraj 15-min konzultaciju",
    sublabel: "Calendly — biraš termin sam",
    href: "https://calendly.com/teamlamon6/plima-uvodni-razgovor-klinike",
    accent: "default",
  },
  {
    emoji: "🎰",
    label: "100 FREE Spinova",
    sublabel: "Sponzor: PlaysMania casino bonus",
    href: "/spin",
    accent: "warm",
  },
];

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://instagram.com/sidequestshr",
    icon: Instagram,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@sidehustlebalkan",
    icon: TikTokIcon,
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@lamon.leonardo",
    icon: Youtube,
  },
];

function TikTokIcon({ className }: { className?: string }) {
  // Lucide doesn't ship TikTok. Inline minimal SVG so social row is
  // visually balanced.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.74a8.16 8.16 0 0 0 4.77 1.52V6.81a4.79 4.79 0 0 1-1.84-.12Z" />
    </svg>
  );
}

export default function LinksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        {/* Avatar — initials placeholder until we drop a real photo into
            /public/leonardo.jpg. Gradient ring matches the Plima brand. */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-rose-400 blur-md opacity-60" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-slate-900 ring-2 ring-white/10">
            <span className="text-3xl font-light tracking-wide text-white">
              LL
            </span>
          </div>
        </div>

        {/* Name + tagline */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Leonardo Lamon
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Plima — premium partner za rast privatnih klinika
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            + AI Side Hustle mentor (Skool grupa)
          </p>
        </div>

        {/* Social icon row */}
        <div className="flex items-center gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <s.icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        {/* Link buttons stack */}
        <div className="mt-2 flex w-full flex-col gap-3">
          {LINKS.map((link) => {
            // Internal /quiz, /spin route through Next Link; external
            // through plain anchor so they open same-tab on mobile
            // (matches Linktree UX). Skool/Calendly/etc open same-tab too —
            // user can hit Back to return to bio.
            const Component = link.href.startsWith("/") ? Link : "a";
            const externalProps = link.href.startsWith("/")
              ? {}
              : { rel: "noopener noreferrer" };

            const accentClass =
              link.accent === "primary"
                ? "border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 to-violet-500/15 hover:from-cyan-500/25 hover:to-violet-500/25"
                : link.accent === "warm"
                  ? "border-amber-400/30 bg-amber-500/5 hover:bg-amber-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10";

            return (
              <Component
                // @ts-expect-error Next Link href vs anchor href type union
                href={link.href}
                key={link.label}
                {...externalProps}
                className={`group flex items-center gap-3 rounded-2xl border ${accentClass} px-4 py-3.5 text-left transition`}
              >
                <span className="text-2xl">{link.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-white">
                    {link.label}
                  </div>
                  {link.sublabel ? (
                    <div className="truncate text-xs text-slate-400">
                      {link.sublabel}
                    </div>
                  ) : null}
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 opacity-0 transition group-hover:opacity-100" />
              </Component>
            );
          })}
        </div>

        {/* Credibility footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            793K kreiranog dosega kroz vlastite kanale
          </p>
          <p className="mt-1 text-[10px] text-slate-600">
            © {new Date().getFullYear()} Lamon Agency · lamon.io
          </p>
        </div>
      </div>
    </main>
  );
}
