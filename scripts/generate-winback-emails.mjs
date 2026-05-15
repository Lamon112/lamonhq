/**
 * Win-back email generator — €20 legacy → €50 premium migracija.
 *
 * Cilj: 47 legacy €20 članova SideHustle premium Skool grupe →
 * migrirati na €50/mj (single tier). Leonardo eliminirao €20 plan,
 * svi MORAJU prelaziti ili otkazati.
 *
 * Pipeline:
 *   1. Read all skool_members WHERE tier = 'legacy_20' AND winback_email_sent_at IS NULL
 *   2. Generate personalized email per member using Claude Sonnet
 *      (uses display_name, joined_at, posts_count for personalization)
 *   3. Output: outputs/winback-emails-2026-05-15.md (preview)
 *      + JSON file Leonardo can import to email tool (Mailchimp/manual)
 *   4. Mark sent: skool_members.winback_email_sent_at = NOW()
 *      (only when --send-mark flag passed; default = preview only)
 *
 * Usage:
 *   node scripts/generate-winback-emails.mjs              # preview only
 *   node scripts/generate-winback-emails.mjs --send-mark  # mark as sent
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANTHROPIC_KEY) {
  console.error("Missing env (SUPABASE / ANTHROPIC).");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const SYSTEM_PROMPT = `Ti si Leonardo Lamon, founder SideHustle premium grupe (skool.com/sidehustlehr).

Pišeš osobni email legacy €20/mj članu koji još uvijek plaća stari plan. Cilj: migrirati ga na novi €50/mj plan ILI dobiti graceful otkaz (ne ljutiti ljude).

# Kontekst za member-a
- Plaća €20/mj već dugo (legacy plan)
- Novi plan je €50/mj (single tier — bez basic/advanced split-a više)
- Ako ne migrira → otkažemo mu pretplatu krajem mjeseca

# Glas Leonarda
- Direktan, peer-level, NIKAD korporativan
- Iskreni "evo što se dogodilo" — ne sales-y
- Hvala za ranu podršku
- Nudi 30 dana grace period (proba €50/mj, ako se ne svidi → puna refund)
- Bez submissive jezika ("volio bih te zamoliti", "ako biste bili tako ljubazni")
- Hrvatski, sve u euri (NIKAD kune)

# Output: STRIKTNO JSON ovog formata
{
  "subject": "Subject linija (do 60 chars)",
  "body": "Tijelo emaila (200-300 riječi, plain text, no markdown)",
  "rationale": "Zašto ova specifična personalizacija (1-2 rečenice)"
}

Bez markdown fence. Samo JSON.`;

const MIGRATION_LINK = "https://www.skool.com/sidehustlehr/about";

function buildUserPrompt(member) {
  return `Generiraj win-back email za ovog člana:

Ime: ${member.display_name ?? "—"}
Username: @${member.skool_username ?? "—"}
Joined: ${member.joined_at ?? "—"}
Last active: ${member.last_active_at ?? "—"}
Aktivnost: ${member.posts_count ?? 0} postova, ${member.comments_count ?? 0} komentara, ${member.likes_count ?? 0} likeova
Lokacija: ${member.city ?? ""} ${member.country ?? ""}

Personaliziraj na temelju aktivnosti:
- Visoka aktivnost (10+ post/koment) → "vidim koliko si aktivan, želim te zadržati"
- Niska/nula aktivnost → "nadam se da si dobio vrijednost, nudim ti šansu da iskoristiš sve nove materijale"
- Jako stari joined_at → "podržavaš nas od početka, hvala"

Migration link: ${MIGRATION_LINK}

Vrati JSON.`;
}

async function generateEmail(member) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM_PROMPT }],
    messages: [{ role: "user", content: buildUserPrompt(member) }],
  });
  const block = message.content.find((b) => b.type === "text");
  const raw = block?.type === "text" ? block.text.trim() : "{}";
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    const cost =
      (message.usage.input_tokens / 1_000_000) * 3 +
      (message.usage.output_tokens / 1_000_000) * 15;
    return { ...parsed, cost };
  } catch (e) {
    console.error(`JSON parse failed for ${member.skool_username}:`, e);
    return null;
  }
}

async function main() {
  const sendMark = process.argv.includes("--send-mark");

  const { data: members, error } = await sb
    .from("skool_members")
    .select("*")
    .eq("tier", "legacy_20")
    .is("winback_email_sent_at", null);

  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }

  console.log(`Found ${members?.length ?? 0} legacy €20 members without winback email`);
  if (!members || members.length === 0) process.exit(0);

  const generated = [];
  let totalCost = 0;

  for (const m of members) {
    process.stdout.write(`Generating for @${m.skool_username ?? m.id.slice(0, 8)}... `);
    const email = await generateEmail(m);
    if (email) {
      generated.push({ member: m, email });
      totalCost += email.cost ?? 0;
      console.log(`OK ($${(email.cost ?? 0).toFixed(4)})`);
    } else {
      console.log("FAIL");
    }
    // soft rate limit — ~10 RPS limit on Anthropic Sonnet 4.5
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✓ Generated ${generated.length} / ${members.length} emails`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);

  // Write Markdown preview
  const today = new Date().toISOString().slice(0, 10);
  const mdPath = `outputs/winback-emails-${today}.md`;
  const mdLines = [
    `# Win-back emails — €20 → €50 migracija`,
    `_Generirano: ${new Date().toISOString()}_`,
    `_Članova: ${generated.length} / ${members.length}_`,
    `_Cost: $${totalCost.toFixed(2)}_`,
    `_Migration link: ${MIGRATION_LINK}_`,
    "",
    `---`,
    "",
  ];
  for (const { member, email } of generated) {
    mdLines.push(`## ${member.display_name ?? member.skool_username} (${member.email ?? "no email"})`);
    mdLines.push(`_Joined: ${member.joined_at ?? "—"} · Posts: ${member.posts_count ?? 0}_`);
    mdLines.push("");
    mdLines.push(`**Subject**: ${email.subject}`);
    mdLines.push("");
    mdLines.push("```");
    mdLines.push(email.body);
    mdLines.push("```");
    mdLines.push("");
    mdLines.push(`_Rationale: ${email.rationale}_`);
    mdLines.push("");
    mdLines.push("---");
    mdLines.push("");
  }
  fs.writeFileSync(mdPath, mdLines.join("\n"));
  console.log(`\nPreview: ${mdPath}`);

  // Also write JSON for programmatic email tool ingestion
  const jsonPath = `outputs/winback-emails-${today}.json`;
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      generated.map(({ member, email }) => ({
        to: member.email,
        name: member.display_name,
        skool_user_id: member.skool_user_id,
        subject: email.subject,
        body: email.body,
      })),
      null,
      2,
    ),
  );
  console.log(`JSON:    ${jsonPath}`);

  if (sendMark) {
    const ids = generated.map((g) => g.member.id);
    const { error: updErr } = await sb
      .from("skool_members")
      .update({
        winback_email_sent_at: new Date().toISOString(),
        winback_email_template: "winback_v1_sonnet",
      })
      .in("id", ids);
    if (updErr) console.error("Mark-sent update failed:", updErr);
    else console.log(`✓ Marked ${ids.length} as winback_email_sent`);
  } else {
    console.log("\n(--send-mark not passed; DB not updated. Re-run with --send-mark after manually sending.)");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
