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
import {
  Lightbulb,
  Sparkles,
  Search,
  Target,
  Users,
  Crosshair,
  CalendarDays,
  CheckSquare,
  Banknote,
  HeartPulse,
  ClipboardList,
  Calculator,
  Activity,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";

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
  /** Estimated cost per click in EUR. Shown to user BEFORE they fire. */
  estimatedCostEur: number;
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
  estimatedCostEur: 0.25,
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
  estimatedCostEur: 0.25,
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
// Mentat — AI Council strategic plan (multi-agent role-play, single call)
// =====================================================================
const MENTAT_COUNCIL_SYSTEM_PROMPT = `You are Mentat, the war-room strategist agent inside Lamon Agency's HQ.

Your job: convene a council of the 8 other AI agents (Holmes, Jarvis,
Nova, Comms, Treasury, Steward, Atlas, Forge), let each speak from
their lens on Lamon Agency's current direction, then synthesize a
30-day strategic plan with the highest-leverage moves.

CONTEXT: Lamon Agency = solo founder Leonardo Lamon (Croatia, EU).
- B2B core: AI gatekeeper / receptionist for premium private clinics
  in Croatia (dental, plastic surgery, orthopedics). Current ICP =
  owner-led clinics ≥15 leads/month wanting patient FILTERING.
- B2C: personal brand "@lamon.leonardo" + "@sidehustlebalkan" coaching
  side-hustle audiences in HR/EX-YU region.
- Goal: 30K€/MRR within 6 months. Currently pre-revenue (€0 MRR).
- Current state: 12 hot Holmes-investigated leads queued, 0 closed
  clients, lamon-hq.vercel.app gamified ops dashboard live, outreach
  campaign launches imminently.

# THE 8 PERSPECTIVES (each speaks for ~3 sentences)

1. **Holmes (Sales recon)** — what does the lead pipeline tell us?
   Are the leads we have ready to close? What's missing?
2. **Jarvis (Ops)** — what bottlenecks slow Leonardo down? Where can
   automation save the most hours/week?
3. **Nova (Research)** — what new market signal / tactic from web
   research changes the game?
4. **Comms (Inbox + outreach)** — what's the current message gap?
   What's NOT being said that should be?
5. **Treasury (Financial reality)** — runway math, cost vs revenue,
   what's the bare-min path to first €1.5K MRR?
6. **Steward (Client retention)** — even pre-revenue, what's the
   client-experience gap that will bite once paying clients arrive?
7. **Atlas (Brand)** — visibility gaps, sponsorship moves, content
   bets that compound.
8. **Forge (Production)** — what should Leonardo BUILD this month
   (product, content, system) for biggest delta?

# OUTPUT FORMAT (always exactly this shape)

## TL;DR
2-3 sentence executive summary of the council's verdict.

## Council Round-Table
For each of the 8 agents, output 2-4 sentences in their voice:

### 🕵 Holmes
...

### 🤵 Jarvis
...

(etc. for all 8)

## Top 3 Moves (next 30 days)
Numbered. Each: 1 sentence move + 1 sentence why + 1 sentence first step.

## Risks & Watch-outs
3 bullets max — what could blow up the plan.

## Sources
URLs Claude cited via web_search.

At the very end, on its own line:
TAGS: tag1, tag2, tag3
(Pick 1-4 from: strategy, product, marketing, sales, ops, tech,
opportunity, risk, competitor, pricing.)

RULES:
- Croatian or English in body OK; default Croatian.
- Each agent should disagree where appropriate — councils that
  always agree are useless. Surface tension.
- Cite at least 2 web sources for the Nova / Atlas perspectives.
- Never hedge. If unsure, say so explicitly.`;

const mentatCouncil: AgentActionDef = {
  id: "mentat.ai_council_strategy",
  kind: "research",
  scope: "all",
  room: "mentat",
  title: "AI Council — strateški plan 30 dana",
  description:
    "Svih 8 AI agenata (Holmes, Jarvis, Nova, Comms, Treasury, Steward, Atlas, Forge) raspravljaju o smjeru Lamon Agency-ja iz svoje perspektive. Mentat sintezira: top 3 poteza za sljedećih 30 dana + rizici. Web search uključen.",
  notionLabel: "Custom",
  icon: Users,
  estimatedSec: 200,
  estimatedCostEur: 0.35,
  systemPrompt: MENTAT_COUNCIL_SYSTEM_PROMPT,
  prompt: `Sazovi council. Sastav: Holmes, Jarvis, Nova, Comms, Treasury, Steward, Atlas, Forge.

PITANJE: Trenutno smo na danu 0 outreach kampanje za premium klinike u Zagrebu. 12 hot Holmes-istraženih leadova spremno. €0 MRR. Cilj 30K€/MRR za 6 mjeseci. Što je optimalna strategija ZA SLJEDEĆIH 30 DANA?

Posebno fokus:
- Trebamo li outreach prvo ili content prvo?
- Treba li B2C grow paralelno ili pauzirati dok B2B ne donese prvi klijent?
- Koji je najveći rizik koji NE vidimo?
- Što bismo trebali OTKAZATI iz trenutnih aktivnosti (sunk cost koji nas usporava)?

Pretraži web za: trenutne biznis trends za solo AI agencije 2026, najbolji acquisition channel za B2B medical clinics u CRO/EU, nove growth taktike koje nismo isprobali. Cite sources.

Daj iskren multi-perspective verdict. Zatraži tenziju među agentima — ne consensus.`,
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
  estimatedCostEur: 2.5,
  pipelineConfig: {
    // Broader query — "premium dentalna" returns only 2-3 hits on Places.
    // Holmes will score for "premium" downstream via the synthesis prompt.
    niche: "stomatološka klinika",
    location: "Zagreb",
    count: 10,
    regionCode: "hr",
  },
};

// =====================================================================
// Data-view actions — instant render (no Inngest, no AI cost)
// Each opens a side drawer rendering the matching dashboard component.
// =====================================================================

const stewardClientsView: AgentActionDef = {
  id: "steward.clients_view",
  kind: "data-view",
  scope: "all",
  room: "steward",
  title: "Svi klijenti — B2B + B2C",
  description:
    "Pregled aktivnih klijenata. B2B klinike (Plima paket) + B2C coach mentor klijenti — odvojeni tabovi.",
  notionLabel: "Custom",
  icon: Users,
  estimatedSec: 0,
  estimatedCostEur: 0,
  viewKey: "clients",
};

const stewardClientStatsView: AgentActionDef = {
  id: "steward.client_stats_view",
  kind: "data-view",
  scope: "all",
  room: "steward",
  title: "Klijent stats & churn risk",
  description:
    "Po klijentu: workflow, MRR doprinos, zadovoljstvo (proxy: na vrijeme isporuke + reply rate), churn risk score.",
  notionLabel: "Custom",
  icon: HeartPulse,
  estimatedSec: 0,
  estimatedCostEur: 0,
  viewKey: "client_stats",
};

const treasuryRevenueView: AgentActionDef = {
  id: "treasury.revenue_dashboard",
  kind: "data-view",
  scope: "all",
  room: "treasury",
  title: "Prihodi & troškovi",
  description:
    "MRR breakdown (B2B klinike vs B2C coachevi vs barter), izvor svakog prihoda, AI burn rate ovog mjeseca, runway.",
  notionLabel: "Custom",
  icon: Banknote,
  estimatedSec: 0,
  estimatedCostEur: 0,
  viewKey: "revenue",
};

const jarvisTasksView: AgentActionDef = {
  id: "jarvis.tasks_today_view",
  kind: "data-view",
  scope: "all",
  room: "jarvis",
  title: "Današnji zadaci",
  description:
    "Sve TODO za danas + ovaj tjedan, sortirano po prioritetu. Vidiš što fali da odeš spavati mirno.",
  notionLabel: "Custom",
  icon: CheckSquare,
  estimatedSec: 0,
  estimatedCostEur: 0,
  viewKey: "tasks",
};

const atlasBookingView: AgentActionDef = {
  id: "atlas.booking_view",
  kind: "data-view",
  scope: "all",
  room: "atlas",
  title: "Raspored / booking",
  description:
    "Discovery callovi + sastanci u sljedećih 7 dana. Tko, kada, koja klinika, brza priprema.",
  notionLabel: "Custom",
  icon: CalendarDays,
  estimatedSec: 0,
  estimatedCostEur: 0,
  viewKey: "booking",
};

// =====================================================================
// Steward — Client Onboarding Kit (Notion intake doc per clinic)
// =====================================================================
const stewardOnboardingKit: AgentActionDef = {
  id: "steward.onboarding_kit",
  kind: "research",
  scope: "b2b",
  room: "steward",
  title: "Pripremni brifing — pokretanje AI recepcije",
  description:
    "Klikni → generira kompletan dokument koji klinika ispunjava prije AI setup-a (radno vrijeme, tretmani, FAQ, scripta, eskalacija, GDPR, brand). Smanjuje setup s 10h na 3h po klijentu.",
  notionLabel: "Custom",
  icon: ClipboardList,
  estimatedSec: 90,
  estimatedCostEur: 0.05,
  systemPrompt: `Ti si Steward agent unutar Lamon HQ-a. Tvoj job je generirati STANDARDIZIRANI ONBOARDING INTAKE doc za novu B2B kliniku koju Leonardo upravo upisuje. Ovo NIJE pitch dokument — ovo je interni operativni dokument koji Leonardo dijeli s klinikom kao prvu stvar nakon potpisa.

Pravila:
1. Hrvatski jezik. Profesionalan, ali jednostavan ton — klinika treba moći ispuniti za 60-90 min, ne 5 sati.
2. Strukturiraj kao numerirane sekcije s placeholder-ima u zagradama gdje klinika upisuje (npr. "[Naziv klinike]").
3. Sve što AI receptionist treba znati za rad mora biti pokriveno. Ako fali, ne radi.
4. NEMOJ pisati TL;DR — samo radni dokument. Headings (##), tablice, checkliste, OK.
5. Završno: 10-step Lamon-side checklist (što Leonardo radi nakon što klinika vrati doc) + očekivani timeline (T+0, T+3, T+7, T+14 dana go-live).
6. TAGS na dnu: onboarding, sop, intake.`,
  prompt: `Generiraj kompletan ONBOARDING INTAKE DOC za novu B2B premium kliniku (default: dentalna klinika u Hrvatskoj — jezik HR, tržište HR). Šablonu koristi za bilo koju kliniku, samo placeholders u zagradama.

Pokrij sve sljedeće sekcije:

## 1. Klinika info
- Naziv, OIB, web, broj lokacija + adrese
- Vlasnik (ime, telefon, email), voditelj klinike (ime, telefon, email)
- Glavni kontakt za onboarding tijekom 14 dana

## 2. Radno vrijeme po lokaciji
- Tablica: lokacija | pon | uto | sri | čet | pet | sub | ned
- Pauze (npr. 12:00-12:30 ručak)
- Praznici: lista datuma kada je zatvoreno
- Hitne situacije izvan radnog vremena: tko se zove?

## 3. Tim koji radi (po lokaciji)
- Tablica: ime | uloga (vlasnik/doktor/specijalist/sestra/asistent) | dani u tjednu
- Tko od tima može preuzimati hitne pozive
- Koje terapije rade samo određeni doktori (specijalizacije)

## 4. Tipovi tretmana + cjenik (KRITIČNO za AI receptionist)
- Tablica s sve standardne usluge: kategorija | tretman | trajanje | cijena (EUR)
- Diferencijacija "konzultacija besplatno" vs "plaćena konzultacija X EUR"
- Paketi (npr. "All-on-4 Premium" = X tretmana za fiksnu cijenu)
- Što NE radite (npr. "ne radimo dječju stomatologiju") — AI mora znati prebaciti ili reći "ne"

## 5. Najčešća pitanja pacijenata + standardni odgovori (FAQ)
- 15-20 pitanja: "Imate li popust?", "Koliko traje ugradnja implanta?", "Radite li vikendom?", "Da li primate djecu?", "Imate li parking?", "Govorite li engleski/njemački/talijanski?", "Imate li garanciju?", "Plaćanje na rate?", "Da li trebam preporuku?", "Koliko prije moram naručiti?", itd.
- Format: Pitanje → odgovor (1-3 rečenice). Klinika upisuje točno onako kako želi da AI odgovara.

## 6. Scripta za prijem poziva (AI receptionist persona)
- Pozdrav (npr. "Dobar dan, [Naziv klinike], dr. [voditelj] na vezi…")
- Ton: formalno-toplo, profesionalno, koristi "Vi"
- Imena AI ne navodi (govori u ime klinike)
- Prosječna duljina poziva: cilj 2-3 min, max 5
- Što NE govoriti (npr. "ne navodi cijenu inženju implanta na poziv — preusmjeri na konzultaciju")

## 7. Booking flow
- Koji booking sustav koristi klinika (EasyBusy, Bookhopa, Calendly, vlastiti softver, Excel)? Lamon mora imati API/integration access.
- Pravila: koliko unaprijed se može rezervirati, minimalna otkazna obavijest, koliko slotova dnevno za nove pacijente vs follow-up
- Confirmation: SMS, email, oboje?
- Reminder: 24h prije, 2h prije, oboje?
- No-show policy

## 8. Eskalacija hitnih slučajeva
- Što kvalificira hitno: bol, krvarenje, zubni traumat, pad ispuna, otpadanje krunice
- Tko se zove ili gdje se preusmjerava: jedan broj 24/7? Telegram grupa? Hitna stomatološka služba grada (broj)?

## 9. Multi-language
- Koji jezici se očekuju (HR + EN + DE + IT)?
- Razina: AI prepoznaje jezik i prebacuje, ili odgovara samo na HR + nudi prevoditelja?
- Cijena varira po jeziku? (npr. dentalni turizam DE/IT)

## 10. GDPR consent + privatnost
- Tekst koji AI koristi prije snimanja poziva (HR + EN): "Ovaj poziv se snima u svrhu kvalitete usluge i obrade vašeg upita. Snimka se čuva 30 dana i nije pristupačna trećim stranama. Ako se ne slažete, recite 'ne snimaj'."
- Što s pacijentima koji odbiju snimanje: AI prelazi na text-only flow ili preusmjerava na živu osobu?
- Storage: gdje se sprema (Lamon Supabase EU? Klinika vlastiti Notion? Brisanje 90 dana?)

## 11. Calendar / kalendar integracija
- Tko upravlja Google Calendar / iCal / drugi
- Koji email/account ima edit access
- Token/permission koji Lamon treba

## 12. Branding & tone
- Klinika brand colors (HEX)
- Logo (link/file)
- "Voice" klinike: premium-formalno? warm-friendly? ekspertno-suho?
- Reference za 2-3 postojeće Instagram/web posta gdje je tone idealan

---

NA KRAJU dodaj 2 dodatne sekcije:

## ✅ LAMON-side setup checklist (Leonardo radi po koraku):
1. Primiti popunjen intake doc + provjeriti sva polja
2. Setup Supabase project za klijenta (RLS scoped na clinic_id)
3. Konfigurirati AI receptionist prompt iz sekcija 4-7
4. Test poziv na vlastiti broj (3 scenarija: novi pacijent, hitno, FAQ)
5. Deploy AI broj (Twilio/Vapi konfiguracija)
6. Prebaciti glavni klinički broj na Lamon (postupak ovisi o telco-u — provjeri Hrvatski Telekom / A1 / Tele2 timeline)
7. 24h shadow mode (AI sluša ali ne odgovara — Leonardo verificira točnost)
8. Live cutover + monitoring 48h
9. T+7 review poziva s klinikom (što treba doraditi)
10. T+30 prvi mjesečni izvještaj (broj poziva, booking conversion, missed→saved, NPS-style score)

## 📅 Timeline
- T+0 Klinika vraća popunjen doc
- T+3 dana Lamon konfigurirano + interni test
- T+7 dana Shadow mode + finalni tweaks
- T+14 dana Go-live + 24h monitoring
- T+30 dana Prvi mjesečni review s klinikom

---

TAGS: onboarding, sop, intake`,
};

// =====================================================================
// Comms — ROI Calculator (input call volume → € lost / lift)
// =====================================================================
const commsRoiCalculator: AgentActionDef = {
  id: "comms.roi_calculator",
  kind: "research",
  scope: "b2b",
  room: "comms",
  title: "ROI calculator — propušteni pozivi → €",
  description:
    "Per Holmes & Council: prva rečenica outreach-a MORA biti ROI brojka. Klikni → 1-page calculator i copy-paste-friendly summary za svaki outreach (Adria/Arini benchmarks).",
  notionLabel: "Custom",
  icon: Calculator,
  estimatedSec: 60,
  estimatedCostEur: 0.04,
  systemPrompt: `Ti si Comms ROI agent. Generiraš 1-page ROI sumary koji Leonardo attache uz outreach poruku. Cilj: prva rečenica outreach-a = konkretan € broj koliko klinika trenutno gubi.

Format: kratko, brojke, copy-paste-friendly. Hrvatski jezik. Bez fluffy uvoda. Maks 1 strana A4.`,
  prompt: `Generiraj ROI summary template za PREMIUM B2B kliniku (dental ili plastic surgery) u Zagrebu. Output je copy-paste-friendly markdown koji Leonardo customizira po svakom prospect-u (placeholder polja u zagradama).

Pokrij:

## ROI Snapshot — [Naziv klinike]

### Konzervativna procjena trenutnog gubitka

| Metrika | Vrijednost |
|---|---|
| Procjena dolaznih poziva mjesečno | [N] |
| % propuštenih (industry benchmark 25-35%) | [N%] |
| Propušteni pozivi mjesečno | [N] |
| Konverzija poziva u booking (industry 40-60%) | [N%] |
| Izgubljenih booking-a mjesečno | [N] |
| Prosječna vrijednost prvog tretmana (premium dental) | €[N] |
| **Procijenjeni mjesečni gubitak** | **€[N]** |
| **Godišnji gubitak (×12)** | **€[N]** |

### Što Plima donosi (na temelju case studies)
- Arini AI receptionist (US dental, n=150 klinika): **80% manje propuštenih poziva**, 12% rast prihoda, 24% rast profita
- Industry baseline: dobro konfigurirani AI receptioneri drže 92-96% poziva live (vs 65-75% manualno)
- **Riva** (naša AI asistentica unutar Plime) radi voice + text — DM, WhatsApp, Instagram s istim FAQ knowledge base-om kao telefon. Pacijent koji pita preko IG-a sutra zove → Riva pamti razgovor.
- Adria dental grupa generira 60M€ godišnje — premium HR dental tržište raste zbog dental turizma + investicija u privatne klinike

### Konzervativni mjesečni LIFT za [Naziv klinike]
- Spašenih booking-a: [80% × propušteni mjesečno] = [N]
- Dodatni prihod: [spašeni × ø vrijednost] = €[N]/mj
- 12-mj kumulativno: €[N]
- Plima paket investicija: 1.997€ setup + 1.497€/mj (17.964€ godišnje)
- **Net ROI prva godina:** €[N] — 17.964€ = **€[N] dodatne dobiti**
- Payback period: [N] mjeseci

### Što sljedeće (CTA)
"Imate 15 min ovaj tjedan? Pokazat ću ti točno kako bi to izgledalo za vašu kliniku — uključujući realan baseline na temelju tvog trenutnog Google Maps reviewa i call patterna." — Leonardo Lamon

---

VAŽNO: ostavi placeholders [Naziv klinike] [N] itd. da Leonardo per-prospect kustomizira. Ne izmišljaj brojke. NE pisati TL;DR — ovo JE 1-page summary.

TAGS: roi, sales-collateral, outreach`,
};

// =====================================================================
// Aegis (NEW room) — Client Nurturing & Following
// Built per Leonardov request 2026-05-09 + Council Steward warning:
// post-sale lifecycle (months 2+), retention, upsell, churn radar.
// Steward = onboarding (first 30 days). Aegis = ongoing.
// =====================================================================
const aegisHealthPulse: AgentActionDef = {
  id: "aegis.client_health_pulse",
  kind: "research",
  scope: "b2b",
  room: "aegis",
  title: "Weekly client health pulse",
  description:
    "Za svaki aktivni B2B klijent: AI sažetak prošlog tjedna (call volume, booking rate trend, missed escalations, tech incidents). Flag-a klijente s decline signals.",
  notionLabel: "Custom",
  icon: Activity,
  estimatedSec: 120,
  estimatedCostEur: 0.08,
  systemPrompt: `Ti si Aegis agent — čuvar postojećih klijenata. Tvoj job je proaktivno detektirati churn signals PRIJE nego klijent kaže "razmišljamo o pauziranju". Tjedni health pulse je tvoj alat — strogi pregled metrika, ne marketing pohvale.`,
  prompt: `Generiraj WEEKLY HEALTH PULSE template za sve aktivne B2B klijente Lamon Agency-ja. Trenutno 0 plaćenih klijenata (pre-revenue) — generiraj template strukturu koja će se popunjavati od momenta kad prvi klijent ode live.

Per klijent format:

## [Naziv klinike] — Health Pulse [tjedan]

**Status:** 🟢 healthy / 🟡 watch / 🔴 churn risk

### Metrike ovaj tjedan vs prošli tjedan
| Metrika | Ovaj tjedan | Prošli tjedan | Δ |
|---|---|---|---|
| Pozivi primljeni | | | |
| Booking conversion % | | | |
| Missed escalations | | | |
| Tech incidents (downtime, bugs) | | | |
| Klijent-side message volume (pitanja, žalbe) | | | |
| MRR utilization (% paketa korišten) | | | |

### Signal flagovi
- [ ] Pad >20% u call volume (pasivnost klinike?)
- [ ] Pad >10% u booking conversion (AI recipt drift?)
- [ ] >2 missed eskalacije (kritično — odmah riješiti)
- [ ] >24h klijent-message bez odgovora (operativni rizik)
- [ ] Klijent stress signal: word count u zadnjoj poruci >2x prosjek (frustracija)

### Action queue (Leonardo radi ovaj tjedan)
1. ...
2. ...

---

NA KRAJU: meta sekcija "Health board" — agregat: koliko klijenata 🟢/🟡/🔴, prosječni utilization %, top 3 stress signali ovaj tjedan agencije.

TAGS: client-health, retention, weekly`,
};

const aegisQbrBrief: AgentActionDef = {
  id: "aegis.qbr_brief",
  kind: "research",
  scope: "b2b",
  room: "aegis",
  title: "Mjesečni client review brief",
  description:
    "QBR-style brief za nadolazeći monthly check-in s klijentom: 30-day metrics, achievements, blockers, next-month roadmap, upsell signals.",
  notionLabel: "Custom",
  icon: TrendingUp,
  estimatedSec: 180,
  estimatedCostEur: 0.1,
  systemPrompt: `Ti si Aegis QBR agent. Generiraš mjesečni Quarterly Business Review (skraćen na monthly za solo agency) brief — Leonardo otvori 1h prije client call-a i ima sve. Ton: data-first, partnerski, ne pitchy.`,
  prompt: `Generiraj MJESEČNI CLIENT REVIEW BRIEF template za sljedeći klijent meeting. Pre-revenue (0 klijenata) — generiraj template koji se popunjava kad prvi klijent dođe na T+30.

Format:

# 30-day Review — [Naziv klinike]

## TL;DR (Leonardo izgovara prvih 30s call-a)
[3 rečenice: što je postignuto, što je glavni blocker, što je sljedeća faza]

## 30-day metrike

### Volume
- Primljenih poziva: [N] (vs T+0 baseline)
- Booking conversion: [N%]
- Missed→saved: [N] (od ovih X spasili Y)
- Avg response time: [Ns]

### Financijski impact
- Procijenjena spašena revenue: €[N]
- ROI vs Lamon investicija (1.497€/mj): [Nx]
- Payback prema baseline: [N mjeseci]

## Što smo naučili
- [3-5 insight-a iz poziva: koji tipovi pitanja dominiraju, kada su peak hours, koji tretmani imaju najveći booking lift]

## Šta menjamo iduća 30 dana
- [Konkretne izmjene: novi FAQ entries, scripting tweaks, novi tipovi tretmana u sustavu, integracije]

## Upsell signals (ako postoje)
- Klinika ima X kapaciteta nereziniranih appointment-a → Lamon Growth (extend hours coverage) bi mogao biti relevantan
- Klinika ne koristi follow-up nurture sequence → Lamon Plus paket
- Multi-lokacijska expansion → multi-instance discount

## Pitanja za klijenta (klijent govori sljedećih 30 min)
1. Što je iznenadilo (pozitivno + negativno)?
2. Koje pitanja pacijenata se ponavljaju koje AI ne hvata dobro?
3. Postoji li tip poziva gdje želite da AI uvijek prebaci na ljudski tim?
4. Koja vrsta pacijenta vam najviše treba (X type)? Promijenimo kvalifikacijska pitanja prema tome.
5. Što biste plati 2x više za sljedeći mjesec?

---

TAGS: client-review, qbr, monthly, retention`,
};

const aegisChurnRadar: AgentActionDef = {
  id: "aegis.churn_radar",
  kind: "research",
  scope: "b2b",
  room: "aegis",
  title: "Churn risk radar — sve klijente",
  description:
    "Skenira sve aktivne klijente i score-a churn risk (0-100). Top 3 visokog rizika dobiju 'rescue play' s konkretnim akcijama Leonardov radi tijekom tjedna.",
  notionLabel: "Custom",
  icon: ShieldAlert,
  estimatedSec: 150,
  estimatedCostEur: 0.07,
  systemPrompt: `Ti si Aegis churn-detection agent. Svaki signal koji bi mogao značiti "klijent se sprema otići" mora biti detektiran ranije nego klijent eksplicitno kaže. Bolje 5 false positives nego 1 propušten true positive.`,
  prompt: `Generiraj CHURN RADAR template koji se popunjava real-time po aktivnim klijentima. Trenutno 0 klijenata — daj template + scoring metodu za buduću upotrebu.

Format:

# Churn Radar — [datum]

## Score formula (0-100, viši = veći risk)
- Pad call volume >20% u 2 tjedna: +25
- Pad booking conversion >10%: +15
- >24h client-message bez odgovora od klijenta: +10
- 2+ missed eskalacije unazad 30 dana: +20
- Plaćanje kasni >7 dana: +15
- Skipped monthly review meeting: +15
- Negativan ton u zadnjoj poruci (sentiment ≤-0.3): +10
- Spomenuo "razmišljamo", "drugu agenciju", "preskupo": +20 (instant red)

## Risk tiers
- 🟢 0-25: healthy, ne diraj
- 🟡 26-55: watch, 1 ad-hoc check-in poziv ovaj tjedan
- 🟠 56-75: at-risk, hitan rescue plan, Leonardo direktno doktora vlasnika
- 🔴 76-100: critical, drop-everything, dogovori sastanak ovaj tjedan + spremi commercial conces (10-20% popust 3 mj ili upgrade za istu cijenu)

## Active clients today
[Tablica: klijent | score | tier | top 3 signal | rescue action ovaj tjedan]

## Top 3 critical (drop-everything)
1. [Klijent] — [score] — Action: [konkretno što]
2. ...

## Lessons learned (post-mortem ako je netko otišao prošli mjesec)
- [Insight koji ide u Holmes prompt da budući leadovi imaju ranije signal-detection]

---

TAGS: churn, retention, risk-radar, rescue`,
};

// =====================================================================
// Action catalog — keyed by room
// =====================================================================
export const ACTION_CATALOG: Record<AgentId, AgentActionDef[]> = {
  nova: [novaDeepBizImprovement, novaAiAutomatableBiz],
  holmes: [holmes10LeadsPipeline],
  mentat: [mentatCouncil],
  steward: [stewardClientsView, stewardClientStatsView, stewardOnboardingKit],
  treasury: [treasuryRevenueView],
  jarvis: [jarvisTasksView],
  atlas: [atlasBookingView],
  aegis: [aegisHealthPulse, aegisQbrBrief, aegisChurnRadar],
  forge: [],
  comms: [
    commsRoiCalculator,
    {
      id: "comms.meeting_brief",
      kind: "research",
      scope: "all",
      room: "comms",
      title: "Brief za sljedeći sastanak",
      description:
        "Klikni i dobiješ 1-page brief za najbliži discovery call: tko je vlasnik, što je njegov pain, što je hot button, opening hook, 3 pitanja za otkriti budget, 3 anticipirana prigovora + odgovori. Koristi shared knowledge iz svih agenta.",
      notionLabel: "Custom",
      icon: Sparkles,
      estimatedSec: 90,
      estimatedCostEur: 0.15,
      systemPrompt: `Ti si Comms agent unutar Lamon HQ-a. Tvoj job je pripremiti Leonarda za njegov sljedeći discovery call s premium klinikom.

Lamon Agency = solo founder Leonardo Lamon, prodaje **Plima** paket (AI receptionist za premium klinike u Croatia) — €1.997 setup + €1.497/mj. AI asistentica unutar Plime se zove **Riva** — diže telefon, odgovara DM/WA/IG, govori HR/EN/DE/IT, drži 92-96% poziva live.

Output FORMAT:

## TL;DR
1 rečenica: tko, kada, koliko će vrijediti.

## Vlasnik / decision-maker (15 sec read)
- Ime, role, jezik
- Najjači signal koji znamo o njemu

## Hot Button
1 rečenica — što ga BOLI najviše?

## Opening Hook (Leonardo izgovori prvih 30 sec)
3 rečenice — observation o klinici → pain pitanje → soft framing.

## 3 Discovery pitanja
Za otkriti: budget, decision-making proces, urgency. Konkretno, ne generic.

## 3 anticipirana prigovora + odgovori
"Skupo je" / "Već imamo X" / "Nemam vremena". Odgovori u Leonardovom glasu.

## Close
Ako interes potvrđen → assumptive close: "Trebam 15 min vašeg vremena, možete li X ili Y?"

Pričaj hrvatski. Direktno. Ne hedge.`,
      prompt: `Pripremi brief za moj sljedeći discovery call. Koristi context iz SHARED KNOWLEDGE bloka (insights drugih AI agenata) koji ti je injectiran. Pretpostavi da je sljedeći sastanak najnoviji lead s pitch_tier='veteran' iz Holmes pipeline-a — ako trebaš najnovije info pretraži web za public info o klinici.

Ako iz konteksta NE vidiš konkretno koji je sljedeći meeting, daj generic playbook za "premium dentalna klinika Zagreb, vlasnik = doktor, 15+ leadova/mj, prvi cold call".`,
    },
  ],
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
