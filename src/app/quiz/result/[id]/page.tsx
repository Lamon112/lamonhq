import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { QuizResult } from "@/components/quiz/QuizResult";
import { MetaPixel } from "@/components/quiz/MetaPixel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tvoj Side Hustle plan",
  robots: { index: false, follow: false },
};

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultPage({ params }: PageProps) {
  const { id } = await params;
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("quiz_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <MetaPixel />
      <QuizResult lead={data} />
    </main>
  );
}
