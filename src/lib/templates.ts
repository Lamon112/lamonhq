export interface OutreachTemplate {
  id: string;
  name: string;
  platform: "linkedin" | "instagram" | "tiktok" | "email" | "any";
  niche: "b2b_clinic" | "coach" | "any";
  body: string;
  tone: string;
}

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: "linkedin_clinic_cold_short",
    name: "LinkedIn cold — klinika (kratka)",
    platform: "linkedin",
    niche: "b2b_clinic",
    tone: "Direktan, premium, bez fluffa",
    body: `Pozdrav {{ime}},

Vidio sam {{specifičnost}} kod {{klinika}}. Uskočimo s AI receptionist-om i bookingom — klijenti booka-ju 24/7, vi gubite 0 noćnih leadova.

Kratak razgovor 15 min ovaj tjedan?

— Leonardo Lamon`,
  },
  {
    id: "instagram_clinic_dm",
    name: "Instagram DM — klinika (story-based)",
    platform: "instagram",
    niche: "b2b_clinic",
    tone: "Topao, jasan hook iz njihovog content-a",
    body: `Hej {{ime}}, baš sam vidio {{koji_post_ili_story}}.

Mi smo Lamon Agency — radimo AI implementaciju za klinike (booking + WhatsApp + receptionist). Kad imam slobodno čut se 15 min?`,
  },
  {
    id: "linkedin_followup_value",
    name: "LinkedIn follow-up — value drop",
    platform: "linkedin",
    niche: "any",
    tone: 'Bez "samo provjeravam", uvijek nova vrijednost',
    body: `{{ime}}, jedan brz update — netom smo objavili case study kako je {{prošli_klijent}} smanjio missed bookings za 38% u 30 dana.

Šaljem ti jednu stranu sažetka? Zanimljivo za {{njihov_use_case}}.`,
  },
  {
    id: "instagram_coach_dm",
    name: "Instagram DM — coach",
    platform: "instagram",
    niche: "coach",
    tone: "Peer-to-peer, ne salesman",
    body: `Hej {{ime}}, gledao sam {{njihov_video_ili_post}} — solidno.

Imaš trenutno content engine ili sve sam? Pitam jer radim s {{broj}} coacheva s pričom — možda nešto za poletjeti.`,
  },
  {
    id: "email_clinic_referral",
    name: "Email — klinika (referral hook)",
    platform: "email",
    niche: "b2b_clinic",
    tone: "Spomenuti tko nas je preporučio (ako imam)",
    body: `{{ime}}, javljam ti se s preporukom od {{tko_je_preporučio}}.

Mi smo Lamon Agency, radimo Rast paket za klinike — AI receptionist + booking flow + WhatsApp template-ovi. Setup je 1.997€ jednokratno + 1.497€/mj operativno.

Slobodan si idući utorak ili četvrtak za 20 min?`,
  },
  {
    id: "tiktok_dm_short",
    name: "TikTok DM — kratka kuka",
    platform: "tiktok",
    niche: "any",
    tone: "Jedna rečenica, hook na konkretan video",
    body: `{{ime}}, vidio video o {{tema}} — imaš li trenutno problem s {{specifični_pain}}? Ako da, imam jedan brzi fix da ti pošaljem.`,
  },
];

export function templatesForPlatform(platform: string): OutreachTemplate[] {
  return OUTREACH_TEMPLATES.filter(
    (t) => t.platform === platform || t.platform === "any",
  );
}
