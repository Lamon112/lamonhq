# Riva voice MVP — setup guide

*v1 · 2026-05-09 · Lamon Agency*

---

## Što gradimo

**Working Riva voice agent na pravom telefonu** koji možeš nazvati i pokazati prospekt klinikama na discovery call-u. NE production setup za klijenta — to dolazi tek nakon prvog close-a. Ovo je **demo asset**: 1 broj, 1 generic Riva persona za "premium dentalna klinika u Zagrebu", spremna za test poziv u 3h od sad.

**Cilj nakon Sunday popodne:**
- [ ] Aktivan Vapi assistant "Riva — Demo Premium Dental Clinic"
- [ ] Demo broj koji možeš nazvati s mobitela
- [ ] 2-3 snimljena sample call-a (MP3) za 3-min explainer video + discovery demo
- [ ] Self-tested kroz 8 scenarija (lista dolje)

**Trošak:** $5-10 Vapi trial credit + ElevenLabs free trial. Ako ti istraje trial → upgrade Vapi pay-as-you-go (~$0.10/min).

---

## Stack — zašto Vapi

**Vapi** (vapi.ai) je platforma koja veže sve potrebno: telefon (Twilio under hood) + voice (ElevenLabs/Cartesia/itd) + LLM (Anthropic/OpenAI) + runtime. Sve config preko web dashboarda.

**Alternative razmotrene:**
- **Retell AI** — slično Vapi, marginalno polish ija, ali ne za $5 trial
- **Bland AI** — manje fleksibilan u CRO jeziku
- **DIY (Twilio + ElevenLabs + Claude direkt)** — 2 dana posla, ne za MVP

**Ne hodaj DIY put dok nemaš plaćenog klijenta** — Vapi $0.10/min je 30x jeftiniji od tvog vremena.

---

## Step 1 · Sign-up Vapi (~10 min)

1. Otvori **vapi.ai** → Sign up (Google login s `leopoldlamon@gmail.com` najbrže)
2. Dashboard te pita za API keys: **trebaš samo Anthropic API key** za sad — koristi `ANTHROPIC_API_KEY` koji već imaš u Lamon HQ env (Vercel → Settings → Environment Variables → kopiraj)
3. Vapi automatically dodaje $10 trial credit na sign-up. To je ~100 minuta voice talk = 50+ test poziva.

**Ne** spajaj kreditnu karticu još — trial credit je dovoljan da provjeriš sviđa li ti se prije nego pređeš na pay-as-you-go.

---

## Step 2 · ElevenLabs voice — pick Croatian (~30 min)

Ovo je **najvažniji single faktor** za percepciju kvalitete. Loš glas = "robotskoj AI", dobar glas = "huh, ovo je prirodna recepcionarka".

### Opcije

ElevenLabs ima 70+ multilingual voices, **Multilingual v2 model** podržava hrvatski. Za HR dentalnu kliniku, ICP recepcionar:
- **Žensko** (industry default — premium dental recepcija = ženski glas u 95% slučajeva)
- **Topli, profesionalni ton** (ne pretjerano cheerful = djeluje fake)
- **Srednji tempo** (sporiji = ozbiljnije, premium feel)

### Test process

1. Otvori **elevenlabs.io** → Sign up (free trial)
2. **Voice Library** → filter:
   - Language: Multilingual (HR support automatski)
   - Gender: Female
   - Use case: Conversational
3. **Test reci** — preslušaj sljedeću rečenicu kroz svaki voice (ima sve tricky CRO sounds):

> *"Dobar dan, Dental Centar Apex. Zovem se Riva. Recite mi prvo, jeste li već naš pacijent ili dolazite prvi put? Ako trebate hitni termin zbog boli, odmah ću vas spojiti s našim dežurnim doktorom."*

Ova rečenica ima: ć (3x), č (2x), š, ž, đ, polite "Vi" form, dental kontekst, multi-clause.

### Top kandidati za prvi test (po mom istraživanju):

| Voice | Profil | Pros | Cons |
|---|---|---|---|
| **Sarah** | Multilingual, calm professional | Naturalna pauza, ne forsirani entuzijazam | Možda previše neutralan |
| **Aria** | Multilingual, warm female | Topli ton, dobro s HR sounds | Pomalo "cosmetic AI" feel |
| **Charlotte** | Sophisticated, formal | Premium feel, glasovni autoritet | Možda previše hladan za dental ICP |
| **Domi** | Warm female, multilingual | Empatični ton, dobro s pitanjima | Manji range |

### Decision criteria

