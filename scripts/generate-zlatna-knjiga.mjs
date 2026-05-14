/**
 * Generate the "10 Zlatnih Pravila" PDF — replacement for the legacy
 * Drive file whose last-page CTA still pointed at lamon.io (B2B).
 *
 * Output: public/zlatna-knjiga.pdf (served at https://lamon-hq.vercel.app/zlatna-knjiga.pdf)
 * CTA: skool.com/sidehustlebalkan (PREMIUM grupa, €50/mj)
 *
 * Run: node scripts/generate-zlatna-knjiga.mjs
 */

import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const PRAVILA = [
  {
    n: 1,
    title: "Hook u prve 3 sekunde",
    body:
      "Prve 3 sekunde odlučuju o 70% retencije. Otvori statom ili pattern interruptom — NIKAD ne kreći s \"Bok, dobrodošli\". Primjer hook-a: \"Zaradio sam 17.000€ u 3 mjeseca s ovim viralnim formatom.\" Probudi znatiželju, ne najavljuj.",
  },
  {
    n: 2,
    title: "Vertikalno 9:16 za sve formate",
    body:
      "Horizontalni 16:9 format gubi 60% reach-a u 2026. Bilo da snimaš za TikTok, Shorts, Reels — uvijek vertikalno 9:16. Single source of truth, repurpose-aš svuda bez re-edita.",
  },
  {
    n: 3,
    title: "Burned-in subtitles uvijek",
    body:
      "85% gledatelja koristi mute. Bez subtitle-a = -85% retencija. CapCut + auto-caption + 2 min manual fix. Stil: bold sans-serif, žuto-bijelo na crnoj traci, 2-3 riječi po liniji.",
  },
  {
    n: 4,
    title: "Storytelling > Edukacija",
    body:
      "Storytelling format: Setup → Problem → Twist → Lekcija → CTA. Educational format umire, story-driven raste 3x. Čak i \"how-to\" video pakuj kao priču: \"Imao sam 5 podataka, mislio sam X, onda sam shvatio Y.\"",
  },
  {
    n: 5,
    title: "Loop-able final frame",
    body:
      "Zadnji frame mora glatko spojiti s prvim. Re-watch je #1 signal algoritma. Ako zadnja sekunda visualno + audio matches start, gledatelj ne primjeti loop → +30% completion rate → algoritam te gura.",
  },
  {
    n: 6,
    title: "CTA = komentar trigger, ne follow",
    body:
      "\"Slijedi me\" daje 1x. \"Napiši X u komentaru\" daje 5x algoritmic boost. Komentari su jači signal od follows. Primjer: \"Napiši mi 1 ako gledaš ovo poslije ponoći.\" Trivial, ali daje 200+ komentara.",
  },
  {
    n: 7,
    title: "Tema = problem koji target rješava DANAS",
    body:
      "Evergreen sadržaj umire — algoritam nagrađuje SAD-aktualne probleme. Pratiš trending audio, news, viralne formate iz zadnjih 7 dana. Ako se nešto event-događa danas, snimi reaction unutar 24h.",
  },
  {
    n: 8,
    title: "Cadence > Savršenstvo",
    body:
      "7 mediocre video tjedno > 1 perfect mjesečno. Algoritam premiuje konzistentnost. Settle za 80% kvaliteta, post-aj svaki dan, iteriraj na podacima. \"Perfekcionizam\" je samo strah obučen u radnost.",
  },
  {
    n: 9,
    title: "Cross-platform repurpose u 24h window",
    body:
      "Video još \"živi\" prvih 24-72h nakon objave na originalnoj platformi. Tada ga repurpose-aš na TikTok/Shorts/Reels SIMULTANEOUSLY. Algoritam svake platforme te tretira kao native, ne kao re-upload.",
  },
  {
    n: 10,
    title: "Pratiš VIEW-THROUGH RATE, ne views",
    body:
      "Views su vanity metric. View-through rate (% gledatelja koji dođe do kraja) je #1 algoritamski signal. Cilj 75%+. Ispod 50% = hook je loš, re-edit. Iznad 80% = scale taj format na X10.",
  },
];

const COLORS = {
  bg: "#0a0a0a",
  accent: "#fbbf24",
  text: "#e5e5e5",
  muted: "#9ca3af",
  card: "#1a1a1a",
};

const doc = new PDFDocument({
  size: "A4",
  margin: 50,
  info: {
    Title: "10 Zlatnih Pravila — Viralni Content Framework",
    Author: "Leonardo Lamon — SideHustle™",
    Subject: "Free PDF lead magnet — SideHustle™ Balkan",
  },
});

const outPath = path.resolve("./public/zlatna-knjiga.pdf");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
doc.pipe(fs.createWriteStream(outPath));

function drawBackground() {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
}

// ── Cover page ──
drawBackground();
doc
  .fillColor(COLORS.accent)
  .font("Helvetica-Bold")
  .fontSize(42)
  .text("10 ZLATNIH", 50, 200, { align: "center" })
  .text("PRAVILA", { align: "center" });

