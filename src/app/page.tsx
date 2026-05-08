import { ResourceBar } from "@/components/ResourceBar";
import { Building } from "@/components/Building";
import { ActionBar } from "@/components/ActionBar";
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
  ] = await Promise.all([
    getHQStats(),
    getOutreachStats(),
    getOutreachList(),
    getClients(),
    getClientsStats(),
    getLeads(),
    getLeadsStats(),
    getDiscoveryStats(),
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
      <ResourceBar stats={stats} user={userMeta} />
      <Building
        data={{
          outreach: { list: outreachList, stats: outreachStats },
          clients: { list: clientList, stats: clientStats },
          leads: { list: leadList, stats: leadStats },
          discovery: { stats: discoveryStats },
        }}
      />
      <ActionBar />
    </>
  );
}
