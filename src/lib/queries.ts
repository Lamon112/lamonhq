import { createClient } from "@/lib/supabase/server";

export interface HQStats {
  mrrCents: number;
  monthlyDeltaCents: number;
  activeClients: number;
  newClientsThisMonth: number;
  totalLeads: number;
  hotLeads: number;
  contentPostsThisMonth: number;
  goalTargetCents: number;
}

export interface OutreachStats {
  thisWeek: number;
  weeklyGoal: number;
  replyRate: number; // 0-1
  convertedToDiscovery: number;
}

const GOAL_MRR_CENTS = 30_000_00; // 30K€/mj

function startOfMonth(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfWeek(d = new Date()): string {
  const day = d.getDay() || 7; // Mon=1..Sun=7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export async function getHQStats(): Promise<HQStats> {
  const supabase = await createClient();
  const monthStart = startOfMonth();

  const [
    activeClientsRes,
    newClientsRes,
    leadsRes,
    hotLeadsRes,
    contentRes,
    mrrRes,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", monthStart),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .not("stage", "in", "(closed_won,closed_lost)"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("icp_score", 15)
      .not("stage", "in", "(closed_won,closed_lost)"),
    supabase
      .from("content_posts")
      .select("*", { count: "exact", head: true })
      .gte("posted_at", monthStart),
    supabase
      .from("clients")
      .select("monthly_revenue")
      .eq("status", "active"),
  ]);

  const mrrCents = (mrrRes.data ?? []).reduce(
    (sum, row) => sum + Math.round(Number(row.monthly_revenue ?? 0) * 100),
    0,
  );

  return {
    mrrCents,
    monthlyDeltaCents: 0, // computed once we have history
    activeClients: activeClientsRes.count ?? 0,
    newClientsThisMonth: newClientsRes.count ?? 0,
    totalLeads: leadsRes.count ?? 0,
    hotLeads: hotLeadsRes.count ?? 0,
    contentPostsThisMonth: contentRes.count ?? 0,
    goalTargetCents: GOAL_MRR_CENTS,
  };
}

export async function getOutreachStats(): Promise<OutreachStats> {
  const supabase = await createClient();
  const weekStart = startOfWeek();

  const [thisWeekRes, repliedRes, convertedRes] = await Promise.all([
    supabase
      .from("outreach")
      .select("*", { count: "exact", head: true })
      .gte("sent_at", weekStart),
    supabase
      .from("outreach")
      .select("status")
      .gte("sent_at", weekStart),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart)
      .not("stage", "eq", "discovery"),
  ]);

  const sentRows = repliedRes.data ?? [];
  const replied = sentRows.filter((r) => r.status === "replied").length;
  const replyRate = sentRows.length ? replied / sentRows.length : 0;

  return {
    thisWeek: thisWeekRes.count ?? 0,
    weeklyGoal: 25,
    replyRate,
    convertedToDiscovery: convertedRes.count ?? 0,
  };
}

export interface OutreachRow {
  id: string;
  lead_name: string | null;
  platform: string | null;
  message: string | null;
  status: "sent" | "replied" | "no_reply" | "bounced";
  sent_at: string;
}

export async function getOutreachList(limit = 50): Promise<OutreachRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("outreach")
    .select("id, lead_name, platform, message, status, sent_at")
    .order("sent_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OutreachRow[];
}

export interface LeadRef {
  id: string;
  name: string;
  niche: string | null;
}

export async function getRecentLeads(limit = 30): Promise<LeadRef[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, name, niche")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as LeadRef[];
}
