# LinkedIn Cold Caller Scoring Rubric v2
_Datum: 2026-05-16_
_Cilj: Top 10 HR-native kandidata sa najvišim FIT × INTENT × REACH score-om_
_Maksimalan score: 50 bodova_

---

## ⛔ MANDATORY HARD FILTER (binarno — ili ili)

Prije bodovanja, kandidat MORA proći ova 3 filtera. Ako ijedan FAIL → skip, ne ulazi u rangiranje.

### Filter 1: HR-NATIVE
- **Lokacija**: trenutno u Hrvatskoj (provjera iz LinkedIn headline + Activity location signals)
- **Surname**: hrvatska patrijarhalna varijanta (ić/ević/ović/ač/k) — NE SRB/BiH-tipično (-ović bez ć varijante, -ski, -čević u istarskom kontekstu).
  - **Sive zone** (provjeriti dodatno): Bošković, Marković — mogu biti i HR i SRB; provjeriti grad rođenja + školu u About
- **LinkedIn jezik**: hrvatski u About OR posts (kod sumnje na bilingualnost — prijeđi)
- **Posts language**: ako objavljuje, treba biti hrvatski (ne srpski varijante "тзв", "dalje" sa ekavskom drugačijom)

### Filter 2: NE-SENIOR
- Trenutna pozicija NE smije sadržavati: Director, Head of, VP, CEO, Founder, Owner, Co-Founder, Partner, Managing Director
- Past CEO/Founder OK (znak iskustva); current title je deal-breaker za €200/close kompenzaciju

### Filter 3: ALIVE PROFILE
- Profile photo postoji (ne default gray silhouette)
- Headline nije generic ("Student" / "Looking for opportunities")
- Connection count ≥ 50 (sub-50 = vjerojatno nije aktivni LinkedIn user)

---

## 🎯 SCORING (max 50 bodova)

### A. FIT — Sales-specific match (25 pts)

| Signal | Bodovi | Validacija |
|---|---|---|
| Trenutna pozicija je sales-spec (SDR/BDR/Sales Rep/Account Manager/Sales Manager/Med Sales) | **+6** | Headline sadrži titulu |
| Past pozicija sales-spec (multi-year) | **+4** | Experience section ≥ 2 godine sales history |
| Premium brand exposure (top 1% companies HR) | **+4** | J&J, BAT, AstraZeneca, Beiersdorf, Würth, Infobip, Krka, Coca-Cola HBC, Atlantic Grupa, Pliva, Roche, GSK, P&G, Nestlé |
| Healthcare/dental/medical industry knowledge | **+3** | Past company in pharma/medical OR education in farmacija/biomedicina |
| B2B consultative selling (ne just retail/walk-in) | **+4** | Account-based, enterprise, partner mgmt, key account |
| Cold calling / telesales EXPLICIT skill listed | **+4** | Skills section sadrži "cold calling" / "telesales" / "outbound" |

### B. INTENT — Available to take role (15 pts)

| Signal | Bodovi | Validacija |
|---|---|---|
| **OTW badge** vidljiv (zeleni ring oko photo) | **+6** | Profile photo ima green "#OpenToWork" frame |
| "Open to work" / "Looking for opportunities" u headline-u | **+3** | Doslovan tekst u headline-u (može biti uz badge ili samostalno) |
| Trenutni employer = mala firma / no logo / nepoznata | **+3** | Mala firma = lakše prelazak; ili "Self-employed" / "Freelancer" |
| Message button dostupan direct (Open Profile premium) | **+2** | Vidljiv "Message" na profilu bez Connect prvog koraka |
| Education recently completed (< 2 god) | **+1** | Junior career stage — više vremena za side gig |

### C. REACH — Will they SEE + RESPOND to DM (10 pts)

| Signal | Bodovi | Validacija |
|---|---|---|
| Recent activity within **14 days** (posts/comments/likes) | **+4** | Activity tab pokazuje datum najnovije akcije |
| Recent activity within **30 days** | **+2** | Activity tab 14-30 dana |
| **5+ mutual connections** | **+3** | "X, Y and N other mutual connections" → 2+N ≥ 5 |
| **2-4 mutuals** | **+2** | |
| **1 mutual** | **+1** | |
| 500+ connections (signal: aktivni networker) | **+2** | "500+ connections" oznaka |
| Profile completeness 90%+ (About + Experience + Skills + photo + cover) | **+1** | Sve sekcije popunjene |

---

## 📊 INTERPRETACIJA SCORE-A

| Score | Tier | Akcija |
|---|---|---|
| **40-50** | S-tier | ⭐ Top 10 lock-in. Najveća šansa za conversion. |
| **30-39** | A-tier | Top 10 ako S-tier nema 10. Solid pick. |
| **20-29** | B-tier | Backup pool (11-20). Send only ako prvi val fail-a. |
| **<20** | Skip | Nije isplativo. |

---

## 🎯 RESPONSE PROBABILITY MULTIPLIER

Nakon bodovanja, primjenjuje se modifikator po formuli:

```
response_prob = (score / 50) × intent_weight × reach_weight
intent_weight = 1.0 if OTW else 0.5
reach_weight = 1.0 if recent_activity_14d else 0.6
```

Primjer:
- Score 45/50 + OTW + recent 14d = 0.9 × 1.0 × 1.0 = **90% prob**
- Score 45/50 + NO OTW + 30 dana stari = 0.9 × 0.5 × 0.6 = **27% prob**
- Score 30/50 + OTW + recent 14d = 0.6 × 1.0 × 1.0 = **60% prob**

Top 10 final selection = po **response_prob desc**, ne po raw score.

---

## 🚫 DUPLICATE AVOIDANCE

Prije slanja:
- Check Notion CRM "LinkedIn Cold Caller Outreach Tracker"
- Provjeri po LinkedIn URL (canonical)
- Ako se kandidat pojavljuje u nekom prijašnjem talasu → skip ili izmijeni template

---

## 📝 DEFAULT NON-SCORE FACTORS (override-i)

Override scoring i FORCE skip u ovim slučajevima:
- **Competitor**: Marketing agency owner/employee, ili B2B sales SaaS koji direktno targetira HR clinics
- **Conflict**: Trenutno radi za dental ordinaciju, ili in-house pri dental grupi
- **Reputation risk**: Profile sadrži MLM, crypto pump, kontroverzne posts

Override FORCE include:
- Leonardov osobni warm contact koji eksplicitno ide u 1st-degree connection list (mutual signal 9+ + Leonardo zna)

---

_Sljedeći korak: aplikacija ove rubrike na 8-10 kandidata po bucket-u + finalno top 10._
