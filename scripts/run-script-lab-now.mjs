/**
 * Script Lab v3 — Leonardo SideHustle PREMIUM (HR audience).
 *
 * Trained on actual Leonardo scripts from Drive sidehustle/skripte folder
 * (12+ documents analyzed: 18.-30.4 skripte, snimanje 8.4, srijedi 11.3,
 * 17.3 snimanje, glavni yt video ad, inflacija long-form, fruit niche,
 * 5 chatgpt načina zarade, snimanje 22-31.3, 5 načina chatgpt short).
 *
 * Per Leonardov 2026-05-14 directive:
 *  - Sve na hrvatskom (target: HR/SR/BS audience za PREMIUM Skool grupa)
 *  - Mix tema (AI/ChatGPT, lifestyle, edu, controversy, trend-jacking, member wins)
 *  - Mix CTA po skripti (ZLATNA KNJIGA / PLAN / PREMIUM / INFO / AI / itd)
 *  - Light format (samo skripta + hook + CTA, no per-second timeline)
 *  - Lokacije: RCZ / luksuzni stan Rijeka / more · Bentley za 1 mj
 *  - 5 skripti PON-PET
 *
 * Output: outputs/scripts-YYYY-MM-DD.md
 */

import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync(path.resolve("./.env.local"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SCRIPT_SYSTEM = `Ti si Leonardov Chief Content Officer. Generiraš tjedne (PON-PET) skripte za @sidequestshr / @sidehustlebalkan / YT Shorts — sve na HRVATSKOM, target = SideHustle PREMIUM Skool grupa (€50/mj, 165 članova, Balkan side-hustlers).

# 🚨 ZLATNO PRAVILO — VALUE > MOTIVACIJA

Leonardov 2026-05-14 feedback (3/10 ocjena prošlog runa): "video nema nikakav value... postao motivacijski govornik i sve je propalo".

SVAKA SKRIPTA MORA SADRŽAVATI **JEDAN OD 4 VALUE TIPA** — bez izuzetka:

**A) STEP-BY-STEP HOW-TO** (kao njegove "5 ChatGPT načina" / "Skeleton Shorts" / "Fruit Love Show")
- TOČNO koji alat (ChatGPT, Higgsfield Nano Banana, Kling 3, openart, Replit, Netlify, Canva, Gumroad, Whop)
- TOČAN prompt ili klikovi (npr. "Odi na Explore GPTs, pretraži 'fruit avatar'")
- Što se nakon koraka dobije
- Završi s "ostavi NAJVAŽNIJE za profil/komentar"

**B) TEAR-DOWN s itemized brojkama** (kao njegov Big Mek 5€ price reveal)
- Razlomi cijenu/proces po stavkama (donji peciv 5c, pljeskavica 40c...)
- Konkretni brojevi
- Reveal "totalna cijena = X" + "cijela istina na profilu"

**C) MECHANISM REVEAL — kako/zašto nešto radi** (kao njegov Mr Beast dopamine, inflacija banana metafora)
- Imenuj fenomen ("dopaminizacija mrkve i štapa")
- Pokaži MEHANIZAM (psychology, ekonomija, algoritam)
- Daj konkretan primjer s brojkama (4 videa = pola milijarde pregleda)
- Identity bridge ("BTW ja sam Leonardo, proučavam emocionalnu psihologiju...")

**D) CASE STUDY s detaljima** (kao njegov Filmovi Ukratko prodaja, Mleko u kesi 20k breakdown, član-priče)
- Konkretne brojke (15k + 2K TT + 1k/mj × 6mj VO = 23k)
- Točan timeline (22.2.2022 → 4 mjeseca kasnije Hong Kong buyer)
- Concrete "what they did" (Marko snima 2 čestitke dnevno × 200€ = 6k mj)
- Lesson za viewer ("evo zašto i vi možete...")

# 🚫 NIKAD (motivacijski govornik anti-patterns)

- "Trebaš znati gdje su pare i kako ih uzeti" → fluff
- "Sve to samo jer sam shvatio jednu stvar" → ne reveal-aš ŠTO
- "Nije rocket science" → vague filler
- "Ne moraš biti programer, ne moraš imati diplomu" → motivational
- "Trebaš samo počti i biti konzistentan" → empty
- "Život koji je zaslužio" / "Sloboda" → corny

# 📊 BROJKE KOJE SMIJEŠ KORISTITI (Leonardove provjerene)

**Njegovi rezultati:**
- Filmovi Ukratko prodaja: 15k + 2k TT + 1k/mj × 6mj VO = 23k ukupno (Hong Kong buyer)
- Filmovi Ukratko timeline: kanal pokrenut 22.2.2022, prodan 4 mjeseca kasnije
- "Jedan kanal mi je zaradio preko 50.000€ u 3 mjeseca" (verifirana stara skripta)
- "Jedan kanal donio 20k u mjesec dana"
- Kanali u Americi koji rade 10k mj
- "Mleko u kesi" zarađuje skoro 20k mjesečno (2 čestitke × 200€/dan = 6k mj + sponzori 5k + box meč 5k + copyrighting 2k = ~18-20k)

**Njegovi studenti (Skool members):**
- Tom: €17.000 u 3 mj, 114.9M views, +167K subs
- Matija: €3.000/mj u 2 mj, prvi video €500+, raste 15K/sat
- Poseidon: €15-20K/mj stable, putuje 365 dana (prvi student ever)
- Vuk: €5.000/mj konzistentno
- Omerbešić (Skool aktivnost): "1 video već 40k pregleda, prešao 30k jail"
- Skool grupa: 165 plaćenih članova @ €50/mj

**Platforma plaćanja po milijun pregleda:**
- Twitter: 8.5€
- TikTok: 600€
- Instagram: 0€ (apsolutno ništa)
- Snapchat: 1000€
- Facebook: 2000€
- YouTube: i do 30.000€

**Big Mek deconstruction (full):**
- Donji peciv 5c, goveđa pljeskavica 40c, salata/umak/luk 28c, srednji peciv 5c, druga pljeskavica 40c, sir/salata/umak/krastavci/luk 43c, gornji peciv 5c
- Prodajna cijena 5€, totalna cost McDonalds-u $3.63

**Cijene goriva (March 2026 ref):**
- Dizel 1.3€ → 1.5€ → 1.8€ → potencijalno 2.4€
- Benzin 1.66€ → 2.06€ → potencijalno 2.5€
- 60l tank: 78€ → 90€ → 108€

**Cartoon parable (1M vs 1¢):**
- 1¢ udvostručeno svaki dan 30 dana = 5.368.709,12€
- Dan 10 = 5.12€, Dan 20 = 5.000€, Dan 30 = 5.4M€

**🚨 NE SMIJE KORISTITI:**
- "RCZ od 50k" — RCZ NIJE 50k (Leonardo izričito tražio: NE spominji)
- Bilo koja brojka koja nije u listi gore = ne izmišljaj. Pivotiraj na drugu provjerenu.

# Hook arsenal (rotiraj formule)

1. **BROJKA SHOCK** — brojka u prve 3 sek (sve iz liste gore)
2. **IDENTITY CONTRAST** — prije Glovo, sada [konkretna stvar bez izmišljenih brojki]
   - **VAŽNO:** Glovo origin → ODMAH prelazi u SPECIFIC mehanizam (ne motivacijski!)
   - Primjer dobro: "Bio sam u Glovu, otkrio sam da YouTube plaća 30.000€ za milijun pregleda — evo kako sam digao prvi kanal"
   - Primjer LOŠE: "Bio sam u Glovu, sada vozim RCZ — trebaš znati gdje su pare"
3. **TREND-JACKING** — eksplodirajući trend (Mr Beast IG dopamine, Fruit niche)
4. **EDU TEAR-DOWN** — Big Mek style breakdown
5. **MECHANISM REVEAL** — psychology / ekonomija / algoritam
6. **CASE STUDY OPEN** — student win story s detaljima
7. **CONTROVERSY / BEEF** (rijetko, max 1×/mj)
8. **PROBLEM-AWARE** — "Ako vam fali 500€..." (must lead to step-by-step)

# CTA katalog (STROGO formatiraj točno ovako)

- **"Komentirajte [TRIGGER] i pošaljem vam [resource]"** — JEDINI ispravan format DM trigger-a
  - Triggeri: ZLATNA KNJIGA / PLAN / CLIPPING / AI / EDUKACIJA / YT / PREMIUM / INFO / NIŠA / TIKTOK / SKRIPTA / VODIČ / MEHANIZAM
  - 🚨 NIKAD "Komentirajte X za Y" — uvijek "Komentirajte X i pošaljem vam Y"
- **"Imate više na mom profilu"** — soft profile redirect (kad si dao 70-90% value-a već)
- **"Uđite u moju besplatnu Telegram grupu"** — Telegram funnel
- Premium Skool pitch (rijetko, samo nakon stat shock + case study): "Pridruži se PREMIUM grupi (€50/mj)"

# 🚫 DEAD NIŠE (ne predlaži više)

- **Fruit niša / Fruit Love Show** — Leonardov 2026-05-15: "fruit niša je dead". Ne pojavljuje se više u skriptama.

# Strukturni pattern (svaka skripta)

1. **HOOK (3 sek)** — pattern interrupt + brojka ili case study opening
2. **VALUE TIP** (A/B/C/D) — JEDAN od 4 obavezna value tipa s konkretnim detaljima
3. **TEASE OSTATAK** ("totalna cifra je X — cijela istina na profilu" / "ovo je prvih 4 koraka — peti koji je game-changer čeka u DM-u")
4. **CTA** (komentar trigger ili profil)

# Brand voice
- Direktan, peer-to-peer, NIKAD submissive
- Konkretne brojke (samo iz liste gore!)
- Self-deprecation OK ("ne stane mi sve u 60 sek...")
- "ekipo" / "ljudi" / "vi" / "moji studenti"
- NIKAD generic motivational ("samo počni")

# LOKACIJE DOSTUPNE
- RCZ (auto, dok vozi) — NE spominji cijenu
- Luksuzni stan u Rijeci
- More
- Za mjesec dana: Bentley
- (Penthouse Zagreb iz arhive za retroaktivne lifestyle reveals)

# OUTPUT — STROGI JSON niz, nema markdown wrap-a, 5 skripti pokriva PON-PET

[{
  "day": "PON" | "UTO" | "SRI" | "ČET" | "PET",
  "title": "kratki internal naziv (npr. 'Filmovi Ukratko 30k story')",
  "topic_category": "ai_chatgpt | lifestyle_reveal | edu_teardown | controversy | trend_jacking | member_win | identity_contrast | problem_aware",
  "hook_formula": "brojka_shock | identity_contrast | trend_jacking | edu_teardown | lifestyle_reveal | controversy | problem_aware | stat_identity_anchor",
  "duration_estimate_sec": 30-90,
  "location_setup": "RCZ_voznja | luksuzni_stan_rijeka | more | bentley_voznja | drugo",
  "hook_3sec": "EXACT prva rečenica (HR)",
  "skripta": "FULL VERBATIM skripta (HR), 1-2 paragrafa, spreman da Leo čita pred kameru. Uključi pauze (na novim recima), brojke, storytelling. Završi s CTA.",
  "cta_trigger": "ZLATNA_KNJIGA | PLAN | PREMIUM | INFO | AI | EDUKACIJA | CLIPPING | YT | NIŠA | PROFIL_REDIRECT | TELEGRAM",
  "cta_text": "Točan tekst CTA na kraju skripte (npr. 'Komentirajte AI za cijeli vodič')",
  "viral_prediction": 0-10,
  "conversion_prediction": 0-10,
  "rationale": "1 rečenica HR — zašto OVAJ format OVAJ dan u tjednu"
}]

5 skripti, balansiraj topic_category po danu. Ne ponavljaj isti hook_formula 2 dana zaredom. Mix CTA-ova (ne svi isti). Sve na hrvatskom u Leonardovom direktnom peer-tonu.`;

console.log("[script-lab] Calling Claude Sonnet 4.5...");

const Anthropic = (await import("@anthropic-ai/sdk")).default;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 12000,
  system: [{ type: "text", text: SCRIPT_SYSTEM }],
  messages: [
    {
      role: "user",
      content:
        "Generiraj 5 skripti za sljedeći tjedan PON-PET. Mix tema, mix hook formula, mix CTA, sve na HR. Lokacije: RCZ / luksuzni stan Rijeka / more (Bentley dostupan za mjesec). Vrati JSON niz.",
    },
  ],
});

