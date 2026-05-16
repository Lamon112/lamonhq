import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { QuizResult } from "@/components/quiz/QuizResult";
import { MetaPixel } from "@/components/quiz/MetaPixel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tvoj Side Hustle plan",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

// Server component → fetch lead via internal API. This ensures we share
// the SAME process state as the submit route (matters for in-memory mock
// mode dev runs; in prod both paths read from Supabase identically).
export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const res = await fetch(`${proto}://${host}/api/quiz/lead/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) notFound();
  const lead = await res.json();
  return (
    <main className="min-h-screen bg-bg text-text">
      <MetaPixel />
      <QuizResult lead={lead} />
    </main>
  );
}
