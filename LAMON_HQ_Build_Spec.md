# 🏢 LAMON HQ — Build Specification

> **Project**: Interaktivna gamificirana app za upravljanje Lamon Agency — vizualni ecosystem koji izgleda i radi kao Fallout Shelter.
> **Phase**: MVP (Razina 🅰️ — visual + hybrid sim/real data)
> **Build approach**: Claude Code (terminal-based AI coding assistant)
> **Owner**: Leonardo Lamon (@lamon.leonardo · lamon.io)
> **Last updated**: 10.5.2026

---

## 1. PROJECT VISION

Lamon Agency vodi 2 paralelna biznisa pod istim brand-om:
- **B2B**: Premium AI implementacija za klinike (Rast paket: 1.997€ setup + 1.497€/mj)
- **B2C**: Mentorstvo za coacheve s pričom (€1500/mj — Dorijan iznimka kao rev share)
- **Cilj**: 30K€/mj MRR za 6 mjeseci

**Lamon HQ** je interaktivna gamificirana web app koja vizualizira sve operacije agencije kao zgradu s sobama. Svaka soba = AI agent (Phase 2 stvarno radi posao, Phase 1 simulira) koji vidiš živo na ekranu. Vraćaš se aplikaciji jer je **interaktivna i motivirajuća**, ne sterilna kao Notion dashboard.

**Visual reference**: Fallout Shelter (2D side-view, multi-floor building, characters walking between rooms, resource counters at top).

---

## 2. TECH STACK

| Layer | Tehnologija | Razlog |
|---|---|---|
| **Framework** | Next.js 14 (App Router) + TypeScript | Industry standard, brz dev, deployable na Vercel |
| **UI** | React + Tailwind CSS | Brza iteracija, custom design language |
| **Animacija** | Framer Motion | Smooth transitions, character movement |
| **State** | Zustand | Lightweight, simple persistence |
| **Database** | Supabase (Postgres + Auth) | Free tier OK za MVP, real-time ready |
| **ORM** | Direct Supabase client (no ORM za MVP) | Brz iteracija |
| **Building visualization** | HTML + CSS Grid + Framer Motion | Fallout-style 2D nije potreban Pixi.js — čišće s HTML |
| **Deploy** | Vercel | Free tier, auto-deploy iz GitHub-a |
| **Email service** *(Phase 2)* | Resend | Za outreach agent |
| **AI integracija** *(Phase 2)* | Anthropic Claude API + OpenAI | Za real agents |

**Neka NE bude:**
- Three.js / Pixi.js (over-engineering za 2D side-view)
- React Native (web only za sad)
- Custom backend (Supabase pokriva sve)
- ORM (Prisma) (overkill za MVP)

---

