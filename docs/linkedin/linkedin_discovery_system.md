# LinkedIn Discovery System — Cold Caller Outreach (Lamon Agency)

**Cilj:** Reproducibilni workflow za nalazenje GREEN-tier kandidata za cold caller rolu, target market HR (Croatia), buckets A/B/C kako je definirano u handoff-u.

**Verzija:** 2026-05-16 (post-Mia exclusion, post top-10 build)

---

## 1. BUCKET DEFINICIJE I SEARCH URL-OVI

LinkedIn `geoUrn` za Hrvatsku je **`104688944`**. Ovaj string je urlencoded kao `%5B%22104688944%22%5D` u parametru `geoUrn`.

### Bucket A — B2B SDR / BDR / Sales Development

**Search URL (reproducible):**
```
https://www.linkedin.com/search/results/people/?keywords=%22SDR%22%20OR%20%22BDR%22%20OR%20%22Sales%20Development%22&geoUrn=%5B%22104688944%22%5D
```

Decoded keywords: `"SDR" OR "BDR" OR "Sales Development"`

**Tipičan output (May 2026):** ~80 osoba, 10 stranica. Najjači signali u Croatia: Infobip, Hypefy, Sofascore, OB2B, Roxtec, HotelSync, Kolegio, Recommend, Bolt, Telemach, Decathlon.

**Template za DM:** Template A.

---

### Bucket B — Healthcare / Dental / Medical Sales

**Search URL (reproducible):**
```
https://www.linkedin.com/search/results/people/?keywords=%22dental%22%20OR%20%22stomatologija%22%20OR%20%22ordinacija%22%20OR%20%22medical%20sales%22&geoUrn=%5B%22104688944%22%5D
```

Decoded keywords: `"dental" OR "stomatologija" OR "ordinacija" OR "medical sales"`

**Tipičan output (May 2026):** ~100+ osoba, 10 stranica. Dominantne firme: Krka, Abbott, AstraZeneca, Boehringer Ingelheim, Beiersdorf, JGL, Salveo CEE, Merck, Alkaloid, Medical Intertrade.

**Iznimno snažan match:** Tena Kiš (Head of Marketing Adria Dental Group) i Sara Stipić (Adria Dental HR/payroll) — ali to su IN-HOUSE pri dental grupi → CONFLICT, ne kandidati.

**Template za DM:** Template B.

---

### Bucket C — Open to Work + Sales

**Search URL (reproducible):**
```
https://www.linkedin.com/search/results/people/?keywords=%22Open%20to%20Work%22%20%22Sales%22&geoUrn=%5B%22104688944%22%5D
```

Decoded keywords: `"Open to Work" "Sales"` (AND logic, ne OR)

**Tipičan output (May 2026):** ~80 osoba, 8 stranica.

**Template za DM:** Template C.

**CRITICAL FILTER:** Excludirati senior/CEO/Founder titule (Template C eksplicitno traži non-senior). Praktično: ako trenutna ili past pozicija sadrži "Director", "Head of", "VP", "CEO", "Founder" → SKIP.

---

## 2. RANKING KRITERIJI (score formula)

Maksimalan score: **25 bodova**.

| Signal | Bodovi | Validacija |
|---|---|---|
| Open to Work badge / "open to work" headline | +5 | Search snippet pokazuje "Open to work" pod imenom |
| Sales-specifična current ili past rola | +5 | Headline ili "Past:" snippet sadrži SDR/BDR/Sales Rep/Sales Manager/Account Mgr |
| Priority HR city (Zagreb / Split / Rijeka / Osijek) | +4 | Snippet location string |
| Secondary HR city (Karlovac / Zaprešić / Zadar / Pula / Varaždin / Koprivnica) | +2 | Snippet location string |
| 2nd-degree connection | +3 | "• 2nd" oznaka u snippet-u |
| 3rd+ connection | +1 | "• 3rd+" oznaka |
| Mutual count ≥ 4 | +3 | "X, Y and N other mutual connections" → 2 + N ≥ 4 |
| Mutual count 2-3 | +2 | |
| Mutual count 1 | +1 | |
| B2B / consultative experience (multinational, premium brand) | +3 | Past company indicates: BAT, J&J, AstraZeneca, Würth, Infobip, Beiersdorf |
| Non-senior title (per Template C rule) | +2 | Headline NE sadrži Director/Head/VP/CEO/Founder |

**Decision thresholds:**
- ≥ 17/25 → top-10 candidate
- 12-16/25 → backup pool
- < 12/25 → skip

**Tie-breaker pravila (kad više kandidata ima isti score):**
1. Više mutuals → wins
2. Priority city → wins
3. Najnovija aktivnost → wins (zahtijeva profile visit)

---

## 3. LINKEDIN FILTER WORKFLOW (KORAK PO KORAK)

### Korak 1: Postavi base filtere

