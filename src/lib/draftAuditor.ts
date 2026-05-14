/**
 * Draft Auditor — programmatic QA for AI-generated outreach drafts.
 *
 * Mirrors Leonardo's manual review checklist (extracted from his daily
 * feedback over May 2026). Runs on demand against any holmes_report and
 * surfaces specific issues with snippet + suggested fix.
 *
 * The goal: stop being a babysitter. If a draft passes audit, Leonardo
 * doesn't need to read it character-by-character. If it fails, the
 * specific issues are flagged with the exact text snippet + the fix
 * action so he can decide whether to refresh, edit, or send anyway.
 *
 * Pure function — no DB writes, no API calls. Cheap to compute on every
 * lead-card render. Each Check is small + isolated so adding a new bug
 * pattern (when one slips past) is a 10-line append, not a refactor.
 *
 * Severity tiers drive UI badge color and sending behavior:
 *   - critical: pricing leak, definite hallucination → BLOCK send
 *   - high: kune, lowball ROI, submissive lang, wrong sign-off, hallu
 *     suspicion → red badge, requires review
 *   - medium: lang mash, TT pregleda mislabel, missing intro → yellow
 *     badge, refresh recommended
 *   - low: cosmetic debris (000€ remnants, etc.) → green badge but
 *     listed for awareness
 */

export type AuditSeverity = "critical" | "high" | "medium" | "low";
export type AuditChannel =
  | "email"
  | "phone"
  | "whatsapp"
  | "instagram"
  | "linkedin";

export interface AuditIssue {
  /** Stable check ID, e.g. "pricing-leak-1497" */
  checkId: string;
  /** Severity tier */
  severity: AuditSeverity;
  /** Which channel draft this issue was found in */
  channel: AuditChannel;
  /** Short human-readable description of what's wrong */
  description: string;
  /** Exact snippet from the draft that triggered the issue (truncated) */
  snippet?: string;
  /** Suggested fix or remediation hint */
  suggestion: string;
}

export interface AuditResult {
  /** ISO timestamp when audit ran */
  audited_at: string;
  /** Total issues found across all channels */
  total_issues: number;
  /** Highest severity seen — drives the badge color */
  worst_severity: AuditSeverity | null;
  /** All issues, sorted by severity (worst first) */
  issues: AuditIssue[];
  /** True when no critical/high issues — safe to send */
  passes: boolean;
  /** True when ANY issues exist (even just low/medium) */
  hasAny: boolean;
}

/**
 * Loose Holmes-report shape used by the auditor. Reads from a few
 * optional sub-fields; everything is permissive so we can audit the
 * trimmed shape that lib/queries.ts returns to the client (which omits
 * `model` and a few server-only fields) without TypeScript complaints.
 */
type AuditableReport = {
  // Use a permissive sub-record so callers can pass either the
  // server-side HolmesReport (which uses `string | undefined`) or the
  // queries.ts trimmed shape (which uses `string | null | undefined`).
  channel_drafts?:
    | Partial<Record<string, string | null | undefined>>
    | null;
  outreach_draft?: string | null;
  evidence?: {
    social_depth?: Record<
      string,
      {
        followers?: number;
        postsCount?: number;
        totalViews?: number;
        topViewCount?: number;
      }
    >;
  } | null;
};

interface CheckContext {
  draft: string;
  channel: AuditChannel;
  report: AuditableReport;
  lead: { name: string; icp_score?: number | null };
}

interface Check {
  id: string;
  severity: AuditSeverity;
  description: string;
  /** Run check, return one or more issues if failed */
  run(ctx: CheckContext): AuditIssue[];
}

