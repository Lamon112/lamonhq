/**
 * Fix Špehar's dentist database — encoding repair + clean export.
 *
 * Source: C:/Users/teaml/Downloads/filtrirana_lista_svih_osim_neispravnih.xlsx
 *   1751 rows × 2 columns (Email, Ime i prezime)
 *
 * Problem: Croatian diacritics were double-encoded somewhere upstream.
 *   The UTF-8 bytes 0xC4 0x8D (which encode "č") were misinterpreted
 *   as two separate CP1252 characters: 'Ä' (0xC4) + control char (0x8D).
 *   When stored back as UTF-8, each became a separate Unicode codepoint
 *   (U+00C4 and U+008D), giving us mojibake like "CvjetiÄanin" with a
 *   hidden control character between Ä and a.
 *
 * Fix: walk each character; if its codepoint fits in a single byte
 *   (≤0xFF), use that byte directly. Map CP1252-specific Unicode
 *   characters (smart quotes etc.) back to their 0x80-0x9F bytes.
 *   Then re-decode the resulting byte stream as UTF-8.
 *
 * Output:
 *   - Cleaned CSV: scripts/output/dentist-db-clean.csv
 *   - Summary JSON: scripts/output/dentist-db-summary.json
 */

import xlsx from "xlsx";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT = "C:/Users/teaml/Downloads/filtrirana_lista_svih_osim_neispravnih.xlsx";
const OUTPUT_DIR = join(__dirname, "output");

// CP1252 → byte mapping for the 0x80-0x9F range characters that Unicode
// placed at higher codepoints (smart quotes, em-dash, etc.)
const CP1252_REVERSE = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

function fixMojibake(str) {
  if (!str || typeof str !== "string") return str;
  const bytes = [];
  for (const c of str) {
    const cp = c.codePointAt(0);
    if (cp <= 0xff) {
      bytes.push(cp);
    } else if (CP1252_REVERSE.has(cp)) {
      bytes.push(CP1252_REVERSE.get(cp));
    } else {
      // Codepoint outside CP1252 — keep as UTF-8 (rare edge case)
      const buf = Buffer.from(c, "utf8");
      for (const b of buf) bytes.push(b);
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

function cleanName(raw) {
  if (!raw) return "";
  let s = fixMojibake(String(raw));
  // Strip the "Dr." prefix to get clean name
  s = s.replace(/^\s*Dr\.?\s*/i, "").trim();
  return s;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function classifyEmail(email) {
  const e = (email || "").toLowerCase().trim();
  if (!e || !e.includes("@")) return "invalid";
  const domain = e.split("@")[1];
  if (!domain) return "invalid";
  if (
    domain === "gmail.com" ||
    domain === "yahoo.com" ||
    domain === "hotmail.com" ||
    domain === "outlook.com" ||
    domain === "icloud.com" ||
    domain === "net.hr" ||
    domain === "inet.hr" ||
    domain === "vip.hr" ||
    domain === "tutanota.com" ||
    domain === "proton.me"
  ) {
    return "personal";
  }
  return "business"; // custom domain → likely clinic-owned
}

function guessFirstName(fullName) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  // Croatian dental list format is typically "Prezime Ime" (Surname First)
  // but can also be "Ime Prezime". We try to detect by checking if first
  // word ends with common female endings (ova/ka) — those are surnames.
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  // If first word looks like a surname (ends in -ić, -ović, -ec, etc.)
  // assume "Surname First" order and return second word.
  const surnameEndings = /(ić|ović|ević|čić|šić|ec|ek|čak)$/i;
  if (surnameEndings.test(parts[0])) {
    return parts[1] || parts[0];
  }
  return parts[0];
}

// ───────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────

const wb = xlsx.readFile(INPUT);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { defval: "", raw: false });

console.log(`Loaded ${rows.length} rows from ${INPUT}`);

const seen = new Set();
const cleaned = [];
const stats = {
  total: 0,
  duplicate_email: 0,
  invalid_email: 0,
  personal_domain: 0,
  business_domain: 0,
  empty_name: 0,
};

for (const raw of rows) {
  stats.total++;
  const email = (raw.Email || raw.email || "").toLowerCase().trim();
  const nameRaw = raw["Ime i prezime"] || raw.name || "";

  if (!email || email === "") {
    stats.invalid_email++;
    continue;
  }
  if (seen.has(email)) {
    stats.duplicate_email++;
    continue;
  }
  seen.add(email);

  const cls = classifyEmail(email);
  if (cls === "invalid") {
    stats.invalid_email++;
    continue;
  }
  if (cls === "personal") stats.personal_domain++;
  else stats.business_domain++;

  const fullName = cleanName(nameRaw);
  if (!fullName) stats.empty_name++;

  const firstName = guessFirstName(fullName);

  cleaned.push({
    email,
    full_name: fullName,
    first_name: firstName,
    email_type: cls, // personal | business
    domain: email.split("@")[1],
  });
}

// Sort: business domains first (more likely premium clinic-owned),
// then personal domains
cleaned.sort((a, b) => {
  if (a.email_type !== b.email_type) {
    return a.email_type === "business" ? -1 : 1;
  }
  return a.email.localeCompare(b.email);
});

// ───────────────────────────────────────────────────────────────────────
// Write outputs
// ───────────────────────────────────────────────────────────────────────

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const csvLines = [
  ["email", "full_name", "first_name", "email_type", "domain"]
    .map(csvEscape)
    .join(","),
];
for (const r of cleaned) {
  csvLines.push(
    [r.email, r.full_name, r.first_name, r.email_type, r.domain]
      .map(csvEscape)
      .join(",")
  );
}
writeFileSync(join(OUTPUT_DIR, "dentist-db-clean.csv"), csvLines.join("\n"), "utf8");

// Per-domain count (top 20 business domains)
const domainCounts = {};
for (const r of cleaned) {
  if (r.email_type === "business") {
    domainCounts[r.domain] = (domainCounts[r.domain] || 0) + 1;
  }
}
const topDomains = Object.entries(domainCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);

const summary = {
  source_file: INPUT,
  processed_at: new Date().toISOString(),
  stats,
  cleaned_count: cleaned.length,
  top_business_domains: topDomains.map(([d, c]) => ({ domain: d, count: c })),
  sample_first_10: cleaned.slice(0, 10),
  sample_business_first_10: cleaned
    .filter((r) => r.email_type === "business")
    .slice(0, 10),
};
writeFileSync(
  join(OUTPUT_DIR, "dentist-db-summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8"
);

console.log("\n=== STATS ===");
console.log(JSON.stringify(stats, null, 2));
console.log(`\nCleaned: ${cleaned.length} unique deliverable contacts`);
console.log(`  business domains: ${stats.business_domain}`);
console.log(`  personal domains: ${stats.personal_domain}`);
console.log(`\nTop 10 business domains:`);
topDomains.slice(0, 10).forEach(([d, c]) => console.log(`  ${c.toString().padStart(4)}  ${d}`));
console.log(`\nWritten:`);
console.log(`  ${join(OUTPUT_DIR, "dentist-db-clean.csv")}`);
console.log(`  ${join(OUTPUT_DIR, "dentist-db-summary.json")}`);
