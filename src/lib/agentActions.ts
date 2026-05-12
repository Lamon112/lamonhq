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
  Phone,
  Mail,
  Smile,
  Ban,
  Scroll,
  Zap,
  Wallet,
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
  title: "Client HQ — pipeline + onboarding",
  description:
    "Centralni dashboard: svi leadovi sortirani po lifecycle stage-u (hot lead → discovery → negotiation → onboarding → live), sljedeća akcija + overdue alert per klijent, onboarding 6-step progress bar. Plus paid B2B + B2C klijenti i barter.",
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
- **Plima nije samo Riva (AI asistentica)** — to je 5 stupova u paketu: Riva (operativa) + Scripting + Branding + Marketing + PR. Riva diže pozive 24/7, mi paralelno gradimo brand i lead gen sustav.

### Usporedba s zapošljavanjem (UVIJEK uključi)
> "Za istu funkcionalnost morali biste zaposliti 5 ljudi — recepcionarku 24/7 (ili 3 u smjenama), marketing managera, brand dizajnera, copywriter/PR osobu i analitičara. U Hrvatskoj to je minimalno **€10.000-15.000 mjesečno na bruto plaće**, plus management overhead, plus 6-12 mjeseci dok ih zaposlite i obučite. **Plima dobivate za €1.497 mjesečno, sutra startate.** I rezultat je konzistentniji jer 1 sustav radi to što 5 ljudi nikad ne sinkronizira savršeno."
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
// RAID DEFENSE ACTIONS — triggered when player picks a defense in
// RaidDefenseModal. Each maps to a defense.aiActionId in src/lib/raids.ts.
// All are kind="research" so they ride the existing agentResearch
// Inngest pipeline (Sonnet 4.6 + optional web_search + Notion mirror).
// =====================================================================

const holmesCounterDmBait: AgentActionDef = {
  id: "holmes.counter_dm_bait",
  kind: "research",
  scope: "b2b",
  room: "holmes",
  title: "Counter-DM bait — honeypot lead list",
  description:
    "Konkurent te scout-ao. Generira fake 'pipeline list' (8-12 honeypot leadova) koje preko DM-a 'slučajno' otkriješ — rasipaš njihovo vrijeme + dezinformiraš.",
  notionLabel: "Custom",
  icon: Crosshair,
  estimatedSec: 60,
  estimatedCostEur: 0.04,
  systemPrompt: `Ti si Holmes — tactical intel agent. Generiraš counter-intelligence assets za zaštitu Lamon Agency outreach pipeline-a.`,
  prompt: `Counter-Scout raid je u tijeku. Generiraj HONEYPOT LEAD LIST koju ćemo "slučajno" pustiti preko DM-ova/email-a da konkurent vidi. Cilj: rasipa njihovo vrijeme + dezinformira o našem stvarnom pipeline-u.

Format:

# Honeypot Lead List — [datum]

## Leadovi (8-12 fake unosa, vjerodostojni ali izmišljeni)
| Klinika (fake) | Grad | Owner | Status | Last touch |
|---|---|---|---|---|
| ... | ... | "Dr. ..." | "Pre-discovery, replied" | "2026-05-..." |

Smjernice:
- Imena klinika realna ali NE postoje (kombiniraj generic + landmark, npr. "Dental Studio Maksimir", "Smile Clinic Tuškanac")
- Owner = realistična HR doktor imena (Dr. Petar X, Dr. Marija Y)
- Status = mix early-stage (cold, warm, replied, discovery scheduled)
- 1-2 oznake "VIP — €3K/mj proposal sent" da konkurent panicira

## Distribution plan
- Plant via koji kanal (LinkedIn DM, Apollo email export "leak", Notion shared workspace dropped)
- Kako učiniti vjerodostojnim (timing, izvor)

## Risk mitigation
- Što ako pravi prospect vidi listu? (svi su fake, prepoznatljivi po nepostojanju)

TAGS: counter-intel, honeypot, op-sec`,
};

