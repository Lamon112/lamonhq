/**
 * Baywash standalone layout — strips HQ chrome so the page reads as a
 * dedicated client site, not part of Leonardov ops dashboard.
 *
 * The root layout in src/app/layout.tsx still wraps this, so we inherit
 * font + base styles; we just don't render any nav/header from HQ.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Baywash — Premium Auto Detailing Studio · Viškovo, Rijeka",
  description:
    "47 koraka. Stage 4 paint correction + Artdeshine NGC+ graphene. Klijenti dolaze iz Dubaija i Saudijske Arabije. 4,9 zvjezdica · 219 recenzija. Pozovi Maxa: 099 667 0969.",
  openGraph: {
    title: "Baywash — Premium Auto Detailing Studio",
    description:
      "Studio koji Saudijci voze 5.000 km da bi došli do njega. 47 koraka. €2.500+ tretmani. 4,9★ · 219 recenzija.",
    type: "website",
    locale: "hr_HR",
    siteName: "Baywash",
  },
  twitter: {
    card: "summary_large_image",
    title: "Baywash — Premium Auto Detailing Studio",
    description:
      "47 koraka. Stage 4 paint correction + Artdeshine NGC+ graphene. Pozovi Maxa: 099 667 0969.",
  },
  robots: { index: true, follow: true },
};

export default function BaywashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