## 3. VISUAL DESIGN — Fallout Shelter Adaptacija

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  TOP RESOURCE BAR (sticky)                                │
│  💰 MRR: 12.450€ │ 👥 Clients: 6 │ 📥 Leads: 23 │ ...  │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ ROOM 1   │ │ ROOM 2   │ │ ROOM 3   │  ← FLOOR 3      │
│  │ Pipeline │ │ Calendar │ │ Reports  │  Operations Hub │
│  └──────────┘ └──────────┘ └──────────┘                 │
│                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ ROOM 1   │ │ ROOM 2   │ │ ROOM 3   │  ← FLOOR 2      │
│  │Lead Score│ │Analytics │ │Competitor│  Intelligence Bay│
│  └──────────┘ └──────────┘ └──────────┘                 │
│                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ ROOM 1   │ │ ROOM 2   │ │ ROOM 3   │  ← FLOOR 1      │
│  │ Outreach │ │ Discovery│ │ Closing  │  B2B Revenue   │
│  └──────────┘ └──────────┘ └──────────┘     Factory     │
│                                                            │
├──────────────────────────────────────────────────────────┤
│  BOTTOM ACTION BAR                                         │
│  [+ Add Lead] [+ Send Outreach] [✏️ Manual Entry]        │
└──────────────────────────────────────────────────────────┘
```

### Visual style
- **Color palette**: Lamon brand (gold #C9A84C + black #0A0A0A + cream)
- **Atmosphere**: Premium dark UI, subtle gold accents, modern flat (NE retro pixel art)
- **Rooms**: Each room = card s rounded corners, dark BG, gold border on hover
- **Characters**: Small SVG avatars (1-2 per room), idle/working animation states
- **Animations**:
  - Walking between rooms (left/right per floor)
  - Typing on laptop (mali "..." indicator)
  - Sending email (envelope flies from room to top bar)
  - Money increment (floating "+€500" with sparkle)
- **Sounds** (optional, mute toggle): subtle ka-ching on revenue, swoosh on action
- **Background**: Subtle gold dot grid (matching lamon.io brand)

### Resource bar (top, always visible)
```
💰 MRR: €12.450/mj   ↗ +€1.497    │
👥 Active: 6 klijenata             │  Goal: 30K€/mj
📥 Leads: 23 (Hot: 5)              │  Progress: ████░░░░ 42%
📊 Content: 12 posts ovaj mjesec   │
```

---

## 4. DATA SCHEMA (Supabase)

### Tabele

```sql
-- Users (auth)
profiles (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamp
)

-- Clients
clients (
  id uuid PRIMARY KEY,
  name text,
  type text, -- 'b2b_clinic' | 'coach_mentor' | 'affiliate'
  status text, -- 'active' | 'onboarding' | 'paused' | 'churned'
  monthly_revenue decimal,
  start_date date,
  notes text,
  created_at timestamp
)

-- Leads / Pipeline
leads (
  id uuid PRIMARY KEY,
  name text,
  source text, -- 'linkedin' | 'instagram' | 'tiktok' | 'referral'
  niche text, -- 'stomatologija' | 'estetska' | 'fizio' | 'ortopedija' | 'coach'
  icp_score int, -- 0-20
  stage text, -- 'discovery' | 'pricing' | 'financing' | 'booking' | 'closed' | 'lost'
  estimated_value decimal,
  next_action text,
  next_action_date date,
  notes text,
  created_at timestamp
)

-- Content posts
content_posts (
  id uuid PRIMARY KEY,
  platform text, -- 'tiktok' | 'instagram' | 'youtube' | 'linkedin'
  post_url text,
  posted_at timestamp,
  views int,
  likes int,
  comments int,
  saves int,
  link_clicks int
)

-- Goals
goals (
  id uuid PRIMARY KEY,
  type text, -- 'monthly_mrr' | 'active_clients' | 'leads_per_week'
  target_value decimal,
  current_value decimal,
  deadline date
)

-- Tasks (daily ops)
tasks (
  id uuid PRIMARY KEY,
  title text,
  room text, -- 'outreach' | 'discovery' | 'closing' | 'analytics' | etc.
  status text, -- 'todo' | 'in_progress' | 'done'
  due_date date,
  completed_at timestamp,
  created_at timestamp
)

