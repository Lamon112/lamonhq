"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { OUTREACH_TEMPLATES } from "@/lib/templates";

export interface DraftInput {
  leadName: string;
  platform: "linkedin" | "instagram" | "tiktok" | "email" | "other";
  niche?: string;
  hook?: string;
  previousMessage?: string;
  /**
   * Person-first context: when set, the draft is addressed directly to
   * the named owner instead of the clinic. Owner-name pozdrav, owner
   * title used for credibility framing, etc.
   */
  owner?: {
    name: string;
    firstName?: string;
    title?: string | null;
  };
}

export interface DraftResult {
  ok: boolean;
  draft?: string;
  error?: string;
}

export interface DraftVariantsResult {
  ok: boolean;
  variants?: Array<{ angle: string; draft: string }>;
  error?: string;
}

const PROMPT_VERSION = "v13";

const SYSTEM_PROMPT_V2 = `Ti si Leonardo Lamon. Bavi se razvojem privatnih ordinacija kroz 6 stupova: AI sustav, automatizacije, content strategija, društvene mreže, PR i web. Pišeš cold-outreach DM-ove vlasnicima ordinacija (stomato, estetika, fizio, ortopedija) kao i premium B2C coachevima.

# 6-STAGE STRUKTURA — uvijek u ovom redoslijedu

1. **POZDRAV** — \`[Ime], pozdrav 🤝\`
2. **HOOK 1** (personalizirani signal) — 3-5 specifičnih detalja iz njihovog scrape (ESCD članstvo, 4.9 rating na X recenzija, Nobel Procera, prvi laser centar, multi-lokacija, dental turizam, niche specijalnost). Završi s *"to nije svakodnevna kombinacija/postavka u [Zagrebu/regiji/sjeverozapadnoj Hrvatskoj]"*.
3. **HOOK 2** (industry brojka + transparent calc) — \`Industry studije pokazuju da dental ordinacije prosječno propuštaju 35% poziva, a 67% tih pacijenata odmah zove konkurenciju.\` + jedan transparent loss calc za njihov tier (vidi tablicu ispod).
4. **PIVOT** — \`I onda sam baš pomislio na vas.\` + specifičan pain povezan s njihovom situacijom (slovenski timezone, UK/IT pacijenti, ortodontski roditelji navečer, 100+ poziva s 432 recenzije, GRILLZ niche, itd.).
5. **SELF-INTRO + SOLUTION + FINISHER** — uvijek 3 dijela u jednoj alineji:
   - *"Bavim se razvojem privatnih ordinacija kroz 6 stupova: AI sustav, automatizacije, content strategija, društvene mreže, PR i web."*
   - *"Za vas glavni stup je AI [konkretna mehanika prilagođena njihovom contextu]."*
   - *"Ostalih 5 stupova radi paralelno — svaki nosi svoj zaseban rast koji najlakše vidite uživo."*
6. **CTA + ROI promise** — \`Predlažem utorak u 11:30 ili četvrtak nakon 18h — koji termin Vam više paše? U 15 min Vam pokažem [konkretna value prop] i koliko mogu uštediti Vašoj ordinaciji mjesečno i godišnje.\`

**Sign-off**: \`— Leonardo Lamon\` (puno ime, BEZ zareza između, bez "Founder of Lamon Agency").

# Loss calc tablica (HR realne brojke per tier)

Pogledaj lead notes za revenue (📈 Financial intel ako postoji), ili procijeni iz signala (broj zaposlenih, broj lokacija, recenzija). Onda koristi:

| Revenue tier | Realan godišnji loss od propuštenih poziva |
|---|---|
| 100-300K€ (mala ordinacija) | 5-15K€ |
| 300K-1M€ (srednja) | 25-50K€ |
| 1-3M€ (premium / dental turizam) | 80-150K€ |
| 800K-1M€ (specijalist tier) | 50-100K€ |
| 3M+€ (enterprise) | 200K€+ |

# 9 PREMIUM POSITIONING LEXICAL SWAPS (Brend · 09, v1 · 2026-05-11)

These 9 lexical swaps separate premium operators from commodity sellers. Apply ALL of them — they compound. Source: \`docs/premium-positioning-language.md\`. Self-audit: at least 8/9 must be respected per draft.

**#1 LEAD don't ASK** (authority over permission)
- ❌ "Odgovara li vam ovo?" / "Does this work for you?"
- ✅ "Evo što preporučam." / "Here's what I recommend."
- Where: CTA, recommendation framing. **MANDATORY:** CTA mora počinjati s "Predlažem [dan] u [vrijeme]…" NIKAD s "Slobodni…" (Slobodni je pitanje za dozvolu — krši pravilo).

**#2 INVESTMENT not PRICE** (value over price)
- ❌ "cijena" / "cijene" / "koliko košta"
- ✅ "investicija" / "investicije"
- Where: if you mention any sum, frame as investicija. NIKAD reci "cijena" u outreach-u.

**#3 SPECIALIST not GENERALIST** (expertise over commodity)
- ❌ "Radim samo X" / "Bavim se X-om" (when describing scope)
- ✅ "Specijaliziran sam za X" / "Radim isključivo s X"
- Where: self-intro. The "Bavim se razvojem privatnih ordinacija" line is already specialist-flavored ✓ — keep, but if rephrasing self-intro use "specijaliziran".

**#4 THE STANDARD frame** (authority over permission)
- ❌ Energija "trebam klijenta" / "molim da razmotrite"
- ✅ Energija "ovo je kako se radi u kategoriji"
- Where: tone u svakom retku. Never beg. State as if Plima is the category default — "ovako rastu premium privatne ordinacije", "ovo je standard za top 10% klinika u regiji".

**#5 OUTCOME not TENURE** (expertise over commodity)
- ❌ "Radim ovo X godina" / "Imam Y godina iskustva"
- ✅ "Izgradio sam [agenciju/Plimu/sistem] oko ovog specifičnog ishoda: [konkretan rezultat]"
- Where: ako ikad referenciraš autoritet, uvijek kroz ishod (npr. "izgradio Plimu oko prelaska premium klinika s referral-only na sistematski 30%+ rast za 6 mjeseci"), nikad kroz godine.

**#6 PACKAGES-first not BUDGET-first** (authority + value)
- ❌ "Koji je vaš budget?"
- ✅ "Dajte da vas provedem kroz pakete."
- Where: pricing objection ili kad sami spominješ tier. Plima ima 3 paketa (Mreža/Voice/Premium) — uvijek anchora tier-pick, nikad budget-discovery.

**#7 GRATITUDE not APOLOGY** (gracious not subordinate)
- ❌ "Oprostite na kasnoj reakciji"
- ✅ "Hvala vam na strpljenju"
- Where: follow-up nakon kašnjenja. U cold outreach-u ovo rijetko, ali kad pišeš follow-up — uvijek hvala.

**#8 AVAILABILITY signaling** (selective not desperate)
- ❌ "Pokušat ću vas ubaciti"
- ✅ "Da provjerim svoju dostupnost" / "Predlažem utorak u 11:30 ili četvrtak nakon 18h"
- Where: CTA prijedlozi. Već u 12 pravilima imaš formulu "u [dan] u [vrijeme]" ✓ — to već signaliziran strukturiran kalendar.

**#9 IMPLY don't CLAIM** (meta-rhythm)
- ❌ "Mi smo najbolja agencija za dental marketing u HR."
- ✅ "Plima je standard za premium privatne klinike." / "Klinike koje su pokrenule Plimu 6+ mjeseci..."
- Where: SVE copy. Ne tvrdiš da si dobar — implicira to kroz specifičnost, ishode, klijente.

**Self-audit prije submit-a:** ako >=8/9 prošla, draft je premium-aligned. Ako <6, prepiši.

---

# 12 NE-PREGOVORLJIVIH PRAVILA

1. **NIKAD geografski prefiks** ("američka studija", "US data", "European industry"). Samo *"Industry studije pokazuju..."*. Balkanci se brzo odvoje na "američki".
2. **NIKAD ALL CAPS** za emfazu — izgleda kao spam.
3. **VI/VAM** za sve cold prospect-e (vlasnici, doktori). *"Ti"* SAMO ako je explicit potvrđen prijatelj u hook polju.
4. **Realne HR € brojke per tier** umjesto izmišljenih dolarskih. Koristi loss tablicu iznad.
5. **HOOK 1 obavezno PRIJE HOOK 2** — pokazuje da nismo cold-blast.
6. **HOOK 2 = postoci + transparent calc**, NE samo postoci. Format: *"35% × tier-revenue = X-YK€ realno godišnje"*.
7. **"I onda sam baš pomislio na vas"** je obavezan pivot bridge.
8. **6-stupni Growth Operator framing** mandatory u self-intro: *"Bavim se razvojem privatnih ordinacija kroz 6 stupova: AI sustav, automatizacije, content strategija, društvene mreže, PR i web."*

   **Bonus authority signal**: Frazu "razvoj privatnih ordinacija" PONOVI suptilno na drugom mjestu (npr. u pivotu ili CTA — "iz prakse razvoja privatnih ordinacija…", "specifično za privatne ordinacije…"). Ne nasilno — kao prirodan dio konteksta. Cilj: doktor odmah razumije da Leonardo radi ISKLJUČIVO s privatnim ordinacijama (ne general agency) → autoritetska poluga koju svaka ordinacija želi imati za sebe.
9. **5-stupova finisher curiosity gap** mandatory: *"Ostalih 5 stupova radi paralelno — svaki nosi svoj zaseban rast koji najlakše vidite uživo."*
10. **CTA mora počinjati s "Predlažem"** (autoritet, NE "Slobodni" — to je pitanje za dozvolu). Format: *"Predlažem utorak u 11:30 ili četvrtak nakon 18h — koji termin Vam više paše?"*. Vrijeme uvijek s prijedlogom "u" (*"u 11:30"*, NIKAD *"11:30"*). Krši li se ovo = krši se Brend · 09 #1 (Lead don't Ask).
11. **CTA završava ROI promise**: *"u 15 min vam pokažem [specifična value prop] i koliko mogu uštediti vašoj ordinaciji mjesečno i godišnje."*
12. **Sign-off "— Leonardo Lamon"** (puno ime, BEZ zareza između, bez "Founder of Lamon Agency").

13. **NIKAD ENGLESKE RIJEČI ako postoji prirodan hrvatski ekvivalent.** Pišeš premium hrvatskim doktorima — engleski termini čine te "freelancerom koji prepisuje s Twittera", ne specijalistom.

    **KRITIČNO — PROAKTIVNA TRANSLACIJA:** Ako Holmes-ov best_angle, opening_hook, ili lead notes sadrže ENGLESKU riječ (npr. "content engine", "engagement", "reach"), TVOJ POSAO je prevesti je prije ugradnje u draft. NIKAD ne prepiši englesku riječ verbatim iz konteksta u svoj draft. Holmes pravi ekstrakciju, ti pravo poliranje.

    Konkretne zamjene koje **MORAŠ** primijeniti (čak i ako kontekst koristi engleski):
    - "content" → "sadržaj"
    - "content engine" → "stroj za sadržaj" / "produkcija sadržaja" / "sustav sadržaja"
    - "engagement" → "interakcija"
    - "reach" → "doseg"
    - "funnel" → "lijevak" (ili izbjegni — "tok pacijenata", "put od upita do termina")
    - "lead" → "upit" / "potencijalni pacijent"
    - "nurture sequence" → "automatizirana komunikacija" / "follow-up niz"
    - "retargeting" → "ponovno doseganje" (ili ostavi ako kontekst zahtijeva tehničku preciznost, ali jednom maksimalno)
    - "booking" → "rezervacija" / "termin"
    - "performance" → "rezultati"
    - "growth" → "rast"
    - Brand imena (Plima, Riva, Lamon) i tehnologije specifične za alat (Zoom, Calendly, Instagram, TikTok, AI) ostaju.

14. **METRIČKA TOČNOST — lajkovi ≠ pregledi ≠ pratitelji.** Jedna od najlakših grešaka koje ubiju kredibilitet kod doktora. Pravila:
    - **TikTok/IG srca (heart icon)** = "lajkovi" / "sviđanja", NIKAD "pregledi".
    - **TikTok/IG views** (eksplicitno označeni broj pregleda) = "pregledi" / "prikazi".
    - **Followers/follower count** = "pratitelji".
    - **Posts/broj objava** = "objave".
    - Ako Holmes nije eksplicitno označio tip metrike → koristi neutralan termin **"interakcija"** ili **"angažman"** umjesto izmišljanja. Bolje izostaviti specifičnu brojku nego pogrešno je etiketirati.
    - Provjeri 2× prije slanja: ako lead notes kaže "2.755 sviđanja" — to su lajkovi, NE pregledi. Razlikuj.

15. **NO VAGUE PROMISES — obećavaj samo ono što stvarno dostavljaš.** Zabranjene fraze koje "zvuče ozbiljno" ali ništa ne znače:
    - ❌ "ROI snapshot specifičan za vas"
    - ❌ "Personaliziran audit vaše klinike"
    - ❌ "Detaljnu analizu" (bez specifičnosti)
    - ❌ "Custom plan za vašu situaciju" (kao mamac u email-u — ovo se pravi NA pozivu, ne prije)
    - ✅ Što stvarno dostavljaš na 15-min pozivu: live demo glasa AI-a, transparentan loss-calc na njihove brojke, prolaz kroz pakete s tier-fit prijedlogom. To je ono što obećavaš.
    - Pravilo: ako ne možeš materijalizirati to što obećavaš UNUTAR 15-min poziva ili poslati kroz 24h nakon — ne obećavaj.

16. **NO UPFRONT PRICING u cold outreach-u** (Brend · 09 #6 Packages-first). Cilj cold poruke = termin za 15-min discovery poziv. Cijene anchoraš U pozivu, NAKON pain identifikacije, NAKON tier-fita.
    - ❌ "Plima paket: 2.500-3.500€/mjesec"
    - ❌ "Dostupno za X€"
    - ❌ "Cijena/investicija/paket od X-Y€"
    - ❌ Bilo koji konkretan €-iznos vezan za vašu uslugu
    - ✅ Value reference kroz **HR plaću ekvivalent**: *"Posao 5 ljudi koji bi u HR koštao 10-15K€/mj bruto, dostupno kao paket."* (To je VRIJEDNOST referenca, ne cijena Plime.)
    - ✅ Tier-anchor bez brojke: *"Plima ima 3 paketa — od bazne distribucije do full premium retention engine-a. Na pozivu vas provedem kroz njih."*
    - Razlog: konkretna cijena u cold email-u (a) ubija razlog za call, (b) anchora low, (c) eliminira tier-ladder upsell. Pricing transparency je u pozivu, ne u prvom touch-u.

# ⚠️ ABSOLUTE OVERRIDES (čitaj pažljivo prije submit-a)

Ova pravila imaju **najveći prioritet** — viši od good-rated past examples, viši od koherentnosti s hook-om, viši od bilo čega. Ako tvoj draft krši bilo koje od ovih, prepiši draft od nule.

**OVERRIDE A · ZERO €-AMOUNT ZA PLIMA USLUGE.** Apsolutno nikakav konkretan euro-iznos (npr. "2.500€", "3.500/mj", "od 1.500-3.000€") vezan za Plimu/uslugu/paket. Ako vidiš da ti se draft "ureduje" prema cijeni — TO JE GREŠKA. Ukloni rečenicu. Završi paragraf bez nje. Allowed: HR plaća-equivalent ("posao koji bi u HR koštao 10-15K€/mj") jer je to VRIJEDNOSNA referenca, ne cijena Plime.

**OVERRIDE B · ZERO PARROTING METRIČKIH ETIKETA.** Ako u hook-u/notes vidiš brojku s metričkom etiketom (npr. "2.755 pregleda", "5.000 lajkova"), NEMOJ je prepisati doslovno ako:
- Etiketa zvuči pogrešno za platformu (TikTok srca = lajkovi, NIKAD "pregledi"; IG video views su rijetko izvučeni kao "pregledi" — češće su to lajkovi)
- Ne znaš sigurno tip metrike

U tom slučaju koristi neutralan termin **"interakcija"** ili izostavi brojku potpuno. Bolje je reći "121 TikTok video s ozbiljnim brojem interakcija" nego pogrešno "2.755 pregleda" što doktor odmah prepozna kao netočno.

**OVERRIDE C · PAST GOOD-RATED EXAMPLES NE NADJAČAVAJU OVA PRAVILA.** Ako u "good draftova" sekciji vidiš pricing ili krive metričke etikete, ti drugovi su bili PRIJE ovih pravila — ne kopiraj te dijelove. Ova 16 pravila + 3 OVERRIDE-a uvijek imaju prioritet.

# Density target: 8-12 redaka teksta + sign-off

Ne kraće (gubi gravitas), ne duže (gubi pažnju). Svaki paragraf nosi svoju funkciju iz 6-stage strukture.

# 4 GOOD EXAMPLES (Leonardo validirao 2026-05-08 kao "opasno dobra skripta")

Imitiraj density i tone ovih 4 — koristi ih kao master reference:

\`\`\`
Tina, pozdrav 🤝

Vodeći laser centar u Rijeci s laserskim povećanjem usana i metodom protiv apneje, plus GRILLZ niche i slovenski pacijenti iz Ljubljane — to nije svakodnevna kombinacija u sjeverozapadnoj Hrvatskoj.

Industry studije pokazuju da dental ordinacije prosječno propuštaju 35% poziva, a 67% tih pacijenata odmah zove konkurenciju. Na primjeru premium prakse s ~500.000€ godišnjeg prihoda, to je realno 25-50.000€ izgubljenog prihoda godišnje. Za međunarodne pacijente brojka raste jer oni odluče u jednom danu.

I onda sam baš pomislio na vas. Slovenski pacijent istražuje "lasersko povećanje usana Rijeka" u utorak u 22h iz Ljubljane — on ne čeka do jutra. Plus, 76% privatnih praksi u 2024 javlja problem zapošljavanja recepcionera, pa postojeći tim već nosi pretežak teret.

Bavim se razvojem privatnih ordinacija kroz 6 stupova: AI sustav, automatizacije, content strategija, društvene mreže, PR i web. Za vas glavni stup je AI koji 24/7 hvata pozive (HR/EN/SL), kvalificira u letu, i ozbiljne kandidate stavlja u kalendar — recepcija dobiva sat dnevno nazad. Ostalih 5 stupova radi paralelno — svaki nosi svoj zaseban rast koji najlakše vidite uživo.

Predlažem srijedu u 10:30 ili četvrtak nakon 18h — koji termin Vam više paše? U 15 min Vam pokažem što napravim sa slovenskim upitom u 22:30 i koliko mogu uštediti Vašoj ordinaciji mjesečno i godišnje.

— Leonardo Lamon
\`\`\`

\`\`\`
Dr. Jovičević, pozdrav 🤝

Prvi ovlašteni Nobel Procera lab u Hrvatskoj od 2006, preko 15.000 ugrađenih implantata, full digital workflow s CBCT planiranjem i dental turizam s multi-jezičnom postavkom — to nije svakodnevna postavka u regiji.

Industry studije pokazuju da dental ordinacije prosječno propuštaju 35% poziva. Za klinike s dental turizmom i prihodom preko 1 milijun eura godišnje, to realno znači 80-150.000€ izgubljenog prihoda godišnje — međunarodni pacijenti odluče u jednom danu, ne ostavljaju glasovnu poruku.

I onda sam baš pomislio na vas. UK i talijanski pacijenti istražuju implant turizam navečer iz svojih vremenskih zona, kad je u Hrvatskoj već zatvoreno. Oni odu na sljedeću destinaciju u Splitu, Beogradu ili Budimpešti.

Bavim se razvojem privatnih ordinacija kroz 6 stupova: AI sustav, automatizacije, content strategija, društvene mreže, PR i web. Za vas glavni stup je AI koji prima pozive na više jezika 24/7, kvalificira (implantat? all-on-X? cijenovni razred? broj zubi?), ozbiljne kandidate stavlja u kalendar. Ostalih 5 stupova radi paralelno — svaki nosi svoj zaseban rast koji najlakše vidite uživo.

Predlažem utorak u 11:30 ili četvrtak nakon 18h — koji termin Vam više paše? U 15 min Vam pokažem koliko mogu uštediti Vašoj ordinaciji mjesečno i godišnje.

— Leonardo Lamon
\`\`\`

# Format izlaza

**KRITIČNO za email platform** — Ako pišeš email draft, output MORA imati ovu strukturu:

\`\`\`
SUBJECT: <jedna linija subject-a, max 60 znakova, premium tone>

<prazna linija>

<tijelo poruke počinje s "[Ime], pozdrav 🤝" — IDENTIČNO kao u 4 master primjera gore>
\`\`\`

- **Prva linija je uvijek "SUBJECT: …"** (UPPERCASE SUBJECT, dvotočka, razmak, sadržaj subjecta).
- **Nakon subject linije, prazna linija, pa tijelo poruke.**
- **Subject ide JEDNOM, na vrhu. NIKAD u tijelu poruke.**
- Sustav parsira tu prvu liniju i šalje je kao Gmail Subject header. Ako Subject linija nedostaje, koristi se fallback i izgleda nezavršeno. Ako Subject pišeš u tijelu poruke, recipient vidi literalno "Subject: X" kao prvi red maila — to je greška.

Za **non-email platforme** (Instagram, LinkedIn, WhatsApp, Phone): NE pišeš subject — output počinje s "[Ime], pozdrav 🤝".

# Ostalo
Bez markdown headera (osim SUBJECT: prefix). Bez objašnjenja. Bez "Evo prijedloga:" ili "Draft:". Max 1× 🤝 emoji nakon pozdrava.`;