Otvori bilo koju od 3 search URL-a (sve već imaju ugrađene filtere). LinkedIn UI prikazuje filter chips na vrhu:
- **People** (već postavljeno)
- **Croatia** (već postavljeno preko geoUrn)
- Connection type: 1st / 2nd / 3rd+ chips dostupni za daljnji refinement

### Korak 2: Optional refinement (manual)

Klikom na **"All filters"** → otvara modal sa:
- **Locations**: već Croatia. Možeš dodati specifične gradove (npr. samo Zagreb).
- **Current companies**: dodati specifične companies (npr. Infobip, Hypefy) za laser-focus.
- **Past companies**: snažan filter — npr. "Past company: KRKA" pulls all ex-Krka ljudi koji su sada drugdje.
- **Industries**: Pharmaceuticals / Medical Devices za hard Bucket B narrowing.
- **Schools**: ako tražiš mentorship signal (npr. ekipa s University of Zagreb School of Economics).

### Korak 3: Sort

LinkedIn-ov default je "Most relevant". Ne diraj — algoritam ti već daje ljude koji su najbliži tebi i tvom search-u.

### Korak 4: Page navigation

URL pagination: dodaj `&page=N` na kraj search URL-a (N = 2, 3, ...). Ovo je puno brže nego klik na "Next" button (koji često zahtijeva scroll-to-load).

### Korak 5: Skim svaku stranicu

Za svaku osobu provjeri u sniupet-u:
- Headline (govori "open to work" ili daje job title?)
- Location
- Past: ili Current: snippet
- Mutual connections count

Označi top 3-5 po stranici za daljnju validaciju.

### Korak 6: Profile visit za top candidates

Klikom na ime otvaraš profil. Provjeri:
- **OTW frame oko profile photo** (vizualni "Open to Work" indikator)
- **Activity** section: kad je zadnji post / comment / like?
- **About** section: detaljan summary može otkriti motivaciju
- **Experience**: chronology — koliko dugo je na trenutnoj poziciji?
- **Skills** section: validacija technical/sales skill claim-ova

---

## 4. KEY-WORD VOCABULARY (za buduće searcheve)

### Hrvatski sinonimi za sales/business development

| Engleski | Hrvatski varijante za search |
|---|---|
| Sales Representative | "prodaja", "prodajni predstavnik", "predstavnik" |
| Account Manager | "voditelj klijenata", "account manager" |
| Sales Manager | "voditelj prodaje", "menadžer prodaje" |
| Business Development | "razvoj poslovanja", "business development" |
| Cold caller / Telesales | "telefonska prodaja", "telesales", "cold calling" |
| Lead generation | "generiranje upita", "lead gen" |

### Hrvatski sinonimi za dental/medical

| Engleski | Hrvatski varijante |
|---|---|
| Dental clinic | "ordinacija", "stomatologija", "zubarska", "dental" |
| Medical sales | "medicinska prodaja", "medical sales" |
| Pharma rep | "predstavnik farmacije", "farmaceutski predstavnik" |

### Boolean operatori (LinkedIn syntax)

- **AND**: razmak između termina (npr. `"Open to Work" "Sales"` traži oba)
- **OR**: eksplicitan `OR` između termina (npr. `"SDR" OR "BDR"`)
- **NOT**: minus znak (npr. `"Sales" -Director` — traži Sales, isključuje Director)
- **Phrase match**: navodnici `"..."`
- **Wildcard**: NIJE podržan na LinkedIn search-u

---

## 5. KAKO PROŠIRITI POOL (kad top-10 ne odgovori)

### Strategija 1: Drugi bucket, isti template

Ako Bucket A bombardira i nitko ne odgovori, prebaci se na Bucket B kandidate ali koristi Template A (B2B) — možeš osloviti Med Reps kao "B2B sales people who happen to have medical industry knowledge".

### Strategija 2: Šire geo

Probaj geoUrn za:
- **Slovenia**: `106137034`
- **Bosnia and Herzegovina**: `102538809`
- **Serbia**: `101855366`

Ti tržišta dijele sličan business kontekst, mogu raditi remote za HR klijente.

### Strategija 3: Specifične companies

Past company filter ovih firmi daje rich pool:
- **Pharma / Healthcare:** Pliva, JGL, Sandoz, Krka, Belupo, Pharmaceuticals
- **B2B Tech:** Infobip, Asseco, Span, Combis
- **FMCG / Field Sales:** Atlantic Grupa, Podravka, Coca-Cola HBC, BAT

### Strategija 4: Skill-based search (advanced)

LinkedIn dozvoljava skill keyword-e:
```
keywords=%22cold%20calling%22%20OR%20%22telesales%22%20OR%20%22outbound%22&geoUrn=%5B%22104688944%22%5D
```

Ovo izvlači ljude koji su eksplicitno listali cold calling kao skill — najjači signal namjernog identiteta kao "cold caller".

### Strategija 5: Job-change radar