Kad slušaš svaki, pitaj se:
- Bi li ovaj glas zvučao prirodno na recepciji premium klinike?
- Da li ima čudne pause / ranije sječe rečenice?
- Da li ć/č/š/ž zvuče kao da govori HR govornik ili stranjac?
- Da li si odmah svjestan da je AI?

**Pick top 1 i top 1 backup.** Pošalji mi voice ID-eve, ja ću ih kasnije moći koristiti za client-specific cloning kad krenemo production.

---

## Step 3 · Setup Riva agent u Vapi (~45 min)

1. Vapi dashboard → **Assistants** → **+ New Assistant**
2. Name: `Riva — Demo Premium Dental Clinic`
3. Konfiguracija:

### Model
- **Provider:** Anthropic
- **Model:** `claude-sonnet-4-5-20250929` (najbolji omjer kvalitete/cijene)
- **Temperature:** 0.6 (low enough da nema halucinacija, high enough za prirodne varijacije)
- **Max tokens:** 250 (kratki odgovori za voice — duge tirade djeluju fake)

### Voice
- **Provider:** ElevenLabs
- **Voice ID:** [tvoj pick iz Step 2]
- **Stability:** 0.55 (medium — ne previše robotski monotone, ne previše varijabilan)
- **Similarity boost:** 0.85 (sticks close to original voice character)

### First Message (što Riva kaže kad se javi)
```
Dobar dan, Dental Centar Apex. Riva na vezi, kako vam mogu pomoći?
```

### Transcriber (što Vapi koristi za STT)
- **Provider:** Deepgram
- **Model:** `nova-2`
- **Language:** Croatian (`hr`)

### System prompt (KOPIRAJ DOSLOVNO)

```
Ti si Riva — AI asistentica privatne dentalne klinike Dental Centar Apex u Zagrebu.

GLAS I TON:
- Hrvatski jezik, formalno "Vi", profesionalno-toplo
- Tempo: usporen, prirodan (ne robotski brzo)
- Ne pretjerano entuzijastično — premium klinika ton
- Pacijent uvijek ima prednost, slušaš pa odgovaraš
- Ne ispričavaj se previše — jedno "Razumijem" je dovoljno
- Kratki odgovori (1-3 rečenice). Voice nije email — ne nabrajaj duge liste.

KVALIFIKACIJA (prvi pitajni korak):
Ako pacijent zove za rezervaciju → "Recite mi prvo, jeste li već naš pacijent ili dolazite prvi put?"
Ako pacijent zove za informaciju → odgovori direktno, pa pitaj "Mogu li vam još s nečim pomoći?"

BOOKING FLOW (sakupi sljedeće, ovim redoslijedom):
1. Ime i prezime (potvrdi pravilan zapis)
2. Broj telefona za potvrdu
3. Tip tretmana koji traže (pregled, čišćenje, ispun, krunica, implant, bjeljenje, ortodoncija, drugo)
4. Hitan slučaj? (bol, krvarenje, traumat — ako da → ESKALACIJA odmah)
5. Preferirano vrijeme (jutro/popodne, dan u tjednu)

Kad imaš sve: "Hvala, [ime]. Bilježim vas za [predloženi termin]. Naša recepcionarka će vas nazvati na [broj] u sljedećih 30 minuta da potvrdimo termin i sve detalje. Ima li nešto drugo što vas zanima?"

FAQ (možeš odgovoriti sigurno):
- Radno vrijeme: ponedjeljak-petak 8:00-20:00, subota 9:00-14:00
- Lokacije: Zagreb Centar, Sesvete, Stenjevec
- Parking: dostupan na svim lokacijama
- Jezici: hrvatski, engleski, njemački, talijanski
- Plaćanje: gotovina, kartice, na rate (do 12 mjeseci, 0% kamata)
- Garancija: ovisi o tretmanu — recepcionarka će dati detalje
- Konzultacija: prva konzultacija besplatna, traje ~30 min

ŠTA NE GOVORIŠ:
- Konkretne cijene tretmana → "Cijena ovisi o pregledu. Naš stomatolog će na konzultaciji predložiti opcije i točnu cijenu."
- Medicinske preporuke ili dijagnoze
- Garancije rezultata ("sigurno ćete biti zadovoljni")
- Imena specifičnih doktora ako nisi sigurna (recepcionarka će znati)

ESKALACIJA — ODMAH PREBACI NA ŽIVU OSOBU:
- Pacijent ima jaku bol, krvarenje, traumat (zub ispao, otpadnuo ispun, oteklina, otok)
- Pacijent spomene tužbu, pravnu žalbu ili "nezadovoljan sam"
- Pacijent je nervozan/frustriran nakon 2 pokušaja objašnjavanja
- Pacijent traži direktno doktora po imenu
- Pacijent kaže "spojite me s živom osobom"

Eskalacija fraza: "Razumijem da je hitno. Prebacujem vas odmah na našeg dežurnog doktora. Ostanite na vezi."

(U demo režimu zapravo nemaš way to transfer — samo reci "Recepcionarka će vas nazvati za 5 minuta s [broj koji su dali]" — ne lažeš jer to je standardni flow u demo periodu.)

NA KRAJU SVAKE INTERAKCIJE:
- Ponovi ime i broj telefona radi potvrde
- "Hvala vam, [ime], lijepo nam je čuti vas. Vidimo se uskoro."
- Ne kaži "Ja sam AI" osim ako pacijent direktno pita

AKO PACIJENT PITA "Jeste li robot/AI?":
"Da, ja sam Riva — AI asistentica klinike. Mogu obaviti većinu rezervacija i odgovoriti na pitanja. Ako trebate pričati s ljudskom osobom, samo recite i prebacit ću vas."

NEPOZNATA PITANJA:
"To pitanje moram provjeriti s našim timom. Naša recepcionarka će vas nazvati u sljedećih 30 minuta s odgovorom — ostavite mi broj na koji vas mogu nazvati."

VENDOR CALL / NON-CLINICAL:
Ako zovu sales / dobavljač / suradnja: "Razumijem. Za poslovne upite, molim vas pošaljite email na info@dentalcentarapex.hr — kolega će vam odgovoriti unutar 24 sata."

NIKAD NE IZMIŠLJAJ:
- Imena doktora (osim u FAQ vendor flow gdje to nije relevantno)
- Konkretne cijene
- Specifikacije tretmana izvan FAQ-a
- Status rezervacija (npr. "imamo termin sutra u 10") — to su laži ako nemaš pristup kalendaru
```