const commsChurnRescueCall: AgentActionDef = {
  id: "comms.churn_rescue_call",
  kind: "research",
  scope: "b2b",
  room: "comms",
  title: "Churn rescue — osobni poziv vlasniku",
  description:
    "Klijent pokazuje churn signale. AI piše 3-section call script: opening hook, top 3 talking points specifični za klijenta, soft re-commit close.",
  notionLabel: "Custom",
  icon: Phone,
  estimatedSec: 75,
  estimatedCostEur: 0.05,
  systemPrompt: `Ti si Comms agent — pišeš call script-ove za Leonarda u Lamon-ovom personalnom glasu (warm, direktan, hrvatski formalno "Vi"). Cilj: spasiti klijenta bez popust pristupa.`,
  prompt: `Klijent pokazuje churn signale (booking volume pao, missed escalations, last touch >14 dana). Generiraj OSOBNI POZIV SCRIPT za vlasnika klinike. Kratko, sadržajno, ne pitchy.

Format:

# Rescue Call — [klijent]

## Kontekst (Leonardo čita prije poziva, 30 sec)
- Što se dogodilo (signal flag)
- Što vlasnik vjerojatno misli
- Što NE smije Leonardo reći

## Opening (prvih 30 sec)
"Dr. [X], javljam vam se jer sam primijetio [konkretan signal]. Htio sam pitati direktno — kako stvari izgledaju s vaše strane?"

## Top 3 Talking Points
1. [Konkretan win iz zadnjeg mjeseca koji su možda zaboravili — broj poziva spasenih, booking conversion improvement]
2. [Honest acknowledgment što ne radi — ne hide, vlasnik to već zna]
3. [Sljedećih 30 dana plan — 1-2 konkretne stvari koje ćemo promijeniti]

## Close (assumptive re-commit)
"Predlažem da ovaj tjedan napravimo X. Slažete li se?"

## Anti-objections
- "Razmišljamo pauzirati" → ...
- "Drugi vendor je nudio jeftinije" → ...
- "Kolega/ica je nezadovoljna" → ...

## Po pozivu (debrief Leonardo zapisuje)
- Što je pravi razlog churn-a?
- Da li je save hot/warm/cold?

TAGS: churn, rescue, retention`,
};

const commsChurnDiscountEmail: AgentActionDef = {
  id: "comms.churn_discount_email",
  kind: "research",
  scope: "b2b",
  room: "comms",
  title: "Churn rescue — discount koncesija email",
  description:
    "Drafta empathetic email klijentu sa −€50/mj 3-mjesečnom koncesijom. Frame-a kao 'partnership investment', ne kao popust.",
  notionLabel: "Custom",
  icon: Mail,
  estimatedSec: 60,
  estimatedCostEur: 0.04,
  systemPrompt: `Ti si Comms agent — drafta retention email-ove za Lamon Agency. Glas: warm, partnerski, ne defenzivan, hrvatski formalno "Vi". Discount je strateška investicija u dugogodišnji odnos, ne ustupak.`,
  prompt: `Drafta DISCOUNT KONCESIJA EMAIL klijentu (vlasnik klinike) koji pokazuje churn signale. Nudimo −€50/mj na 3 mjeseca. Frame: ovo je naša investicija u njihov uspjeh, ne popust.

Format:

# Email draft — [klijent]
**Subject:** [Tri opcije — A, B, C — od kojih Leonardo bira]
**To:** [vlasnik]
**From:** Leonardo Lamon <leonardo@lamon.hr>

[Email tijelo, 150-200 riječi MAX, struktura:]
- Otvaranje (1 rečenica): osobno + acknowledgment što vidim
- Što sam vidio (2-3 rečenice): konkretni signali, bez floweri
- Naša odgovornost (1-2 rečenice): što sam mogao učiniti bolje
- Prijedlog (3-4 rečenice): −€50/mj sljedeća 3 mjeseca + jedna konkretna stvar koju mijenjamo (npr. tjedna check-in poziva, custom report)
- Close: "Hoćemo li nazvati ovaj tjedan? Predlažem [konkretan dan/sat]."

## Anti-pattern checklist (Leonardo provjeri prije slanja)
- [ ] Ne ispričava se previše (max 1 rečenica)
- [ ] Ne nudi popust kao prvi potez (frame je investicija)
- [ ] Ne pita "kako ste?" (premalo direktno za situaciju)
- [ ] Ima konkretan next step (poziv, ne nastavak email-a)

## Follow-up plan
- Ako odgovori za 24h: ...
- Ako ne odgovori 48h: ...
- Ako odbije discount: ...

TAGS: churn, retention, email-draft`,
};

