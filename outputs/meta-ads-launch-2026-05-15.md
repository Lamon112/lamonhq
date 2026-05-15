# Meta Ads — Quiz Funnel launch (€450 test budget)
_Datum: 2026-05-15_
_Cilj: validirati TT/IG → Quiz → Skool funnel + benchmark CPA_
_Pad reference Leonardo: prijašnje 140€ spent, 63.8K views, 1.460 site visits = €0.096/visit (DOBRO)_

---

## 🎯 Strategija

**Faza A — Validacija (€150, 5 dana)**: jedna kampanja, jedan ad set, 2 video creative-a (PON i PET skripta — najjače hookove). Cilj: 300 visits @ €0.50 CPA. Konverzija u quiz_lead 30-50%.

**Faza B — Optimizacija (€200, 7 dana)**: pause loser kreativa, scale winner, dodaj 2 nove kreative (UTO i ČET skripte). Geo split: dijaspora EU vs Balkan zaposleni 25-34.

**Faza C — Skaliranje (€100, 3 dana)**: lookalike audience na quiz_completers, retarget visitors who didn't complete quiz.

---

## 📐 Account setup

**Meta Business Manager**: leopoldlamon@gmail.com → Lamon Agency BM
**Pixel**: lamon-hq.vercel.app (treba dodati Meta pixel — vidi tehnički checklist dolje)
**Page**: @sidequestshr (Instagram) + linked FB page
**Payment**: Leonardova kartica (€450 cap)

### Tehnički checklist (PRIJE LAUNCH-a)

- [ ] Meta Pixel inserted u `src/app/layout.tsx` (event: PageView, ViewContent, Lead)
- [ ] Custom event `QuizComplete` fired iz `/api/quiz/submit` route na success
- [ ] Custom event `SkoolCTAClick` fired iz QuizResult component
- [ ] CAPI (Conversion API) postavljen za server-side double-tracking (iOS 14.5+ resilience)

### Pixel kod (paste u layout.tsx pre </head>)

