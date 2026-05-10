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
  lead_id: string | null;
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
    .select("id, lead_id, lead_name, platform, message, status, sent_at")
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

// =====================================================================
// Client Manager
// =====================================================================

export interface ClientRow {
  id: string;
  name: string;
  type: "b2b_clinic" | "coach_mentor" | "affiliate";
  status: "active" | "onboarding" | "paused" | "churned";
  monthly_revenue: number | null;
  start_date: string | null;
  notes: string | null;
  last_touchpoint_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  churn_risk: "low" | "medium" | "high" | null;
  created_at: string;
  updated_at: string;
}

export interface ClientsStats {
  active: number;
  onboarding: number;
  paused: number;
  churned: number;
  churnRisk: number;
  mrrCents: number;
}

export async function getClients(): Promise<ClientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("status", { ascending: true })
    .order("monthly_revenue", { ascending: false });
  return (data ?? []) as ClientRow[];
}

export async function getClientsStats(): Promise<ClientsStats> {
  const clients = await getClients();
  const stats = {
    active: 0,
    onboarding: 0,
    paused: 0,
    churned: 0,
    churnRisk: 0,
    mrrCents: 0,
  };
  for (const c of clients) {
    stats[c.status] += 1;
    if (c.churn_risk && c.status === "active") stats.churnRisk += 1;
    if (c.status === "active") {
      stats.mrrCents += Math.round(Number(c.monthly_revenue ?? 0) * 100);
    }
  }
  return stats;
}

// =====================================================================
// Lead Scorer
// =====================================================================

export type ICPCriterion =
  | "lice_branda"
  | "edge"
  | "premium"
  | "dokaz"
  | "brzina_odluke";