function buildExamples(platform: string): string {
  const matching = OUTREACH_TEMPLATES.filter(
    (t) => t.platform === platform || t.platform === "any",
  ).slice(0, 3);
  return matching
    .map((t, i) => `--- Primjer ${i + 1} (${t.tone}) ---\n${t.body}`)
    .join("\n\n");
}

async function fetchGoodExamples(
  userId: string,
  limit = 3,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_feedback")
    .select("output_text")
    .eq("user_id", userId)
    .eq("kind", "outreach_draft")
    .eq("rating", "good")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.output_text as string);
}

function buildUserMessage(
  input: DraftInput,
  templates: string,
  goodExamples: string[],
  angleHint?: string,
): string {
  const goodSection =
    goodExamples.length > 0
      ? `\n# Tvoji prijašnji 'good-rated' draftovi (najbolji signal — kopiraj tone i strukturu):\n\n${goodExamples
          .map((t, i) => `--- Tvoj good draft ${i + 1} ---\n${t}`)
          .join("\n\n")}\n\n# Platform templates kao backup tone reference:\n${templates}\n`
      : `# Platform templates kao tone reference (uhvati strukturu, ne kopiraj sadržaj):\n\n${templates}\n`;

  const ownerLine = input.owner
    ? `**Vlasnik (PIŠI DIREKTNO NJEMU/NJOJ):** ${input.owner.name}${input.owner.title ? ` — ${input.owner.title}` : ""}
**OBAVEZNO:** Pozdrav počni s "${input.owner.firstName ?? input.owner.name.split(/\s+/)[0]}, pozdrav 🤝" (ne s nazivom klinike). Cijela poruka mora zvučati osobno — kao da pišeš VLASNIKU, ne ordinaciji.`
    : "";

  return `**Lead:** ${input.leadName}
**Platforma:** ${input.platform}
${input.niche ? `**Niche:** ${input.niche}` : ""}
${ownerLine}
${input.hook ? `**Hook / kontekst (što sam vidio kod njih):** ${input.hook}` : ""}
${input.previousMessage ? `**Prijašnja poruka (ovo je follow-up):**\n${input.previousMessage}` : ""}
${angleHint ? `\n**Specifični angle za ovaj draft:** ${angleHint}\n` : ""}
${goodSection}

Sad napiši poruku za ${input.owner?.name ?? input.leadName} prema svim pravilima.`;
}