-- Activity log (for the visual "agents working" feel)
activity_log (
  id uuid PRIMARY KEY,
  room text,
  action text, -- 'lead_added' | 'email_sent' | 'meeting_booked' | etc.
  metadata jsonb,
  timestamp timestamp
)
```

---

## 5. MVP ROOMS — Detaljan Spec

### 🏭 FLOOR 1: B2B REVENUE FACTORY

**Floor description**: Place gdje se generira novi novac. 3 sobe pokrivaju cijeli funnel od leada do potpisanog deal-a.

#### Room 1A: **Outreach Lab** 🎯
- **Purpose**: Trackaj outreach effort
- **Visual**: Laptop sa typing animation, mali dwarf-character "Lamon" radi
- **Live data**:
  - Outreach poslano ovaj tjedan: 12 (cilj: 25)
  - Reply rate: 18%
  - Leads converted to discovery: 4
- **Click action**: Otvori panel
  - List of past outreach (sortable by date, niche, status)
  - "Add new outreach" button — bilježi: lead name, platform, message sent
  - Templates dropdown (predefinirane skripte)
- **Animation**: Kad klikneš "send", envelope odlije gore u "leads" counter

#### Room 1B: **Discovery Bay** 🤝
- **Purpose**: Trackaj discovery calls (Calendly bookings)
- **Visual**: Mali okrugli stol, 2 stolice
- **Live data**:
  - Discovery calls ovaj tjedan: 3
  - Show-up rate: 67%
  - Conversion to pricing stage: 2/3
- **Click action**: 
  - Lista zakazanih discovery calls
  - "Log past call" forma (lead, outcome, next step)
  - Notes per call

#### Room 1C: **Closing Room** 💼
- **Purpose**: Trackaj otvorene deals u final stage
- **Visual**: Handshake animacija, ceremonija
- **Live data**:
  - Open deals: 2 (Estetska klinika Zagreb 1.997€, Fizio Split 1.997€)
  - Pipeline value: 7.984€
  - Average days to close: 14
- **Click action**:
  - Lista deals s probability score
  - "Mark as closed-won" / "closed-lost" buttons
  - Auto-update MRR counter on close

---

### 🔬 FLOOR 2: INTELLIGENCE BAY

#### Room 2A: **Lead Scorer** 🧠
- **Purpose**: ICP scoring i kvalifikacija
- **Visual**: Mali "computer" sa scrolling data
- **Live data**:
  - Leadovi ovog tjedna: 23
  - Hot leads (score ≥15): 5
  - Cold leads (score <10): 12
- **Click action**:
  - Tabela svih leadova s ICP score (5 kriterija — lice branda, edge, premium, dokaz, brzina odluke)
  - "Score new lead" forma sa 5 checkbox-a
  - Export hot leads list

#### Room 2B: **Performance Analytics** 📊
- **Purpose**: Multi-platform content performance
- **Visual**: Mali grafovi koji se animiraju
- **Live data**:
  - Total views ovog mjeseca: 87.400
  - Best-performing post: TikTok Video 1 (13.2K views)
  - Avg engagement rate: 1.94%
- **Click action**:
  - Filter po platformi (TT/IG/YT/LinkedIn)
  - Sort posts by views/engagement
  - "Add new post" forma (URL, platform, snapshot stats)

#### Room 2C: **Competitor Watch** 👁
- **Purpose**: Track Bolutions + drugih AI agencija
- **Visual**: Telescope / monitoring screens
- **Live data**:
  - Tracked competitors: 3
  - New posts ovaj tjedan: 8
  - Pricing changes detected: 0
- **Click action**:
  - Lista konkurenata (Bolutions etc.)
  - Manual entry "competitor update" log

---

### 💼 FLOOR 3: OPERATIONS HUB

#### Room 3A: **Client Manager** 👥
- **Purpose**: Active client management
- **Visual**: Filing cabinet, mali rolodex
- **Live data**:
  - Active clients: 6
  - This week's tasks: 8 (3 done, 5 todo)
  - Churn risk indicators: 1 (Baywash — communication gap)
- **Click action**:
  - List all active clients
  - Per client: status, last touchpoint, next action
  - "Send weekly report" template

#### Room 3B: **Calendar / Tasks** 📅
- **Purpose**: Daily ops
- **Visual**: Calendar wall + dwarf with checklist
- **Live data**:
  - Today's tasks: 5
  - Tomorrow's tasks: 3
  - Overdue: 1
- **Click action**:
  - Today / Week / Month view
  - Add task button
  - Mark done (animation: ✓ + dwarf gives thumbs up)

#### Room 3C: **Weekly Reports** 📋
- **Purpose**: Generate i track tjedne reporte za klijente
- **Visual**: Printer s papirima
- **Live data**:
  - Reports due ovaj tjedan: 4
  - Sent: 2
  - Pending: 2
- **Click action**:
  - Lista po klijentu, due date
  - Generate report template (auto-pull data iz Performance Analytics)
  - Mark as sent

---

## 6. TOP RESOURCE BAR — što je uvijek vidljivo

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 €12.450 MRR    │  👥 6 Active    │  📥 23 Leads   │  ⚙ Goal│
│  ↗ +€1.497 ovaj mj │  +1 ovaj mj    │  Hot: 5        │ 42% / 30K │
└─────────────────────────────────────────────────────────────────┘
```

