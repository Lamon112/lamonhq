/**
 * Telegram broadcast — Quiz Funnel launch announcement.
 *
 * Posts a single message to t.me/sidehustlehr (Leonardov public Telegram
 * group, ~5K members) introducing the new AI-powered quiz funnel.
 *
 * Intentionally NOT mass-DMs (TOS + spam-filter risk). Only posts to
 * the channel — users who already opted in see it organically.
 *
 * Usage (one-shot):
 *   node scripts/telegram-broadcast-quiz-launch.mjs
 *
 * Reads:
 *   TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION  (GramJS auth)
 *
 * Idempotency: each broadcast saves a marker file under outputs/. Re-running
 * skips if marker exists for today. Pass --force to override.
 *
 * Channel target: --channel @sidehustlehr (default) or --channel <id>
 */

import "dotenv/config";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import fs from "node:fs";
import path from "node:path";

const QUIZ_URL = "https://lamon-hq.vercel.app/quiz?utm_source=telegram&utm_campaign=launch";

const BROADCAST_BODY = `🎯 NOVO — AI Side Hustle Quiz

10 pitanja. 60 sekundi. AI ti generira osobni 30-dnevni plan.

✅ Score 0-100 (gdje si trenutno na svom putu)
✅ Top 3 prepreke koje te baš sad drže natrag
✅ Plan prilagođen TVOJIM satima, budžetu, cilju
✅ Koji case study ti odgovara (Tom 17K€/3mj, Matija 3K€/2mj, Vuk 5K€/mj…)

Probaj sada — bez maila u prvom koraku, bez login-a:
${QUIZ_URL}

PS: prvi rezultati od ljudi unutra već — netko dobio score 78, plan tačno na njegovu nišu (faceless ASMR), pokrenuo prvi video isti dan.`;

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const channelArg = args.indexOf("--channel");
  const channel = channelArg >= 0 ? args[channelArg + 1] : "@sidehustlehr";

  const apiId = parseInt(process.env.TELEGRAM_API_ID ?? "0", 10);
  const apiHash = process.env.TELEGRAM_API_HASH ?? "";
  const session = process.env.TELEGRAM_SESSION ?? "";

  if (!apiId || !apiHash || !session) {
    console.error("Missing TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_SESSION env");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const marker = path.join(
    "outputs",
    `telegram-broadcast-quiz-launch-${today}.marker`,
  );
  if (!force && fs.existsSync(marker)) {
    console.log(`Already broadcasted today (${marker}). Use --force to send anyway.`);
    process.exit(0);
  }

  console.log(`Connecting to Telegram (channel: ${channel})...`);
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  console.log("Connected. Sending broadcast...");

  const result = await client.sendMessage(channel, {
    message: BROADCAST_BODY,
    linkPreview: true,
  });

  console.log(`✓ Sent. Message ID: ${result.id}`);
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, `${new Date().toISOString()}\nmsg_id=${result.id}\n`);
  console.log(`Marker: ${marker}`);

  await client.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