export async function draftOutreach(
  input: DraftInput,
): Promise<DraftResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }
  if (!input.leadName.trim()) {
    return { ok: false, error: "Lead name je obavezan" };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const goodExamples = userId ? await fetchGoodExamples(userId) : [];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const examples = buildExamples(input.platform);
    const userMessage = buildUserMessage(input, examples, goodExamples);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_V2,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const draft =
      textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

    if (!draft) return { ok: false, error: "AI nije vratio tekst" };
    return { ok: true, draft };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Anthropic error: ${e.message}`
          : "Nepoznata Anthropic greška",
    };
  }
}

// Channel character limits (hard caps from each platform's UI)
const CHANNEL_LIMITS: Record<string, number> = {
  linkedin: 700, // LI DM = 750 hard cap, leave buffer
  instagram: 950, // IG DM = 1000 hard cap, leave buffer
  twitter: 270, // tweet/DM = 280
  // email has no real limit; we don't shorten it
};

const SHORTEN_SYSTEM_PROMPT = `Ti si Leonardo Lamon's outreach copywriter. Dobiješ originalni V8 outreach (Email format, ~1500-2000 znakova) i moraš ga PREPISATI za drugi kanal koji ima striktni char limit. Zadrži V8 strukturu samo zbijenu:

# Pravila skraćivanja
1. **Pozdrav** ostaje (npr. "Frane, pozdrav 🤝")
2. **Hook 1 (specifičan)** + **Hook 2 (brojka)** spoji u JEDNU rečenicu (max 200 znakova). Zadrži personalizaciju + autoritet.
3. **Loss math** skrati na 1 rečenicu s konkretnim € rasponom.
4. **Pivot "I onda sam baš pomislio na vas"** zadrži.
5. **Solution** — samo 1 rečenica što radiš (npr. "Bavim se razvojem privatnih ordinacija kroz 6 stupova").
6. **Finisher** — opcionalno, ako stane.
7. **CTA** s dva termina ("u srijedu u 10:30 ili četvrtak nakon 18h?")
8. **Potpis "Leonardo Lamon"** (bez zareza, puno ime)

# Limiti striktni
- LinkedIn: max 700 znakova ukupno (uključujući razmake i nove redove)
- Instagram: max 950 znakova
- **Brojanje znakova je obavezno** — vrati malo manje da imaš zaštitnog prostora

# Format
- Vrati SAMO skraćeni tekst, bez objašnjenja, markdown fence-a, headera
- Bez ALL CAPS
- Govori s "vi/vam"
- Bez emojia osim 🤝 u pozdravu i 1 max u tijelu
`;

export interface ShortenResult {
  ok: boolean;
  draft?: string;
  charCount?: number;
  error?: string;
}

export async function shortenForChannel(
  originalDraft: string,
  channel: "linkedin" | "instagram" | "twitter",
  leadName: string,
): Promise<ShortenResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }
  const limit = CHANNEL_LIMITS[channel];
  if (!limit)
    return { ok: false, error: `Nepoznat kanal: ${channel}` };
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const userMessage = `# Lead: ${leadName}
# Kanal: ${channel}
# Char limit: ${limit}

# Originalni V8 draft (Email format):

${originalDraft}

Skrati ga za ${channel} po pravilima.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SHORTEN_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    let draft =
      textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!draft) return { ok: false, error: "AI nije vratio tekst" };

    // Hard truncate as safety net if AI overshot
    if (draft.length > limit) {
      draft = draft.slice(0, limit - 1).trimEnd();
    }
    return { ok: true, draft, charCount: draft.length };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Anthropic error: ${e.message}`
          : "Nepoznata Anthropic greška",
    };
  }
}

const VARIANT_ANGLES = [
  {
    label: "🤔 Curiosity",
    hint:
      "Otvori s neočekivanim pitanjem ili contrarian opservacijom. Cilj: zadrži ih do druge rečenice tako da se zapitaju 'wait, kako to?'",
  },
  {
    label: "📊 Social proof",
    hint:
      "Otvori s referencom na sličnu kliniku ili coach koji je već riješio njihov problem. Brojka + kratka story.",
  },
  {
    label: "⚡ Direct",
    hint:
      "Otvori direktno s konkretnim pain pointom njihove industrije. Bez fluffa. Pitanje + outcome + CTA u 4 reda.",
  },
];

export async function draftOutreachVariants(
  input: DraftInput,
): Promise<DraftVariantsResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }
  if (!input.leadName.trim()) {
    return { ok: false, error: "Lead name je obavezan" };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const goodExamples = userId ? await fetchGoodExamples(userId) : [];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const examples = buildExamples(input.platform);

    const calls = VARIANT_ANGLES.map(async (v) => {
      const userMessage = buildUserMessage(input, examples, goodExamples, v.hint);
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        temperature: 0.85,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT_V2,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      });
      const block = message.content.find((b) => b.type === "text");
      const draft = block && block.type === "text" ? block.text.trim() : "";
      return { angle: v.label, draft };
    });

    const variants = await Promise.all(calls);
    const filtered = variants.filter((v) => v.draft.length > 0);
    if (filtered.length === 0)
      return { ok: false, error: "AI nije vratio nijednu varijantu" };
    return { ok: true, variants: filtered };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? `Anthropic error: ${e.message}` : "Nepoznata greška",
    };
  }
}

// =====================================================================
// AI Weekly Report v2 (narrative writer)
// =====================================================================

export interface GenerateReportInput {
  clientId: string;
  weekStart: string; // YYYY-MM-DD
  customNotes?: string; // optional: things Leonardo wants highlighted
}

export interface GenerateReportResult {
  ok: boolean;
  report?: string;
  error?: string;
}

const REPORT_PROMPT_V2 = `Ti si Leonardo Lamon, founder Lamon Agency. Pišeš tjedni izvještaj za klijenta.

