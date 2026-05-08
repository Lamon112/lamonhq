import { ResourceBar } from "@/components/ResourceBar";
import { Building } from "@/components/Building";
import { ActionBar } from "@/components/ActionBar";
import { ActivityFeed } from "@/components/ActivityFeed";
import { DailyBriefing } from "@/components/DailyBriefing";
import { getRecentActivity } from "@/app/actions/activityLog";
import { getXpStats } from "@/app/actions/xp";
import { getTodaysBriefing } from "@/app/actions/briefing";
import { createClient } from "@/lib/supabase/server";
import {
  getHQStats,
  getOutreachStats,
  getOutreachList,
  getClients,
  getClientsStats,
  getLeads,
  getLeadsStats,
  getDiscoveryStats,
  getDealsStats,
  getContentPosts,
  getContentStats,
  getCompetitors,
  getCompetitorUpdates,
  getCompetitorStats,
  getTasks,
  getTasksStats,
  getWeeklyReports,
  getReportsStats,
  getCurrentWeekStart,
} from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HQPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const [
    stats,
    outreachStats,
    outreachList,
    clientList,
    clientStats,
    leadList,
    leadStats,
    discoveryStats,
    dealsStats,
    contentList,
    contentStats,
    competitorList,
    competitorUpdates,
    competitorStats,
    taskList,
    taskStats,
    reportList,
    reportStats,
    activityRows,
    xpStats,
    todaysBriefing,
  ] = await Promise.all([
    getHQStats(),
    getOutreachStats(),
    getOutreachList(),
    getClients(),
    getClientsStats(),
    getLeads(),
    getLeadsStats(),
    getDiscoveryStats(),
    getDealsStats(),
    getContentPosts(),
    getContentStats(),
    getCompetitors(),
    getCompetitorUpdates(),
    getCompetitorStats(),
    getTasks(),
    getTasksStats(),
    getWeeklyReports(),
    getReportsStats(),
    getRecentActivity(40),
    getXpStats(),
    getTodaysBriefing(),
  ]);

  const userMeta = {
    email: user?.email ?? null,
    fullName:
      (user?.user_metadata?.full_name as string | undefined) ??
      (user?.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      (user?.user_metadata?.avatar_url as string | undefined) ??
      (user?.user_metadata?.picture as string | undefined) ??
      null,
  };

  return (
    <>
      <ResourceBar stats={stats} xp={xpStats} user={userMeta} />
      <DailyBriefing initialBriefing={todaysBriefing} />
      <Building
        data={{
          outreach: { list: outreachList, stats: outreachStats },
          clients: { list: clientList, stats: clientStats },
          leads: { list: leadList, stats: leadStats },
          discovery: { stats: discoveryStats },
          deals: { stats: dealsStats },
          content: { list: contentList, stats: contentStats },
          competitor: {
            list: competitorList,
            updates: competitorUpdates,
            stats: competitorStats,
          },
          tasks: { list: taskList, stats: taskStats },
          reports: {
            list: reportList,
            stats: reportStats,
            weekStart: getCurrentWeekStart(),
          },
        }}
      />
      <ActionBar />
      <ActivityFeed initialRows={activityRows} />
    </>
  );
}
