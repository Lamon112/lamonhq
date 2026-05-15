# 🎯 Quiz AI Funnel — D1-D7 SHIPPED
_Datum: 2026-05-15_
_Status: ✅ Production build green (`npx next build` passes)_
_Per Leonardov direktivi: "okej sve d1-d7 radimo danas"_

---

## 📦 Što je shipped (deployable danas)

### D1 — Quiz schema + UI wizard + Claude scoring
- ✅ `supabase/migrations/0030_quiz_leads.sql` — full schema (id, responses jsonb, score, weaknesses jsonb, ai_output_md, lead_email, status pipeline, attribution UTM, generation cost)
- ✅ `src/lib/quizQuestions.ts` — 10 pitanja (trenutno_stanje, iskustvo, sati_tj, budget, blocker multi, cilj_zarade, kamera, platforma, lokacija, kontakt)
- ✅ `src/app/quiz/page.tsx` — public route, Suspense-wrapped, robots noindex
- ✅ `src/components/quiz/QuizWizard.tsx` — 10-step wizard, dark+gold Hormozi theme, auto-advance singleSelect, localStorage persistence, keyboard nav, UTM capture, validation gating
- ✅ `src/app/api/quiz/submit/route.ts` — Claude Sonnet 4.5 scoring (60s budget), JSON output → markdown compose, full QUIZ_SCORING_SYSTEM prompt with verified case studies (Tom 17K, Matija 3K, Vuk 5K, Filmovi 30K, Borna), 5 viralnih niša katalog, audience hierarchy
- ✅ `src/app/quiz/result/[id]/page.tsx` + `src/components/quiz/QuizResult.tsx` — Hormozi-style result: score circle (animated SVG, 0-100, color-coded), 3 weakness bars (red/orange/yellow/green), matched case study card, AI plan markdown render, soft Skool €50/mj CTA
- ✅ `src/app/api/quiz/lead/[id]/route.ts` + `src/app/api/quiz/track/route.ts` — polling + status pipeline tracking
- ✅ Middleware whitelist `/quiz` + `/api/quiz` (public, no login)

### D2 — HQ leads panel + result page polish
- ✅ `src/app/actions/quizLeads.ts` — listQuizLeads + getQuizFunnelStats + updateQuizLeadStatus + generateQuizDM (warm-DM style)
- ✅ `src/components/rooms/QuizFunnelPanel.tsx` — Funnel waterfall (5 koraka, conversion rates), live leads list (score, blockers, email/telegram, source UTM, ago), DM modal s clipboard copy, status pipeline gumbi (new → dm_sent → replied → invited → converted), 30s auto-refresh
- ✅ Wired u SkoolOpsPanel kao 5. tab "🎯 Quiz Funnel" (Vault → Scholar agent)

### D3 — DM auto-reply + Telegram broadcast
- ✅ `src/lib/telegramIntent.ts` — novi intent `quiz_request` + regex za QUIZ/PLAN/TEST/NIŠA/NISA triggere
- ✅ `src/lib/telegramTemplates.ts` — `tplQuizLink` template (cold + repeat) + routing wired za `new` i `awaiting` stage
- ✅ `scripts/telegram-broadcast-quiz-launch.mjs` — one-shot launch broadcaster za t.me/sidehustlehr (~5K članova), idempotent s daily marker
- ✅ `outputs/quiz-funnel-distribution-2026-05-15.md` — distribution playbook (UTM map za sve kanale, video CTA template A/B/C, KPI tjedan)

### D4 — Skool ingest + win-back kampanja
- ✅ `supabase/migrations/0031_skool_members.sql` — skool_members tablica (tier: legacy_20/premium_50/free/comp/mentor, geo, engagement, win-back tracking)
- ✅ `scripts/ingest-skool-members.mjs` — parsira `__NEXT_DATA__` JSON ili CSV iz Skool admin → upsert s tier detection
- ✅ `scripts/generate-winback-emails.mjs` — Claude Sonnet generira osobnu poruku per legacy €20 member (47 ljudi target), output preview MD + JSON za manualno slanje, --send-mark flag za update DB

### D5 — 5 viral skripti PON-PET
- ✅ `outputs/scripts-quiz-launch-2026-05-15.md` — 5 skripti u verified Leonardovom 30-45s mystery formatu:
  - **PON** "5K€/MJ ZA 10H" (paradoks hook, CTA: PLAN)
  - **UTO** "AI MI ODGOVORIO PRIJE PITANJA" (relatable pain, CTA: QUIZ)
  - **SRI** "10 SATI TJEDNO = €1.500/MJ" (specifičan workflow, CTA: PLAN)
  - **ČET** "$280K JEDAN ČOVJEK" ($280K validna brojka, CTA: NIŠA)
  - **PET** "40 LJUDI 40 PLANOVA" (social proof recap, CTA: QUIZ)
- Sve poštuju verified rules (no Tom/Matija po imenu u value videima, no "motivacijski govornik", no izmišljeni alati, 1-word CTA)
- ✅ NIŠA regex dodan u telegramIntent.ts za ČET CTA

### D6 — Meta Ads launch package
- ✅ `outputs/meta-ads-launch-2026-05-15.md` — full launch playbook (3-phase strategija €450, account setup checklist, 2 ad creative dekonstrukcije iz PON+PET skripti, 4 ad set targeting (dijaspora EU / Balkan zaposleni / mladi / retarget), KPI thresholds, day-by-day sekvenca)
- ✅ `src/components/quiz/MetaPixel.tsx` — Meta Pixel komponenta (mounts samo na /quiz routes, NEXT_PUBLIC_META_PIXEL_ID env, helper `trackMetaEvent`)
- ✅ Pixel events wired:
  - `PageView` automatski na /quiz mount
  - `Lead` na quiz submit success (QuizWizard.tsx)
  - `InitiateCheckout` na Skool CTA click (QuizResult.tsx, value=50 EUR)

