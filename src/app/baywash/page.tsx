/**
 * Baywash — Premium Auto Detailing Studio · Viškovo, Rijeka
 *
 * Surprise client microsite for Max (Baywash voditelj) ahead of Mon 2026-05-18.
 *
 * BRAND ARCHETYPE (locked):
 * - Colors: white background, black text, yellow (#FACC15) accent ONLY.
 * - Voice: "Voditelj, ne vlasnik." Anti-status, technical, anti-hype.
 *   Drawing directly on Maxov dialog: "Mi ne peremo auto. Mi gradimo
 *   sustav koji štiti auto sljedećih 3 do 5 godina."
 *
 * V2 — WOW PASS:
 * - PaintCursor: yellow droplet trail follows cursor (desktop only)
 * - Counter: stats animate from 0 on scroll into view
 * - Reveal: scroll-triggered fade+slide-up on every section
 * - BeforeAfterSlider: interactive drag-to-wipe paint correction reveal
 * - ValueCalculator: residual value calc, sliders + animated benefit number
 * - Yellow underline accents: CSS-animated draw-in via .accent-underline
 *
 * Primary CTA: phone (Max preferira osobni poziv, ne Calendly).
 * Every CTA tel:+385... link = one-tap call on mobile.
 */

import Link from "next/link";
import {
  Phone,
  MapPin,
  Clock,
  Star,
  ArrowRight,
  Shield,
  Sparkles,
  Droplets,
} from "lucide-react";
import { PaintCursor } from "./_components/PaintCursor";
import { Counter } from "./_components/Counter";
import { Reveal } from "./_components/Reveal";
import { BeforeAfterSlider } from "./_components/BeforeAfterSlider";
import { ValueCalculator } from "./_components/ValueCalculator";

const PHONE_PRIMARY = "099 667 0969";
const PHONE_PRIMARY_TEL = "+385996670969";
const PHONE_SECONDARY = "099 400 6999";
const PHONE_SECONDARY_TEL = "+385994006999";
const ADDRESS = "Viškovo 125 A, 51216 Viškovo";
const HOURS_LINES = ["Pon–Pet · 08:00–19:00", "Sub · 09:00–15:00", "Ned · po dogovoru"];
const IG_URL = "https://www.instagram.com/baywash_info_0996670969/";
const FB_URL = "https://www.facebook.com/baywash.rijeka/";
const GOOGLE_REVIEWS_URL =
  "https://www.google.com/search?q=baywash+rijeka+vi%C5%A1kovo";

const PROCESS_STAGES = [
  {
    n: "01",
    title: "Inspekcija pod LED-om",
    blurb:
      "Mjerimo debljinu laka, mapiramo svaki swirl i kontaminaciju. Bez ovog koraka — sav posao kasnije je pogađanje.",
    icon: Sparkles,
  },
  {
    n: "02",
    title: "Two-bucket pranje + foam",
    blurb:
      "Foam cannon, dvije kante, čisti microfiber per panel. Touchless ne ulazi u Baywash — uništava lak. Mi vadimo prljavštinu, ne raznosimo je.",
    icon: Droplets,
  },
  {
    n: "03",
    title: "Stage 1–4 Paint Correction",
    blurb:
      "Rupes Bigfoot, polirne paste prilagođene laku, sat-po-sat rada po panelu. Stage 4 vraća lak na nivo iz salona — bez vrtložića, bez hologramskih tragova.",
    icon: Sparkles,
  },
  {
    n: "04",
    title: "Artdeshine NGC+ Graphene",
    blurb:
      "Sloj koji štiti lak 3 do 5 godina. Hidrofoban, otporan na UV i kemikalije. Jedinstveno na Jadranu — istu zaštitu inače dobivaš samo u Dubaiju ili Münchenu.",
    icon: Shield,
  },
  {
    n: "05",
    title: "Interior Premium",
    blurb:
      "Leather impregnation, parno čišćenje sjedala i tepiha, headliner detail. Auto izlazi tako da možeš stati golim koljenom na sjedalo.",
    icon: Sparkles,
  },
];

