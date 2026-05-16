"use client";

/**
 * Investment Calculator — "Stvarna vrijednost tvog auta za N godina."
 *
 * Premium clients think about resale value. This widget shows them how
 * much residual value Stage 4 + Artdeshine NGC+ Graphene preserves vs.
 * driving a poorly-maintained car to the second-hand market.
 *
 * Math (conservative):
 *  - Standard premium depreciation: 12% / year compounded
 *  - "Bez tretmana" penalty: -5% one-time market discount at sale
 *    (visible paint defects, dull interior, touchless wash damage)
 *  - "S Baywashom" bonus: +3% premium at sale (mirror finish, leather
 *    pristine, ceramic protection in place — sells faster, top of market)
 *
 * Output: difference in € between the two residual values, displayed as
 * "+€XX.XXX očuvane vrijednosti" with a side-by-side comparison.
 *
 * CTA: tel: link to Max with context phrase, no contact form.
 */

import { useMemo, useState } from "react";
import { Phone, TrendingUp } from "lucide-react";
import { Counter } from "./Counter";

const PHONE_TEL = "+385996670969";
const PHONE_DISPLAY = "099 667 0969";

const VALUE_PRESETS = [
  { label: "€30K", value: 30000 },
  { label: "€60K", value: 60000 },
  { label: "€120K", value: 120000 },
  { label: "€250K", value: 250000 },
];

const STANDARD_DEPRECIATION = 0.12; // 12% / year compounded
const WITHOUT_BAYWASH_DISCOUNT = 0.05; // -5% at sale due to wear
const WITH_BAYWASH_PREMIUM = 0.03; // +3% at sale due to condition

function formatEUR(n: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function ValueCalculator() {
  const [carValue, setCarValue] = useState(60000);
  const [years, setYears] = useState(5);

  const result = useMemo(() => {
    const baseResidual = carValue * Math.pow(1 - STANDARD_DEPRECIATION, years);
    const withoutBaywash = baseResidual * (1 - WITHOUT_BAYWASH_DISCOUNT);
    const withBaywash = baseResidual * (1 + WITH_BAYWASH_PREMIUM);
    const preserved = withBaywash - withoutBaywash;
    return {
      baseResidual,
      withoutBaywash,
      withBaywash,
      preserved,
      // Visual fill percentages for the comparison bars (normalized to original car value)
      withoutPct: (withoutBaywash / carValue) * 100,
      withPct: (withBaywash / carValue) * 100,
    };
  }, [carValue, years]);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
            Stvarna vrijednost
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl lg:text-5xl">
            Koliko vrijedi tvoj auto
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">za {years} godinâ?</span>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-1 z-0 h-3 bg-yellow-300/70 sm:h-4"
              />
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-neutral-600 sm:text-lg">
            Premium klijenti znaju: način kako se brineš za auto direktno
            utječe na njegovu prodajnu vrijednost. Evo koliko € sustavom
            čuvaš.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
          {/* ────── LEFT: Inputs ────── */}
          <div className="rounded-3xl border border-black/10 bg-neutral-50 p-7 sm:p-9">
            <div>
              <label
                htmlFor="car-value"
                className="text-xs font-semibold uppercase tracking-widest text-neutral-500"
              >
                Vrijednost auta danas
              </label>
              <div className="mt-3 text-4xl font-black tracking-tight text-black sm:text-5xl">
                {formatEUR(carValue)}
              </div>
              <input
                id="car-value"
                type="range"
                min={10000}
                max={500000}
                step={5000}
                value={carValue}
                onChange={(e) => setCarValue(Number(e.target.value))}
                className="mt-4 w-full accent-yellow-400"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {VALUE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setCarValue(p.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      carValue === p.value
                        ? "border-yellow-400 bg-yellow-400 text-black"
                        : "border-black/15 bg-white text-neutral-700 hover:border-black/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-black/10 pt-8">
              <label
                htmlFor="years"
                className="text-xs font-semibold uppercase tracking-widest text-neutral-500"
              >
                Koliko godina ćeš ga voziti
              </label>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-4xl font-black tracking-tight text-black sm:text-5xl">
                  {years}
                </div>
                <div className="text-base font-medium text-neutral-500">
                  {years === 1 ? "godinu" : years < 5 ? "godine" : "godina"}
                </div>
              </div>
              <input
                id="years"
                type="range"
                min={1}
                max={10}
                step={1}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="mt-4 w-full accent-yellow-400"
              />
              <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                <span>1g</span>
                <span>5g</span>
                <span>10g</span>
              </div>
            </div>
          </div>

          {/* ────── RIGHT: Comparison + Result ────── */}
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              {/* Without */}
              <div className="rounded-3xl border border-black/10 bg-white p-5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Bez tretmana
                </div>
                <div className="mt-3 text-2xl font-black tracking-tight text-neutral-700 sm:text-3xl">
                  {formatEUR(result.withoutBaywash)}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full bg-neutral-400 transition-all duration-500"
                    style={{ width: `${Math.max(5, result.withoutPct)}%` }}
                  />
                </div>
                <div className="mt-3 text-xs text-neutral-500">
                  Swirl-marks · dull interior · touchless damage = -5%
                  market discount
                </div>
              </div>

              {/* With */}
              <div className="rounded-3xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-white p-5 ring-1 ring-yellow-400/20">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-yellow-700">
                  S Baywashom
                </div>
                <div className="mt-3 text-2xl font-black tracking-tight text-black sm:text-3xl">
                  {formatEUR(result.withBaywash)}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-yellow-100">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-500"
                    style={{ width: `${Math.max(5, result.withPct)}%` }}
                  />
                </div>
                <div className="mt-3 text-xs text-neutral-600">
                  Stage 4 + Artdeshine NGC+ · pristine interior = +3%
                  premium pri prodaji
                </div>
              </div>
            </div>

            {/* HERO RESULT */}
            <div className="relative overflow-hidden rounded-3xl bg-black p-7 text-white sm:p-9">
              <div
                aria-hidden="true"
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-400">
                  <TrendingUp className="h-4 w-4" />
                  Tvoj benefit
                </div>
                <div className="mt-3 text-5xl font-black tracking-tight text-yellow-400 sm:text-6xl lg:text-7xl">
                  <Counter
                    key={`${carValue}-${years}`}
                    target={result.preserved}
                    prefix="+€"
                    durationMs={900}
                  />
                </div>
                <div className="mt-2 text-sm text-neutral-300 sm:text-base">
                  očuvane vrijednosti kroz {years} godinâ s 47-koraka
                  sustavom
                </div>
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-yellow-400 px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-yellow-300"
                >
                  <Phone className="h-4 w-4" />
                  Pričaj s Maxom o svom autu · {PHONE_DISPLAY}
                </a>
              </div>
            </div>

            <p className="text-center text-xs text-neutral-500">
              Procjena bazirana na industrijskim podacima (premium auto 12 %
              deprecijacije/god). Stvarna brojka ovisi o modelu, kilometraži
              i tržištu — Max ti može dati točniji estimat za tvoj auto.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
