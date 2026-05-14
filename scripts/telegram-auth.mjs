/**
 * One-time Telegram userbot auth — generates a session string for
 * @lamonleonardo. Uses GramJS MTProto + file-based code submission so
 * the script can be orchestrated remotely (Telegram sends SMS to
 * Leonardo's phone; he sends the code via chat; the orchestrator
 * writes it to .telegram_code; this script picks it up).
 *
 * Run from repo root:
 *   TELEGRAM_PHONE="+385XXXXXXXX" node scripts/telegram-auth.mjs
 *
 * The script will:
 *   1. Connect via api_id + api_hash from .env.local
 *   2. Send auth code request → Telegram sends SMS to TELEGRAM_PHONE
 *   3. Wait for /tmp/telegram_code (or .telegram_code in cwd) to appear
 *   4. Read the code, submit it, complete auth
 *   5. If 2FA enabled, also wait for .telegram_2fa file
 *   6. Print session string to stdout
 *
 * The session string then goes into .env.local as TELEGRAM_SESSION
 * (and into Vercel env vars for production).
 */

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import fs from "node:fs";
import path from "node:path";

// --- 1. Load credentials from .env.local ---
const envPath = path.resolve("./.env.local");
const envText = fs.readFileSync(envPath, "utf8");
function getEnv(key) {
  const m = envText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}
const apiId = parseInt(getEnv("TELEGRAM_API_ID"), 10);
const apiHash = getEnv("TELEGRAM_API_HASH");
const phone = process.env.TELEGRAM_PHONE;

if (!apiId || !apiHash) {
  console.error("ERR: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env.local");
  process.exit(1);
}
if (!phone) {
  console.error("ERR: TELEGRAM_PHONE env var required (e.g. TELEGRAM_PHONE=+385917890084)");
  process.exit(1);
}

// --- 2. File-based code/2fa submission paths ---
const codeFile = path.resolve("./.telegram_code");
const twoFaFile = path.resolve("./.telegram_2fa");

async function waitForFile(filePath, label, timeoutMs = 600_000) {
  const start = Date.now();
  while (!fs.existsSync(filePath)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timeout waiting for ${label} (${filePath})`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  const content = fs.readFileSync(filePath, "utf8").trim();
  fs.unlinkSync(filePath); // single-use
  return content;
}

// --- 3. Connect + auth ---
console.log("[telegram-auth] Connecting to Telegram MTProto...");
const session = new StringSession(""); // empty → fresh auth
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

await client.start({
  phoneNumber: () => phone,
  phoneCode: async () => {
    console.log(
      `[telegram-auth] SMS code request sent to ${phone}.\n` +
      `[telegram-auth] Waiting for code to appear in: ${codeFile}\n` +
      `[telegram-auth] (Orchestrator: write the 5-digit SMS code to that file)`,
    );
    return waitForFile(codeFile, "SMS code");
  },
  password: async () => {
    console.log(
      `[telegram-auth] 2FA password required.\n` +
      `[telegram-auth] Waiting for password in: ${twoFaFile}\n` +
      `[telegram-auth] (If no 2FA, this won't be called.)`,
    );
    return waitForFile(twoFaFile, "2FA password");
  },
  onError: (err) => {
    console.error("[telegram-auth] Error:", err);
  },
});

const sessionString = client.session.save();
console.log("\n========== TELEGRAM_SESSION ==========");
console.log(sessionString);
console.log("======================================\n");
console.log("[telegram-auth] Auth complete. Save the session string above to .env.local + Vercel env.");

await client.disconnect();
process.exit(0);
