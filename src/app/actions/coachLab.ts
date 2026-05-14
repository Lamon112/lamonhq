"use server";

/**
 * Coach Lab actions — AI YouTube biznis coach for Leonardov 1:1 students.
 *
 * Per Leonardov 2026-05-14 directive: AI coach generates personalized
 * 12-week roadmaps + weekly check-in analyses. Leonardo reviews every
 * AI reply before it's sent to the student (oversight mode default-on).
 *
 * The AI uses:
 *   - Leonardov methodology (10 Zlatnih Pravila + brand stack)
 *   - Student's onboarding intake (niche, goal, bottleneck)
 *   - Student's historical check-ins + videos published
 *   - Latest niche drops (cross-pollinate Niche Hunter)
 *   - Latest top-10x performers from video_intel (borrowing source)
 *
 * Cost: Sonnet ~$0.05-0.15 per check-in analysis. Roadmap (Opus) ~$0.20.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getServiceSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface CoachStudent {
  id: string;
  full_name: string;
  email: string | null;
  telegram_handle: string | null;
  niche: string | null;
  primary_platform: string | null;
  current_subs: number | null;
  current_avg_views: number | null;
  monetization_status: string | null;
  monthly_goal_eur: number | null;
  hours_per_week: number | null;
  primary_bottleneck: string | null;
  learning_style: string | null;
  ai_roadmap_md: string | null;
  ai_roadmap_generated_at: string | null;
  start_date: string | null;
  months_paid: number;
  monthly_fee_eur: number;
  status: "onboarding" | "active" | "paused" | "graduated" | "churned";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachCheckin {
  id: string;
  student_id: string;
  week_number: number;
  metrics: Record<string, unknown>;
  videos_published: unknown[];
  question: string | null;
  blocker: string | null;
  ai_analysis_md: string | null;
  ai_recommended_actions: Array<{ title: string; why: string }>;
  ai_generated_at: string | null;
  leonardo_approved: boolean;
  leonardo_edits_md: string | null;
  sent_to_student_at: string | null;
  generation_cost_usd: number;
  created_at: string;
  updated_at: string;
}

/* ── List + single-fetch helpers ── */

export async function listStudents(): Promise<CoachStudent[]> {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("coach_students")
    .select("*")
    .order("status", { ascending: true })
    .order("start_date", { ascending: false });
  return (data ?? []) as CoachStudent[];
}

export async function getStudent(id: string): Promise<CoachStudent | null> {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("coach_students")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as CoachStudent) ?? null;
}

export async function listCheckins(studentId: string): Promise<CoachCheckin[]> {
  const sb = getServiceSupabase();
  const { data } = await sb
    .from("coach_checkins")
    .select("*")
    .eq("student_id", studentId)
    .order("week_number", { ascending: false });
  return (data ?? []) as CoachCheckin[];
}

/* ── Student CRUD ── */

