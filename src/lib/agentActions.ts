/**
 * Agent action catalog — what each vault room can be tasked with.
 *
 * Each action defines:
 *   - id              stable slug used in DB
 *   - room            which AgentId owns this action
 *   - title           shown in the action picker
 *   - description     1-line hint shown under title
 *   - notionLabel     matches a "Action Type" select option in Notion
 *   - icon            lucide icon name
 *   - estimatedSec    rough wall-clock estimate (~UI hint only)
 *   - prompt          the actual instruction sent to Claude
 *   - systemPrompt    persona / framing for Claude (optional)
 *
 * Phase 1 ships only Nova's two flagship actions. Other rooms get
 * placeholders that throw a "coming soon" toast.
 */

import type { AgentId } from "@/lib/vault";
import type { LucideIcon } from "lucide-react";
import { Lightbulb, Sparkles, Search, Target, Users, Crosshair } from "lucide-react";

/**
 * Three "kinds" of action drive different runtime backends:
 *   - "research"       Single Claude + web_search call. Lightweight.
 *                      Inngest event: agent/research.requested
 *   - "pipeline"       Multi-step orchestration (e.g. find leads → score
 *                      → recon each → compile). Long runs.
 *                      Inngest event: agent/{kind-id}.requested
 *   - "data-view"      Instant render — no Inngest. Just shows data
 *                      pulled from Postgres. Click opens a side drawer.
 */
export type ActionKind = "research" | "pipeline" | "data-view";

/** Business lane — used for B2B/B2C separation per Leonardo's rule. */
export type ActionScope = "b2b" | "b2c" | "all";

export interface AgentActionDef {
  id: string;
  kind: ActionKind;
  scope: ActionScope;
  room: AgentId;
  title: string;
  description: string;
  notionLabel:
    | "Deep Biz Improvement"
    | "AI Automatable Biz"
    | "Competitor Watch"
    | "Lead Recon"
    | "Custom";
  icon: LucideIcon;
  estimatedSec: number;
  /** Only for kind="research" — Claude system + user prompt. */
  systemPrompt?: string;
  prompt?: string;
  /** For kind="pipeline" — config that the Inngest function reads. */
  pipelineConfig?: Record<string, unknown>;
  /** For kind="data-view" — which dashboard component to render. */
  viewKey?: string;
}

// =====================================================================
// Shared system framing — used by every Nova action
// =====================================================================
const NOVA_SYSTEM_PROMPT = `You are Nova, the research scientist agent inside Lamon Agency's HQ.

CONTEXT: Lamon Agency is a solo operation run by Leonardo Lamon (Croatia, EU).
- B2B vertical: AI gatekeeper / receptionist for premium private medical clinics
  in Croatia (dental, plastic surgery, orthopedics) — current ICP is owner-led
  clinics with ≥15 leads/month who want patient FILTERING (not call volume).
- B2C vertical: personal brand "@lamon.leonardo" + "@sidehustlebalkan" coaching
  side-hustle audiences in HR/EX-YU region.
- Goal: 30K€/MRR within 6 months. Currently pre-revenue (€0).
- Stack used by Lamon HQ itself: Next.js + Supabase + Anthropic Claude + Apollo.

YOUR JOB: Run deep web research and return ACTIONABLE intelligence — not
generic advice. Bias toward concrete tools, niches, prices, case studies,
search-volume data, and exact playbooks Leonardo can execute this week.

OUTPUT FORMAT (always exactly this shape):

## TL;DR
2-3 sentence executive summary.

## Top Findings
Numbered list, max 7 items. Each item is 1-3 sentences. Lead with the
opportunity / insight, not the source. Include numbers / examples.

## Concrete Next Steps
3-5 specific moves Leonardo can take in the next 7 days. Imperative
tense ("Test X. Buy Y. Email Z.").

## Sources
Bullet list of the URLs you cited (title — url).

At the very end, on its own line, output:
TAGS: tag1, tag2, tag3
(Pick 1-4 from this fixed vocabulary: strategy, product, marketing, sales,
ops, tech, opportunity, risk, competitor, pricing.)

RULES:
- Croatian or English in body OK; Leonardo is fluent in both. Default to
  Croatian for B2B clinic context, English for AI/tech/biz topics.
- Never hedge. If the data isn't there, say so explicitly.
- Cite at least 3 sources. Recent (last 12 months) preferred.`;