### D7 — Verifikacija + deploy ready
- ✅ `npx next build` — clean compile (`/quiz` static prerendered, `/quiz/result/[id]` dynamic, 3 API routes)
- ✅ `npx tsc --noEmit` — 0 type errors
- ✅ `npx eslint` — 0 errors, 1 intentional warning (Meta noscript `<img>` 1x1 pixel)
- ✅ Suspense boundary fix za useSearchParams

---

## 🚀 Deploy — što treba kliknuti

### Supabase (Leonardov account)
Apply 2 nove migracije:
- `supabase/migrations/0030_quiz_leads.sql`
- `supabase/migrations/0031_skool_members.sql`

(Plus prethodno čekaju 0023-0028 ako još nisu apliciran — vidi prethodni summary.)

### Vercel env (NEW vars potrebne)
- `NEXT_PUBLIC_META_PIXEL_ID` — postavi nakon kreiranja pixela u Meta Business Manager (D6 launch step)

(Već postoji: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_*`)

### Git push
Sve je u radnom direktoriju, ready za commit + push:
```
git add -A
git commit -m "Quiz AI funnel D1-D7 — Hormozi-style funnel + Meta Pixel + win-back + viral scripts"
git push
```

Vercel auto-deploya. URL: `https://lamon-hq.vercel.app/quiz`

### Po deployu (5 min smoke test)
1. Otvori `/quiz` → klikni kroz 10 pitanja → submit
2. Vidi result page s score + weakness bars + AI plan
3. Otvori HQ → Vault → Scholar agent → SkoolOps → "🎯 Quiz Funnel" tab → tvoj test lead vidljiv
4. Klikni "DM" gumb → Claude generira DM nacrt → kopiraj
5. Pošalji TT bot test poruku "QUIZ" → bot drop quiz link

---

## 📊 KPI tracking — gdje gledaš?

| Što gledaš | Gdje |
|---|---|
| Live leadovi | HQ → Vault → Scholar → SkoolOps → 🎯 Quiz Funnel tab |
| Funnel waterfall (new/sent/replied/invited/converted) | Isti panel, gornji dio |
| AI cost per lead | Isti panel, "AI cost (svi)" stat box |
| UTM source breakdown | Lead row "source" tag |
| Meta Ads attribution | Meta Business Manager (kasnije, nakon ad launch-a) |
| Telegram broadcast click-through | Telegram channel insights + UTM `utm_source=telegram` u quiz_leads.source |

---

## 🎬 Sljedeći koraci (Leonardo radi)

**Today (post-deploy)**:
1. Push to git → wait Vercel deploy (3 min)
2. Apply Supabase migracije
3. Smoke test (5 min)
4. Telegram broadcast: `node scripts/telegram-broadcast-quiz-launch.mjs`

**This week**:
5. Snimi Creative 1 (PON skripta) — 30 min
6. Snimi Creative 2 (PET skripta) — 30 min
7. Postavi Meta Pixel ID u Vercel env
8. Postavi Meta Business kampanju per `outputs/meta-ads-launch-2026-05-15.md`

**Win-back (paralelno)**:
9. Ekstraktiraj Skool članove iz admin (`window.__NEXT_DATA__` ili CSV)
10. Pokreni: `node scripts/ingest-skool-members.mjs`
11. Pregledaj tier breakdown u logu (provjeri 47 legacy_20)
12. Generiraj win-back: `node scripts/generate-winback-emails.mjs`
13. Pregledaj `outputs/winback-emails-2026-05-15.md` → odluči slati/ne
14. Pošalji manualno (Gmail) → re-run s `--send-mark`

---

## 💸 Cost projekcija

| Stavka | Mjesečno @ 200 leadova/mj |
|---|---|
| Anthropic (Sonnet quiz scoring) | ~$6 |
| Anthropic (Sonnet win-back per kampanja) | ~$2 (one-off ovaj mj) |
| Supabase (free tier dovoljan) | $0 |
| Vercel (Hobby tier dovoljan) | $0 |
| Meta Ads (Faza A+B+C) | €450 (one-off launch budget) |
| **TOTAL D1-D7 launch** | **~$8 + €450 ad spend** |

**ROI breakeven**: 1 Skool join (€50/mj) > celokupni AI cost cijelog mjeseca. Quiz funnel je profitabilan od 1. konverzije.

---

## 🧠 Što radi DRUGAČIJE od prijašnjeg Telegram→Skool funnel-a

| Stari funnel | Novi quiz funnel |
|---|---|
| TT/IG → "DM mi ZLATNA" → 3 Q's qualifying → PDF → soft Skool pitch | TT/IG → "Komentiraj QUIZ" → bot drop link → quiz captures 10 polja → AI plan → Skool €50/mj CTA |
| 1 lead magnet (PDF) za sve | 1 personalized output po leadu (10× viša relevance) |
| Manualno qualifying (Leonardo čita svaki DM) | Quiz IS qualifying (Leonardo gleda samo high-score leadove) |
| Conversion ~3-5% | Hipoteza: 10-15% (Hormozi data) |
| Friction: 3 Q's prije bilo kakve value | Friction: 60s quiz daje plan ODMAH |
| Nema retargeting signala | Meta Pixel + UTM + status pipeline = full attribution |
| ~50 unanswered DMs | Auto-reply + Funnel panel = 0 unanswered theoretically |

---

_Sve napravljeno u jednom danu po Leonardovom direktivi. Funnel je deployable, testable, scalable._
_Sljedeći Leonardov korak: git push + smoke test + creative snimanje._