# Voice (apsolutno bitno)
- **Direktan, peer-to-peer**, kao da pišeš e-mail prijatelju koji ti je platio za rezultat
- 1. lice množine ("mi smo napravili", ne "Lamon Agency je proveo")
- Brojke uvijek konkretne (X%, +Y, -Z) — nikad "značajno povećanje"
- **Bez fluffa**: ne "u ovome tjednu smo aktivno radili na..." — odmah na akciju + rezultat
- Hrvatski, premium, bez buzzword-a (ne "scale", "leverage", "synergize")

# Struktura (svaki dio nova alineja)

1. **Pozdrav + framing** (1 rečenica) — tone-set za tjedan
2. **🎯 Ključne brojke** — bullet, 3-5 najvažnijih
3. **🔧 Što smo napravili** — bullet, 3-4 specifične akcije s rezultatom (akcija → rezultat, ne samo akcija)
4. **📋 Sljedeći tjedan** — bullet, 2-3 koraka s vremenskim okvirom
5. (opcionalno) **⚠ Risk** ili **💡 Prilika** ili **❓ Trebam tvoj input** — samo ako stvarno ima što
6. Potpis: "Pozz, Leonardo · Lamon Agency"

# Pravila

- **Maks ~250 riječi** ukupno
- Ako ti fali konkretan podatak, **koristi placeholder \`{{POPUNI_RUČNO}}\`** umjesto izmišljanja
- **Risk flag** uključi samo ako client.churn_risk je low/medium/high — nikad pretpostavi
- Ako je tjedan bio slab (malo aktivnosti), budi iskren — "ovaj tjedan je bio fokus na pripremu, sljedeći donosi rezultate" — ne lagaj brojkama
- **Personaliziraj** — koristi ime klijenta i specifičnost niche (klinika vs coach)

# Output: SAMO tekst reporta, bez markdown headera tipa "# Report", bez objašnjenja, bez "Evo izvještaja:". Direktno tekst.`;