- **MRR counter**: live updates kad se status klijenta promijeni
- **Active clients**: count of clients.status = 'active'
- **Leads counter**: total + breakdown po stage
- **Goal progress bar**: vizualno bar 0 → 30K€/mj
- **Animacija**: Kad MRR raste, "+€XXX" floats s sparkle preko bara

---

## 7. PHASE 1 SCOPE (MVP)

### ✅ Build za prva 2 tjedna

**Day 1-3: Setup + Auth + Database**
- Next.js project setup
- Supabase setup (tables, RLS policies)
- Login (Google OAuth — Leonardo only)
- Tailwind config + brand colors
- Folder structure

**Day 4-7: Visual ecosystem rendering**
- Building layout (3 floors × 3 rooms grid)
- Top resource bar (static za sad — fetch later)
- Bottom action bar
- Room cards (klikabilne)
- Empty room "panels" (otvori → modal)

**Day 8-10: Implement Floor 1 (B2B Revenue Factory)**
- Outreach Lab — manual entry forms + lista
- Discovery Bay — calendar integration manual za sad
- Closing Room — deals lista + close action

**Day 11-12: Implement Floor 2 (Intelligence Bay)**
- Lead Scorer — manual scoring forma + ICP kalkulator
- Performance Analytics — manual entry initially (paste post URL + stats)
- Competitor Watch — basic log

**Day 13-14: Implement Floor 3 (Operations Hub)**
- Client Manager — CRUD klijenata
- Calendar/Tasks — CRUD task-ova
- Weekly Reports — manual generate template

### ⛔ NE u Phase 1

- Real AI agents (sve manual entry za sad)
- Email automation
- API integracije (Notion, Gmail, Calendly) — to je Phase 2
- Sound effects — Phase 3
- Multi-user / team — Phase 3
- Advanced animations (samo basic Framer Motion)

---

## 8. PHASE 2-3 ROADMAP

### Phase 2 (Tjedan 3-6): Real integracije
- Notion API → auto-sync klijenti i pipeline
- Calendly webhook → auto-update Discovery Bay
- TikTok/IG/YT API → auto-pull views/likes
- LinkedIn manual scraper / web scraping (kompleksno)
- Email integration (Gmail OAuth → log outreach)
- AI agent #1: Outreach drafter (Anthropic API)

### Phase 3 (Tjedan 7-12): Full AI agents + polish
- AI agent #2: Lead scorer (auto-scoring od scraped data)
- AI agent #3: Content idea generator
- AI agent #4: Weekly report auto-generator
- Sound effects + advanced animacije
- Mobile responsive fix
- Multi-user (asistent / team access)

---

## 9. CLAUDE CODE SETUP — što treba Leonardo

### A. Predcondições (1-time setup, ~30 min)

**1. Instaliraj prerequisites:**
```bash
# Mac/Linux:
brew install node git

# Windows: download installers
# Node.js (LTS): https://nodejs.org/en/download
# Git: https://git-scm.com/download/win
```