const commsChurnLoyaltyGift: AgentActionDef = {
  id: "comms.churn_loyalty_gift",
  kind: "research",
  scope: "b2b",
  room: "comms",
  title: "Churn rescue — loyalty gift + ručno pismo",
  description:
    "Lista 3 gift opcije (€20-€40 budget) prikladne za HR doktora-vlasnika + draft handwritten letter (10-15 rečenica) koji ide uz gift.",
  notionLabel: "Custom",
  icon: Sparkles,
  estimatedSec: 60,
  estimatedCostEur: 0.04,
  systemPrompt: `Ti si Comms agent — kustos personal touch gestova. HR business culture (vlasnik dental klinike, 40-55, vjerojatno muški, voli kvalitetu, cijeni gesture preko cijene).`,
  prompt: `Drafta LOYALTY GIFT PACKAGE za klijenta koji pokazuje churn signale. Budget €20-€40. Mora biti memorable, ne generic.

Format:

# Loyalty Gift — [klijent]

## Gift opcije (Leonardo bira 1)

### A) Premium opcija (€35-40)
- [Što] · [Gdje kupiti u Zagrebu] · [Zašto baš ovo za vlasnika klinike]

### B) Mid opcija (€25-30)
- ...

### C) Budget opcija (€18-22)
- ...

Smjernice za izbor:
- Ne generic vino (svatko ga šalje)
- Specifično lokalno (HR proizvod, Zagreb shop)
- Konekcija na zubarsku/health niche (premium toothbrush set, organic tea, espresso beans od artisan roastery)

## Handwritten Letter Draft

[10-15 rečenica, hrvatski, formalno "Vi", glasom Leonarda Lamona. Struktura:]
- Otvaranje s konkretnim podsjetnikom (zajednički razgovor, prvi sastanak)
- Acknowledgment: što sam naučio od njih u zadnjih X mjeseci
- Konkretan win koji je njihova klinika ostvarila zahvaljujući suradnji
- "Ovaj mali znak…" (intro gift)
- Close: "Drago mi je što gradimo ovaj odnos. — Leonardo"

## Delivery checklist
- Pakiraj sam, ne online (njihov adresant ne treba znati)
- Ručno potpiši (penmenship matters)
- Pošalji ranom srijedom (stigne četvrtak/petak — pozitivan kraj tjedna)

TAGS: retention, personal-touch, loyalty`,
};

const commsSarcasticPitchReply: AgentActionDef = {
  id: "comms.sarcastic_pitch_reply",
  kind: "research",
  scope: "b2b",
  room: "comms",
  title: "Vendor swarm — sarkastičan pitch reply",
  description:
    "SaaS cold pitch ti je u inbox-u. AI generira 3 sarkastična ali profesionalno-britka odgovora (kratka, witty, anglo-style) koje Leonardo paste-a.",
  notionLabel: "Custom",
  icon: Smile,
  estimatedSec: 30,
  estimatedCostEur: 0.02,
  systemPrompt: `Ti si Comms agent — meister of the pleasantly-savage email reply. Glas: sharp, brief, dosadno-ne-pomaže-im. Cilj: vendor odustaje + možda postane fan tvog stila.`,
  prompt: `Vendor swarm raid: SaaS/agency cold pitch je stigao. Drafta 3 SARKASTIČNA REPLY OPCIJE (Leonardo bira 1). Engleski jer su pitcheri obično USA SaaS.

Format:

# Sarcastic Reply Drafts

## Opcija A — "The Polite Roast" (mid spice)
[3-5 rečenica. Acknowledge their pitch, point out the irony specific to what they sent, decline gracefully but with bite.]

## Opcija B — "The Mirror" (high spice)
[Quote their own marketing-speak back at them with mild absurdism. 4-6 rečenica.]

## Opcija C — "The Question" (subtle, philosophical)
[1-2 questions that make them realize their email was bad. No insult, just clarity.]

## Smjernice za sve 3 opcije
- Ne fail-safe ("nije nam relevantno") — to je bezobrazno
- Ne ad-hominem (ne napadaj njih osobno, samo metodu)
- Otvori vrata za buduce ako se predomjene ("ako ikada vidite koju nišu konkretno mojoj agenciji…")
- Sign-off uvijek "— Leonardo"

## Risk note
Ako pošiljatelj dođe iz velikog konkurenta (npr. Vapi, ElevenLabs sales rep) — koristi opciju C (najsigurnija).

TAGS: comms, vendor-swarm, sarcasm-with-class`,
};