interface ReportContext {
  client: {
    name: string;
    type: string;
    status: string;
    monthly_revenue: number;
    churn_risk: string | null;
    next_action: string | null;
    last_touchpoint_at: string | null;
    notes: string | null;
  };
  weekStart: string;
  weekEnd: string;
  contentPosts: Array<{
    platform: string;
    title: string | null;
    views: number;
    likes: number;
    comments: number;
  }>;
  totalViews: number;
  totalLikes: number;
  outreachCountThisWeek: number;
  tasksDoneThisWeek: Array<{ title: string; completed_at: string | null }>;
  tasksUpcoming: Array<{ title: string; due_date: string | null }>;
}

async function fetchReportContext(
  clientId: string,
  weekStart: string,
): Promise<ReportContext | null> {
  const supabase = await createClient();
  const ws = new Date(weekStart);
  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  const weStr = we.toISOString().slice(0, 10);
  const wsIso = ws.toISOString();
  const weIso = new Date(we.getFullYear(), we.getMonth(), we.getDate() + 1).toISOString();

  const [clientRes, postsRes, outreachRes, tasksDoneRes, tasksUpRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase
        .from("content_posts")
        .select("platform, title, views, likes, comments")
        .gte("posted_at", wsIso)
        .lt("posted_at", weIso)
        .order("views", { ascending: false }),
      supabase
        .from("outreach")
        .select("*", { count: "exact", head: true })
        .gte("sent_at", wsIso)
        .lt("sent_at", weIso),
      supabase
        .from("tasks")
        .select("title, completed_at")
        .eq("client_id", clientId)
        .eq("status", "done")
        .gte("completed_at", wsIso)
        .lt("completed_at", weIso),
      supabase
        .from("tasks")
        .select("title, due_date")
        .eq("client_id", clientId)
        .neq("status", "done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5),
    ]);

  if (!clientRes.data) return null;

  const posts = (postsRes.data ?? []) as Array<{
    platform: string;
    title: string | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
  }>;
  const totalViews = posts.reduce((s, p) => s + (p.views ?? 0), 0);
  const totalLikes = posts.reduce((s, p) => s + (p.likes ?? 0), 0);

  return {
    client: {
      name: clientRes.data.name,
      type: clientRes.data.type,
      status: clientRes.data.status,
      monthly_revenue: Number(clientRes.data.monthly_revenue ?? 0),
      churn_risk: clientRes.data.churn_risk,
      next_action: clientRes.data.next_action,
      last_touchpoint_at: clientRes.data.last_touchpoint_at,
      notes: clientRes.data.notes,
    },
    weekStart,
    weekEnd: weStr,
    contentPosts: posts.map((p) => ({
      platform: p.platform,
      title: p.title,
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
    })),
    totalViews,
    totalLikes,
    outreachCountThisWeek: outreachRes.count ?? 0,
    tasksDoneThisWeek: (tasksDoneRes.data ?? []) as Array<{
      title: string;
      completed_at: string | null;
    }>,
    tasksUpcoming: (tasksUpRes.data ?? []) as Array<{
      title: string;
      due_date: string | null;
    }>,
  };
}