export interface LeadRow {
  id: string;
  name: string;
  source: "linkedin" | "instagram" | "tiktok" | "referral" | "other" | null;
  niche:
    | "stomatologija"
    | "estetska"
    | "fizio"
    | "ortopedija"
    | "coach"
    | "other"
    | null;
  icp_score: number | null;
  icp_breakdown: Record<string, number> | null;
  stage:
    | "discovery"
    | "pricing"
    | "financing"
    | "booking"
    | "closed_won"
    | "closed_lost";
  estimated_value: number | null;
  probability: number | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  discovery_at: string | null;
  discovery_outcome: string | null;
  discovery_notes: string | null;
  // person_enrichment is filled by deepEnrichLead — see actions/deepEnrich.ts
  person_enrichment: {
    owner: {
      name: string;
      title: string | null;
      linkedin_url: string | null;
      email: string | null;
      email_status: string | null;
      apollo_id: string | null;
      match_score: number;
      channels: { email?: string; linkedin?: string };
      channelHealth?: {
        linkedin?: {
          status:
            | "alive"
            | "recently_active"
            | "dormant"
            | "dead"
            | "blocked"
            | "unknown";
          followers?: number;
          reason?: string;
        };
      };
    } | null;
    candidates_searched?: string[];
    apollo_total?: number;
    apollo_skipped?: boolean;
    enriched_at?: string;
    note?: string;
    org_channels_scraped?: {
      instagram?: string[];
      facebook?: string[];
      linkedin_company?: string[];
      linkedin_personal?: string[];
      tiktok?: string[];
      youtube?: string[];
      whatsapp?: string[];
      emails?: string[];
      phones?: string[];
      pages_visited?: string[];
    };
  } | null;
  holmes_report?: {
    owner: {
      name: string | null;
      title: string | null;
      bio: string | null;
      photo: string | null;
      education: string[];
      languages: string[];
      years_experience: number | null;
    };
    channels: {
      linkedin_personal: string | null;
      instagram_personal: string | null;
      email: string | null;
      phone: string | null;
      linkedin_company: string | null;
      instagram_company: string | null;
      website: string | null;
    };
    personal_angles: {
      interests: string[];
      values: string[];
      recent_activity: string[];
      pain_points: string[];
    };
    best_angle: {
      summary: string;
      opening_hook: string;
      avoid: string[];
    };
    reachability: Array<{
      channel: string;
      url: string;
      confidence: number;
      reasoning: string;
    }>;
    publicity: Array<{ title: string; url: string; snippet: string }>;
    outreach_draft: string;
    primary_channel?:
      | "instagram"
      | "linkedin"
      | "email"
      | "phone"
      | "whatsapp";
    channel_drafts?: {
      instagram?: string | null;
      linkedin?: string | null;
      email?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
    };
    team?: {
      members: Array<{
        name: string;
        role: string | null;
        linkedin_url: string | null;
        signals: string[];
      }>;
      size_estimate: "solo" | "small" | "mid" | "large";
      structure_note: string;
    };
    recommended_contact?: {
      name: string;
      role: string | null;
      why: string;
      channel:
        | "instagram"
        | "linkedin"
        | "email"
        | "phone"
        | "whatsapp"
        | null;
      fallback?: {
        name: string;
        role: string | null;
        why: string;
      };
    };
    pitch_tier?: "starter" | "intermediate" | "veteran" | "dead";
    recommended_package?: string;
    social_depth?: {
      tiktok?: {
        url?: string;
        followers?: number;
        postsCount?: number;
        totalViews?: number;
        topViewCount?: number;
        status: string;
        reason?: string;
      };
      instagram?: {
        url?: string;
        followers?: number;
        postsCount?: number;
        status: string;
        reason?: string;
      };
      youtube?: {
        url?: string;
        followers?: number;
        postsCount?: number;
        totalViews?: number;
        status: string;
        reason?: string;
      };
      linkedin?: {
        url?: string;
        followers?: number;
        status: string;
        reason?: string;
      };
      tier: "starter" | "intermediate" | "veteran" | "dead";
      tier_reason: string;
      score: number;
    };
    generated_at: string;
  } | null;
  email?: string | null;
  website_url?: string | null;
  // Migration 0016 — post-close 6-step lifecycle checklist
  onboarding_status?: {
    intake_sent_at?: string | null;
    intake_returned_at?: string | null;
    ai_configured_at?: string | null;
    shadow_test_at?: string | null;
    live_cutover_at?: string | null;
    first_review_at?: string | null;
    notes?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface LeadsStats {
  total: number;
  hot: number; // score >= 15
  warm: number; // 10-14
  cold: number; // < 10
  byStage: Record<LeadRow["stage"], number>;
}

export async function getLeads(): Promise<LeadRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .order("icp_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadRow[];
}

export async function getLeadsStats(): Promise<LeadsStats> {
  const leads = await getLeads();
  const stats: LeadsStats = {
    total: leads.length,
    hot: 0,
    warm: 0,
    cold: 0,
    byStage: {
      discovery: 0,
      pricing: 0,
      financing: 0,
      booking: 0,
      closed_won: 0,
      closed_lost: 0,
    },
  };
  for (const l of leads) {
    const score = l.icp_score ?? 0;
    if (score >= 15) stats.hot += 1;
    else if (score >= 10) stats.warm += 1;
    else stats.cold += 1;
    stats.byStage[l.stage] += 1;
  }
  return stats;
}

// =====================================================================
// Discovery Bay
// =====================================================================

export interface DiscoveryStats {
  thisWeek: number;
  upcoming: number;
  showUpRate: number; // 0-1 (replied / scheduled)
  conversionToPricing: number;
}

// =====================================================================
// Closing Room — open deals math
// =====================================================================

export interface DealsStats {
  openCount: number;
  pipelineValueCents: number; // sum estimated_value (any open stage)
  weightedValueCents: number; // sum est_value * probability (or stage default)
  wonThisMonth: number;
  wonValueCents: number;
}

const STAGE_PROB_DEFAULT: Record<string, number> = {
  discovery: 0.1,
  pricing: 0.3,
  financing: 0.5,
  booking: 0.8,
  closed_won: 1,
  closed_lost: 0,
};

export async function getDealsStats(): Promise<DealsStats> {
  const supabase = await createClient();
  const monthStart = startOfMonth();

  const [openRes, wonRes] = await Promise.all([
    supabase
      .from("leads")
      .select("estimated_value, probability, stage")
      .in("stage", ["pricing", "financing", "booking"]),
    supabase
      .from("leads")
      .select("estimated_value, updated_at, stage")
      .eq("stage", "closed_won")
      .gte("updated_at", monthStart),
  ]);

  let pipelineCents = 0;
  let weightedCents = 0;
  for (const r of openRes.data ?? []) {
    const v = Math.round(Number(r.estimated_value ?? 0) * 100);
    const p = r.probability ?? STAGE_PROB_DEFAULT[r.stage] ?? 0;
    pipelineCents += v;
    weightedCents += Math.round(v * p);
  }

  let wonCents = 0;
  for (const r of wonRes.data ?? [])
    wonCents += Math.round(Number(r.estimated_value ?? 0) * 100);

  return {
    openCount: openRes.data?.length ?? 0,
    pipelineValueCents: pipelineCents,
    weightedValueCents: weightedCents,
    wonThisMonth: wonRes.data?.length ?? 0,
    wonValueCents: wonCents,
  };
}

// =====================================================================
// Performance Analytics
// =====================================================================

export interface ContentPostRow {
  id: string;
  platform: "tiktok" | "instagram" | "youtube" | "linkedin";
  post_url: string | null;
  title: string | null;
  posted_at: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  link_clicks: number | null;
  created_at: string;
}

export interface ContentStats {
  postsThisMonth: number;
  totalViewsThisMonth: number;
  bestPost: { title: string | null; platform: string; views: number } | null;
  avgEngagement: number; // 0-1
}

export async function getContentPosts(limit = 100): Promise<ContentPostRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_posts")
    .select("*")
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as ContentPostRow[];
}

export async function getContentStats(): Promise<ContentStats> {
  const posts = await getContentPosts();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthPosts = posts.filter(
    (p) => p.posted_at && new Date(p.posted_at) >= monthStart,
  );
  const totalViews = monthPosts.reduce((s, p) => s + (p.views ?? 0), 0);
  let totalEng = 0;
  let counted = 0;
  for (const p of monthPosts) {
    const v = p.views ?? 0;
    if (v > 0) {
      const eng =
        ((p.likes ?? 0) + (p.comments ?? 0) + (p.saves ?? 0)) / v;
      totalEng += eng;
      counted += 1;
    }
  }
  const avg = counted ? totalEng / counted : 0;

  let best: ContentStats["bestPost"] = null;
  for (const p of monthPosts) {
    if (!best || (p.views ?? 0) > best.views) {
      best = {
        title: p.title,
        platform: p.platform,
        views: p.views ?? 0,
      };
    }
  }

  return {
    postsThisMonth: monthPosts.length,
    totalViewsThisMonth: totalViews,
    bestPost: best,
    avgEngagement: avg,
  };
}

// =====================================================================
// Social Channel Stats (YouTube auto-refresh)
// =====================================================================

export interface ChannelStatsSnapshot {
  id: string;
  platform: "youtube" | "instagram" | "tiktok" | "linkedin";
  handle: string | null;
  channel_id: string | null;
  subscribers: number | null;
  total_views: number | null;
  video_count: number | null;
  fetched_at: string;
}

export interface ChannelStatsView {
  latest: ChannelStatsSnapshot | null;
  previous: ChannelStatsSnapshot | null;
  deltaSubscribers: number | null;
  deltaTotalViews: number | null;
  deltaVideoCount: number | null;
  deltaSinceDays: number | null;
}

export async function getChannelStatsView(
  platform: ChannelStatsSnapshot["platform"] = "youtube",
  handle?: string,
): Promise<ChannelStatsView> {
  const supabase = await createClient();
  let q = supabase
    .from("social_channel_stats")
    .select(
      "id, platform, handle, channel_id, subscribers, total_views, video_count, fetched_at",
    )
    .eq("platform", platform);
  if (handle) q = q.eq("handle", handle);
  const { data } = await q
    .order("fetched_at", { ascending: false })
    .limit(2);

  const rows = (data ?? []) as ChannelStatsSnapshot[];
  const latest = rows[0] ?? null;
  const previous = rows[1] ?? null;

  const sub = (k: keyof ChannelStatsSnapshot) =>
    latest && previous && latest[k] != null && previous[k] != null
      ? (latest[k] as number) - (previous[k] as number)
      : null;

  const deltaSinceDays =
    latest && previous
      ? Math.max(
          0,
          Math.round(
            (new Date(latest.fetched_at).getTime() -
              new Date(previous.fetched_at).getTime()) /
              86_400_000,
          ),
        )
      : null;

  return {
    latest,
    previous,
    deltaSubscribers: sub("subscribers"),
    deltaTotalViews: sub("total_views"),
    deltaVideoCount: sub("video_count"),
    deltaSinceDays,
  };
}

export async function getChannelStatsByHandles(
  platform: ChannelStatsSnapshot["platform"],
  handles: string[],
): Promise<Array<{ handle: string; view: ChannelStatsView }>> {
  const out: Array<{ handle: string; view: ChannelStatsView }> = [];
  for (const h of handles) {
    out.push({ handle: h, view: await getChannelStatsView(platform, h) });
  }
  return out;
}

// =====================================================================
// Revenue Engine — daily health dashboard
// =====================================================================

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  conversionFromPrev: number | null; // 0-1, vs previous step
  conversionFromTop: number; // 0-1, vs first step
}