doc
  .moveDown(0.5)
  .fillColor(COLORS.text)
  .fontSize(18)
  .font("Helvetica")
  .text("Viralni Content Framework", { align: "center" });

doc
  .moveDown(2)
  .fillColor(COLORS.muted)
  .fontSize(12)
  .text("Framework s kojim su mi kanali zaradili 20.000€+ mjesečno", {
    align: "center",
  });

doc
  .moveDown(0.3)
  .text("Sažeto iz 5 godina YouTube Shorts + TikTok eksperimenta", {
    align: "center",
  });

doc
  .fontSize(11)
  .fillColor(COLORS.accent)
  .moveDown(8)
  .text("Leonardo Lamon · SideHustle™ Balkan", { align: "center" });

doc
  .fillColor(COLORS.muted)
  .fontSize(9)
  .text("793K+ pratitelja · 5M+ mjesečnih pregleda · 165 plaćenih članova", {
    align: "center",
  });

// ── Rules pages ──
for (const p of PRAVILA) {
  doc.addPage();
  drawBackground();

  // Top number badge
  doc
    .roundedRect(50, 50, 80, 80, 8)
    .fillColor(COLORS.accent)
    .fill();

  doc
    .fillColor(COLORS.bg)
    .font("Helvetica-Bold")
    .fontSize(56)
    .text(String(p.n), 50, 60, { width: 80, align: "center" });

  // Title
  doc
    .fillColor(COLORS.accent)
    .font("Helvetica-Bold")
    .fontSize(28)
    .text(p.title, 50, 170, { width: doc.page.width - 100 });

  // Divider
  doc
    .moveTo(50, 230)
    .lineTo(doc.page.width - 50, 230)
    .strokeColor(COLORS.accent)
    .lineWidth(2)
    .stroke();

  // Body
  doc
    .fillColor(COLORS.text)
    .font("Helvetica")
    .fontSize(14)
    .text(p.body, 50, 260, {
      width: doc.page.width - 100,
      align: "left",
      lineGap: 6,
    });

  // Footer pagination
  doc
    .fillColor(COLORS.muted)
    .fontSize(9)
    .text(
      `${p.n} / 10 · SideHustle™ Balkan · skool.com/sidehustlebalkan`,
      50,
      doc.page.height - 60,
      { width: doc.page.width - 100, align: "center" },
    );
}

// ── Final CTA page ──
doc.addPage();
drawBackground();

doc
  .fillColor(COLORS.accent)
  .font("Helvetica-Bold")
  .fontSize(36)
  .text("ŠTO SAD?", 50, 100, { align: "center" });

doc
  .moveDown(1)
  .fillColor(COLORS.text)
  .font("Helvetica")
  .fontSize(16)
  .text(
    "Pročitao si 10 pravila. Sad dolazi 95% posla — samostalna primjena.",
    50,
    doc.y,
    { width: doc.page.width - 100, align: "center", lineGap: 4 },
  );

// Highlight box
const boxY = 280;
doc
  .roundedRect(60, boxY, doc.page.width - 120, 200, 12)
  .fillColor(COLORS.card)
  .fill();

doc
  .fillColor(COLORS.accent)
  .font("Helvetica-Bold")
  .fontSize(20)
  .text("→ PREMIUM grupa", 80, boxY + 25, {
    width: doc.page.width - 160,
  });

doc
  .fillColor(COLORS.text)
  .font("Helvetica")
  .fontSize(13)
  .text(
    "165 ljudi koji rade isto — svaki tjedan radimo na ovome konkretno. Tjedni live pozivi sa mnom, svi kursevi (YT Shorts, TikTok, AI alati, niche-finder), bi-weekly viralni niche drop.",
    80,
    boxY + 65,
    { width: doc.page.width - 160, lineGap: 4 },
  );

doc
  .fillColor(COLORS.accent)
  .font("Helvetica-Bold")
  .fontSize(15)
  .text("€50/mj · otkaži kad god", 80, boxY + 155, {
    width: doc.page.width - 160,
  });

// Main CTA URL
doc
  .fillColor(COLORS.accent)
  .font("Helvetica-Bold")
  .fontSize(22)
  .text("skool.com/sidehustlebalkan", 50, 540, {
    width: doc.page.width - 100,
    align: "center",
  });

doc
  .fillColor(COLORS.muted)
  .font("Helvetica")
  .fontSize(11)
  .text(
    "Pridruži se danas i vidimo se na sljedećem live pozivu (srijeda 20:00 Zagreb time).",
    50,
    600,
    { width: doc.page.width - 100, align: "center" },
  );

// Signature
doc
  .moveDown(3)
  .fillColor(COLORS.text)
  .fontSize(13)
  .text("— Leonardo", { align: "center" });

doc
  .fillColor(COLORS.muted)
  .fontSize(9)
  .text("SideHustle™ Balkan · Pomažem ti pokrenuti viralni biznis bez kamere", {
    align: "center",
  });

doc.end();
console.log(`Wrote ${outPath}`);