const commsVendorFilterSetup: AgentActionDef = {
  id: "comms.vendor_filter_setup",
  kind: "research",
  scope: "b2b",
  room: "comms",
  title: "Vendor swarm — Gmail auto-filter setup",
  description:
    "Generira točan setup za Gmail filter koji blokira tipične SaaS/agency cold pitche (CSV format pravila + step-by-step Gmail UI walkthrough).",
  notionLabel: "Custom",
  icon: Ban,
  estimatedSec: 45,
  estimatedCostEur: 0.03,
  systemPrompt: `Ti si Comms agent — operativni op-sec helper. Generiraš konkretne Gmail filter rules (ne savjete, ne "pokušaj X"). Sve mora biti copy-paste ready.`,
  prompt: `Vendor swarm raid. Generiraj GMAIL FILTER SETUP koji uklanja 90% SaaS/agency cold pitch-eva s lamonorganization@gmail.com inbox-a.

Format:

# Gmail Auto-Filter Setup — Vendor Swarm Defense

## Rule Set (5-7 pravila, by priority)

### Pravilo 1: Auto-archive cold SaaS pitch
**Search criteria** (paste in Gmail "Has the words"):
\`\`\`
{from:(*@*.io) from:(*@hubspot.com) from:(*@apollo.io) from:(noreply@*) "scale your agency" OR "10x your" OR "growth hack" OR "book a demo" OR "quick chat" -from:(@apollo.io to:lamonorganization)}
\`\`\`
**Action:** Skip Inbox + Apply label "Cold Pitch" + Mark as read

### Pravilo 2-7: ...

## Setup walkthrough (Gmail web UI)
1. Otvori gmail.com → kliknite ⚙ → All settings → Filters tab
2. ...

## Whitelist exceptions (NE smiješ blokirati)
- @anthropic.com, @openai.com, @vercel.com, @supabase.io (alat vendori koje koristimo)
- @apollo.io (jer plaćamo plan)
- klijenti — list specifičnih domena

## Maintenance
- Weekly review "Cold Pitch" label za 30s, restore false positives
- Mjesečno: prošlo arhiv + delete >90 dana

TAGS: ops, gmail, automation`,
};

const atlasReviewPublicResponse: AgentActionDef = {
  id: "atlas.review_public_response",
  kind: "research",
  scope: "b2b",
  room: "atlas",
  title: "Bad review — javni odgovor",
  description:
    "Bad-review goblin: Atlas drafta empathetic, profesionalan public response na 1★ recenziju. 2-3 verzije (kratak/srednji/dug), uvijek bez defenzivnosti.",
  notionLabel: "Custom",
  icon: Scroll,
  estimatedSec: 45,
  estimatedCostEur: 0.03,
  systemPrompt: `Ti si Atlas — brand reputation agent. Glas: kalmer, ne-defenzivan, profesionalno-topao. Klijent vidi tvoj odgovor i misli "wow ovo je odrasla osoba".`,
  prompt: `Bad-review raid. Drafta JAVNI ODGOVOR na 1★ recenziju ("AI je hladan i nikad ne daje cijene, gubitak vremena"). Drafta 3 verzije.

Format:

# Public Response Drafts — 1★ recenzija

## Verzija A — Kratka (60-80 riječi)
[Jednostavna empatija + acknowledgment + invite na private follow-up. Bez objašnjavanja zašto AI ne daje cijene.]

## Verzija B — Srednja (120-150 riječi)
[Empatija + konkretno objašnjenje zašto cijena ovisi o pregledu (medical-legal reason) + invite na konzultaciju.]

## Verzija C — Duga (200-250 riječi)
[Empatija + edukativan kontekst (zašto premium klinika ne daje cijene preko poziva) + konkretan invite + ime osobe za kontakt.]

## Smjernice za sve verzije
- Otvori s "Hvala vam što ste podijelili svoje iskustvo"
- NE počinji s "Razumijemo vašu frustraciju" (cliché)
- NE pravdaj AI (uvijek smo "naš tim" ili "naša klinika")
- Završi s konkretnim sljedećim korakom (broj telefona, ime, kalendar link)

## Tone-of-voice samples (CRO premium klinika 2026)
- "Naš pristup je..." ne "naš sistem je..."
- "Konzultacija s doktorom" ne "pregled"
- "Investicija u zdravlje" ne "trošak"

## Po objavi
- Snimi screenshot odgovora
- Spremi za "social proof" template (drugima pokaži kako reagiraš na kritike)

TAGS: brand, reviews, public-response`,
};