LinkedIn ne prikazuje "recently left job" javnu oznaku, ali možeš pratiti aktivne članove pomoću:
- Filter: "Companies they left" → search by past companies
- Indikator za recent change: profile activity feed često spomene "Excited to share..." / "New chapter..." / "Open to..."

---

## 6. RATE-LIMITING I OPERATIONAL SAFETY

Ovaj system je za **manual research only** — LinkedIn detektira automation patterns.

**Soft limits per session (single browser tab, no concurrent automation):**
- Search queries: ≤ 30 / dan
- Profile visits: ≤ 80 / dan (LinkedIn warning threshold za free account ~ 100)
- Connection requests: ≤ 15 / dan
- DMs: ≤ 15 / dan, sa 7-9 min spacing-om (per handoff)

**Detection triggers (DO NOT cross):**
- CAPTCHA appearance → STOP, idle 30+ min
- "Too many requests" banner → STOP for the day
- Account restriction email → STOP, contact LinkedIn appeal
- "Profile view limit reached" → switch to LinkedIn Premium ili idle 24h

**Best practice:** human-paced workflow (scroll, read, ~30s per profile, breaks between bursts).

---

## 7. CRM LOGGING WORKFLOW (Notion)

Po handoff-u, log u Notion CRM "LinkedIn Cold Caller Outreach Tracker":

**Kolone:**
| Date | Bucket | Name | LinkedIn URL | Template | Signal used | Status |
|---|---|---|---|---|---|---|

**Status enum:**
- `Drafted` — DM napravljen, ne poslan
- `Sent` — DM poslan, čekam odgovor
- `Replied positive` — odgovorio s interesom → schedule Zoom
- `Replied negative` — odbio ili izrazio nezainteresiranost
- `No reply 7d` — eskaliraj na follow-up #1
- `No reply 14d` — eskaliraj na follow-up #2 ili archive
- `Closed` — Zoom obavljen, odluka donesena
- `Skipped` — odlučeno ne slati
- `Stopped` — Leonardo abort

**Anti-duplikat workflow:** prije slanja bilo kojeg DM-a, search Notion CRM po LinkedIn URL-u — ako već postoji red, NE pošalji ponovo.

---

## 8. WHAT WAS USED ZA OVAJ TOP-10 RUN (2026-05-16)

**Search URLs run:**
- Bucket A page 1: `https://www.linkedin.com/search/results/people/?keywords=%22SDR%22%20OR%20%22BDR%22%20OR%20%22Sales%20Development%22&geoUrn=%5B%22104688944%22%5D`
- Bucket A page 2: dodano `&page=2`
- Bucket B page 1: `https://www.linkedin.com/search/results/people/?keywords=%22dental%22%20OR%20%22stomatologija%22%20OR%20%22ordinacija%22%20OR%20%22medical%20sales%22&geoUrn=%5B%22104688944%22%5D`
- Bucket B page 2: dodano `&page=2`
- Bucket C page 1: `https://www.linkedin.com/search/results/people/?keywords=%22Open%20to%20Work%22%20%22Sales%22&geoUrn=%5B%22104688944%22%5D`
- Bucket C page 2: dodano `&page=2`

**Profile visits (verifikacija):**
1. Mia Kuzmanović — EXCLUDED iz top 10 (Leonardo cancel)
2. Bruno Dunaj — verified OTW + 5 mutuals
3. Igor Hlušička — verified OTW + low activity (6mo)
4. Ines Huskovic — verified active SDR + 9 mutuals (highest)
5. Lara Migalić — verified OTW + no recent posts
6. Lidija Zenunovic — verified active Beiersdorf + 4 mutuals + no recent posts

**Profili NIJE verified (samo search-data):**
- Jadran Hudoklin, Ivana Jurić, Iva Leona Medvidović, Ivanka Tonkovic, Petra Jandras

Tagiraj ih u Notion CRM s `verify_pre_send = true` da Leonardo zna ručno otvoriti profil prije slanja.

---

## 9. NEXT STEPS (preporuka)

1. **Verifikacija preostalih 5** kandidata (Jadran, Ivana J., Iva L., Ivanka, Petra) — manual profile visit, provjeri OTW frame i recent activity.
2. **Connection request strategy:** sve top 10 su 2nd-degree. LinkedIn dozvoljava Message direct samo ako primatelj ima Open Profile (Premium feature) — vidio sam "Message" button na svim 6 verificiranih profila, što sugerira da imaju Open Profile. Za one koje nisi verificirao, opcija je Connect+note (limit 300 chars) ili Message ako je dostupan.
3. **Drugačiji draft za Connect+note** — DM drafti u candidates.md su ~500-700 znakova, predugi za Connect+note. Skratiti verziju do 280 chars za case kad Message ne radi.
4. **Reproducible re-run:** za sljedeći talas (npr. nakon 2 tjedna), ovaj search URL-ovi će vratiti nove kandidate jer LinkedIn rotira "Most relevant" rezultate. Score formula ostaje ista.
