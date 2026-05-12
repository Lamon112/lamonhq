/**
 * Generate paste-ready text for HQ Lead Scorer → Bulk Import tab.
 *
 * Takes scripts/output/dentist-db-clean.csv and produces:
 *   - scripts/output/import-tier1-clinic.txt  → 351 premium clinic emails
 *   - scripts/output/import-tier2-isp.txt     → ~180 ISP-legacy entries
 *   - scripts/output/import-tier3-personal.txt → ~1160 Gmail/Yahoo entries
 *
 * Format per line: "name,email" — matches LeadScorerPanel's parseRawLeads.
 *
 * Leonardo workflow:
 *   1. Open HQ → Lead Scorer → Bulk Import tab
 *   2. Niche: Stomatologija · Source: Referral (Špeharova baza)
 *   3. Paste content of import-tier1-clinic.txt
 *   4. Submit
 *   5. Wait for "📥 Učitano X/351" toast
 *   6. List tab → "AI re-score & enrich" button → Holmes batch runs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = join(__dirname, "output", "dentist-db-clean.csv");
const OUTPUT_DIR = join(__dirname, "output");

const ISP_DOMAINS =
  /\.(t-com\.hr|htnet\.hr|ht\.hr)$|^(t-com\.hr|htnet\.hr|ht\.hr)$/i;
const ISP_PREFIX = /^(zg|ri|pu|st|si|hi|gs|sb|du|os|vk|sk|ka|po)\./i;
const ACADEMIC = /(sfzg\.hr|mef\.hr|unizg\.hr|unizd\.hr|uniri\.hr|unist\.hr|unipu\.hr|gov\.hr)/i;
const PERSONAL =
  /^(gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|icloud\.com|net\.hr|inet\.hr|vip\.hr|tutanota\.com|proton\.me|live\.com|ymail\.com|yahoo\.co\.uk|yahoo\.de|windowslive\.com|gmai\.com|gmaill\.com|siol\.net)$/i;
const ALSO_LEGACY = /\b(optinet\.hr|globalnet\.hr|h1\.hr)\b/i;

function parseCSVLine(line) {
  // Minimal CSV parser supporting quoted fields with embedded commas
  const out = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === "," && !inQuote) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function classify(email) {
  const domain = (email.split("@")[1] || "").toLowerCase();
  if (!domain || !domain.includes(".")) return "invalid";
  if (PERSONAL.test(domain)) return "personal";
  if (ACADEMIC.test(domain)) return "academic";
  if (ISP_DOMAINS.test(domain) || ISP_PREFIX.test(domain) || ALSO_LEGACY.test(domain))
    return "isp_legacy";
  return "clinic";
}

const lines = readFileSync(INPUT, "utf8").split("\n");
const header = parseCSVLine(lines[0]);
const colEmail = header.indexOf("email");
const colName = header.indexOf("full_name");

const buckets = {
  clinic: [],
  isp_legacy: [],
  personal: [],
  academic: [],
  invalid: [],
};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = parseCSVLine(line);
  const email = (cols[colEmail] || "").trim().toLowerCase();
  const fullName = (cols[colName] || "").trim();
  if (!email) continue;

  const bucket = classify(email);
  // Format for HQ bulk import parser: "name,email"
  // If name contains a comma, parser expects CSV — but name with comma would
  // confuse it. Strip commas from name to keep parser happy.
  const safeName = fullName.replace(/,/g, " ").trim() || email;
  buckets[bucket].push(`${safeName},${email}`);
}

// Write per-bucket paste files
writeFileSync(
  join(OUTPUT_DIR, "import-tier1-clinic.txt"),
  buckets.clinic.join("\n") + "\n",
  "utf8",
);
writeFileSync(
  join(OUTPUT_DIR, "import-tier2-isp.txt"),
  buckets.isp_legacy.join("\n") + "\n",
  "utf8",
);
writeFileSync(
  join(OUTPUT_DIR, "import-tier3-personal.txt"),
  buckets.personal.join("\n") + "\n",
  "utf8",
);

console.log("=== PASTE-READY FILES ===");
console.log(`Tier 1 (premium clinic): ${buckets.clinic.length} entries`);
console.log(`Tier 2 (ISP legacy):     ${buckets.isp_legacy.length} entries`);
console.log(`Tier 3 (personal):       ${buckets.personal.length} entries`);
console.log(`Academic (skipped):       ${buckets.academic.length}`);
console.log(`Invalid (skipped):        ${buckets.invalid.length}`);
console.log("");
console.log("Files written:");
console.log("  " + join(OUTPUT_DIR, "import-tier1-clinic.txt"));
console.log("  " + join(OUTPUT_DIR, "import-tier2-isp.txt"));
console.log("  " + join(OUTPUT_DIR, "import-tier3-personal.txt"));
console.log("");
console.log("=== SAMPLE FIRST 5 TIER 1 LINES ===");
buckets.clinic.slice(0, 5).forEach((l) => console.log(l));