const atlasReviewDmOutreach: AgentActionDef = {
  id: "atlas.review_dm_outreach",
  kind: "research",
  scope: "b2b",
  room: "atlas",
  title: "Bad review — privatni DM reviewer-u",
  description:
    "Drafta privatni DM/email reviewer-u (ako je identifiable) — empatičan, nudi konzultaciju, traži priliku da popravimo iskustvo. Cilj: voluntary review removal.",
  notionLabel: "Custom",
  icon: Mail,
  estimatedSec: 45,
  estimatedCostEur: 0.03,
  systemPrompt: `Ti si Atlas — brand recovery agent. Pišeš human-to-human poruke koje izlaze iz brand defaults (ne-pita-za-removal, samo-poprava-iskustva-i-removal-followuje-prirodno).`,
  prompt: `Bad-review raid. Reviewer je identifiable (npr. javni Google profil). Drafta PRIVATNI DM koji nudi recovery iskustvo.

Format:

# Private DM/Email Draft — [reviewer name placeholder]
**Channel:** Google Maps message / LinkedIn / email (ovisi o platformi)
**To:** [reviewer]
**From:** Leonardo Lamon (NE klinika owner — više osobno)

[Poruka, 80-120 riječi, struktura:]
- Self-intro: "Vidio sam vašu recenziju" (NE "primijetio")
- Acknowledgment: konkretan prošli iskustvo bez excuse
- Ponuda: "Volio bih vas pozvati na 15-min besplatnu konzultaciju s [konkretan doktor] da bismo razgovarali o tome što ste tražili"
- Soft framing: "Recenzija ostaje vaša — bez očekivanja da je mijenjate. Samo želim da imate priliku doživiti drugačiji susret."
- Close: konkretan kalendar link

## Smjernice
- NIKAD ne pitaj za removal direktno (toxic + protiv Google ToS)
- Ako oni sami ponude promijeniti recenziju → "Hvala, samo ako se osjećate tako"
- Sign-off: "— Leonardo Lamon, suosnivač Lamon Agency"

## Anti-pattern checklist
- [ ] Ne defenzivan ton
- [ ] Ne pravdanje AI agenta
- [ ] Ne "hvala što ste recenzirali" (insulting nakon 1★)
- [ ] Konkretna osoba se javlja, ne klinika

## Backup plan ako reviewer ignorira (7 dana)
- Plan B: Atlas drafta drugi, kraći ping
- Plan C: ako i dalje ignorira → focus na drown_in_good_reviews

TAGS: brand, reviews, dm-outreach`,
};

const stewardReview5StarRequest: AgentActionDef = {
  id: "steward.review_5star_request",
  kind: "research",
  scope: "b2b",
  room: "steward",
  title: "Bad review — drown in 5★ batch request",
  description:
    "Generira email/SMS template + lista 5 happy klijenata za batch send tražeći Google review. Cilj: vratiti prosjek na 4.8+ kroz volume.",
  notionLabel: "Custom",
  icon: Sparkles,
  estimatedSec: 60,
  estimatedCostEur: 0.04,
  systemPrompt: `Ti si Steward agent — manager klijent retention-a. Pišeš review request poruke koje su tako personal i jednostavne da klijenti stvarno odgovore.`,
  prompt: `Bad-review raid: trebamo "drown in 5★" — pingnuti 5-7 happy klijenata da ostave Google review. Generiraj template + listu kandidata.

Format:

# 5★ Review Batch Push

## Email/SMS Template (CRO, klijent-friendly)
**Subject (email):** Imate li 60 sekundi?
**SMS varijanta (160 chars):** ...
**Email body (80-100 riječi):**
- Otvori s konkretnim podsjetnikom (njihov treatment, datum, doktor)
- Ask: "Ako imate 60 sekundi, link je ovdje: [Google review link]"
- Reason: "Nedavno smo dobili kritičnu recenziju i trudimo se da budući pacijenti vide cjelovitu sliku"
- Sign-off: "Hvala unaprijed, — Leonardo"

## Direktan link template
- Google: https://search.google.com/local/writereview?placeid=[PLACE_ID_PLACEHOLDER]
- (Leonardo zamjeni s pravim Place ID-em iz Google Business Profile)

## Kandidati za batch (5-7 happy klijenata, kriteriji)
| Klijent | Zadnji pozitivan signal | Kanal | Spomenuti specific |
|---|---|---|---|
| [Klijent A] | "Dr X je odličan — dijete je oduševljeno" | SMS | dr X + dijete |
| ... | ... | ... | ... |

(Trenutno 0 plaćenih klijenata — daj template + plan kad prvi 5 paying klijenata bude live.)

## Timing
- Pošalji utorak/srijeda 19h-21h (najveći open rate)
- Razmakni po 1 klijent / 30 min (ne baci sve odjednom — Google detektira batch)
- Cilj: 3-5 novih 5★ unutar 48h → prosjek vraćen

## Anti-pattern
- NE: "Bili biste tako ljubazni…" (pretjerano formalno)
- NE: "Nedavno smo imali problem…" (siguran turn-off)
- NE: tjedan dana follow-up ako nisu odgovorili (zaboravi i probaj sljedeći mjesec)

TAGS: brand, reviews, retention, batch-outreach`,
};