export interface StuckDeal {
  id: string;
  name: string;
  stage: LeadRow["stage"];
  daysStuck: number;
  estimatedValue: number | null;
  niche: LeadRow["niche"];
}

export interface ActionItem {
  id: string;
  title: string;
  reason: string;
  priority: number; // 0-100, higher = more urgent
  leadId?: string;
  href?: string;
}

export interface WeekActivity {
  outreach: number;
  outreachGoal: number;
  discoveries: number;
  discoveriesGoal: number;
  replies: number;
  replyRate: number; // 0-1
  outreachStreakDays: number;
}

export interface RevenueTrajectory {
  currentMrrCents: number;
  goalMrrCents: number;
  growthPaketMrrCents: number; // 1.497€/mj
  clientsNeeded: number; // active clients to hit goal
  daysToGoal: number;
  weeksToGoal: number;
  newClientsPerWeekRequired: number; // pace
  paceRequired: { discoveries: number; outreach: number }; // per week
  pctToGoal: number; // 0-1
  goalDate: string; // ISO yyyy-mm-dd 6 months from start
}

export interface RevenueHealth {
  score: number; // 0-100
  components: Array<{ key: string; label: string; max: number; got: number }>;
  topLeak: string | null;
  trajectory: RevenueTrajectory;
  funnel: FunnelStep[];
  thisWeek: WeekActivity;
  stuckDeals: StuckDeal[];
  topActions: ActionItem[];
}