### End-of-call message
```
Hvala vam što ste nazvali Dental Centar Apex. Ugodan dan!
```

### Save assistant.

---

## Step 4 · Provision demo phone number (~5 min)

1. Vapi → **Phone Numbers** → **+ Buy Number**
2. Country: USA ($1.15/mo) ili UK (£1.50/mo) — **HR brojevi su skuplji + treba registracija, demo-ovima je svejedno**
3. Asocijacija: poveži s `Riva — Demo Premium Dental Clinic` assistant-om
4. Vapi prikaže novi broj — **kopiraj ga**

Tvoj demo broj je sada live. Možeš ga nazvati s bilo kojeg telefona u svijetu.

---

## Step 5 · Test scenariji (8 scenarija, ~30 min ukupno)

Pozovi demo broj sa svog mobitela. Glumiš pacijenta. Cilj: provjeriti da Riva ne lomi flow ni u jednom od 8 standardnih scenarija.

### Scenario 1: Novi pacijent, ne-hitno, općeniti pregled
```
TI: "Dobar dan, htio bih dogovoriti pregled."
Očekuj: Riva pita "novi pacijent ili postojeći?"
TI: "Novi sam."
Očekuj: prikupi ime, broj, tip tretmana, vrijeme.
TI: "Marko Marković, 091 123 4567, općeniti pregled, idući tjedan popodne."
Očekuj: potvrda i closing.
```
**Pass:** flow prošao bez petlji, sve podatke pokupila, na kraju potvrdila ime + broj.

### Scenario 2: Postojeći pacijent, follow-up termin
```
TI: "Bok, ja sam Ana, već sam vaša pacijentica, treba mi follow-up nakon implanta."
Očekuj: ne pita ponovno za sve podatke, samo broj/vrijeme.
```
**Pass:** Riva ne tjera novog pacijenta kroz cijeli flow.

### Scenario 3: Hitan slučaj — jaka bol
```
TI: "Strašno me boli zub, ne mogu izdržati, treba mi termin SADA."
Očekuj: ESKALACIJA odmah — "Razumijem, prebacujem vas na dežurnog doktora..."
```
**Pass:** Riva NE pokuša prikupiti booking podatke, odmah eskalacija.

### Scenario 4: Cjenovni upit (kompleksan tretman)
```
TI: "Koliko košta implant?"
Očekuj: NE konkretni iznos. "Ovisi o pregledu, na konzultaciji ćemo dati točnu cijenu."
```
**Pass:** Riva NE izmišlja cijenu, NE garantira "do X eura", preusmjeri na konzultaciju.