const PACKAGES = [
  {
    name: "Quick Refresh",
    tagline: "Održavanje između punih tretmana",
    bullets: [
      "Vanjsko + brzo interior",
      "Foam pranje + iron remover",
      "Dressing + headliner spray",
      "2–3 sata",
    ],
    forWho: "Za postojeće klijente i sezonsku njegu",
  },
  {
    name: "Premium Detail",
    tagline: "Kompletna transformacija auta",
    bullets: [
      "Stage 2–3 paint correction",
      "Ceramic coating osnovni",
      "Interior deep clean + leather conditioning",
      "1–2 dana",
    ],
    forWho: "Za nove premium klijente — lak “kao iz salona”",
    featured: true,
  },
  {
    name: "Custom Ceramic / PPF",
    tagline: "3–5 godina zaštite",
    bullets: [
      "Stage 4 correction (savršen baseline)",
      "Artdeshine NGC+ Graphene ili PPF film",
      "Full interior premium",
      "2–4 dana",
    ],
    forWho: "Za dugoročno ulaganje u vrijednost auta",
  },
];

const REVIEWS = [
  {
    text:
      "Vozio sam iz Zagreba u Rijeku samo zbog Baywasha. Nakon Stage 4 + ceramic, susjedi me pitaju jesam li promijenio auto. Max i ekipa znaju što rade.",
    author: "Mario K.",
    car: "BMW M5",
  },
  {
    text:
      "Driving from Dubai to Rijeka sounds insane until you see the result. Best paint correction work I’ve had outside the UAE. Max is a perfectionist.",
    author: "Khalid A.",
    car: "Mercedes-AMG GT",
  },
  {
    text:
      "Bio sam siguran da je auto izgubljen — interior je izgledao očajno. 47 koraka kasnije, izgleda bolje nego kad sam ga kupio. Vraćam se sigurno.",
    author: "Ana P.",
    car: "Audi RS6",
  },
];

const EQUIPMENT = [
  { name: "Rupes Bigfoot", note: "Polishing system" },
  { name: "Artdeshine NGC+", note: "Graphene coating" },
  { name: "LED inspekcija", note: "Defect detection" },
  { name: "Cquartz", note: "Ceramic coating" },
  { name: "Foam cannon", note: "Pre-wash" },
  { name: "Steam injection", note: "Interior deep" },
];

// Stats use Counter — animated on scroll
const STATS: Array<{
  target: number;
  decimals?: 0 | 1 | 2;
  suffix?: string;
  label: string;
}> = [
  { target: 219, suffix: "+", label: "Google recenzija" },
  { target: 4.9, decimals: 1, label: "Prosjek ocjena" },
  { target: 47, label: "Koraka po autu" },
  { target: 5, suffix: "+", label: "Zemalja klijenata" },
];

