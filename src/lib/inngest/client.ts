/**
 * Inngest client — singleton for sending events from server actions and
 * registering long-running functions that run outside Vercel's 60s
 * serverless timeout.
 */

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "lamon-hq",
  name: "Lamon HQ",
});