// Stage age threshold (days) before a deal is considered "stuck"
const STUCK_DAYS: Record<LeadRow["stage"], number> = {
  discovery: 14,
  pricing: 7,
  financing: 10,
  booking: 5,
  closed_won: 999,
  closed_lost: 999,
};

// Goal anchor: 6 months from outreach campaign start (2026-05-09)
const GOAL_ANCHOR = new Date("2026-11-09T00:00:00Z");
const GROWTH_PAKET_MRR_CENTS = 1_497_00;

export async function getRevenueHealth(): Promise<RevenueHealth> {
  const supabase = await createClient();
  const weekStart = startOfWeek();
  const now = Date.now();

  const [
    leadsRes,
    outreachWeekRes,
    inboundWeekRes,
    clientsMrrRes,
    prospectsRes,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, name, stage, niche, estimated_value, probability, discovery_at, discovery_outcome, updated_at, created_at, icp_score, next_action, next_action_date",
      ),
    supabase
      .from("outreach")
      .select("status, sent_at, lead_id")
      .gte("sent_at", weekStart),
    supabase
      .from("inbound_messages")
      .select("id, lead_id, received_at, status")
      .gte("received_at", weekStart),
    supabase
      .from("clients")
      .select("monthly_revenue")
      .eq("status", "active"),
    supabase
      .from("leads")
      .select("id, icp_score")
      .eq("stage", "discovery")
      .is("discovery_at", null),
  ]);

  const leads = (leadsRes.data ?? []) as LeadRow[];
  const outreach = outreachWeekRes.data ?? [];
  const inbound = inboundWeekRes.data ?? [];
  const clients = clientsMrrRes.data ?? [];
  const prospects = prospectsRes.data ?? [];

  // ---- Trajectory
  const currentMrrCents = clients.reduce(
    (s, c) => s + Math.round(Number(c.monthly_revenue ?? 0) * 100),
    0,
  );
  const remainingMrr = Math.max(GOAL_MRR_CENTS - currentMrrCents, 0);
  const clientsNeeded = Math.ceil(remainingMrr / GROWTH_PAKET_MRR_CENTS);
  const daysToGoal = Math.max(
    1,
    Math.ceil((GOAL_ANCHOR.getTime() - now) / 86_400_000),
  );
  const weeksToGoal = Math.max(1, Math.ceil(daysToGoal / 7));
  const newClientsPerWeekRequired = Math.ceil(clientsNeeded / weeksToGoal);
  // Reverse-funnel pace assumptions (industry-ish for cold B2B):
  //   discovery → close ≈ 25%   |   reply → discovery ≈ 50%   |
  //   reply rate ≈ 8%
  const discoveriesPerWeek = Math.ceil(newClientsPerWeekRequired / 0.25);
  const outreachPerWeek = Math.ceil(discoveriesPerWeek / 0.5 / 0.08);

  // ---- Funnel
  const cold = prospects.length;
  const dmSentLeadIds = new Set(
    (outreach as Array<{ lead_id: string | null }>)
      .map((o) => o.lead_id)
      .filter(Boolean) as string[],
  );
  const dmSent = dmSentLeadIds.size;
  const replied = leads.filter(
    (l) =>
      inbound.some((m) => m.lead_id === l.id) ||
      // Also: any outreach for this lead with status replied (rough proxy)
      (outreach as Array<{ status?: string; lead_id?: string | null }>).some(
        (o) => o.lead_id === l.id && o.status === "replied",
      ),
  ).length;
  const discoveryBooked = leads.filter((l) => l.discovery_at).length;
  const discoveryDone = leads.filter(
    (l) =>
      l.discovery_at &&
      l.discovery_outcome &&
      l.discovery_outcome !== "no_show",
  ).length;
  const pricingPlus = leads.filter((l) =>
    ["pricing", "financing", "booking"].includes(l.stage),
  ).length;
  const wonAll = leads.filter((l) => l.stage === "closed_won").length;

  const stepCounts = [
    { key: "cold", label: "Cold prospect", count: cold },
    { key: "dm", label: "Outreach poslan", count: dmSent },
    { key: "reply", label: "Reply", count: replied },
    { key: "disc_booked", label: "Discovery booked", count: discoveryBooked },
    { key: "disc_done", label: "Discovery done", count: discoveryDone },
    { key: "pricing", label: "Pricing+", count: pricingPlus },
    { key: "won", label: "Closed won", count: wonAll },
  ];
  const top = stepCounts[0].count || 1;
  const funnel: FunnelStep[] = stepCounts.map((s, i) => {
    const prev = i > 0 ? stepCounts[i - 1].count : null;
    return {
      ...s,
      conversionFromPrev:
        prev != null && prev > 0 ? s.count / prev : prev === 0 ? 0 : null,
      conversionFromTop: top > 0 ? s.count / top : 0,
    };
  });

  // ---- This week
  const outreachThisWeek = (outreach as unknown[]).length;
  const repliesThisWeek = (
    outreach as Array<{ status?: string }>
  ).filter((o) => o.status === "replied").length;
  const discoveriesThisWeek = leads.filter(
    (l) => l.discovery_at && new Date(l.discovery_at) >= new Date(weekStart),
  ).length;
  const replyRate = outreachThisWeek
    ? repliesThisWeek / outreachThisWeek
    : 0;

  // Streak: how many consecutive days (looking back) had >=1 outreach sent
  const outreachByDay = new Map<string, number>();
  for (const o of outreach as Array<{ sent_at: string }>) {
    const d = o.sent_at.slice(0, 10);
    outreachByDay.set(d, (outreachByDay.get(d) ?? 0) + 1);
  }
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    if ((outreachByDay.get(d) ?? 0) > 0) streak += 1;
    else break;
  }

  const thisWeek: WeekActivity = {
    outreach: outreachThisWeek,
    outreachGoal: outreachPerWeek,
    discoveries: discoveriesThisWeek,
    discoveriesGoal: discoveriesPerWeek,
    replies: repliesThisWeek,
    replyRate,
    outreachStreakDays: streak,
  };

  // ---- Stuck deals
  const stuckDeals: StuckDeal[] = [];
  for (const l of leads) {
    if (l.stage === "closed_won" || l.stage === "closed_lost") continue;
    const updatedAt = new Date(l.updated_at).getTime();
    const days = Math.floor((now - updatedAt) / 86_400_000);
    if (days >= STUCK_DAYS[l.stage]) {
      stuckDeals.push({
        id: l.id,
        name: l.name,
        stage: l.stage,
        daysStuck: days,
        estimatedValue: l.estimated_value,
        niche: l.niche,
      });
    }
  }
  stuckDeals.sort((a, b) => b.daysStuck - a.daysStuck);

  // ---- Top 3 actions
  const actions: ActionItem[] = [];
  // 1. Upcoming discoveries needing prep (priority based on time-until)
  const upcomingDiscoveries = leads
    .filter(
      (l) => l.discovery_at && new Date(l.discovery_at).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.discovery_at!).getTime() -
        new Date(b.discovery_at!).getTime(),
    );
  for (const l of upcomingDiscoveries.slice(0, 1)) {
    const hoursUntil = Math.round(
      (new Date(l.discovery_at!).getTime() - now) / 3_600_000,
    );
    actions.push({
      id: `disc-${l.id}`,
      title: `Pripremi brief: ${l.name}`,
      reason:
        hoursUntil <= 48
          ? `Discovery za ${hoursUntil}h — Brief Room`
          : `Discovery za ${Math.round(hoursUntil / 24)}d`,
      priority: hoursUntil <= 48 ? 95 : 70,
      leadId: l.id,
    });
  }
  // 2. Outreach gap: if behind on weekly pace, surface as #1
  if (outreachThisWeek < outreachPerWeek) {
    const remaining = outreachPerWeek - outreachThisWeek;
    actions.push({
      id: "outreach-gap",
      title: `Pošalji ${remaining} outreach poruka`,
      reason: `Tjedan: ${outreachThisWeek}/${outreachPerWeek}. Pace za 30K€.`,
      priority: 90,
    });
  }
  // 3. Stuck deals: top stuck by value
  for (const sd of stuckDeals.slice(0, 1)) {
    actions.push({
      id: `stuck-${sd.id}`,
      title: `Pingaj: ${sd.name}`,
      reason: `${sd.stage} ${sd.daysStuck} dana — re-engage ili close-lost`,
      priority: 80,
      leadId: sd.id,
    });
  }
  // 4. Hot leads without next_action_date
  const orphanHot = leads
    .filter(
      (l) =>
        (l.icp_score ?? 0) >= 15 &&
        !l.next_action_date &&
        l.stage !== "closed_won" &&
        l.stage !== "closed_lost",
    )
    .slice(0, 1);
  for (const l of orphanHot) {
    actions.push({
      id: `next-${l.id}`,
      title: `Postavi next action: ${l.name}`,
      reason: `Hot lead (${l.icp_score}/20) bez sljedećeg poteza`,
      priority: 60,
      leadId: l.id,
    });
  }
  actions.sort((a, b) => b.priority - a.priority);
  const topActions = actions.slice(0, 3);

  // ---- Health Score (0-100)
  const components = [
    {
      key: "outreach_pace",
      label: "Outreach pace",
      max: 30,
      got: Math.min(
        30,
        Math.round((outreachThisWeek / Math.max(1, outreachPerWeek)) * 30),
      ),
    },
    {
      key: "discovery_pace",
      label: "Discovery pace",
      max: 25,
      got: Math.min(
        25,
        Math.round(
          (discoveriesThisWeek / Math.max(1, discoveriesPerWeek)) * 25,
        ),
      ),
    },
    {
      key: "pipeline_depth",
      label: "Pipeline depth",
      max: 20,
      got: Math.min(20, pricingPlus * 5), // 4 deals in pricing+ = full
    },
    {
      key: "no_rot",
      label: "No-rot (stuck deals)",
      max: 15,
      got: Math.max(0, 15 - stuckDeals.length * 5),
    },
    {
      key: "reply_rate",
      label: "Reply rate health",
      max: 10,
      got:
        outreachThisWeek === 0
          ? 0
          : Math.min(10, Math.round((replyRate / 0.08) * 10)),
    },
  ];
  const score = components.reduce((s, c) => s + c.got, 0);

  const weakest = [...components].sort(
    (a, b) => a.got / a.max - b.got / b.max,
  )[0];
  const topLeak =
    weakest && weakest.got / weakest.max < 0.5
      ? `Najveći leak: ${weakest.label} (${weakest.got}/${weakest.max})`
      : null;

  const trajectory: RevenueTrajectory = {
    currentMrrCents,
    goalMrrCents: GOAL_MRR_CENTS,
    growthPaketMrrCents: GROWTH_PAKET_MRR_CENTS,
    clientsNeeded,
    daysToGoal,
    weeksToGoal,
    newClientsPerWeekRequired,
    paceRequired: {
      discoveries: discoveriesPerWeek,
      outreach: outreachPerWeek,
    },
    pctToGoal: GOAL_MRR_CENTS
      ? Math.min(1, currentMrrCents / GOAL_MRR_CENTS)
      : 0,
    goalDate: GOAL_ANCHOR.toISOString().slice(0, 10),
  };

  return {
    score,
    components,
    topLeak,
    trajectory,
    funnel,
    thisWeek,
    stuckDeals: stuckDeals.slice(0, 5),
    topActions,
  };
}