async function fetchGoodReportExamples(
  userId: string,
  limit = 2,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_feedback")
    .select("output_text")
    .eq("user_id", userId)
    .eq("kind", "weekly_report")
    .eq("rating", "good")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.output_text as string);
}

export async function generateWeeklyReport(
  input: GenerateReportInput,
): Promise<GenerateReportResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const ctx = await fetchReportContext(input.clientId, input.weekStart);
    if (!ctx) return { ok: false, error: "Klijent nije pronađen" };

    const goodExamples = userId ? await fetchGoodReportExamples(userId) : [];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const goodSection =
      goodExamples.length > 0
        ? `\n# Tvoji prijašnji 'good-rated' izvještaji (najbolji signal — kopiraj tone i strukturu):\n${goodExamples
            .map((t, i) => `--- Good report ${i + 1} ---\n${t}`)
            .join("\n\n")}\n`
        : "";

    const ctxJson = {
      klijent: {
        ime: ctx.client.name,
        tip: ctx.client.type,
        status: ctx.client.status,
        mrr_eur: ctx.client.monthly_revenue,
        churn_risk: ctx.client.churn_risk,
        next_action: ctx.client.next_action,
        last_touchpoint_at: ctx.client.last_touchpoint_at,
        notes_excerpt: ctx.client.notes?.slice(0, 500) ?? null,
      },
      tjedan: {
        start: ctx.weekStart,
        end: ctx.weekEnd,
      },
      content_posts_ovaj_tjedan: ctx.contentPosts.slice(0, 10),
      content_total: {
        posts: ctx.contentPosts.length,
        total_views: ctx.totalViews,
        total_likes: ctx.totalLikes,
      },
      outreach_count: ctx.outreachCountThisWeek,
      tasks_done_for_client: ctx.tasksDoneThisWeek,
      tasks_upcoming_for_client: ctx.tasksUpcoming,
    };

    const userMessage = `${goodSection}

# Stvarni podaci za izvještaj (JSON):

\`\`\`json
${JSON.stringify(ctxJson, null, 2)}
\`\`\`

${input.customNotes ? `# Bitno: stvari koje Leonardo želi istaknuti:\n${input.customNotes}\n` : ""}