export async function createStudent(input: {
  full_name: string;
  email?: string;
  telegram_handle?: string;
  niche?: string;
  primary_platform?: string;
  current_subs?: number;
  current_avg_views?: number;
  monetization_status?: string;
  monthly_goal_eur?: number;
  hours_per_week?: number;
  primary_bottleneck?: string;
  learning_style?: string;
  monthly_fee_eur?: number;
  start_date?: string;
}): Promise<CoachStudent> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("coach_students")
    .insert({
      ...input,
      status: "onboarding",
      monthly_fee_eur: input.monthly_fee_eur ?? 500,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data as CoachStudent;
}

/* ── AI roadmap generation ── */

const ROADMAP_SYSTEM = `Ti si Leonardov AI co-pilot za 1:1 mentorstvo. Generiraš 12-tjedni personalizirani roadmap za studenta YouTube/TikTok biznisa.

Leonardov stil:
- Hands-on, akcijski, ne teorija
- 1 koncept tjedno → 1 video do nedjelje → metric review iduće srijede
- Storytelling > educational
- Hook 3sek + loop-able final
- View-through rate > views

Output: Strukturirani markdown s tjedan-po-tjedan razgradnjom. Svaki tjedan ima: cilj, što naučiti, što SNIMITI, koju metriku pratiti, što očekivati.

Direktan ton (peer-to-peer, ne paternalistički). Hrvatski / srpski. Konkretni primjeri uvijek iznad apstrakcije.`;

export async function generateRoadmap(studentId: string): Promise<{ ok: boolean; cost: number }> {
  const sb = getServiceSupabase();
  const student = await getStudent(studentId);
  if (!student) return { ok: false, cost: 0 };

  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, cost: 0 };
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMsg = `Generiraj 12-tjedni roadmap za:

Ime: ${student.full_name}
Niche: ${student.niche ?? "(nije specificirano)"}
Platforma: ${student.primary_platform ?? "(?)"}
Trenutni subs: ${student.current_subs ?? 0}
Avg views: ${student.current_avg_views ?? 0}
Monetizacija: ${student.monetization_status ?? "(?)"}
Mjesečni cilj: €${student.monthly_goal_eur ?? "(?)"}
Sati/tj: ${student.hours_per_week ?? "(?)"}
Bottleneck: ${student.primary_bottleneck ?? "(?)"}
Learning style: ${student.learning_style ?? "(?)"}

Vrati MARKDOWN roadmap (nema JSON wrap-a). Otvori s 1-rečenicom procjenom njegove startne pozicije, onda Week 1..12 sekcije.`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 8192,
    system: [{ type: "text", text: ROADMAP_SYSTEM }],
    messages: [{ role: "user", content: userMsg }],
  });

  const block = message.content.find((b) => b.type === "text");
  const roadmap = block && block.type === "text" ? block.text.trim() : "";

  const cost =
    (message.usage.input_tokens / 1_000_000) * 15 +
    (message.usage.output_tokens / 1_000_000) * 75;

  await sb
    .from("coach_students")
    .update({
      ai_roadmap_md: roadmap,
      ai_roadmap_generated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  revalidatePath("/");
  return { ok: true, cost };
}

/* ── Weekly check-in: AI drafts analysis (Leonardo approves before send) ── */

const CHECKIN_SYSTEM = `Ti si Leonardov AI co-pilot za njegove 1:1 mentorstvo studente. Generiraš personalizirani tjedni feedback baziran na studentovim metrikama + roadmap kontekstu.

Tvoj output je MARKDOWN sastoji se od 4 dijela:

# 📊 Što je radilo ovaj tjedan
1-2 konkretne stvari iz njihovih videa / metrika (referenciraj točne brojke).

# ⚠️ Gdje vidim problem
1-2 stvari koje gube na retention/conversion. Imenuj specifične video URL-ove ako su submit-ali.

# 🎯 Sljedećih 7 dana — action plan
3-5 konkretnih akcija (snimi X, testiraj Y, pratiti Z metric). Svaka mora imati: što, do kad, koji ishod očekuješ.

# 🔥 Glavna lekcija ovog tjedna
1 rečenica koja sumira mind-shift.

Ton: peer-to-peer, direktan, energičan. Hrvatski/srpski. Konkretni primjeri uvijek > apstrakcija. Bez "great job!" — referenciraj BROJEVE, ne emocije.`;

export async function generateCheckinAnalysis(checkinId: string): Promise<{ ok: boolean; cost: number; error?: string }> {
  const sb = getServiceSupabase();

  const { data: checkin } = await sb
    .from("coach_checkins")
    .select("*")
    .eq("id", checkinId)
    .maybeSingle();
  if (!checkin) return { ok: false, cost: 0, error: "checkin not found" };

  const { data: student } = await sb
    .from("coach_students")
    .select("*")
    .eq("id", checkin.student_id)
    .maybeSingle();
  if (!student) return { ok: false, cost: 0, error: "student not found" };

  // Prior 4 checkins for context
  const { data: prior } = await sb
    .from("coach_checkins")
    .select("week_number, metrics, ai_analysis_md, blocker")
    .eq("student_id", student.id)
    .lt("week_number", checkin.week_number)
    .order("week_number", { ascending: false })
    .limit(4);

  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, cost: 0, error: "no API key" };
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMsg = `Student: ${student.full_name} (Week ${checkin.week_number})
Niche: ${student.niche} | Cilj: €${student.monthly_goal_eur}/mj | Subs: ${student.current_subs}

# Roadmap kontekst (12-tj plan)
${(student.ai_roadmap_md ?? "(nema roadmapa generiranog)").slice(0, 2000)}

# Prethodni check-in feedback (zadnja 4 tjedna)
${(prior ?? []).map((p) => `**W${p.week_number}** blocker: ${p.blocker ?? "(none)"}`).join("\n")}

# OVOTJEDNI INPUT
Metrike: ${JSON.stringify(checkin.metrics)}
Videi objavljeni: ${JSON.stringify(checkin.videos_published)}
Pitanje studenta: ${checkin.question ?? "(nije postavljeno)"}
Blocker tjedna: ${checkin.blocker ?? "(nije specificirano)"}

Vrati MARKDOWN analizu (4 sekcije iz system prompt-a).`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: [{ type: "text", text: CHECKIN_SYSTEM }],
    messages: [{ role: "user", content: userMsg }],
  });

  const block = message.content.find((b) => b.type === "text");
  const analysis = block && block.type === "text" ? block.text.trim() : "";

  const cost =
    (message.usage.input_tokens / 1_000_000) * 3 +
    (message.usage.output_tokens / 1_000_000) * 15;

  await sb
    .from("coach_checkins")
    .update({
      ai_analysis_md: analysis,
      ai_generated_at: new Date().toISOString(),
      generation_cost_usd: cost,
    })
    .eq("id", checkinId);

  revalidatePath("/");
  return { ok: true, cost };
}

export async function approveCheckin(checkinId: string, leonardoEdits?: string): Promise<void> {
  const sb = getServiceSupabase();
  await sb
    .from("coach_checkins")
    .update({
      leonardo_approved: true,
      leonardo_edits_md: leonardoEdits ?? null,
      sent_to_student_at: new Date().toISOString(),
    })
    .eq("id", checkinId);
  revalidatePath("/");
}

export async function createCheckin(input: {
  student_id: string;
  week_number: number;
  metrics?: Record<string, unknown>;
  videos_published?: unknown[];
  question?: string;
  blocker?: string;
}): Promise<CoachCheckin> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from("coach_checkins")
    .insert({
      ...input,
      metrics: input.metrics ?? {},
      videos_published: input.videos_published ?? [],
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data as CoachCheckin;
}