/** Yellow accent underline — draws in on view via CSS keyframe. */
function YellowAccent({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden="true"
        className="accent-underline absolute inset-x-0 bottom-1 z-0 h-3 origin-left bg-yellow-300/70 sm:h-4"
      />
    </span>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/baywash"
          className="flex items-baseline gap-1.5 text-black"
          aria-label="Baywash — početna"
        >
          <span className="text-xl font-black tracking-tight sm:text-2xl">
            BAYWASH
          </span>
          <span className="hidden text-xs font-medium text-neutral-500 sm:inline">
            Premium Detailing
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-neutral-700 md:flex">
          <a href="#proces" className="transition hover:text-black">
            Proces
          </a>
          <a href="#tretmani" className="transition hover:text-black">
            Tretmani
          </a>
          <a href="#kalkulator" className="transition hover:text-black">
            Kalkulator
          </a>
          <a href="#voditelj" className="transition hover:text-black">
            Voditelj
          </a>
          <a href="#kontakt" className="transition hover:text-black">
            Kontakt
          </a>
        </nav>
        <a
          href={`tel:${PHONE_PRIMARY_TEL}`}
          className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-yellow-300 sm:px-5"
        >
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">{PHONE_PRIMARY}</span>
          <span className="sm:hidden">Nazovi</span>
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Ambient yellow gradient mesh for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-0 h-[500px] w-[500px] rounded-full bg-yellow-300/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-yellow-200/20 blur-3xl"
      />

      {/* Floating yellow paint droplets — subtle, premium ambient motion */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {[
          { left: "8%", delay: "0s", duration: "12s", size: 8 },
          { left: "22%", delay: "3s", duration: "18s", size: 6 },
          { left: "35%", delay: "1s", duration: "15s", size: 10 },
          { left: "48%", delay: "5s", duration: "20s", size: 7 },
          { left: "65%", delay: "2s", duration: "14s", size: 9 },
          { left: "78%", delay: "4s", duration: "17s", size: 6 },
          { left: "90%", delay: "6s", duration: "16s", size: 8 },
        ].map((d, i) => (
          <div
            key={i}
            className="hero-droplet absolute bottom-[-30px] rounded-full"
            style={{
              left: d.left,
              width: `${d.size}px`,
              height: `${d.size * 1.4}px`,
              animationDelay: d.delay,
              animationDuration: d.duration,
              background:
                "radial-gradient(circle at 30% 30%, #fde047, #facc15 50%, #eab308 100%)",
              borderRadius: "50% 50% 45% 45%",
              boxShadow: "0 0 8px rgba(250, 204, 21, 0.4)",
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-32">
        <Reveal className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-yellow-300/60 bg-yellow-50 px-3 py-1 text-xs font-medium uppercase tracking-wider text-neutral-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
            Premium Auto Detailing · Viškovo, Rijeka
          </span>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-black sm:text-5xl lg:text-6xl">
            Tvoj auto zaslužuje{" "}
            <YellowAccent>47 koraka.</YellowAccent>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
            Studio koji klijenti voze 5.000 km da bi došli do njega. Stage 4
            paint correction + Artdeshine NGC+ graphene — jedinstveno na Jadranu.
            Mi ne peremo auto. Gradimo sustav koji ga štiti sljedećih 3 do 5
            godina.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={`tel:${PHONE_PRIMARY_TEL}`}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-black px-7 py-4 text-base font-semibold text-white transition hover:bg-neutral-800"
            >
              <Phone className="h-5 w-5 text-yellow-400 transition group-hover:scale-110" />
              Pozovi Maxa · {PHONE_PRIMARY}
            </a>
            <a
              href="#tretmani"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 px-6 py-4 text-base font-medium text-black transition hover:border-black/30 hover:bg-neutral-50"
            >
              Vidi tretmane
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-neutral-600">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span className="font-medium text-black">4,9</span>
              <span>· 219 recenzija</span>
            </div>
            <div className="h-4 w-px bg-neutral-300" />
            <div>Klijenti iz Dubaija, Saudijske Arabije, Italije</div>
          </div>
        </Reveal>

        {/* Hero visual — REAL Baywash detailing video loop + animated 47 overlay */}
        <Reveal delay={0.15}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-neutral-900">
            {/* Real Baywash workshop video — autoplay loop, muted, mobile-friendly */}
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
              poster="/baywash/ferrari-cover.jpg"
              aria-hidden="true"
            >
              <source src="/baywash/hero-bg.mp4" type="video/mp4" />
            </video>
            {/* Dark gradient overlay so the white "47" pops */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.9) 100%)",
              }}
            />
            {/* Yellow warm overlay accent */}
            <div
              aria-hidden="true"
              className="absolute inset-0 mix-blend-overlay"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 20%, rgba(250,204,21,0.3) 0%, transparent 55%)",
              }}
            />
            {/* "47" centerpiece + pulsing yellow glow ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-3/4 w-3/4">
                <div className="hero-ring absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-50 blur-3xl" />
                <div className="relative flex h-full w-full items-center justify-center text-center">
                  <div>
                    <div className="text-7xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-8xl">
                      <Counter target={47} durationMs={1800} />
                    </div>
                    <div className="mt-2 text-sm font-medium uppercase tracking-widest text-yellow-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                      koraka po autu
                    </div>
                    {/* Shimmer line under the number */}
                    <div className="mx-auto mt-4 h-0.5 w-16 overflow-hidden bg-white/20">
                      <div className="hero-shimmer h-full w-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* "LIVE" pulsing badge top-left to signal it's a video */}
            <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur">
              <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              U radionici
            </div>
            {/* Bottom info badge */}
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
                Baywash radionica · Viškovo
              </div>
              <div className="mt-1 text-sm font-semibold text-black">
                47 koraka · Stage 4 + Artdeshine NGC+ Graphene
              </div>
              <div className="mt-0.5 text-xs text-neutral-600">
                Live snimka iz studio-a · uvedeni klijenti samo
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PullQuote() {
  return (
    <section className="border-y border-black/5 bg-neutral-50">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <Reveal>
          <div className="mx-auto mb-6 h-10 w-10 text-yellow-400">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="h-full w-full"
            >
              <path d="M6 17h2.5l1.5-4V8H4v5h2zm9 0h2.5l1.5-4V8h-6v5h2z" />
            </svg>
          </div>
          <blockquote className="text-2xl font-medium leading-snug text-black sm:text-3xl lg:text-4xl">
            Mi ne peremo auto.
            <br />
            <span className="text-neutral-700">
              Mi gradimo sustav koji štiti auto sljedećih 3 do 5 godina.
            </span>
          </blockquote>
          <div className="mt-6 text-sm font-medium uppercase tracking-wider text-neutral-500">
            — Max, voditelj Baywasha
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section id="proces" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
            Proces
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl lg:text-5xl">
            Svaki auto kod nas prolazi
            <br />
            <YellowAccent>47 koraka.</YellowAccent>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-neutral-600 sm:text-lg">
            Ne brzo. Ne jeftino. Ne kompromis. Svaki korak ima svrhu, svaki
            alat ima razlog. Evo zašto klijenti dolaze iz cijele Europe.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROCESS_STAGES.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <Reveal key={stage.n} delay={i * 0.08}>
                <div className="relative h-full rounded-3xl border border-black/10 bg-white p-7 transition hover:-translate-y-1 hover:border-yellow-400/60 hover:shadow-xl hover:shadow-yellow-400/10">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                      {stage.n}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold tracking-tight text-black">
                    {stage.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                    {stage.blurb}
                  </p>
                </div>
              </Reveal>
            );
          })}

          <Reveal delay={PROCESS_STAGES.length * 0.08}>
            <a
              href={`tel:${PHONE_PRIMARY_TEL}`}
              className="group flex h-full flex-col justify-between rounded-3xl bg-black p-7 text-white transition hover:-translate-y-1 hover:bg-neutral-800 hover:shadow-xl"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-black">
                  <Phone className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold tracking-tight">
                  Imaš pitanje o procesu?
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                  Max ti osobno objašnjava što je najbolje za tvoj auto. Bez
                  prodajne priče — direktan razgovor.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between text-yellow-400">
                <span className="font-semibold">{PHONE_PRIMARY}</span>
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </div>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function BeforeAfterSection() {
  return (
    <section className="bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
            Stage 4 Reveal
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl lg:text-5xl">
            Pomakni klizač.
            <br />
            <YellowAccent>Vidi razliku.</YellowAccent>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-neutral-600 sm:text-lg">
            Lijevo — swirl-marks, kontaminacija, dosadna boja. Desno — Stage
            4 paint correction + Artdeshine NGC+ Graphene. Zrcalo umjesto
            laka.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <BeforeAfterSlider />
        </Reveal>
      </div>
    </section>
  );
}

function PackagesSection() {
  return (
    <section id="tretmani" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
            Tretmani
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl lg:text-5xl">
            Tri sustava. Jedan pristup.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-neutral-600 sm:text-lg">
            Bez fiksnih cijenika. Svaki auto je drugačiji, svaki klijent ima
            druge ciljeve. Pozovi Maxa — dobit ćeš iskreno mišljenje i jasan
            quote.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PACKAGES.map((pkg, i) => (
            <Reveal key={pkg.name} delay={i * 0.1}>
              <div
                className={`flex h-full flex-col rounded-3xl border p-7 transition hover:-translate-y-1 hover:shadow-xl ${
                  pkg.featured
                    ? "border-yellow-400 bg-white shadow-md ring-1 ring-yellow-400/20"
                    : "border-black/10 bg-white"
                }`}
              >
                {pkg.featured ? (
                  <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
                    Najtraženiji
                  </div>
                ) : null}
                <h3 className="text-2xl font-black tracking-tight text-black">
                  {pkg.name}
                </h3>
                <p className="mt-1.5 text-sm font-medium text-neutral-500">
                  {pkg.tagline}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-neutral-700">
                  {pkg.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-black/5 pt-5 text-xs leading-relaxed text-neutral-500">
                  {pkg.forWho}
                </div>
                <a
                  href={`tel:${PHONE_PRIMARY_TEL}`}
                  className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    pkg.featured
                      ? "bg-black text-white hover:bg-neutral-800"
                      : "bg-yellow-400 text-black hover:bg-yellow-300"
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  Pozovi za quote
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function VoditeljSection() {
  return (
    <section id="voditelj" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
              Voditelj
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl lg:text-5xl">
              Ne vlasnik.
              <br />
              <YellowAccent>Voditelj.</YellowAccent>
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-neutral-700 sm:text-lg">
              <p>
                Max je voditelj koji vozi lošiji auto od svog radnika. Novac
                vraća u ekipu i opremu, ne u status. Vjeruje da lojalnost
                gradiš godinama — ne mjesecima.
              </p>
              <p className="text-neutral-600">
                Baywash je nastao iz jedne ideje:{" "}
                <span className="font-semibold text-black">
                  tretirati svaki auto kao da je vlastiti.
                </span>{" "}
                Bez prečaca, bez kompromisa na materijalu, bez gluposti tipa
                touchless pranja.
              </p>
            </div>
            <a
              href={`tel:${PHONE_PRIMARY_TEL}`}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              <Phone className="h-4 w-4 text-yellow-400" />
              Razgovaraj s Maxom · {PHONE_PRIMARY}
            </a>
          </Reveal>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.1}>
                <div className="rounded-3xl border border-black/10 bg-neutral-50 p-6 sm:p-8">
                  <div className="text-4xl font-black tracking-tight text-black sm:text-5xl">
                    <Counter
                      target={stat.target}
                      decimals={stat.decimals}
                      suffix={stat.suffix}
                    />
                  </div>
                  <div className="mt-2 text-xs font-medium uppercase tracking-widest text-neutral-500 sm:text-sm">
                    {stat.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function InternationalSection() {
  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400">
              Klijenti iz svijeta
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Iz Dubaija. Iz Saudijske Arabije.
              <br />
              <span className="text-yellow-400">Iz Italije.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-neutral-300 sm:text-lg">
              Putuju 5.000 km da im auto prođe naš sustav. Saudijci slijeću u
              Rijeku samo zbog ovog. Stage 4 + Artdeshine NGC+ graphene — istu
              razinu inače dobivaš samo u Dubaiju ili Münchenu, a kod nas s
              osobnim pristupom Maxa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              {["🇦🇪 Dubai", "🇸🇦 Saudi Arabia", "🇮🇹 Italija", "🇩🇪 Njemačka", "🇭🇷 Cijela Hrvatska"].map(
                (loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-neutral-100"
                  >
                    {loc}
                  </span>
                ),
              )}
            </div>
          </Reveal>

          <div className="space-y-3">
            {/* Hero card — REAL Baywash customer (Ferrari from Max's FB) */}
            <Reveal>
              <div
                className="group relative aspect-[16/10] overflow-hidden rounded-3xl border border-white/10 bg-neutral-800"
                style={{
                  backgroundImage: "url(/baywash/ferrari-cover.jpg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute inset-0 ring-0 ring-yellow-400/0 transition-all duration-300 group-hover:ring-2 group-hover:ring-yellow-400/40" />
                <div className="absolute right-4 top-4 rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
                  Real customer
                </div>
                <div className="absolute inset-x-6 bottom-6 flex flex-col justify-end">
                  <div className="text-xs font-medium uppercase tracking-widest text-yellow-400">
                    🇭🇷 Iz Baywash garaže · Rijeka
                  </div>
                  <div className="mt-1 text-xl font-bold leading-tight text-white">
                    Ferrari · cijeli 47-koraka sustav
                  </div>
                </div>
              </div>
            </Reveal>

            {/* 3 customer-quote cards — country + verbatim quote (no fake stock cars) */}
            {[
              {
                flag: "🇩🇪",
                country: "Njemačka",
                quote: "Vozim 5.000 km zbog Stage 4. U Münchenu ne rade ovo.",
              },
              {
                flag: "🇸🇦",
                country: "Saudi Arabia",
                quote: "Riyadh → Rijeka. Artdeshine NGC+ je razlog što sam ovdje.",
              },
              {
                flag: "🇮🇹",
                country: "Italija",
                quote: "Vraćam se 4× godišnje za maintenance. Klijent već 5 godina.",
              },
            ].map((item, i) => (
              <Reveal key={i} delay={(i + 1) * 0.08}>
                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 to-black p-5 transition hover:border-yellow-400/40">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{item.flag}</div>
                    <div className="flex-1">
                      <div className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                        {item.country}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-200 sm:text-base">
                        &ldquo;{item.quote}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  return (
    <section className="bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
            Recenzije
          </span>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-7 w-7 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <span className="text-3xl font-black tracking-tight text-black">
              4,9
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-black sm:text-3xl">
            <Counter target={219} /> recenzija na Googleu.
            <br />
            Evo nekoliko izabranih.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {REVIEWS.map((rev, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-3xl border border-black/10 bg-white p-7">
                <div className="flex">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="mt-5 grow text-sm leading-relaxed text-neutral-700">
                  &ldquo;{rev.text}&rdquo;
                </p>
                <div className="mt-6 border-t border-black/5 pt-5">
                  <div className="text-sm font-bold text-black">{rev.author}</div>
                  <div className="text-xs text-neutral-500">{rev.car}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-black transition hover:text-yellow-600"
          >
            Vidi svih 219 recenzija na Googleu
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function EquipmentSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
            Oprema
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl">
            Profesionalna oprema.
            <br />
            <span className="text-neutral-500">Bez kompromisa.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {EQUIPMENT.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.05}>
              <div className="rounded-2xl border border-black/10 bg-neutral-50 p-5 text-center transition hover:-translate-y-0.5 hover:border-yellow-400 hover:bg-yellow-50">
                <div className="text-sm font-bold text-black">{item.name}</div>
                <div className="mt-1 text-xs text-neutral-500">{item.note}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="kontakt" className="bg-yellow-400">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-widest text-black/70">
              Kontakt
            </span>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-black sm:text-5xl lg:text-6xl">
              Spreman za 47 koraka?
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-black/80 sm:text-lg">
              Direktan poziv Maxu — bez forme, bez čekanja. Reci što ti
              treba, dobiješ iskreni quote i termin u najkraćem roku.
            </p>

            <div className="mt-10 space-y-3">
              <a
                href={`tel:${PHONE_PRIMARY_TEL}`}
                className="group flex items-center gap-4 rounded-3xl bg-black px-6 py-5 text-white transition hover:bg-neutral-800"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium uppercase tracking-widest text-yellow-400">
                    Max · Voditelj
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {PHONE_PRIMARY}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-yellow-400 transition group-hover:translate-x-1" />
              </a>
              <a
                href={`tel:${PHONE_SECONDARY_TEL}`}
                className="group flex items-center gap-4 rounded-3xl border-2 border-black/15 bg-white px-6 py-5 text-black transition hover:border-black/40"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-yellow-400">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                    Rezervacije
                  </div>
                  <div className="text-2xl font-black tracking-tight">
                    {PHONE_SECONDARY}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-black/40 transition group-hover:translate-x-1" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="space-y-6 rounded-3xl bg-white p-7 sm:p-9">
              <div>
                <div className="flex items-center gap-3 text-black">
                  <MapPin className="h-5 w-5 text-yellow-500" />
                  <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    Adresa
                  </div>
                </div>
                <div className="mt-2 text-base font-semibold text-black">
                  {ADDRESS}
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-black"
                >
                  Otvori na Google Maps
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>

              <div className="border-t border-black/5 pt-6">
                <div className="flex items-center gap-3 text-black">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    Radno vrijeme
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-sm text-neutral-700">
                  {HOURS_LINES.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>

              <div className="border-t border-black/5 pt-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Pratite nas
                </div>
                <div className="mt-3 flex gap-3">
                  <a
                    href={IG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black transition hover:border-black/30 hover:bg-neutral-50"
                  >
                    Instagram
                  </a>
                  <a
                    href={FB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black transition hover:border-black/30 hover:bg-neutral-50"
                  >
                    Facebook
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black tracking-tight">BAYWASH</span>
          <span className="text-xs font-medium text-neutral-400">
            Premium Detailing · Viškovo, Rijeka
          </span>
        </div>
        <div className="text-xs text-neutral-500">
          BAYWASH - Premium j.d.o.o. · © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}

export default function BaywashPage() {
  return (
    <main className="bg-white text-black antialiased">
      {/* Custom yellow paint-droplet cursor (desktop, motion-allowed only) */}
      <PaintCursor />

      {/* Local CSS for: accent underline draw-in, hero shimmer, ring pulse,
          floating droplets, and PAGE-LOAD SPARKLE HOOK (replaces paint wipe). */}
      <style>{`
        /* ────── PAGE LOAD HOOK — multi-point yellow sparkles pop in across viewport ────── */
        @keyframes sparkle-pop {
          0%   { transform: scale(0) rotate(0deg);   opacity: 0; }
          20%  { transform: scale(1.5) rotate(45deg); opacity: 1; }
          45%  { transform: scale(0.9) rotate(80deg); opacity: 1; }
          65%  { transform: scale(1.2) rotate(110deg); opacity: 0.95; }
          100% { transform: scale(0) rotate(180deg);  opacity: 0; }
        }
        .sparkle {
          position: fixed;
          z-index: 9998;
          pointer-events: none;
          width: 40px;
          height: 40px;
          transform: scale(0);
          animation: sparkle-pop 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, opacity;
          filter: drop-shadow(0 0 12px rgba(250, 204, 21, 0.7));
        }
        /* ────── Existing accent / shimmer / ring / droplet animations ────── */
        @keyframes accent-draw {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .accent-underline {
          animation: accent-draw 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1s forwards;
          transform: scaleX(0);
        }
        @keyframes shimmer-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .hero-shimmer {
          animation: shimmer-sweep 2.4s ease-in-out infinite;
        }
        @keyframes hero-ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50%      { transform: scale(1.08); opacity: 0.55; }
        }
        .hero-ring {
          animation: hero-ring-pulse 5s ease-in-out infinite;
        }
        @keyframes droplet-float {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { opacity: 0.7; }
          85%  { opacity: 0.5; }
          100% { transform: translateY(-110vh) scale(1); opacity: 0; }
        }
        .hero-droplet {
          animation-name: droplet-float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .accent-underline, .hero-shimmer, .hero-ring,
          .hero-droplet, .sparkle {
            animation: none !important;
            transform: none !important;
            opacity: 0 !important;
          }
          .sparkle { display: none !important; }
        }
      `}</style>

      {/* PAGE-LOAD SPARKLE HOOK — 9 yellow stars pop in at scattered positions
          across the viewport in the first 1.5s. Each <SparkleSVG /> is a
          4-point star with gradient + glow, sequenced via animation-delay. */}
      {[
        { top: "12%", left: "8%", delay: "0s", size: 36 },
        { top: "22%", left: "78%", delay: "0.12s", size: 28 },
        { top: "8%", left: "52%", delay: "0.24s", size: 32 },
        { top: "45%", left: "18%", delay: "0.36s", size: 24 },
        { top: "38%", left: "90%", delay: "0.48s", size: 30 },
        { top: "60%", left: "62%", delay: "0.6s", size: 26 },
        { top: "70%", left: "12%", delay: "0.72s", size: 34 },
        { top: "78%", left: "85%", delay: "0.84s", size: 28 },
        { top: "30%", left: "35%", delay: "0.96s", size: 22 },
      ].map((s, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="sparkle"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: s.delay,
          }}
        >
          <svg viewBox="0 0 32 32" fill="none">
            <defs>
              <radialGradient id={`sparkle-grad-${i}`}>
                <stop offset="0%" stopColor="#fffbe7" />
                <stop offset="40%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#eab308" />
              </radialGradient>
            </defs>
            <path
              d="M16 0 L19 13 L32 16 L19 19 L16 32 L13 19 L0 16 L13 13 Z"
              fill={`url(#sparkle-grad-${i})`}
            />
          </svg>
        </div>
      ))}

      <Header />
      <Hero />
      <PullQuote />
      <ProcessSection />
      <BeforeAfterSection />
      <PackagesSection />
      <section id="kalkulator">
        <ValueCalculator />
      </section>
      <VoditeljSection />
      <InternationalSection />
      <ReviewsSection />
      <EquipmentSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