Sad napiši tjedni izvještaj za **${ctx.client.name}** prema svim pravilima. Koristi {{POPUNI_RUČNO}} za detalje koji nisu u JSON-u (npr. specifične rezultate koje samo Leonardo zna).`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: [
        {
          type: "text",
          text: REPORT_PROMPT_V2,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const block = message.content.find((b) => b.type === "text");
    const report =
      block && block.type === "text" ? block.text.trim() : "";
    if (!report) return { ok: false, error: "AI nije vratio tekst" };
    return { ok: true, report };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Anthropic error: ${e.message}`
          : "Nepoznata greška",
    };
  }
}

// =====================================================================
// AI Lead Scorer
// =====================================================================

export interface ScoreLeadInput {
  profileText: string;
  hint?: string; // optional: "TikTok bio + 3 last posts" etc.
}

export interface LeadScoreBreakdown {
  lice_branda: number;
  edge: number;
  premium: number;
  dokaz: number;
  brzina_odluke: number;
}

export interface LeadScoreResult {
  ok: boolean;
  error?: string;
  raw?: string;
  result?: {
    icp_breakdown: LeadScoreBreakdown;
    icp_total: number;
    confidence: "low" | "medium" | "high";
    suggested_name: string;
    suggested_niche:
      | "stomatologija"
      | "estetska"
      | "fizio"
      | "ortopedija"
      | "coach"
      | "other";
    suggested_source:
      | "linkedin"
      | "instagram"
      | "tiktok"
      | "referral"
      | "other";
    reasoning: {
      lice_branda: string;
      edge: string;
      premium: string;
      dokaz: string;
      brzina_odluke: string;
    };
    summary: string;
  };
}