// Severity sort order — lower = higher priority (rendered first)
const SEV_ORDER: Record<AuditSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const CHECKS: Check[] = [
  // ── CRITICAL: Plima Growth pricing leak (€1,497) ──
  {
    id: "pricing-leak-1497",
    severity: "critical",
    description: "Plima Growth price (€1,497/mj) leaked",
    run({ draft, channel }) {
      const m = draft.match(/[^.\n]*\b1[.,]?497\s*€[^.\n]*\.?/i);
      if (!m) return [];
      return [
        {
          checkId: "pricing-leak-1497",
          severity: "critical",
          channel,
          description: "Plima Growth price (€1,497/mj) leaked into outbound",
          snippet: m[0].slice(0, 180).trim(),
          suggestion:
            "Refresh draft. Pricing is discovery-call-only per OVERRIDE A. Strip the entire sentence containing the number.",
        },
      ];
    },
  },

  // ── CRITICAL: Plima Distribution+ pricing leak (€2.5-3.5K) ──
  {
    id: "pricing-leak-distribution",
    severity: "critical",
    description: "Plima Distribution+ price (€2.5-3.5K/mj) leaked",
    run({ draft, channel }) {
      const m = draft.match(/[^.\n]*\b2[.,]?500\s*[-–]\s*3[.,]?500\s*€[^.\n]*\.?/i);
      if (!m) return [];
      return [
        {
          checkId: "pricing-leak-distribution",
          severity: "critical",
          channel,
          description: "Plima Distribution+ price (€2.5-3.5K/mj) leaked",
          snippet: m[0].slice(0, 180).trim(),
          suggestion: "Refresh. Distribution+ pricing is discovery-call-only.",
        },
      ];
    },
  },

  // ── CRITICAL: pricing connector phrase ──
  {
    id: "pricing-leak-connector",
    severity: "critical",
    description: "Pricing disclosure connector phrase detected",
    run({ draft, channel }) {
      const m = draft.match(
        /(dostupno\s+(je\s+)?za|dobivate\s+(ga\s+)?za|samo\s+za|već\s+za|već\s+od)\s+[\d.,]+\s*€/i,
      );
      if (!m) return [];
      return [
        {
          checkId: "pricing-leak-connector",
          severity: "critical",
          channel,
          description:
            "Pricing connector ('dostupno za', 'dobivate za', etc.) — likely Plima price disclosure",
          snippet: m[0],
          suggestion:
            "Strip from connector word to sentence end. HR salary anchor (10-15K€ bruto) is OK; the 'a dostupno za…' tail is the violation.",
        },
      ];
    },
  },

  // ── HIGH: hallucinated platform numbers (number not in evidence) ──
  {
    id: "hallucinated-platform-number",
    severity: "high",
    description: "Cited platform number not in evidence",
    run({ draft, channel, report }) {
      const issues: AuditIssue[] = [];
      // Evidence sub-tree from the Holmes report. AuditableReport's
      // SocialNode type lives at module scope; we reference it implicitly
      // via the indexed access here.
      type SocialNode = {
        followers?: number;
        postsCount?: number;
        totalViews?: number;
        topViewCount?: number;
      };
      const evidence: Record<string, SocialNode> =
        report.evidence?.social_depth ?? {};

      const patterns: Array<{
        rx: RegExp;
        platform: "youtube" | "tiktok" | "instagram" | "linkedin";
        field: keyof SocialNode;
        label: string;
      }> = [
        // YouTube — "X pretplatnika" anywhere, OR "YouTube ... X pratitelja"
        {
          rx: /\b(\d[\d.,]*)\s*[KkMm]?\s+(?:YouTube\s+)?pretplatnika/i,
          platform: "youtube",
          field: "followers",
          label: "YouTube subscribers",
        },
        {
          rx: /YouTube[^.\n]{0,40}?\b(\d[\d.,]*[KkMm]?)\s+(?:pratitelja|followers)/i,
          platform: "youtube",
          field: "followers",
          label: "YouTube followers",
        },
        // TikTok
        {
          rx: /TikTok[^.\n]{0,40}?\b(\d[\d.,]*[KkMm]?)\s+(?:pratitelja|followers)/i,
          platform: "tiktok",
          field: "followers",
          label: "TikTok followers",
        },
        {
          rx: /\b(\d[\d.,]*[KkMm]?)\s+TikTok\s+(?:videa|videi|video)/i,
          platform: "tiktok",
          field: "postsCount",
          label: "TikTok video count",
        },
        // Instagram
        {
          rx: /Instagram[^.\n]{0,40}?\b(\d[\d.,]*[KkMm]?)\s+(?:pratitelja|followers|sljedbenika)/i,
          platform: "instagram",
          field: "followers",
          label: "Instagram followers",
        },
        {
          rx: /\bIG[^.\n]{0,20}?\b(\d[\d.,]*[KkMm]?)\s+(?:pratitelja|followers)/i,
          platform: "instagram",
          field: "followers",
          label: "Instagram followers",
        },
        {
          rx: /\b(\d[\d.,]*[KkMm]?)\s+(?:IG\s+)?objav[ae]/i,
          platform: "instagram",
          field: "postsCount",
          label: "Instagram posts",
        },
        // LinkedIn
        {
          rx: /LinkedIn[^.\n]{0,40}?\b(\d[\d.,]*[KkMm]?)\s+(?:pratitelja|followers)/i,
          platform: "linkedin",
          field: "followers",
          label: "LinkedIn followers",
        },
      ];

      for (const { rx, platform, field, label } of patterns) {
        const m = draft.match(rx);
        if (!m) continue;
        const claimedRaw = m[1].toLowerCase().replace(/[.,]/g, "");
        let claimedNum: number;
        if (claimedRaw.endsWith("k")) {
          claimedNum = parseFloat(claimedRaw) * 1000;
        } else if (claimedRaw.endsWith("m")) {
          claimedNum = parseFloat(claimedRaw) * 1_000_000;
        } else {
          claimedNum = parseInt(claimedRaw, 10);
        }
        if (!Number.isFinite(claimedNum) || claimedNum < 100) continue;

        const actualVal = evidence[platform]?.[field];

        if (actualVal == null || actualVal === 0) {
          issues.push({
            checkId: "hallucinated-platform-number",
            severity: "high",
            channel,
            description: `Cited ${label} = ${claimedNum} but evidence has none`,
            snippet: m[0].slice(0, 120),
            suggestion: `Refresh draft. Per OVERRIDE C: NEVER cite a number unless evidence.social_depth.${platform}.${String(field)} has it. Use generic phrasing instead ("vidio sam vašu ${platform} prisutnost" without number).`,
          });
          continue;
        }

        // Allow 30% tolerance for rounding ("13.000" claim vs "13.247" evidence)
        const ratio = Math.abs(claimedNum - actualVal) / actualVal;
        if (ratio > 0.3) {
          issues.push({
            checkId: "hallucinated-platform-number",
            severity: "high",
            channel,
            description: `Cited ${label} = ${claimedNum} but evidence has ${actualVal} (${Math.round(ratio * 100)}% off)`,
            snippet: m[0].slice(0, 120),
            suggestion: `Refresh draft to use the actual evidence number (${actualVal}) or round more conservatively.`,
          });
        }
      }
      return issues;
    },
  },

  // ── HIGH: kuna / HRK mentions ──
  {
    id: "currency-kuna",
    severity: "high",
    description: "Kuna/HRK mentioned (Croatia uses EUR since 2023)",
    run({ draft, channel }) {
      const m = draft.match(
        /[^.\n]*\b(?:\d[\d.,]*\s*)?(kuna|kune|kuni|kunama|HRK|kn)\b[^.\n]*\.?/i,
      );
      if (!m) return [];
      return [
        {
          checkId: "currency-kuna",
          severity: "high",
          channel,
          description: "Kuna mentioned — Croatia adopted EUR on 2023-01-01",
          snippet: m[0].slice(0, 180).trim(),
          suggestion:
            "Refresh. AI must use € (eura) only. Per OVERRIDE E: kune are dead currency.",
        },
      ];
    },
  },

  // ── HIGH: lowball ROI estimate ──
  {
    id: "lowball-roi",
    severity: "high",
    description: "ROI estimate too small to justify package price",
    run({ draft, channel }) {
      // Pattern: "X do Y eura/€" or "X-Y €" or "između X i Y eura"
      // where both X and Y are 3-4 digit numbers (i.e. €800-2000 territory)
      const m = draft.match(
        /(?:između\s+)?(\d{3,4})\s*(?:do|i|-|–|–|\s+i\s+)\s*(\d{3,4})\s*(?:eura?|€)/i,
      );
      if (!m) return [];
      const lower = parseInt(m[1], 10);
      const upper = parseInt(m[2], 10);
      // Anything where the lower bound is < €3K AND upper < €5K is lowball
      // for our package tiers (Growth 1.5K, Distribution+ 2.5-3.5K, Premium
      // 5-10K). ROI must be ≥5x package price per OVERRIDE D.
      if (lower < 3000 && upper < 5000) {
        return [
          {
            checkId: "lowball-roi",
            severity: "high",
            channel,
            description: `Lowball ROI estimate (€${lower}-${upper}/mj) — likely ≤ package price`,
            snippet: m[0],
            suggestion:
              "Refresh. Per OVERRIDE D — ROI must be ≥5x package price. Solo praksa = 3-8K€/mj propušteno; Mid = 8-20K; Premium = 15-50K.",
          },
        ];
      }
      return [];
    },
  },

  // ── HIGH: submissive Croatian phrasing ──
  {
    id: "submissive-language",
    severity: "high",
    description: "Submissive Croatian phrasing kills premium positioning",
    run({ draft, channel }) {
      const patterns = [
        /\bvolio bih\s+(samo\s+)?pitati\b/i,
        /\bvolio bih\s+vam\b/i,
        /\bželio bih\b/i,
        /\bsmio bih\b/i,
        /\bako biste bili tako ljubazni\b/i,
        /\bnadam se da ne smetam\b/i,
        /\bmogu poslati ako je u redu\b/i,
        /\bmogu poslati ako vam odgovara\b/i,
      ];
      const issues: AuditIssue[] = [];
      for (const p of patterns) {
        const m = draft.match(p);
        if (m) {
          issues.push({
            checkId: "submissive-language",
            severity: "high",
            channel,
            description: "Submissive Croatian phrasing detected",
            snippet: m[0],
            suggestion:
              "Replace with peer-level: 'Smijem li pitati', 'Pitanje za vas:', 'Predlažem [konkretan objekt]', 'Trebam 15 min vašeg vremena'.",
          });
        }
      }
      return issues;
    },
  },

  // ── HIGH: wrong sign-off (S poštovanjem / full surname) ──
  {
    id: "signoff-too-formal",
    severity: "high",
    description: "Sign-off uses 'S poštovanjem' or full 'Leonardo Lamon'",
    run({ draft, channel }) {
      // Skip phone — phone OPENER spoken intro keeps full name on purpose.
      if (channel === "phone") return [];
      const issues: AuditIssue[] = [];
      const formal = draft.match(/s\s+po[šs]tovanjem[,\s]+leonardo(\s+lamon)?/i);
      if (formal) {
        issues.push({
          checkId: "signoff-too-formal",
          severity: "high",
          channel,
          description: "'S poštovanjem' sign-off too formal for premium peer-level",
          snippet: formal[0],
          suggestion: "Replace with 'Pozdrav,\\nLeonardo' (no surname).",
        });
      }
      // Catch full-name signature anywhere on the LAST 3 lines (sign-off zone).
      // Skip when full name appears mid-body (e.g., spoken intro in WA glasovna).
      const lines = draft.trim().split(/\n+/);
      const tail = lines.slice(Math.max(0, lines.length - 3)).join("\n");
      const fullName = tail.match(/leonardo\s+lamon\s*$/i);
      if (fullName && !formal) {
        issues.push({
          checkId: "signoff-too-formal",
          severity: "high",
          channel,
          description: "Sign-off uses full 'Leonardo Lamon' — too corporate",
          snippet: fullName[0],
          suggestion: "Replace with just 'Leonardo' (single name = peer signal).",
        });
      }
      return issues;
    },
  },

  // ── MEDIUM: Croatian-English language mash ──
  {
    id: "lang-mash",
    severity: "medium",
    description: "Croatian-English mid-phrase mash-up",
    run({ draft, channel }) {
      const issues: AuditIssue[] = [];
      const checks: Array<{ rx: RegExp; suggestion: string }> = [
        {
          rx: /\bsadr[žz]aj\s+creator/i,
          suggestion: "Use 'kreator sadržaja' (Croatian) or 'content creator' (English) — not mash.",
        },
        {
          rx: /\bcontent\s+kreator/i,
          suggestion: "Use 'kreator sadržaja' (Croatian) or 'content creator' (English) — not mash.",
        },
        {
          rx: /\bmarketing\s+manager\b/i,
          suggestion: "Use 'voditelj marketinga' (HR) or full English context.",
        },
        {
          rx: /\bsocial\s+media\s+kreator/i,
          suggestion: "Use 'stručnjak za društvene mreže' or full English.",
        },
      ];
      for (const c of checks) {
        const m = draft.match(c.rx);
        if (m) {
          issues.push({
            checkId: "lang-mash",
            severity: "medium",
            channel,
            description: "Croatian-English mash-up term detected",
            snippet: m[0],
            suggestion: c.suggestion,
          });
        }
      }
      return issues;
    },
  },

  // ── MEDIUM: TikTok 'pregleda' mislabel (TT hearts ≠ views) ──
  {
    id: "tiktok-pregleda-mislabel",
    severity: "medium",
    description: "TikTok 'pregleda' mislabel (TT hearts ≠ views)",
    run({ draft, channel }) {
      const m = draft.match(/(TikTok[^.\n]{0,80}?)\b(\d[\d.,]*)\s+pregleda\b/i);
      if (!m) return [];
      return [
        {
          checkId: "tiktok-pregleda-mislabel",
          severity: "medium",
          channel,
          description: "TikTok 'pregleda' detected — TT heart-counts ≠ views",
          snippet: m[0].slice(0, 150),
          suggestion: "Replace 'pregleda' with 'interakcija' for TikTok metrics.",
        },
      ];
    },
  },

  // ── MEDIUM: WA poruka missing mandatory intro ──
  {
    id: "missing-wa-intro",
    severity: "medium",
    description: "WA PORUKA missing 'Leonardo Lamon ovdje' intro",
    run({ draft, channel }) {
      if (channel !== "whatsapp") return [];
      // PORUKA section is everything before the first --- separator.
      const poruka = draft.split(/^\s*---\s*$/m)[0] ?? draft;
      // Accept either full or shortened intro
      if (
        /leonardo\s+lamon\s+ovdje/i.test(poruka) ||
        /leonardo\s+ovdje/i.test(poruka)
      ) {
        return [];
      }
      return [
        {
          checkId: "missing-wa-intro",
          severity: "medium",
          channel,
          description: "WA PORUKA missing mandatory 'Leonardo Lamon ovdje' predstavljanje",
          snippet: poruka.slice(0, 200).trim(),
          suggestion:
            "Refresh. Per OVERRIDE — WA poruka MUST have pozdrav + 'Leonardo Lamon ovdje — bavim se razvojem privatnih ordinacija.' as paragraphs 1+2.",
        },
      ];
    },
  },

  // ── LOW: '000€' debris from over-aggressive regex ──
  {
    id: "regex-debris-000eur",
    severity: "low",
    description: "Visible '000€' fragment — over-aggressive regex artefact",
    run({ draft, channel }) {
      const m = draft.match(/[^\d]\b000\s*€/);
      if (!m) return [];
      return [
        {
          checkId: "regex-debris-000eur",
          severity: "low",
          channel,
          description: "Visible '000€' debris — leftover from regex strip",
          snippet: m[0].trim(),
          suggestion:
            "Refresh. Should be '10.000€' or full number — premiumLanguage.ts strip swallowed leading digit.",
        },
      ];
    },
  },

  // ── LOW: vague promise filler ──
  {
    id: "vague-promise-roi-snapshot",
    severity: "low",
    description: "Vague 'ROI snapshot / audit' promise (no actual deliverable)",
    run({ draft, channel }) {
      const m = draft.match(/\b(ROI snapshot|kratki audit|kratku analizu)\b/i);
      if (!m) return [];
      return [
        {
          checkId: "vague-promise-roi-snapshot",
          severity: "low",
          channel,
          description:
            "Vague promise filler — we don't actually deliver a 'ROI snapshot' / 'audit' as standalone artefact",
          snippet: m[0],
          suggestion: "Refresh. Replace with concrete next step (Zoom CTA or glasovna tease).",
        },
      ];
    },
  },
];