// =====================================================================
// Competitor Watch
// =====================================================================

export interface CompetitorRow {
  id: string;
  name: string;
  url: string | null;
  notes: string | null;
  last_check_at: string | null;
  created_at: string;
}

export interface CompetitorUpdateRow {
  id: string;
  competitor_id: string;
  observation: string;
  url: string | null;
  created_at: string;
}

export interface CompetitorStats {
  count: number;
  updatesThisWeek: number;
  staleSinceDays: number; // longest "since last_check_at"
}

export async function getCompetitors(): Promise<CompetitorRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("competitors")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as CompetitorRow[];
}

export async function getCompetitorUpdates(
  limit = 50,
): Promise<CompetitorUpdateRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("competitor_updates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CompetitorUpdateRow[];
}

export async function getCompetitorStats(): Promise<CompetitorStats> {
  const supabase = await createClient();
  const weekStart = startOfWeek();
  const [comps, updRes] = await Promise.all([
    getCompetitors(),
    supabase
      .from("competitor_updates")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart),
  ]);

  let oldest = 0;
  const now = Date.now();
  for (const c of comps) {
    if (!c.last_check_at) {
      oldest = Math.max(oldest, 99);
      continue;
    }
    const days = Math.floor(
      (now - new Date(c.last_check_at).getTime()) / 86_400_000,
    );
    oldest = Math.max(oldest, days);
  }

  return {
    count: comps.length,
    updatesThisWeek: updRes.count ?? 0,
    staleSinceDays: oldest,
  };
}