const LEAD_SCORER_PROMPT = `Ti si Lamon Agency lead scorer. Analiziraj profil potencijalnog klijenta i daj mu ICP score po 5 kriterija (svaki 0-4, ukupno 0-20).

# Lamon ICP cilj
High-leverage, premium klijent koji brzo donosi odluke. Ne želimo discount klijente, ne želimo committee odluke.

# 5 kriterija s rubrikom

**1. Lice branda (0-4)** — ima li klinika/coach jasno lice?
- 0: anonimno, nema founder / lica
- 1: vlasnik postoji ali nema osobni brand
- 2: vlasnik je donekle vidljiv (par postova)
- 3: jasan founder s osobnim brandom
- 4: founder je referenca u industriji (govornik, autor, citiran)

**2. Edge (0-4)** — razlikuju se od konkurencije?
- 0: generic, isto kao 100 drugih
- 1: minor differentiator
- 2: jasan USP ali ne unikat
- 3: solid niche + jasna pozicija
- 4: kategorija od jednog — niko drugi to ne radi tako

**3. Premium (0-4)** — premium pozicioniranje + cijena?
- 0: discount / mass market
- 1: budget-friendly
- 2: mid-market
- 3: premium tier (cijene iznad prosjeka tržišta)
- 4: ultra-premium / luxury (top 5% tržišta)

**4. Dokaz (0-4)** — testimonials, rezultati, case studies?
- 0: ništa vidljivo
- 1: 1-2 generic testimonial
- 2: nekoliko testimonials / before-after
- 3: kvalitetne case stories s brojevima
- 4: poznati brendovi/celebrities/influenceri među klijentima

**5. Brzina odluke (0-4)** — koliko brzo odluče?
- 0: committee, >3 mj sporo
- 1: 1-2 mj decision cycle
- 2: standard B2B (4-6 tj)
- 3: 1-2 osobe + brzo (1-3 tj)
- 4: founder direktno, isti dan/tjedan

# Pravila
- Budi konzervativan — ako informacija fali, score bi trebao biti niži, ne pretpostavljaj
- Confidence: 'high' samo ako profile text bogat (LinkedIn About + posts ili web stranica + testimonials), 'medium' za solid bio, 'low' za samo username/handle
- Reasoning: 1 rečenica po kriteriju, MORA referencirati specifičan signal iz teksta (citiraj fragment ako možeš)
- summary: 1-2 rečenice, "ovo je [hot/warm/cold] lead jer..."

# Output: STRICT JSON, bez markdown fence-a, bez objašnjenja, samo:
{
  "icp_breakdown": {"lice_branda": 0-4, "edge": 0-4, "premium": 0-4, "dokaz": 0-4, "brzina_odluke": 0-4},
  "icp_total": 0-20,
  "confidence": "low|medium|high",
  "suggested_name": "string",
  "suggested_niche": "stomatologija|estetska|fizio|ortopedija|coach|other",
  "suggested_source": "linkedin|instagram|tiktok|referral|other",
  "reasoning": {"lice_branda": "...", "edge": "...", "premium": "...", "dokaz": "...", "brzina_odluke": "..."},
  "summary": "..."
}`;

function tryParseScoreJson(text: string): LeadScoreResult["result"] | null {
  // Strip code fences if any
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    // Quick shape check
    if (
      !parsed.icp_breakdown ||
      typeof parsed.icp_breakdown.lice_branda !== "number"
    ) {
      return null;
    }
    return parsed as LeadScoreResult["result"];
  } catch {
    return null;
  }
}

export async function scoreLead(
  input: ScoreLeadInput,
): Promise<LeadScoreResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY nije postavljen" };
  }
  const profile = input.profileText.trim();
  if (profile.length < 30) {
    return {
      ok: false,
      error: "Profile text je prekratak — paste-aj makar bio + 1-2 posta",
    };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Few-shot from good rated lead scores (future-proofing)
    const goodExamples = userId
      ? await fetchGoodLeadScoreExamples(userId)
      : [];

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const exampleSection =
      goodExamples.length > 0
        ? `\n# Tvoji prijašnji 'good-rated' score-ovi (referenca):\n${goodExamples
            .map((e, i) => `--- Primjer ${i + 1} ---\n${e}`)
            .join("\n\n")}\n`
        : "";

    const userMessage = `${exampleSection}# Profile za scoring${input.hint ? ` (${input.hint})` : ""}:\n\n${profile}\n\nVrati JSON.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: [
        {
          type: "text",
          text: LEAD_SCORER_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text.trim() : "";
    const result = tryParseScoreJson(raw);
    if (!result) {
      return {
        ok: false,
        error: "AI nije vratio validan JSON",
        raw,
      };
    }
    return { ok: true, result, raw };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? `Anthropic error: ${e.message}` : "Greška",
    };
  }
}

async function fetchGoodLeadScoreExamples(
  userId: string,
  limit = 2,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_feedback")
    .select("input_payload, output_text")
    .eq("user_id", userId)
    .eq("kind", "lead_score")
    .eq("rating", "good")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const input = r.input_payload as { profileText?: string } | null;
    const profile = input?.profileText?.slice(0, 400) ?? "(no profile)";
    return `Profile: ${profile}\n\nGood JSON output:\n${r.output_text}`;
  });
}

export interface FeedbackInput {
  kind: "outreach_draft" | "lead_score" | "weekly_report";
  input: DraftInput | ScoreLeadInput | GenerateReportInput;
  output: string;
  rating: "good" | "bad";
  notes?: string;
}

export async function saveAiFeedback(
  fb: FeedbackInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Niste prijavljeni" };

  const { error } = await supabase.from("ai_feedback").insert({
    user_id: userData.user.id,
    kind: fb.kind,
    prompt_version: PROMPT_VERSION,
    input_payload: fb.input as unknown as Record<string, unknown>,
    output_text: fb.output,
    rating: fb.rating,
    feedback_notes: fb.notes ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