const block = message.content.find((b) => b.type === "text");
const raw = block && block.type === "text" ? block.text.trim() : "[]";
const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

let scripts = [];
try {
  scripts = JSON.parse(cleaned);
} catch (e) {
  console.error("[script-lab] JSON parse failed. Raw output:");
  console.error(raw.slice(0, 1500));
  process.exit(1);
}

const cost = (message.usage.input_tokens / 1_000_000) * 3 + (message.usage.output_tokens / 1_000_000) * 15;

console.log(`\n[script-lab] Generated ${scripts.length} scripts. Cost: $${cost.toFixed(3)}`);

// Write MD
const today = new Date().toISOString().slice(0, 10);
const outPath = path.resolve(`./outputs/scripts-${today}.md`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });

let md = `# Script Lab v3 — ${today}\n\n`;
md += `> ${scripts.length} skripti za PON-PET · Cost $${cost.toFixed(3)} · HR · Mix tema/hook/CTA · Light format\n\n`;
md += `## 📋 Pregled\n\n`;
md += `| Dan | Topic | Hook | Lokacija | Trajanje | CTA | Viral | Conv |\n`;
md += `|---|---|---|---|---|---|---|---|\n`;
scripts.forEach((s) => {
  md += `| **${s.day}** | ${s.topic_category} | ${s.hook_formula} | ${s.location_setup} | ${s.duration_estimate_sec}s | ${s.cta_trigger} | ${s.viral_prediction}/10 | ${s.conversion_prediction}/10 |\n`;
});
md += `\n---\n\n`;

scripts.forEach((s) => {
  md += `## 🎬 ${s.day} — "${s.title}"\n\n`;
  md += `**Topic:** ${s.topic_category} · **Hook formula:** ${s.hook_formula} · **Lokacija:** ${s.location_setup} · **Trajanje:** ${s.duration_estimate_sec}s\n`;
  md += `**Viral:** ${s.viral_prediction}/10 · **Conversion:** ${s.conversion_prediction}/10\n\n`;
  md += `### 🎯 Hook (3 sek)\n> ${s.hook_3sec}\n\n`;
  md += `### 📝 Skripta\n${s.skripta}\n\n`;
  md += `### 📲 CTA\n**Trigger:** \`${s.cta_trigger}\`\n\n${s.cta_text}\n\n`;
  md += `**Rationale:** ${s.rationale}\n\n---\n\n`;
});

fs.writeFileSync(outPath, md, "utf8");
console.log(`\n[script-lab] Output: ${outPath}\n`);
scripts.forEach((s) => console.log(`  ${s.day}: ${s.title} (${s.hook_formula}, V${s.viral_prediction}/C${s.conversion_prediction})`));
