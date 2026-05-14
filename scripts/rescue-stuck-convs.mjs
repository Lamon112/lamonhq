/**
 * One-off recovery script for the 5 conversations that got stuck in
 * the duplicate-question loop before the dedupe guards landed.
 *
 * Sends a single personal recovery message + new skool-CTA PDF + skool
 * join link. After this, conversations stay in handover stage so the
 * main bot won't touch them; Leonardo takes over manually.
 *
 * Run: node scripts/rescue-stuck-convs.mjs
 */

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import fs from "node:fs";

const env = fs.readFileSync("./.env.local", "utf8");
function getEnv(k) {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

const apiId = parseInt(getEnv("TELEGRAM_API_ID"), 10);
const apiHash = getEnv("TELEGRAM_API_HASH");
const session = getEnv("TELEGRAM_SESSION");
if (!apiId || !apiHash || !session) {
  console.error("Missing Telegram env vars");
  process.exit(1);
}

// Stuck conversations (queried from Supabase before run).
const STUCK = [
  { id: 6421026272, username: "Djordjek", firstName: "Djordje" },
  { id: 2086368010, username: "ivans2210", firstName: "Ivan" },
  { id: 5117294144, username: "patrick31c", firstName: "Patrick" },
  { id: 6984919534, username: "brxnee", firstName: "𝘽" },
  { id: 8619834449, username: null, firstName: "Dino" },
];

const RECOVERY = (firstName) => `Hej${firstName ? ` ${firstName}` : ""}! 🙏

Sorry — bila je tehnička greška u našem sustavu pa sam te pitao istu stvar par puta. Vidio sam tvoje odgovore, sve je super, više se neće događati.

Šaljem ti odmah PDF — 10 Zlatnih Pravila (Viralni Content Framework):

→ https://lamon-hq.vercel.app/zlatna-knjiga.pdf

PDF je 5% posla. 95% je samostalna primjena. Najbrže ćeš stići do cilja unutar PREMIUM grupe gdje radimo svaki tjedan na ovome konkretno — €50/mj, 165 ljudi unutra, neki zarađuju i $15K+/mj.

→ Pridruži se: https://www.skool.com/sidehustlebalkan

Vidimo se unutra,
Leonardo`;

const client = new TelegramClient(
  new StringSession(session),
  apiId,
  apiHash,
  { connectionRetries: 3 },
);

await client.connect();
console.log("[rescue] Connected as @lamonleonardo");

// Resolve dialog entities (cache access_hash by user_id).
const peerByUserId = new Map();
for await (const dialog of client.iterDialogs({ limit: 200 })) {
  if (!dialog.isUser || !dialog.entity) continue;
  const idObj = dialog.entity.id;
  const numeric =
    typeof idObj === "object" && "value" in idObj
      ? Number(idObj.value)
      : typeof idObj === "object" && "toString" in idObj
        ? parseInt(idObj.toString(), 10)
        : Number(idObj);
  peerByUserId.set(numeric, dialog.entity);
}

console.log(`[rescue] Indexed ${peerByUserId.size} dialogs`);

let sent = 0;
let skipped = 0;

for (const user of STUCK) {
  const peer = peerByUserId.get(user.id);
  if (!peer) {
    console.log(
      `[rescue] SKIP ${user.firstName} (id ${user.id}) — peer not in dialogs`,
    );
    skipped++;
    continue;
  }

  try {
    const result = await client.sendMessage(peer, {
      message: RECOVERY(user.firstName),
    });
    console.log(
      `[rescue] SENT to ${user.firstName} (@${user.username ?? user.id}) — msg ${result.id}`,
    );
    sent++;
    // Throttle — Telegram allows ~30 msg/sec but we go gentle
    await new Promise((r) => setTimeout(r, 1000));
  } catch (e) {
    console.log(`[rescue] FAIL ${user.firstName}: ${e.message ?? e}`);
    skipped++;
  }
}

console.log(`\n[rescue] Done. Sent: ${sent}, Skipped: ${skipped}`);
await client.disconnect();
process.exit(0);