const jarvisOutageFailoverRunbook: AgentActionDef = {
  id: "jarvis.outage_failover_runbook",
  kind: "research",
  scope: "b2b",
  room: "jarvis",
  title: "Outage — failover runbook (Vapi → mobitel)",
  description:
    "Vapi/Supabase down. Generira step-by-step runbook za prebacivanje incoming poziva s Vapi broja na Leonardov mobitel preko Twilio fallback (call forwarding).",
  notionLabel: "Custom",
  icon: Zap,
  estimatedSec: 60,
  estimatedCostEur: 0.04,
  systemPrompt: `Ti si Jarvis — mission-critical ops agent. Pišeš runbook-ove kao SRE: točan, nuneričan, no fluff. Korisnik je u panici, mora reagirati za 5 minuta.`,
  prompt: `Outage Beast raid: Vapi/Supabase health drop, active calls failing. Generiraj FAILOVER RUNBOOK (forward na Leonardov mobitel) — step-by-step.

Format:

# Outage Failover Runbook — [Service]

## Trigger condition
Service: [Vapi / Supabase / ElevenLabs] (ovisno o context-u raid-a)
Status: [degraded / down]

## Pre-checks (30 sec)
1. Provjeri https://status.vapi.ai (ili relevantni status page)
2. Provjeri Telegram alerts (Jarvis bot) za prethodne pingove
3. Procijeni: incident < 5 min ILI > 5 min?

## Failover steps (3-5 min total)
**Step 1:** Otvori Vapi Dashboard → Phone Numbers → tvoj demo broj
**Step 2:** Klikni "Edit" → polje "Fallback destination"
**Step 3:** Postavi na "Forward to phone number" → Leonardov mobitel: +385 91 XXX XXXX
**Step 4:** Save → test call iz drugog telefona da provjeriš
**Step 5:** Pošalji proactive client notification (vidi action: comms.outage_proactive_notify)

## Vapi Twilio fallback config (advanced)
- TwiML XML template za custom forwarding script:
\`\`\`xml
<Response>
  <Say voice="alice" language="hr-HR">Trenutni AI sustav nije dostupan, prebacujem vas na ljudski tim.</Say>
  <Dial>+385 91 XXX XXXX</Dial>
</Response>
\`\`\`

## Recovery (kad service vrati health)
1. Vrati fallback na "AI Assistant" u Vapi Dashboard
2. Testiraj 2 demo poziva
3. Update Telegram channel s post-mortem

## Post-mortem template
- Što je puklo, kada, koliko trajalo
- Koliko poziva propušteno (Vapi logs)
- Koliko klijenata javljeno proaktivno
- Što popravljamo da se ne ponovi (preventive action)

TAGS: ops, outage, failover, sre`,
};

const commsOutageProactiveNotify: AgentActionDef = {
  id: "comms.outage_proactive_notify",
  kind: "research",
  scope: "b2b",
  room: "comms",
  title: "Outage — proactive client notify",
  description:
    "Outage je živ. Drafta hitan email/SMS svim aktivnim klijentima: što se dogodilo, što radimo, kada očekujemo recovery, kontakt za hitne slučajeve.",
  notionLabel: "Custom",
  icon: Mail,
  estimatedSec: 45,
  estimatedCostEur: 0.03,
  systemPrompt: `Ti si Comms agent — incident communicator. Glas: smiren, faktualni, no excuses, no panic. Klijent treba osjetiti "ovi ljudi to imaju pod kontrolom čak i kada nešto pukne".`,
  prompt: `Outage Beast raid: Vapi/Supabase down, Riva degraded. Drafta HITAN PROACTIVE NOTIFICATION svim aktivnim klijentima.

Format:

# Outage Notification — [Service Name] [Date]

## Email draft (140-180 riječi)
**Subject:** [3 opcije: A "Quick update on [Service]" / B "Trenutno tehnički incident — pod kontrolom" / C "[Klinika], javljam se proaktivno"]
**To:** Svi aktivni klijenti (BCC, ne CC)
**From:** Leonardo Lamon <leonardo@lamon.hr>

[Tijelo:]
- Otvaranje (1-2 rečenice): "Javljam vam se proaktivno — [service] ima trenutno tehničke probleme koje utječu na Rivu."
- Što se dogodilo (1-2 rečenice): faktualno, ne tehnički žargon
- Što radimo (2-3 rečenice): konkretno (failover aktiviran, pozivi se forward-aju, monitor)
- Što vi trebate raditi (1 rečenica): "Ništa — sustav radi, samo s blagim delay-om" ILI konkretne instrukcije
- Kada očekujemo recovery (1 rečenica): timeframe (npr. "u sljedećih 30-60 min" ako znamo)
- Hitan kontakt: Leonardo +385 91 XXX, dostupan ovaj sat
- Sign-off: "Update slijedi čim recovery potvrđen — Leonardo"

## SMS varijanta (160 chars max)
"Lamon: [Service] tehnički incident, Riva degraded ali pozivi forward-aju se na nas. ETA recovery 30 min. Hitno: 091 XXX XXX. — Leonardo"

## Distribution
- Email: bcc svim aktivnim klijentima
- SMS: samo onima koji su pristali na SMS (proveri integration prefs)
- Telegram (ako klijent koristi): ad-hoc message

## Post-recovery follow-up
- Ako recovery <30 min: jedan "✓ Sve radi" SMS
- Ako recovery >30 min: post-mortem email + besplatan kredit (npr. -10% next month)

TAGS: ops, incident-comms, transparency`,
};

