/**
 * Inngest webhook endpoint — Inngest cloud (or local dev server) calls
 * this URL to introspect and execute registered functions.
 *
 * In production, configure your Inngest app to point at:
 *   https://lamon-hq.vercel.app/api/inngest
 *
 * For local dev, run:
 *   npx inngest-cli@latest dev
 * Then set INNGEST_DEV=1 in .env.local.
 */

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { agentResearch } from "@/lib/inngest/functions/agentResearch";
import { holmesPipeline } from "@/lib/inngest/functions/holmesPipeline";
import { dailyExpenseCron } from "@/lib/inngest/functions/dailyExpenseCron";
import { raidScanner } from "@/lib/inngest/functions/raidScanner";
import { autoReplyPoller } from "@/lib/inngest/functions/autoReplyPoller";
import { auditorCron } from "@/lib/inngest/functions/auditorCron";
import { telegramUserbotPoller } from "@/lib/inngest/functions/telegramUserbotPoller";
import { nicheHunterCron } from "@/lib/inngest/functions/nicheHunterCron";
import { videoIntelImport } from "@/lib/inngest/functions/videoIntelImport";
import { scriptGenerator } from "@/lib/inngest/functions/scriptGenerator";
import { clinicCallerCron } from "@/lib/inngest/functions/clinicCallerCron";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    agentResearch,
    holmesPipeline,
    dailyExpenseCron,
    raidScanner,
    autoReplyPoller,
    auditorCron,
    telegramUserbotPoller,
    nicheHunterCron,
    videoIntelImport,
    scriptGenerator,
    clinicCallerCron,
  ],
  // Allow long-running steps without Vercel cutting them off — Inngest
  // takes over execution; this route only sends/receives step signals.
});
