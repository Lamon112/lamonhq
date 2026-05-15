// Quiz AI funnel — 10 questions Hormozi-style.
// Goal: enough signal for Claude to generate a personalized 30-day plan +
// match prospect to a verified case study (Tom 17K, Matija 3K, Vuk 5K/mj,
// Filmovi Ukratko 30K, Borna documenting). Questions intentionally short
// — Hormozi's quiz is 9 q's, completion drops fast past 12.

export type QuizOption = {
  value: string;
  label: string;
  // Optional weight for scoring — higher = closer to "ready" profile.
  weight?: number;
};

export type QuizQuestion = {
  id: string;
  // 0-indexed for progress bar.
  step: number;
  // What we ask the user.
  prompt: string;
  // Optional sub-line / micro-context.
  helper?: string;
  type: "single" | "multi" | "text" | "email" | "number";
  options?: QuizOption[];
  placeholder?: string;
  required: boolean;
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "trenutno_stanje",
    step: 0,
    prompt: "Gdje si trenutno?",
    helper: "Odaberi najbliže.",
    type: "single",
    required: true,
    options: [
      { value: "zaposlen_full", label: "Zaposlen, 8 sati dnevno, jedva stignem disati", weight: 3 },
      { value: "zaposlen_dosadno", label: "Zaposlen, ali posao mi je dosadan i hoću više", weight: 4 },
      { value: "student", label: "Student", weight: 3 },
      { value: "freelancer", label: "Freelancer / poduzetnik već zarađujem online", weight: 5 },
      { value: "nezaposlen", label: "Trenutno bez posla, tražim izlaz", weight: 2 },
    ],
  },
  {
    id: "iskustvo",
    step: 1,
    prompt: "Koliko si već probao online zaradu?",
    type: "single",
    required: true,
    options: [
      { value: "nikad", label: "Nikad nisam probao, sada počinjem", weight: 1 },
      { value: "probao_par_mj", label: "Probao par mjeseci, odustao", weight: 2 },
      { value: "vec_zaradio_malo", label: "Već sam zaradio par eura, želim više", weight: 4 },
      { value: "vec_zaradio_puno", label: "Već zarađujem konzistentno, želim skalirati", weight: 5 },
    ],
  },
  {
    id: "sati_tj",
    step: 2,
    prompt: "Koliko sati TJEDNO realno možeš uložiti?",
    helper: "Iskreno — bolje 5h koje držiš nego 20h koje ne.",
    type: "single",
    required: true,
    options: [
      { value: "manje_5", label: "Manje od 5 sati", weight: 1 },
      { value: "5_10", label: "5-10 sati", weight: 3 },
      { value: "10_20", label: "10-20 sati", weight: 4 },
      { value: "20_plus", label: "20+ sati (idem all-in)", weight: 5 },
    ],
  },
  {
    id: "budget",
    step: 3,
    prompt: "Koliko si spreman investirati u edukaciju i alate?",
    helper: "Pošten broj — ne procjenjujemo te.",
    type: "single",
    required: true,
    options: [
      { value: "0", label: "0€ — samo besplatno", weight: 1 },
      { value: "do_50", label: "Do 50€", weight: 3 },
      { value: "do_200", label: "Do 200€", weight: 4 },
      { value: "200_plus", label: "200€+ (mentorstvo, alati, ad spend)", weight: 5 },
    ],
  },
  {
    id: "blocker",
    step: 4,
    prompt: "Što te najviše ZA SADA blokira?",
    helper: "Odaberi sve što vrijedi.",
    type: "multi",
    required: true,
    options: [
      { value: "ne_znam_pocet", label: "Ne znam odakle početi" },
      { value: "nemam_ideju", label: "Nemam ideju za nišu" },
      { value: "kamera", label: "Sram me kamere / govora" },
      { value: "tehnika", label: "Ne znam tehniku (editing, AI alati)" },
      { value: "nemam_vremena", label: "Nemam vremena" },
      { value: "nemam_novca", label: "Nemam novca za start" },
      { value: "ne_drzim_konzistentno", label: "Krenem pa odustanem nakon 2 tjedna" },
      { value: "ne_vjerujem_si", label: "Ne vjerujem si da mogu uspjeti" },
    ],
  },
  {
    id: "cilj_zarade",
    step: 5,
    prompt: "Koja ti je realna ciljna mjesečna zarada za 6 mjeseci?",
    type: "single",
    required: true,
    options: [
      { value: "do_500", label: "Do 500€/mj — usputna lova", weight: 2 },
      { value: "500_2000", label: "500-2000€/mj — pokriva najam", weight: 3 },
      { value: "2000_5000", label: "2000-5000€/mj — zamjena za posao", weight: 4 },
      { value: "5000_plus", label: "5000€+/mj — ozbiljan biznis", weight: 5 },
    ],
  },
  {
    id: "kamera",
    step: 6,
    prompt: "Hoćeš li biti pred kamerom?",
    helper: "Postoji rute za oba — samo da znamo gdje te poslati.",
    type: "single",
    required: true,
    options: [
      { value: "da_komforno", label: "Da, volim biti pred kamerom" },
      { value: "da_nervozno", label: "Da, ali nervozan sam — radit ću na tome" },
      { value: "samo_glas", label: "Samo glas, ne lice" },
      { value: "ne_nikako", label: "Apsolutno NE — anonimni content samo" },
    ],
  },
  {
    id: "platforma",
    step: 7,
    prompt: "Koju platformu najviše konzumiraš?",
    helper: "Najlakše počneš tamo gdje već provodiš vrijeme.",
    type: "single",
    required: true,
    options: [
      { value: "tiktok", label: "TikTok" },
      { value: "instagram", label: "Instagram (Reels)" },
      { value: "youtube", label: "YouTube (long ili Shorts)" },
      { value: "twitter", label: "Twitter / X" },
      { value: "linkedin", label: "LinkedIn" },
      { value: "ne_konzumiram", label: "Niti jednu, ne pratim social" },
    ],
  },
  {
    id: "lokacija",
    step: 8,
    prompt: "Gdje živiš?",
    helper: "Bitno — neke side hustle rute paye ovise o tržištu.",
    type: "single",
    required: true,
    options: [
      { value: "hr", label: "Hrvatska" },
      { value: "ba", label: "BiH" },
      { value: "rs", label: "Srbija" },
      { value: "me_mk_si", label: "Crna Gora / Sjeverna Makedonija / Slovenija" },
      { value: "dijaspora_eu", label: "EU dijaspora (Njemačka, Austrija, Švicarska, Italija...)" },
      { value: "dijaspora_us", label: "US/Kanada/Australija dijaspora" },
      { value: "drugo", label: "Drugo" },
    ],
  },
  {
    id: "kontakt",
    step: 9,
    prompt: "Kamo da pošaljemo tvoj osobni plan?",
    helper: "Generiramo ga u realnom vremenu — uskoro je gotov.",
    type: "text",
    required: true,
  },
];