const aegisGdprDossier: AgentActionDef = {
  id: "aegis.gdpr_dossier",
  kind: "research",
  scope: "b2b",
  room: "aegis",
  title: "GDPR probe — compliance dossier (web_search)",
  description:
    "AZOP probe stigao. Aegis koristi web_search da pull-a najnoviji AZOP requirements, generira full compliance dossier: consent flow text, DPA template, retention policy, breach response plan.",
  notionLabel: "Custom",
  icon: Scroll,
  estimatedSec: 240,
  estimatedCostEur: 0.18,
  systemPrompt: `Ti si Aegis — compliance & risk officer. Tvoj output mora biti spreman za AZOP submission, ne za internal use. Točnost > brzina. Citiraj zakon (HR + EU GDPR Art X) gdje primjenjivo.`,
  prompt: `GDPR Probe raid: AZOP traži dokaze da Riva voice flow ima pravilan consent + retention. Generiraj FULL COMPLIANCE DOSSIER za submission.

Pretraži web (max 5 calls) za:
- Najnovija AZOP guidance za AI/voice processing health-related podataka (2025-2026)
- Croatian Zakon o zaštiti pacijenata + GDPR Art 9 (special category data)
- Vapi + ElevenLabs + Anthropic data residency disclosures (gdje se procesiraju podatci)

Format:

# GDPR Compliance Dossier — Lamon Agency / Riva Voice AI

## 1. Executive Summary (½ stranice)
- Što je Riva, koje podatke procesira, gdje
- 3 ključne compliance kontrole
- Risk score (low/medium/high)

## 2. Lawful Basis (Art 6 + Art 9)
- Tvrdnja: koja je lawful basis za processing (Art 6(1)(b) ugovor + Art 9(2)(h) medical care)
- Dokaz: gdje je dokumentirano (DPA s klinikom)

## 3. Consent Flow (sub-sekcija)
- **Trenutni Riva script CRO:** [draft 2-3 rečenice na početku poziva, "Poziv se snima radi kvalitete i sigurnosti, slažete li se? Ako ne — prebacit ću vas na recepcionarku."]
- **Proof of consent:** kako se snima (audio + transcript timestamp)
- **Withdrawal:** kako pacijent može povući consent

## 4. Data Map (gdje podaci putuju)
| Field | Source | Storage | Retention | Processor |
|---|---|---|---|---|
| Glasovna snimka | Pacijent | Vapi (US/EU) | 30 dana | Vapi LLC |
| Transcript | OpenAI gpt-4o-transcribe | Anthropic (EU) | 30 dana | Anthropic, Inc. |
| Booking podaci (ime, broj, tretman) | Riva | Klinika EasyBusy / Calendly | 2 godine | Klinika data controller |

## 5. DPA Template (klinika ↔ Lamon)
[Standard EU DPA bullet points, prilagođen za AI voice processor]

## 6. Retention Policy
- Glasovne snimke: 30 dana auto-delete
- Transcript: 30 dana auto-delete
- Booking podaci: 2 godine (Zakon o zaštiti pacijenata Art X)

## 7. Breach Response Plan
- Detection (within 24h)
- Notification AZOP (within 72h, GDPR Art 33)
- Notification affected pacijenti (Art 34, ako visok risk)

## 8. Data Subject Rights Procedure
- Access request (Art 15) — process + max 30 dana
- Erasure (Art 17) — kako brišemo iz Vapi/Anthropic
- Portability (Art 20) — JSON export

## 9. Vendor / Processor agreements
- Vapi: link na njihov DPA
- Anthropic: link na njihov DPA
- ElevenLabs: link na njihov DPA

## 10. Submission Cover Letter (1 stranica)
[Drafta formalan CRO odgovor AZOP-u: "U odgovoru na vaš upit od [datum], dostavljam dossier o GDPR usklađenosti naše AI voice usluge…"]

## 11. AZOP Citations (provjerene)
[Lista konkretnih AZOP guidances + članaka GDPR / HR Zakona — sve s URL izvorima iz web search-a]

TAGS: gdpr, compliance, azop, dossier`,
};