### Scenario 5: Dental tourism (engleski)
```
TI (na engleskom): "Hello, I'm calling from Germany. Looking for dental implant package."
Očekuj: Riva prebacuje na engleski, kvalificira (broj implanata, tip), zakazuje konzultaciju.
```
**Pass:** plynni switch na engleski, ne miješa jezike u istoj rečenici.

### Scenario 6: Frustrirani pacijent
```
TI: "Zvao sam vas tri puta već, nitko se ne javlja, ovo je očajno!"
Očekuj: Riva NE eskalira problem, mirno odgovori, nudi rješenje.
```
**Pass:** Riva ostaje smirena, eskalira na recepcionarku ako frustracija raste.

### Scenario 7: Vendor / suradnja call
```
TI: "Zovem iz tvrtke Henry Schein, htjeli bismo poslati katalog."
Očekuj: "Pošaljite email na info@... — kolega će odgovoriti."
```
**Pass:** ne pokušava bukirati pacijent termin za vendor poziv.

### Scenario 8: "Jeste li robot?"
```
TI: "Pričam li s pravom osobom ili AI-jem?"
Očekuj: iskreno odgovori "Ja sam Riva, AI asistentica. Mogu prebaciti na ljudsku osobu ako želite."
```
**Pass:** Riva NE laže, ponudi opciju ljudske osobe.

---

## Step 6 · Snimi sample call-ovi za demo (~30 min)

Vapi automatically snima sve pozive (default ON). Dashboard → **Call Logs** → svaki poziv ima MP3 download.

**Spremi 2-3 najbolje:**
1. Scenario 1 (full booking flow) — pokazuje da rivalna basic flow radi
2. Scenario 4 (price objection) — pokazuje da Riva ne izmišlja
3. Scenario 5 (English dental tourism) — pokazuje multi-language

Ti MP3-ovi idu:
- 3-min explainer video (audio overlay tijekom dashboard demo segmenta)
- Discovery call (puštaš live: "evo kako Riva trenutno radi za jednu test kliniku")
- LinkedIn post 1-2 tjedna nakon launch-a (case study format)

---

## Step 7 · Cost guardrails

- Vapi trial: $10 = ~100 min talk = 50+ pozivanja od po 2 min
- Posle trial: pay-as-you-go ~$0.10/min (Anthropic + ElevenLabs + Vapi compose)
- ElevenLabs: free tier OK za demo (10K chars/mo), Pro $99/mo dolazi tek kad imamo 3+ klijenta

**Set hard cap u Vapi:** Settings → Billing → Spending Limit → set na $20/mo dok ne klijent #1. To te štiti od accidental loop charges.

---

## Step 8 · Što SLJEDEĆE (post-MVP, kad prvi klijent close-a)

Sad imaš working demo Riva. Što treba **production setup za prvog klijenta:**

1. **Per-clinic system prompt** — generirati Steward Onboarding Kit-om (već imamo) → konfigurirati u Vapi (per-assistant)
2. **HR phone number** — registracija s HR telco (Hrvatski Telekom / A1 / Tele2), traje 5-15 dana, košta ~€10/mo. Vapi support može pomoći s setup-om.
3. **Booking integracija** (Vapi tools) — webhook na klijentov calendar (EasyBusy, Calendly, Google Calendar) tako da Riva STVARNO knjizi termine, ne samo "bilježim vas..."
4. **Telco port-over** — klijentov glavni broj prebaci na Vapi-managed routing s fallback-om na njihov stari broj. Najkompliciraniji korak, traje 7-14 dana ovisno o telco-u.
5. **GDPR consent flow** — Riva kaže consent disclaimer prije snimanja prema HR pravu (već u system prompt-u kao TODO za production).
6. **Shadow mode** (T+7 prije live cutover) — Vapi može run u "monitor mode" gdje sluša ali ne odgovara. Konfiguracija depends na telco setup.

Ovo sve je **3-7 dana posla** za prvog klijenta, drugi klijent je 2-3 dana, treći+ je standardiziran 1-day deploy.

---

## Quick reference

| Resurs | URL |
|---|---|
| Vapi dashboard | https://dashboard.vapi.ai |
| ElevenLabs voice library | https://elevenlabs.io/app/voice-library |
| Anthropic API key | https://console.anthropic.com/settings/keys |
| Vapi docs (Anthropic + ElevenLabs combo) | https://docs.vapi.ai/quickstart/dashboard |
| Voice testing tip — Croatian phonemes | č ć š ž đ — koristi sve u testnoj rečenici |

---

*Dobiveš pitanja pri setup-u, javi se. Možemo i live debugger session ako Vapi nešto ne reagira kako treba.*
