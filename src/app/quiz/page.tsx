import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizWizard } from "@/components/quiz/QuizWizard";
import { MetaPixel } from "@/components/quiz/MetaPixel";

export const metadata: Metadata = {
  title: "Side Hustle Match — tvoj osobni plan za 30 dana",
  description:
    "Odgovori na 10 pitanja i AI generira tvoj osobni 30-dnevni plan za side hustle: koja platforma, koja niša, koji case study je tebi najbliži.",
  openGraph: {
    title: "Tvoj osobni Side Hustle plan — 60 sekundi",
    description:
      "AI generira osobni 30-dnevni plan na temelju 10 pitanja. Bez generičnih savjeta.",
    type: "website",
    locale: "hr_HR",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function QuizPage() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <MetaPixel />
      {/* useSearchParams in QuizWizard requires Suspense boundary at the
          page level so Next can prerender the shell during build and
          stream the param-aware UI client-side. */}
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-text-muted">
            Učitavam quiz…
          </div>
        }
      >
        <QuizWizard />
      </Suspense>
    </main>
  );
}
