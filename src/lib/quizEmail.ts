/**
 * Quiz lead email sender — sends the personalized AI plan to lead's
 * email immediately after generation.
 *
 * Per Leonardov 2026-05-16 feedback: "nisam dobio nikakvu pozivnicu na
 * mail koji sam napisao". Quiz never actually emailed. Now wires Resend
 * (transactional email API — easier than Gmail OAuth for system-level
 * sends from anonymous quiz leads).
 *
 * Setup steps for Leonardo:
 *   1. Create free Resend account → resend.com (3000 emails/mo free)
 *   2. Add domain verification OR use onboarding@resend.dev temp sender
 *   3. Set RESEND_API_KEY in Vercel env vars
 *   4. Set QUIZ_FROM_EMAIL (e.g. "Leonardo Lamon <plan@lamon.io>")
 *
 * Until env set, sendQuizPlanEmail is a graceful no-op (logs but doesn't
 * fail) so /api/quiz/submit keeps working.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

export interface QuizEmailPayload {
  to: string;
  leadName: string;
  resultUrl: string;
  score: number;
  matchedCaseStudy: string | null;
  planMd: string;
}

const CASE_STUDY_NAME: Record<string, string> = {
  tom_17k: "Tom (17.000€ za 3 mjeseca, faceless TikTok)",
  matija_3k: "Matija (3.000€ za 2 mjeseca, faceless ASMR)",
  vuk_5k: "Vuk (5.000€/mj, longform YouTube)",
  filmovi_30k: "Filmovi Ukratko (30K followera za 6 mj)",
  borna_doc: "Borna (0→12K za 4 mj, dokumentari put)",
};

export async function sendQuizPlanEmail(payload: QuizEmailPayload): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
  id?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[quizEmail] RESEND_API_KEY not set — skipping send");
    return { ok: true, skipped: true };
  }

  const fromEmail = process.env.QUIZ_FROM_EMAIL || "Leonardo Lamon <onboarding@resend.dev>";

  const matchedLabel = payload.matchedCaseStudy
    ? CASE_STUDY_NAME[payload.matchedCaseStudy] ?? payload.matchedCaseStudy
    : null;

  const subject = `${payload.leadName}, tvoj osobni Side Hustle plan (score ${payload.score}/100)`;

  // Plain text body — Croatian, peer-level Leonardov stil
  const body = `Hej ${payload.leadName},

Tvoj osobni Side Hustle plan je generiran na temelju tvojih odgovora.

📊 Tvoj score: ${payload.score}/100
${matchedLabel ? `🎯 Tvoj match case study: ${matchedLabel}\n` : ""}
👉 Otvori plan ovdje:
${payload.resultUrl}

Plan ostaje spreman u bilo koje vrijeme — bookmark-aj link ako te zanima da ga ponovo pogledaš.

Sljedeći korak ako želiš da te vodim tjedno + pristup community-u koji prolazi isto:
SideHustle premium grupa (€50/mj) — https://www.skool.com/sidehustlehr

Bilo kakvo pitanje? Odgovori na ovaj email, čitam sve.

— Leonardo
Lamon Agency
`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #222; max-width: 580px; margin: 0 auto; padding: 24px;">
  <div style="background: linear-gradient(135deg, #c9a84c, #e0bf5e); color: #0a0a0a; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
    <p style="font-size: 11px; font-weight: 700; letter-spacing: 2px; margin: 0 0 4px 0;">SIDEHUSTLE MATCH</p>
    <h1 style="margin: 0; font-size: 24px;">Tvoj osobni plan je spreman</h1>
  </div>

  <p>Hej <strong>${payload.leadName}</strong>,</p>

  <p>Tvoj osobni Side Hustle plan je generiran na temelju tvojih odgovora.</p>

  <div style="background: #181818; color: #fff; padding: 20px; border-radius: 12px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; opacity: 0.7;">Tvoj score</p>
    <p style="margin: 4px 0 12px 0; font-size: 36px; font-weight: 900; color: #e0bf5e;">${payload.score}<span style="font-size: 18px; opacity: 0.6;">/100</span></p>
    ${matchedLabel ? `<p style="margin: 0; font-size: 13px;"><strong style="color: #e0bf5e;">Match case study:</strong> ${matchedLabel}</p>` : ""}
  </div>

  <div style="text-align: center; margin: 28px 0;">
    <a href="${payload.resultUrl}" style="display: inline-block; background: #c9a84c; color: #0a0a0a; font-weight: 900; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 15px;">📋 Otvori moj plan</a>
  </div>

  <p style="font-size: 13px; color: #666;">Plan ostaje spreman u bilo koje vrijeme — bookmark-aj link ako ga želiš ponovo pogledati.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p><strong>Sljedeći korak</strong> — ako želiš da te vodim tjedno + pristup community-u koji prolazi isto:</p>
  <p>SideHustle premium grupa <strong>€50/mj</strong> — <a href="https://www.skool.com/sidehustlehr" style="color: #c9a84c;">skool.com/sidehustlehr</a></p>

  <p>Bilo kakvo pitanje? Odgovori na ovaj email, čitam sve.</p>

  <p>— Leonardo<br><span style="color: #999; font-size: 13px;">Lamon Agency</span></p>
</body></html>`;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject,
        text: body,
        html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error("[quizEmail] Resend send failed:", res.status, errBody);
      return { ok: false, error: `Resend HTTP ${res.status}: ${errBody.slice(0, 200)}` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (e) {
    console.error("[quizEmail] Resend send threw:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