/**
 * Audit a single draft. Pure function — no side effects.
 * Returns array of issues (empty array if clean).
 */
export function auditDraft(ctx: CheckContext): AuditIssue[] {
  const issues: AuditIssue[] = [];
  for (const check of CHECKS) {
    issues.push(...check.run(ctx));
  }
  return issues;
}

/**
 * Audit all channel drafts in a Holmes report. Returns aggregated result
 * with worst severity, total count, and all issues sorted by severity.
 *
 * Cheap to recompute on every render — no caching needed for typical
 * lead lists (<100 cards). If list grows, memoize on holmes_report.
 */
export function auditHolmesReport(
  report: AuditableReport,
  lead: { name: string; icp_score?: number | null },
): AuditResult {
  const allIssues: AuditIssue[] = [];
  const drafts = report.channel_drafts ?? {};
  const channels: AuditChannel[] = [
    "email",
    "phone",
    "whatsapp",
    "instagram",
    "linkedin",
  ];
  for (const ch of channels) {
    const draft = drafts[ch];
    if (!draft || typeof draft !== "string") continue;
    allIssues.push(...auditDraft({ draft, channel: ch, report, lead }));
  }
  // Also audit legacy outreach_draft as email-style (V8 fallback).
  if (typeof report.outreach_draft === "string" && report.outreach_draft.length > 0) {
    allIssues.push(
      ...auditDraft({
        draft: report.outreach_draft,
        channel: "email",
        report,
        lead,
      }),
    );
  }
  // Sort worst-first.
  allIssues.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const worst = allIssues.length > 0 ? allIssues[0].severity : null;
  const passes = !allIssues.some(
    (i) => i.severity === "critical" || i.severity === "high",
  );
  return {
    audited_at: new Date().toISOString(),
    total_issues: allIssues.length,
    worst_severity: worst,
    issues: allIssues,
    passes,
    hasAny: allIssues.length > 0,
  };
}

/**
 * Convenience: badge variant for UI rendering.
 * - "clean"   = no issues at all
 * - "ok"      = only low-severity (cosmetic) issues
 * - "warn"    = medium-severity issues, refresh recommended
 * - "fail"    = critical/high issues, BLOCK send
 */
export function auditBadgeVariant(
  result: AuditResult,
): "clean" | "ok" | "warn" | "fail" {
  if (!result.hasAny) return "clean";
  if (result.worst_severity === "critical" || result.worst_severity === "high") {
    return "fail";
  }
  if (result.worst_severity === "medium") return "warn";
  return "ok";
}