// =====================================================================
// Calendar / Tasks
// =====================================================================

export interface TaskRow {
  id: string;
  title: string;
  room: string | null;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  client_id: string | null;
  lead_id: string | null;
  created_at: string;
}

export interface TasksStats {
  todayCount: number;
  weekCount: number;
  overdue: number;
  doneToday: number;
}

export async function getTasks(): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as TaskRow[];
}

export async function getTasksStats(): Promise<TasksStats> {
  const supabase = await createClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const todayStartIso = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).toISOString();

  const [todayRes, weekRes, overdueRes, doneRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("due_date", todayStr)
      .neq("status", "done"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .gte("due_date", todayStr)
      .lte("due_date", weekEndStr)
      .neq("status", "done"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .lt("due_date", todayStr)
      .neq("status", "done"),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "done")
      .gte("completed_at", todayStartIso),
  ]);

  return {
    todayCount: todayRes.count ?? 0,
    weekCount: weekRes.count ?? 0,
    overdue: overdueRes.count ?? 0,
    doneToday: doneRes.count ?? 0,
  };
}

// =====================================================================
// Weekly Reports
// =====================================================================

export interface WeeklyReportRow {
  id: string;
  client_id: string;
  week_start: string;
  content: string | null;
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportsStats {
  dueThisWeek: number;
  sentThisWeek: number;
  pendingThisWeek: number;
}

export async function getWeeklyReports(): Promise<WeeklyReportRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("week_start", { ascending: false })
    .order("client_id", { ascending: true });
  return (data ?? []) as WeeklyReportRow[];
}