```tsx
{/* Meta Pixel - TODO: replace XXX with actual Pixel ID */}
<Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'XXXXXXXXXX');
fbq('track', 'PageView');
`}</Script>
```

---

## 🎬 Ad creative

### Creative 1 — "5K€/MJ ZA 10 SATI/TJEDNO" (iz PON skripte)

**Format**: 9:16 vertical, 30s, native iOS feel
**Hook frame (0-2s)**: ekran s velikim brojem "10h/tjedno → €1.500/mj"
**Body (2-25s)**: Leonardo → calendar workflow demo → before/after stats
**CTA frame (25-30s)**: "Komentiraj PLAN — AI ti generira osobni"
**Audio**: original audio (Leonardo govori), bez glazbe (dist.viewer trust)

### Creative 2 — "AI ZA SIDE HUSTLE" (iz PET skripte)

**Format**: 9:16 vertical, 35s
**Hook frame (0-2s)**: 3 result page screenshots zoomed in (score 78, 54, 89)
**Body (2-30s)**: dekonstrukcija quiz funkcionalnosti, fictional case studies (Marko/Iva/Filip)
**CTA frame (30-35s)**: "Komentiraj QUIZ — link stiže u DM"
**Audio**: brzi cuts + tekst overlays za silent autoplay

---

## 🎯 Targeting

### Ad Set 1 — Dijaspora EU 25-45 (€100/€450)
- **Lokacije**: Njemačka, Austrija, Švicarska, Italija
- **Jezik**: hrvatski, srpski, bosanski
- **Interesi**: side income, online business, financial freedom, faceless YouTube, AI tools, ChatGPT
- **Lookalike (kasnije)**: 1% dijaspora od quiz_completers
- **Estimacija**: ~€0.60 CPM, 167K reach, ~250-400 visits za €100

### Ad Set 2 — Balkan zaposleni 25-34 (€150/€450)
- **Lokacije**: Hrvatska + BiH + Srbija + CG (urbano)
- **Jezik**: hrvatski, srpski
- **Interesi**: poslovi, plaća, side hustle, freelancing, online zarada, viral marketing
- **Iskljuci**: studenti, već followeri SideHustle stranica
- **Estimacija**: ~€0.40 CPM, 375K reach, ~500-750 visits za €150

### Ad Set 3 — Mladi 18-24 studenti (€50/€450)
- **Lokacije**: Hrvatska + BiH + Srbija
- **Jezik**: hrvatski, srpski
- **Interesi**: TikTok, Instagram Reels, ChatGPT, online income, gaming
- **Estimacija**: ~€0.30 CPM, 233K reach, ~300-450 visits za €50
- **Napomena**: Test ovaj segment je manji budget jer historic conversion na €50/mj Skool je niža (no money signal)

### Ad Set 4 — Retarget (€150/€450, Faza C)
- **Custom audience**: pixel:PageView na /quiz pa NE Lead u 7 dana = drop-off
- **Creative**: Drugačiji od originala — focus na "60 sek je sve što treba"
- **Optimization**: Lead

---

## 📊 KPI thresholds (kill / scale criteria)

| Metric | Kill ako | Scale ako |
|---|---|---|
| CPM | > €5 | < €2 |
| CTR (link) | < 1% | > 2.5% |
| Cost per landing page view (CPLV) | > €0.50 | < €0.20 |
| Cost per Lead (quiz_complete) | > €3 | < €1 |
| Cost per Skool join | > €60 (no LTV) | < €25 (3x LTV) |

**Decision rule**: review na kraju dana 3 (€90 spent). Ako CPLV > €0.50 i CTR < 1% → kill creative, ne ad set.

---

## 🚦 Launch sekvenca (radi po točkama)

### Day 0 (DANAS): preparation
1. ✅ Quiz live na lamon-hq.vercel.app/quiz
2. [ ] Meta Pixel inserted u layout.tsx (5 min)
3. [ ] CAPI server endpoint `/api/meta-capi` (10 min, optional za prvi launch)
4. [ ] Snimi Creative 1 (PON skripta) — 30 min
5. [ ] Snimi Creative 2 (PET skripta) — 30 min

### Day 1: launch
1. Postavi Meta Business kampanju "Quiz Funnel — Validation"
2. 1 kampanja, 3 ad set (dijaspora / balkan / mladi)
3. €30/dan total → €100 podijeljeno na ad set po proporciji budget tablice gore
4. Pokreni 18:00 (najbolje attention window)

### Day 2-3: monitor
1. CTR + CPLV per ad set
2. QuizFunnelPanel prati novi leadove
3. Mark cold one-off leadove (no follow-up)

### Day 4-5: optimize
1. Pause underperformer ad set
2. Skalira winner +50% budget
3. Test 1 nova creative iz UTO/SRI/ČET skripti

### Day 6-7: review + scale
1. Calculate cost-per-Skool-join
2. Ako < €30 → green light Faza B (€200 + 2 nove kreative)
3. Ako > €60 → optimize landing/quiz UX umjesto skaliranja

---

## 💰 Budget alokacija — €450 ukupno

| Faza | Budget | Period | Cilj |
|---|---|---|---|
| Validacija | €150 | Day 1-5 | 300 visits, 100 leads, 5 Skool joins |
| Optimizacija | €200 | Day 6-12 | 500 visits, 200 leads, 12 Skool joins |
| Skaliranje | €100 | Day 13-15 | 300 visits, 150 leads, 8 Skool joins |
| **TOTAL** | **€450** | **15 dana** | **1.100 visits, 450 leads, 25 Skool joins (€1.250 MRR)** |

**ROI calc** (konzervativno):
- Spend: €450
- Revenue M1: 25 × €50 = €1.250 MRR
- Payback period: 0.36 mj (ako 100% retention) → 0.5 mj (50% retention) → 1 mj (worst case)
- **Net positive @ 1 mj minimum, 25%+ profit**

---

## 🧠 Claude follow-up (post-launch)

Nakon Day 7 launch, traži od mene:
- Top 10 highest-score quiz_leads → personalizirani DM cluster (ja ti pišem 10 nacrta)
- Bottom 10 (cold leads) → nurture email sequence draft
- A/B varijanta /quiz/result/[id] s alternativnim CTA pozicijom
- Retarget creative iz najjačeg subject linaja prijašnje viralnih skripti

---

_Status pre-launch_:
- ✅ Quiz funnel D1-D5 LIVE
- ⏳ Meta Pixel + CAPI (ostaje 15-20 min wire job)
- ⏳ Creative snimanje (60 min Leonardov vrijeme)
- ⏳ Account setup (15 min Meta Business UI)

**Total time-to-launch**: ~2 sata Leonardovog vremena nakon što su svi tehnički build-ovi završeni.