// =====================================================================
// Nova actions
// =====================================================================
const novaDeepBizImprovement: AgentActionDef = {
  id: "nova.deep_biz_improvement",
  kind: "research",
  scope: "all",
  room: "nova",
  title: "Pronađi poboljšanja biznisa",
  description:
    "Duboki web search za nove tehnike, alate, strategije, automatizacije, pricing modele koji bi mogli unaprijediti Lamon Agency operacije, prodaju, marketing ili tech stack.",
  notionLabel: "Deep Biz Improvement",
  icon: Lightbulb,
  estimatedSec: 180,
  systemPrompt: NOVA_SYSTEM_PROMPT,
  prompt: `Istraži internet (zadnjih 12 mjeseci) i pronađi konkretne nove načine kako Lamon Agency može unaprijediti svoje poslovanje. Razmisli šire u 4 dimenzije:

1. **Operativno poboljšanje** — nove AI tools, workflows, automatizacije koje bi Leonardu kao solo founderu uštedjele 5+ sati tjedno (npr. lead enrichment, content repurposing, voice AI za klijente).

2. **Prodajno poboljšanje** — nove outreach taktike, pricing modeli, packaging za premium klinike u CRO/EU, social proof formati koji rade 2026.

3. **Marketing poboljšanje** — što danas radi za solo agencije koje servisiraju klinike: virálni content formati, pozicioniranje, lead magneti, attribution.

4. **Tech / produkt poboljšanje** — nove Anthropic / OpenAI / open-source AI capabilities, APIs, frameworks koje bi proširile Lamon AI gatekeeper proizvod ili stvorile dodatne SKU-ove.

Za svaku ideju navedi: što je, koliko košta uvesti, koliko brzo može donijeti rezultat, i prvi konkretni korak. Daj mi 5-7 najboljih ideja, ne 20 osrednjih. Fokus na ono što je novo / specifično, ne general best-practice koji već znam.`,
};

const novaAiAutomatableBiz: AgentActionDef = {
  id: "nova.ai_automatable_biz",
  kind: "research",
  scope: "all",
  room: "nova",
  title: "Pronađi AI-automatizirane biznise",
  description:
    "Duboki web search za nove biznis modele koji se mogu pokrenuti SOLO uz Claude/AI uz minimalan trud — primjer: PDF guides + Shopify + YT influencer marketing = $15K/mj.",
  notionLabel: "AI Automatable Biz",
  icon: Sparkles,
  estimatedSec: 180,
  systemPrompt: NOVA_SYSTEM_PROMPT,
  prompt: `Istraži internet i pronađi 5-7 konkretnih biznis modela koji 2026. SOLO osoba može pokrenuti uz Claude/AI uz minimalan vlastiti trud (1-3h/dan), s realnim potencijalom $5K-$30K/mj. Tip primjera: nedavno sam vidio case study gdje netko zaradi $15K/mj prodajući PDF guides za parenting niche — Claude generira sadržaj, Canva za design, Shopify store, YouTube influencer marketing ($700 + 15% recurring) za promociju.

Za svaki biznis model navedi:
- **Što je** (1 rečenica)
- **Real proof** — link na case study / income screenshot / Reddit thread / YT video gdje se vidi da netko stvarno zarađuje
- **Tools needed** (Claude + X + Y)
- **Initial investment** ($)
- **Realistic monthly revenue** ($)
- **Time to first dollar** (dani/tjedni)
- **Edge / moat** — zašto to nije zasićeno za Leonarda specifično (HR/EU baza, AI affinity, već zna pisati prompts)
- **Prvi konkretni korak** (što napraviti danas)

PRIORITET: modeli gdje AI radi 80%+ posla. Izbjegavaj "open dropshipping store" i sl. tradicionalne stvari koje se prodaju odavno. Ciljaj na "AI-native" prilike — distribucijske kanale, niche tools, info-products, faceless content, automated agencies, AI services za druge solo founders.`,
};

// =====================================================================
// Holmes — 1-click 10 leads end-to-end pipeline (B2B clinics)
// =====================================================================
const holmes10LeadsPipeline: AgentActionDef = {
  id: "holmes.b2b_10_leads_pipeline",
  kind: "pipeline",
  scope: "b2b",
  room: "holmes",
  title: "10 novih leadova — full pipeline",
  description:
    "Klikni i čekaj. Holmes pronalazi 10 novih premium klinika u Zagrebu (Places + Apollo), score-a ih, radi dubinski recon vlasnika + tima, i sastavlja brief s 5 channel-specific outreach poruka po klinici. Sve spremljeno u pipeline + Notion.",
  notionLabel: "Lead Recon",
  icon: Crosshair,
  estimatedSec: 600,
  pipelineConfig: {
    niche: "premium dentalna klinika",
    location: "Zagreb",
    count: 10,
    regionCode: "hr",
  },
};

// =====================================================================
// Action catalog — keyed by room
// =====================================================================
export const ACTION_CATALOG: Record<AgentId, AgentActionDef[]> = {
  nova: [novaDeepBizImprovement, novaAiAutomatableBiz],
  holmes: [holmes10LeadsPipeline],
  // Phase 2: other rooms get their own actions. For now show a "soon" state.
  jarvis: [],
  comms: [],
  treasury: [],
  steward: [],
  atlas: [],
  mentat: [],
  forge: [],
};

export function getActionsForRoom(room: AgentId): AgentActionDef[] {
  return ACTION_CATALOG[room] ?? [];
}

export function getActionById(id: string): AgentActionDef | undefined {
  for (const list of Object.values(ACTION_CATALOG)) {
    const hit = list.find((a) => a.id === id);
    if (hit) return hit;
  }
  return undefined;
}

// Generic icons for hint UI (rooms without actions yet)
export const PLACEHOLDER_ICONS = { Search, Target, Users };