**2. Account-i koje trebaš:**
- [GitHub](https://github.com) (free) — za code repo
- [Vercel](https://vercel.com) (free) — za deploy
- [Supabase](https://supabase.com) (free) — za database
- [Anthropic Console](https://console.anthropic.com) — za Claude Code subscription

**3. Instaliraj Claude Code:**
```bash
npm install -g @anthropic-ai/claude-code
```

**4. Login Claude Code:**
```bash
claude /login
```

### B. Init projekta (5 min)

```bash
# 1. Napravi folder
mkdir lamon-hq
cd lamon-hq

# 2. Pokreni Claude Code
claude
```

### C. Initial Claude Code prompt (copy-paste u Claude Code)

```
Build LAMON HQ — gamificirana web app za Lamon Agency koja izgleda kao Fallout Shelter (2D side-view zgrada s 3 kata × 3 sobe).

Pročitaj kompletan spec u file-u LAMON_HQ_Build_Spec.md (ja ću ga staviti u project root).

Tech stack:
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- Supabase
- Vercel deploy

Phase 1 (MVP, 2 tjedna):
- Setup + auth (Google OAuth, samo ja)
- Visual ecosystem: 3 kata, 9 sobi, top resource bar, bottom action bar
- 3 floor-a: B2B Revenue Factory, Intelligence Bay, Operations Hub
- Manualni data entry (no real API integracije za sad)
- Brand: dark + gold (#C9A84C), modern flat, premium feel

Krenimo step by step. Prvo:
1. Init Next.js project
2. Install dependencies
3. Setup Supabase (daj mi SQL migration file za tabele iz spec-a)
4. Build osnovni layout (top bar + 3 floors grid + room cards, sve placeholder)
5. Deploy na Vercel da vidim live

Nakon toga gradimo room po room.

Pokreni step 1 i pitaj me bilo što što ti treba.
```

### D. Što ti Claude Code traži tijekom builda

Pripremi unaprijed:
- **Supabase URL + anon key** (iz Supabase project settings)
- **Vercel account** (povezat će sa GitHub-om)
- **Brand assets** — već imaš sve u Lamon Agency folderu (lamon.io HTML kao reference)

---

## 10. AKCEPTANCIJSKI KRITERIJI MVP-a

Phase 1 je gotov kad:

- [ ] Mogu se prijaviti (Google OAuth)
- [ ] Vidim 3 kata × 3 sobe na ekranu, sve klikabilne
- [ ] Top resource bar prikazuje MRR + counter-e (osnovni za sad)
- [ ] Mogu unijeti novog klijenta i vidim ga u Client Manager-u
- [ ] Mogu unijeti novi lead i sam ga score-am ICP filterom
- [ ] Mogu unijeti outreach poruku i vidim count u Outreach Lab
- [ ] Klikom na sobu otvara se modal s detaljima
- [ ] Hover na sobu = gold border (Lamon brand)
- [ ] App deployed na Vercel (lamonhq.vercel.app ili custom domain)
- [ ] Mobile-responsive osnovno (full mobile dolazi u Phase 3)

---

## 11. MOTIVACIJSKE ANIMACIJE (Phase 1 priority)

Da app feels gamificirano:
1. **Add lead** → mali dwarf trči preko ekrana, lead se "deposita" u Lead Scorer
2. **Close deal** → confetti + MRR counter "boost" sa "+€XXX" floating
3. **Send outreach** → envelope ikona odlije s laptop-a u "Leads" counter
4. **Mark task done** → ✓ checkmark sa subtle bounce
5. **Goal progress milestone** (e.g., 50% za 30K€/mj) → fireworks + level-up sound

---

## 12. RESOURCES — što Claude Code može referencirati

- **Brand assets**: `Lamon Agency/lamon_io_HR_v2.html` (boje, fontovi, dot grid pattern)
- **Existing PDFs**: brand styling iz carousela (`Lamon_Chatbot_Carousel_Stomato.pdf`)
- **Visual reference**: Fallout Shelter (Google/YouTube screenshots)
- **Color palette**:
  - Primary BG: `#0A0A0A` (deep black)
  - Card BG: `#141414`
  - Gold: `#C9A84C`
  - Gold dim: `#8B7530`
  - White: `#FFFFFF`
  - White dim: `#999999`
  - Green (success): `#7BB663`
  - Red (warning): `#E04545`
- **Font**: DM Sans (Google Fonts) — ili Inter

---

*Spec verzija 1.0 · 10.5.2026 · Spremno za Claude Code handoff*
