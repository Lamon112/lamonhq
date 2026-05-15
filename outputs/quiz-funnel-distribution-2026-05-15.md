# Quiz Funnel — Distribution playbook
_Datum: 2026-05-15_
_Status: D3 LIVE, čeka prvi traffic test_

---

## 🎯 Quiz URL

**Production**: `https://lamon-hq.vercel.app/quiz`

**Source-tagged varijante** (UTM tracking — surface-aju u QuizFunnelPanel "source" koloni):

| Kanal | URL |
|---|---|
| TikTok bio link | `https://lamon-hq.vercel.app/quiz?utm_source=tt&utm_medium=bio` |
| TikTok komentar auto-reply | `https://lamon-hq.vercel.app/quiz?utm_source=tt&utm_medium=comment` |
| Instagram bio | `https://lamon-hq.vercel.app/quiz?utm_source=ig&utm_medium=bio` |
| Instagram DM (auto + manual) | `https://lamon-hq.vercel.app/quiz?utm_source=ig&utm_medium=dm` |
| Telegram broadcast | `https://lamon-hq.vercel.app/quiz?utm_source=telegram&utm_campaign=launch` |
| Telegram bot DM (cold "QUIZ") | `https://lamon-hq.vercel.app/quiz?utm_source=telegram&utm_medium=dm` |
| Skool community feed | `https://lamon-hq.vercel.app/quiz?utm_source=skool&utm_medium=feed` |
| Email blast (legacy €20 win-back) | `https://lamon-hq.vercel.app/quiz?utm_source=email&utm_campaign=winback` |
| Meta Ads (D6) | `https://lamon-hq.vercel.app/quiz?utm_source=meta&utm_campaign=quiz_launch` |

---

## 📡 Distribution kanali — što je live, što treba ručna akcija

### ✅ AUTOMATSKI (već wired)

**1. Telegram bot @lamonleonardo — cold DM trigger**
- Korisnik šalje "QUIZ" / "PLAN" / "TEST" → bot odmah dropi quiz link
- Stage: `new` → `awaiting` (template `quiz_link_v1`)
- Code: `src/lib/telegramTemplates.ts` — `tplQuizLink`
- Test: pošalji "QUIZ" botu pa provjeri response

**2. Telegram bot @lamonleonardo — pitch/awaiting stage**
- Već PREMIUM-ovan korisnik traži "QUIZ" → re-šalje link
- Pokriva re-share use-case (član šalje prijatelju)

### ⏳ POLU-AUTOMATSKI (skripta postoji, treba pokrenuti)

**3. Telegram t.me/sidehustlehr broadcast (~5K članova)**
- Skripta: `scripts/telegram-broadcast-quiz-launch.mjs`
- Pokreni jednom kad si spreman za launch:
  ```bash
  node scripts/telegram-broadcast-quiz-launch.mjs
  ```
- Idempotent — neće 2x istog dana (override `--force`)

### 🔧 MANUALAN (do D6 = Meta Ads + IG/TT auto-poster)

**4. TikTok / Instagram bio**
- Update `linktree`/`bio link` u TT/IG na quiz URL
- TT bio: `@sidehustlebalkan` → bio link
- IG bio: `@sidequestshr` → bio link

**5. Komentar auto-reply (CTA u videima)**
- U svim sljedećim videima završi sa: _"Komentiraj **QUIZ** ako želiš osobni AI plan"_
- Manualno odgovori s linkom prvih 24h dok ne wired auto-reply (Instagram Graph API + TikTok Comments)
- Tekst odgovora: _"Evo ti link → [quiz URL]"_

**6. Skool community post (PREMIUM grupa)**
- Postaj u feed:
  - Naslov: _"NOVO: tvoj osobni AI plan generiran za 60 sekundi"_
  - Body: kratko + quiz link s `utm_source=skool`
  - Poanta: PREMIUM članovi mogu poslati prijateljima → afilijati conversion vector

---

## 🎬 Video CTA template (Leonardo govori u video završnici)

**Verzija A (kratka, 8s)**:
> "Komentiraj **QUIZ** ispod ako želiš svoj osobni 30-dnevni plan."

**Verzija B (full, 15s)**:
> "Hej, ako te zanima točno gdje si TI na svom side hustle putu — napravio sam quiz, 10 pitanja, AI ti generira osobni plan i kaže ti koji je case study tebi najbliži. Komentiraj **QUIZ** ispod, šaljem ti link u DM."

**Verzija C (mystery hook, 10s)**:
> "Nešto novo za sve koji ste pratili — komentar **PLAN** dolje pa ti šaljem što sam baš za vas izgradio."

---

## 📊 KPI za prvi tjedan (D7 review checkpoint)

| Metrika | Cilj T1 (tjedan) | Cilj M1 (mjesec) |
|---|---|---|
| Quiz starts | 50 | 300 |
| Quiz completes | 30 (60% completion) | 200 (66%) |
| DM sent (od strane Leonarda) | 25 (83%) | 180 (90%) |
| Replied | 15 (60%) | 100 (55%) |
| Skool €50/mj converts | 3 (12%) | 25 (14%) |
| **Revenue T1** | **€150 MRR** | **€1.250 MRR** |
| **Cost T1 (AI gen)** | ~$1.5 | ~$10 |

**Cost po lead-u**: ~$0.05 (Sonnet ~$0.03 + DB negligible)
**ROI breakeven**: 1 lead × €50/mj > 50× cost. Quiz funnel = profitabilan već od 1 conversion/mj.

---

## 🚦 Status pipeline u QuizFunnelPanel

Leonardo prati leadove kroz: Vault → Scholar (Floor B2C) → SkoolOps panel → "🎯 Quiz Funnel" tab.

Pipeline:
- `new` — quiz dovršen, AI plan generiran, lead čeka outreach
- `dm_sent` — Leonardo poslao DM (kopirao iz "DM" buttona)
- `replied` — lead odgovorio
- `skool_invited` — lead vidio Skool CTA / dobio direktan invite
- `converted` — €50/mj subscription pokrenuta
- `cold` — 7+ dana bez odgovora, marknut kao hladan

Auto-advance: klik na "DM" gumb → "Označi kao poslano" → status flipa u `dm_sent` automatski.

---

_Sljedeći korak (D4)_: izvuci 47 legacy €20 članova iz Skool admin → email blast s win-back ponudom (€50/mj migracija ili otkaz, no manual €20 više).