export function getCurrentWeekStart(): string {
  const d = new Date();
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toISOString().slice(0, 10);
}

export async function getReportsStats(): Promise<ReportsStats> {
  const ws = getCurrentWeekStart();
  const supabase = await createClient();
  const [activeRes, sentRes, draftRes] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("weekly_reports")
      .select("*", { count: "exact", head: true })
      .eq("week_start", ws)
      .eq("status", "sent"),
    supabase
      .from("weekly_reports")
      .select("*", { count: "exact", head: true })
      .eq("week_start", ws)
      .eq("status", "draft"),
  ]);

  const due = activeRes.count ?? 0;
  const sent = sentRes.count ?? 0;
  const drafts = draftRes.count ?? 0;
  return {
    dueThisWeek: due,
    sentThisWeek: sent,
    pendingThisWeek: Math.max(due - sent, 0) + drafts,
  };
}

export async function getDiscoveryStats(): Promise<DiscoveryStats> {
  const supabase = await createClient();
  const weekStart = startOfWeek();
  const now = new Date().toISOString();

  const [thisWeekRes, upcomingRes, allRecentRes, pricingRes] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("discovery_at", weekStart),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("discovery_at", now),
    supabase
      .from("leads")
      .select("discovery_outcome")
      .gte("discovery_at", weekStart)
      .lt("discovery_at", now),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("discovery_at", weekStart)
      .in("stage", ["pricing", "financing", "booking", "closed_won"]),
  ]);

  const past = allRecentRes.data ?? [];
  const showed = past.filter(
    (r) => r.discovery_outcome && r.discovery_outcome !== "no_show",
  ).length;
  const showUpRate = past.length ? showed / past.length : 0;

  return {
    thisWeek: thisWeekRes.count ?? 0,
    upcoming: upcomingRes.count ?? 0,
    showUpRate,
    conversionToPricing: pricingRes.count ?? 0,
  };
}
