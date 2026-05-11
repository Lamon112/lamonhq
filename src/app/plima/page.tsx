import type { Metadata } from "next";
import { PlimaLogo } from "@/components/plima/PlimaLogo";
import { PlimaIntroVideo } from "@/components/plima/PlimaIntroVideo";
import {
  PhoneCall,
  Megaphone,
  Sparkles,
  TrendingUp,
  Mic,
  Check,
  Minus,
  Calendar,
  Mail,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Plima — premium partner za rast privatnih klinika",
  description:
    "Vanjski tim za rast (operativa + marketing + brend + odnosi s javnošću) za privatne klinike u Hrvatskoj. Riva AI asistentica + skripte + brendiranje + marketing + PR. Od €797 mjesečno.",
  // Explicit icons override — Next.js auto-icon convention was getting
  // shadowed by root src/app/favicon.ico. Force the Plima wave SVG by URL.
  icons: {
    icon: [
      { url: "/plima/icon.svg", type: "image/svg+xml" },
      { url: "/plima/icon.svg", sizes: "any" },
    ],
    shortcut: "/plima/icon.svg",
    apple: "/plima/icon.svg",
  },
  openGraph: {
    title: "Plima — premium partner za rast privatnih klinika",
    description:
      "Zamjena za 5 zaposlenika za €1.497 mjesečno. Riva AI 24 sata dnevno + brend + marketing + PR.",
    type: "website",
    locale: "hr_HR",
    images: [{ url: "/plima/intro-poster.svg", width: 1920, height: 1080 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plima — premium partner za rast privatnih klinika",
    description:
      "Zamjena za 5 zaposlenika za €1.497 mjesečno. Riva AI 24 sata dnevno.",
    images: ["/plima/intro-poster.svg"],
  },
};

/**
 * Primary CTA — B2B Calendly event "Plima — uvodni razgovor (klinike)".
 * 30 min, 4 meetings/day cap, 15 min buffers, 6 required invitee questions
 * (klinika, lokacije, niche, volume, operativni problem, paket interesa).
 */
const BOOKING_HREF =
  "https://calendly.com/teamlamon6/plima-uvodni-razgovor-klinike";

const PILLARS = [
  {
    n: 1,
    title: "Riva — operativna AI asistentica",
    icon: PhoneCall,
    accent: "cyan",
    bullets: [
      "Diže telefon 24/7 (paketi Voice i Premium)",
      "Odgovara na poruke (DM, WhatsApp, Instagram, e-mail) — svi paketi",
      "Hrvatski, engleski, njemački, talijanski · rezervacije + podsjetnici · eskalacija na živu osobu",
    ],
  },
  {
    n: 2,
    title: "Skripte i prodajna podrška",
    icon: Mic,
    accent: "amber",
    bullets: [
      "Optimizirane skripte za pozive (fokus na pretvorbu poziva u rezervaciju)",
      "Baza čestih pitanja koja vodi pacijenta prema rezervaciji",
      "Skripte za razgovor doktor–pacijent kod tretmana visoke vrijednosti",
    ],
  },
  {
    n: 3,
    title: "Brendiranje i vizualni identitet",
    icon: Sparkles,
    accent: "rose",
    bullets: [
      "Brend audit + smjernice za ton komunikacije",
      "Vizualna konzistencija (web, tisak, društvene mreže, recepcija)",
      "Smjernice za fotografiju (što snimiti i kako)",
    ],
  },
  {
    n: 4,
    title: "Marketing i privlačenje pacijenata",
    icon: TrendingUp,
    accent: "emerald",
    bullets: [
      "Google Ads + Meta plaćene kampanje (premium tretmani)",
      "SEO za ključne riječi visoke kupovne namjere",
      "Sekvenca podsjetnika e-mailom za pacijente koji su zvali ali nisu rezervirali",
    ],
  },
  {
    n: 5,
    title: "Odnosi s javnošću i pozicioniranje",
    icon: Megaphone,
    accent: "violet",
    bullets: [
      "Stručni LinkedIn sadržaj za vlasnika klinike",
      "Plasman u stručnim medijima + nastupi na konferencijama",
      "Komunikacija u kriznim situacijama (negativne recenzije, reputacijski rizik)",
    ],
  },
] as const;

type AccentColor = (typeof PILLARS)[number]["accent"];

const ACCENT_BG: Record<AccentColor, string> = {
  cyan: "from-cyan-500/15 to-cyan-700/5 border-cyan-400/40 shadow-[0_0_24px_rgba(6,182,212,0.18)]",
  amber: "from-amber-500/15 to-amber-700/5 border-amber-400/40 shadow-[0_0_24px_rgba(251,191,36,0.18)]",
  rose: "from-rose-500/15 to-rose-700/5 border-rose-400/40 shadow-[0_0_24px_rgba(244,63,94,0.18)]",
  emerald: "from-emerald-500/15 to-emerald-700/5 border-emerald-400/40 shadow-[0_0_24px_rgba(16,185,129,0.18)]",
  violet: "from-violet-500/15 to-violet-700/5 border-violet-400/40 shadow-[0_0_24px_rgba(139,92,246,0.18)]",
};
const ACCENT_TEXT: Record<AccentColor, string> = {
  cyan: "text-cyan-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
  emerald: "text-emerald-300",
  violet: "text-violet-300",
};

interface TierFeature {
  label: string;
  values: [string | boolean, string | boolean, string | boolean];
}

const TIER_MATRIX: TierFeature[] = [
  { label: "Riva — pisana (DM, WhatsApp, Instagram, e-mail)", values: [true, true, true] },
  { label: "Riva — glasovna (telefon)", values: [false, true, true] },
  { label: "Riva — kloniran glas po želji klinike", values: [false, false, true] },
  { label: "Integracija s rezervacijskim sustavom", values: [true, true, true] },
  { label: "Podrška za više lokacija", values: [false, false, true] },
  { label: "24/7 nadzor + dedicirana WhatsApp grupa", values: [false, false, true] },
  { label: "Skripte — pitanja, odgovori, eskalacija", values: [true, true, true] },
  { label: "Skripte — razgovor doktor–pacijent (visokovrijedni tretmani)", values: [false, true, true] },
  { label: "Smjernice za ton komunikacije (brend voice)", values: [true, true, true] },
  { label: "Brend audit + pregled vizualnog identiteta", values: [false, true, true] },
  { label: "Smjernice za fotografiju", values: [false, false, true] },
  { label: "SEO ključne riječi", values: [false, "3 ključne riječi", "10 ključnih riječi"] },
  { label: "Vođenje Google/Meta kampanja", values: [false, false, "uključeno do €1.500 budžeta"] },
  { label: "Sekvenca podsjetnika e-mailom", values: [false, "osnovna", "potpuna"] },
  { label: "Stručni LinkedIn sadržaj (objave/mj.)", values: [false, "2", "4"] },
  { label: "Plasman u stručnim medijima", values: [false, false, "1 prilog/kvartal"] },
  { label: "Dogovaranje nastupa na konferencijama", values: [false, false, true] },
  { label: "Pregled rezultata s Leonardom", values: [false, "mjesečno", "tjedno"] },
  { label: "Tromjesečna strateška sesija", values: [false, true, true] },
  { label: "Vrijeme odgovora na WhatsApp", values: ["48 h", "24 h", "4 h"] },
];

const TIMELINE = [
  { day: "1. dan", what: "Klijent vraća popunjen pripremni brifing (intake dokument)" },
  { day: "2–4. dan", what: "Brend audit + konfiguracija skripti + postavljanje Rive" },
  { day: "5–7. dan", what: "Interni test (20 scenarija s Rivom u kontroliranom okruženju)" },
  { day: "8. dan", what: "Tihi režim — Riva sluša ali ne odgovara, mi verificiramo" },
  { day: "9–11. dan", what: "Doradba i finalne iteracije skripti" },
  { day: "12–14. dan", what: "Dokument tona komunikacije + marketinški plan za prvi mjesec" },
  { day: "15. dan", what: "Pokretanje uživo + 24-satni aktivni nadzor" },
  { day: "31. dan", what: "Prvi mjesečni pregled rezultata" },
];

const NOT_INCLUDED = [
  {
    title: "Budžet za oglase (Google/Meta)",
    detail:
      "Klijent plaća svoj oglašivački budžet izravno platformi. Lamon vodi i optimizira kampanje.",
  },
  {
    title: "Profesionalna fotografija",
    detail:
      "Lamon daje smjernice (što snimiti, kako, gdje). Klijent angažira fotografa.",
  },
  {
    title: "Pravna provjera medicinskih marketinških materijala",
    detail:
      "Provjera da marketinški materijali ne krše HALMED/AZOP/komorska pravila ide preko klijentova odvjetnika za zdravstveno pravo (~€50–100 po pregledu). Lamon nije odvjetnik.",
  },
  {
    title: "Pojedinačne kampanje za jednokratne događaje",
    detail:
      "Npr. „promocija za Crni petak\" — dodatak €497 po događaju uz mjesečni paket.",
  },
];

export default function PlimaLandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 antialiased">
      {/* Background ocean depth gradient + caustic light */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#031022] via-[#020617] to-black" />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.18), transparent 70%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(34,211,238,0.10), transparent 70%)",
          }}
        />
        {/* Subtle wave grid lines */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 opacity-20"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(6,182,212,0.18) 0 1px, transparent 1px 80px)",
            maskImage:
              "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.95) 100%)",
            WebkitMaskImage:
              "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.95) 100%)",
          }}
        />
      </div>

      {/* Top nav */}
      <header className="border-b border-cyan-500/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <PlimaLogo size={36} />
          <nav className="flex items-center gap-3 sm:gap-6">
            <a
              href="#stupovi"
              className="hidden text-sm text-slate-300 hover:text-white sm:inline"
            >
              5 stupova
            </a>
            <a
              href="#cijene"
              className="hidden text-sm text-slate-300 hover:text-white sm:inline"
            >
              Cijene
            </a>
            <a
              href="#timeline"
              className="hidden text-sm text-slate-300 hover:text-white sm:inline"
            >
              Tijek
            </a>
            <a
              href={BOOKING_HREF}
              className="rounded-md border border-cyan-400/60 bg-cyan-500/15 px-3 py-1.5 text-sm font-medium text-cyan-100 transition-all hover:scale-[1.03] hover:bg-cyan-500/25"
            >
              Dogovori razgovor →
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>
              Premium partner za rast · privatne klinike · Hrvatska
            </div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Plima ne prodaje AI alat.{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-200 bg-clip-text text-transparent">
                Prodajemo kompletnu mehaniku rasta klinike.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
              Vanjski tim za rast — operativa + marketing + brend + odnosi s
              javnošću — za cijenu ispod jedne nepunoradno zaposlene osobe.
              Riva AI asistentica diže svaki poziv 24 sata dnevno, mi gradimo
              brend i privlačimo nove pacijente dok se vi bavite postojećima.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href={BOOKING_HREF}
                className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 px-6 py-3 font-semibold text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.45)] transition-all hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(6,182,212,0.7)]"
              >
                <Calendar size={18} />
                Dogovori 15-minutni uvodni razgovor
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </a>
              <a
                href="#stupovi"
                className="text-sm text-cyan-200 underline-offset-4 hover:text-cyan-100 hover:underline"
              >
                ili pročitaj što ulazi u paket ↓
              </a>
            </div>

            {/* Hero proof points */}
            <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="MJESEČNO OD" value="€797" sub="paket Mreža" />
              <Stat
                label="VRIJEME POSTAVLJANJA"
                value="14 dana"
                sub="od potpisa do pokretanja uživo"
              />
              <Stat label="JEZICI" value="HR EN DE IT" sub="Riva — sva 4 jezika" />
            </div>
          </div>
        </div>
      </section>

      {/* INTRO VIDEO — placed right after hero so engaged visitors can dive deep */}
      <PlimaIntroVideo bookingHref={BOOKING_HREF} />

      {/* THE 5-EMPLOYEES PITCH — big quote block */}
      <section className="border-y border-cyan-500/10 bg-gradient-to-b from-cyan-950/30 via-[#021024] to-[#021024]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="mb-2 text-center text-xs font-mono uppercase tracking-[0.3em] text-cyan-400/80">
            Kontekst
          </p>
          <blockquote className="mx-auto max-w-4xl text-center text-2xl leading-relaxed text-slate-100 sm:text-3xl sm:leading-relaxed">
            Za istu funkcionalnost morali biste zaposliti{" "}
            <span className="font-semibold text-cyan-300">5 ljudi</span> —
            recepcionarku 24 sata dnevno, voditelja marketinga, brend
            dizajnera, copywritera (osobu za odnose s javnošću) i analitičara.
            <br />
            <br />
            U Hrvatskoj to je{" "}
            <span className="font-semibold text-amber-300">
              €10.000–15.000 mjesečno
            </span>{" "}
            na bruto plaće, plus 6-12 mjeseci dok ih zaposlite i obučite.
            <br />
            <br />
            <span className="text-white">
              Plima za €1.497 mjesečno. Sutra startate.
            </span>
          </blockquote>
        </div>
      </section>

      {/* 5 STUPOVA */}
      <section id="stupovi" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-cyan-400/80">
            Što ulazi u Plimu
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            5 stupova kompletne mehanike rasta
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.n}
                className={
                  "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 backdrop-blur-sm transition-all hover:-translate-y-1 " +
                  ACCENT_BG[p.accent]
                }
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={
                      "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/30 " +
                      ACCENT_TEXT[p.accent]
                    }
                  >
                    <Icon size={20} />
                  </span>
                  <span
                    className={
                      "font-mono text-xs uppercase tracking-wider opacity-60 " +
                      ACCENT_TEXT[p.accent]
                    }
                  >
                    Stup {p.n}
                  </span>
                </div>
                <h3 className="mb-3 text-lg font-semibold text-white">
                  {p.title}
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  {p.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={ACCENT_TEXT[p.accent]}>▸</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* TIER COMPARISON */}
      <section
        id="cijene"
        className="border-y border-cyan-500/10 bg-gradient-to-b from-[#021024] via-[#01101f] to-[#01101f]"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-cyan-400/80">
              Cijene
            </p>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              3 paketa — od probnog pristupa do potpunog partnera za rast
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
              Svi paketi imaju 14-dnevno postavljanje. Godišnja pretplata —
              popust 10%.
            </p>
          </div>

          {/* Tier headline cards */}
          <div className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <TierCard
              name="Plima Mreža"
              setupPrice="€997"
              monthly="€797"
              icp="Samostalna praksa, manje od 100 poziva mjesečno, jak nastup na društvenim mrežama. Probni pristup."
              tagline='„Probni pristup — Riva odgovara na svaku poruku, vi vidite kako se mijenja stopa pretvorbe poziva u rezervacije."'
              accent="from-slate-700/40 to-slate-900/40 border-slate-500/40"
              accentText="text-slate-300"
              cta="Krenuti s probnim paketom →"
              href={BOOKING_HREF}
            />
            <TierCard
              name="Plima Voice"
              setupPrice="€1.997"
              monthly="€1.497"
              icp="Premium klinike, 100–300 poziva mjesečno. Standardni paket za 80 % naših klijenata."
              tagline='„Kompletan operativni stroj + brend + organski rast. Riva diže svaki poziv, mi gradimo brend."'
              accent="from-cyan-500/25 to-cyan-700/15 border-cyan-400/70"
              accentText="text-cyan-200"
              featured
              cta="Dogovori razgovor za Voice →"
              href={BOOKING_HREF}
            />
            <TierCard
              name="Plima Premium"
              setupPrice="€2.997"
              monthly="€2.497"
              icp="Premium grupe s više lokacija. Potpuni partner za rast."
              tagline='„Potpuni partner za rast. Voice + plaćeni mediji + više lokacija + kloniran glas + tjedni strateški poziv."'
              accent="from-amber-500/15 to-amber-800/10 border-amber-400/50"
              accentText="text-amber-200"
              cta="Razgovarajmo o Premiumu →"
              href={BOOKING_HREF}
            />
          </div>

          {/* Full feature matrix */}
          <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-500/20 bg-cyan-950/40 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold text-cyan-200">
                      Element
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-300">
                      Mreža
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-cyan-200">
                      Voice ⭐
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-amber-200">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_MATRIX.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-cyan-500/10 transition-colors hover:bg-cyan-500/5"
                    >
                      <td className="px-4 py-2.5 text-slate-200">
                        {row.label}
                      </td>
                      {row.values.map((v, j) => (
                        <td
                          key={j}
                          className={
                            "px-3 py-2.5 text-center text-xs " +
                            (j === 1
                              ? "bg-cyan-500/5 font-medium text-cyan-100"
                              : j === 2
                                ? "bg-amber-500/5 text-amber-100"
                                : "text-slate-400")
                          }
                        >
                          <CellValue value={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            * Godišnja pretplata (Voice godišnje €16.166 umjesto €17.964 kod
            mjesečnog plaćanja) — popust 10 %.
          </p>
        </div>
      </section>

      {/* TIMELINE */}
      <section id="timeline" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-cyan-400/80">
            Tijek postavljanja
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Od potpisa do pokretanja uživo u 14 dana
          </h2>
        </div>
        <div className="relative mx-auto max-w-4xl">
          {/* Vertical wave line */}
          <div
            className="absolute left-[88px] top-0 hidden h-full w-px sm:block"
            style={{
              background:
                "linear-gradient(180deg, rgba(6,182,212,0.6) 0%, rgba(6,182,212,0.3) 100%)",
            }}
          />
          <ol className="space-y-4">
            {TIMELINE.map((t) => (
              <li
                key={t.day}
                className="relative flex flex-col gap-3 rounded-lg border border-cyan-500/15 bg-cyan-950/15 p-4 backdrop-blur-sm sm:flex-row sm:items-center"
              >
                <span className="inline-flex w-20 shrink-0 items-center justify-center rounded-md border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 font-mono text-sm font-bold text-cyan-200">
                  {t.day}
                </span>
                <span className="text-slate-200">{t.what}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHAT'S NOT INCLUDED — transparency */}
      <section className="border-y border-cyan-500/10 bg-gradient-to-b from-[#01101f] via-[#020617] to-[#020617]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-rose-400/70">
              Transparentno
            </p>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Što NIJE u Plima paketu
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
              Bolje da znate prije nego potpišete.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {NOT_INCLUDED.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-rose-500/15 bg-rose-950/10 p-5"
              >
                <h3 className="mb-2 font-semibold text-rose-200">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <PlimaLogo variant="stacked" size={64} className="mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Spremni vidjeti kako bi izgledalo za vašu kliniku?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            15 minuta. Bez obaveze. Pokažem vam koji paket odgovara vašoj
            klinici, kakvi su realni rezultati prvog mjeseca i kada možete
            krenuti.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href={BOOKING_HREF}
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 px-7 py-3.5 font-semibold text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(6,182,212,0.8)]"
            >
              <Calendar size={18} />
              Dogovori uvodni razgovor
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
            <a
              href="mailto:leonardo@lamon.io"
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/5 px-6 py-3.5 font-medium text-cyan-100 transition-colors hover:bg-cyan-500/15"
            >
              <Mail size={16} />
              ili pošalji e-mail
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-cyan-500/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8">
          <PlimaLogo size={28} />
          <p className="text-xs text-slate-500">
            Lamon Agency · Leonardo Lamon · Hrvatska
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function TierCard({
  name,
  setupPrice,
  monthly,
  icp,
  tagline,
  accent,
  accentText,
  featured,
  cta,
  href,
}: {
  name: string;
  setupPrice: string;
  monthly: string;
  icp: string;
  tagline: string;
  accent: string;
  accentText: string;
  featured?: boolean;
  cta: string;
  href: string;
}) {
  return (
    <div
      className={
        "relative flex flex-col rounded-2xl border-2 bg-gradient-to-br p-7 backdrop-blur-sm transition-all hover:-translate-y-1 " +
        accent +
        (featured
          ? " shadow-[0_0_40px_rgba(6,182,212,0.35)] lg:scale-105"
          : "")
      }
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950 shadow-md">
          Standardni paket
        </span>
      )}
      <h3 className={"mb-2 text-xl font-bold " + accentText}>{name}</h3>
      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-white">{monthly}</span>
        <span className="text-sm text-slate-400">/mj</span>
      </div>
      <p className="mb-5 text-xs text-slate-400">
        Postavljanje {setupPrice} · jednokratno
      </p>
      <p className={"mb-3 text-xs uppercase tracking-wider " + accentText}>
        Za koga
      </p>
      <p className="mb-5 text-sm leading-snug text-slate-200">{icp}</p>
      <p className="mb-7 flex-1 text-sm italic leading-relaxed text-slate-300">
        {tagline}
      </p>
      <a
        href={href}
        className={
          "block rounded-lg border px-4 py-2.5 text-center text-sm font-semibold transition-all " +
          (featured
            ? "border-transparent bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            : "border-current " + accentText + " hover:bg-current/10")
        }
      >
        {cta}
      </a>
    </div>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check size={14} className="mx-auto text-cyan-400" />;
  if (value === false)
    return <Minus size={14} className="mx-auto text-slate-700" />;
  return <span>{value}</span>;
}