const commsGdprLawyerEngagement: AgentActionDef = {
  id: "comms.gdpr_lawyer_engagement",
  kind: "research",
  scope: "b2b",
  room: "comms",
  title: "GDPR probe — lawyer engagement email",
  description:
    "Drafta email za HR lawyera (data privacy) s case summary, expected scope of work, budget €200, deadline 72h. Lista 3 preporučene HR firme.",
  notionLabel: "Custom",
  icon: Wallet,
  estimatedSec: 60,
  estimatedCostEur: 0.04,
  systemPrompt: `Ti si Comms agent — pišeš profesionalne business inquiries. Glas: kompetentan, koncizan, daje punu sliku za fast quote.`,
  prompt: `GDPR Probe raid: angažiramo HR lawyera (data privacy specialty) da odgovori na AZOP probe. Drafta engagement email + lista preporučenih firmi.

Format:

# Lawyer Engagement Email + Vendor Shortlist

## Email Draft
**Subject:** Hitna konzultacija — AZOP GDPR probe (AI voice processor)
**To:** [lawyer]
**From:** Leonardo Lamon <leonardo@lamon.hr>
**Body (200-250 riječi):**
- Kontekst (3 rečenice): Lamon Agency, Riva = AI voice za dental klinike, AZOP poslao spot-check
- Konkretan problem: AZOP traži [X], rok 72h
- Što tražim: prepare dossier + submission letter, max 4h work
- Budget: €200 (firm cap, prihvaćam fixed-fee)
- Timeline: response danas, dossier u 48h, submission u 72h
- Materijali: imam draft dossier (Aegis-generated), tražim review + legal polish
- Ako interes: "Predlažem 30-min discovery call ovaj sat — [Calendly link]"

## Recommended HR Firms (top 3 za data privacy, 2025-2026)
[Pretraži web za top hrvatski data-privacy lawyere/firms — Zagreb-based, GDPR specialty]
| Firma | Kontakt | Specialty | Indikativna cijena | Note |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Backup plan
- Ako prvi lawyer ne odgovori za 4h: pošalji 2. + 3. paralelno
- Ako budget ovrijedi €200: vrati se na aegis.gdpr_dossier (sam compile-aj)

TAGS: legal, gdpr, vendor-engagement`,
};

// =====================================================================
// Action catalog — keyed by room
// =====================================================================
export const ACTION_CATALOG: Record<AgentId, AgentActionDef[]> = {
  nova: [novaDeepBizImprovement, novaAiAutomatableBiz],
  holmes: [holmes10LeadsPipeline, holmesCounterDmBait],
  mentat: [mentatCouncil],
  steward: [stewardClientsView, stewardClientStatsView, stewardOnboardingKit, stewardReview5StarRequest],
  treasury: [treasuryRevenueView],
  jarvis: [jarvisTasksView, jarvisOutageFailoverRunbook],
  atlas: [atlasBookingView, atlasReviewPublicResponse, atlasReviewDmOutreach],
  aegis: [aegisHealthPulse, aegisQbrBrief, aegisChurnRadar, aegisGdprDossier],
  forge: [],
  comms: [
    commsRoiCalculator,
    commsChurnRescueCall,
    commsChurnDiscountEmail,
    commsChurnLoyaltyGift,
    commsSarcasticPitchReply,
    commsVendorFilterSetup,
    commsOutageProactiveNotify,
    commsGdprLawyerEngagement,
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

Lamon Agency = Leonardo Lamon, prodaje **Plima** paket — premium growth partner za privatne klinike u Croatia. **5 stupova:** Riva (AI asistentica voice+text), Scripting, Branding, Marketing/Lead Gen, PR/Pozicioniranje. Tier-ovi: Mreža €797/mj (text-only entry) · Voice €1.497/mj (default, voice + text + brand + organic) · Premium €2.497/mj (Voice + paid ads + multi-loc + custom voice + tjedni review). Pitch hook: zamijeniš 5 zaposlenika (€10-15K/mj bruto u HR) za €1.497/mj.

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
  strateg: [],
  pulse: [],
  riva: [],
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
