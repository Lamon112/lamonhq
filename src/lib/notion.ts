export type NotionPropertyValue = string | number | null;
export type NotionRow = Record<string, NotionPropertyValue> & { _id: string };

export interface NotionPreview {
  ok: boolean;
  error?: string;
  dbTitle?: string;
  rowCount?: number;
  columns?: { name: string; type: string }[];
  rows?: NotionRow[];
  suggestedMapping?: Record<string, string | null>;
}

const NOTION_VERSION = "2022-06-28";
const NOTION_BASE = "https://api.notion.com/v1";

export function parseDatabaseId(input: string): string {
  const trimmed = input.trim();
  const m = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32}/i,
  );
  if (!m) throw new Error("Nije moguće prepoznati Notion database ID iz URL-a");
  return m[0].replace(/-/g, "");
}

async function notionFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${NOTION_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string; code?: string };
      if (body.message) msg = `${body.code ?? res.status}: ${body.message}`;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function readPropertyValue(prop: unknown): NotionPropertyValue {
  if (!prop || typeof prop !== "object") return null;
  const p = prop as Record<string, unknown>;
  const type = p.type as string;
  switch (type) {
    case "title":
      return (
        (p.title as { plain_text: string }[])
          ?.map((t) => t.plain_text)
          .join("") || null
      );
    case "rich_text":
      return (
        (p.rich_text as { plain_text: string }[])
          ?.map((t) => t.plain_text)
          .join("") || null
      );
    case "number":
      return (p.number as number) ?? null;
    case "select":
      return (p.select as { name: string } | null)?.name ?? null;
    case "multi_select":
      return (
        (p.multi_select as { name: string }[])?.map((s) => s.name).join(", ") ||
        null
      );
    case "status":
      return (p.status as { name: string } | null)?.name ?? null;
    case "date":
      return (p.date as { start: string } | null)?.start ?? null;
    case "checkbox":
      return p.checkbox ? "true" : "false";
    case "url":
      return (p.url as string) ?? null;
    case "email":
      return (p.email as string) ?? null;
    case "phone_number":
      return (p.phone_number as string) ?? null;
    case "people":
      return (
        (p.people as { name?: string; person?: { email?: string } }[])
          ?.map((u) => u.name ?? u.person?.email ?? "")
          .filter(Boolean)
          .join(", ") || null
      );
    case "formula": {
      const f = p.formula as { type: string } & Record<string, unknown>;
      if (f?.type === "number") return (f.number as number) ?? null;
      if (f?.type === "string") return (f.string as string) ?? null;
      return null;
    }
    default:
      return null;
  }
}

const CLIENT_FIELD_HINTS: Record<string, string[]> = {
  name: ["name", "naziv", "klinika", "client", "klijent"],
  type: ["type", "tip", "vrsta"],
  status: ["status", "stanje"],
  monthly_revenue: [
    "monthly_revenue",
    "mrr",
    "mjesecno",
    "mjesečno",
    "revenue",
    "cijena",
    "price",
  ],
  start_date: ["start", "start_date", "pocetak", "početak", "datum"],
  notes: ["notes", "biljeske", "bilješke", "opis", "description"],
  next_action: ["next_action", "akcija", "next", "todo"],
  churn_risk: ["churn", "risk", "rizik"],
};

const LEAD_FIELD_HINTS: Record<string, string[]> = {
  name: ["name", "naziv", "klinika", "lead", "ime"],
  source: ["source", "izvor", "platform"],
  niche: ["niche", "nisa", "niša", "industry", "vertikala"],
  icp_score: ["icp", "score", "rating", "ocjena"],
  stage: ["stage", "status", "faza"],
  estimated_value: [
    "estimated_value",
    "value",
    "vrijednost",
    "deal_size",
    "potential",
  ],
  next_action: ["next_action", "akcija", "next", "todo"],
  notes: ["notes", "biljeske", "bilješke", "opis"],
};

function suggestMapping(
  columns: { name: string; type: string }[],
  hints: Record<string, string[]>,
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [hqField, candidates] of Object.entries(hints)) {
    const found =
      columns.find((c) => {
        const name = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return candidates.some((cand) =>
          name.includes(cand.toLowerCase().replace(/[^a-z0-9]/g, "")),
        );
      })?.name ?? null;
    result[hqField] = found;
  }
  return result;
}

interface DatabaseResponse {
  title?: { plain_text: string }[];
  properties: Record<string, { type: string }>;
}

interface QueryResponse {
  results: { id: string; properties: Record<string, unknown> }[];
  next_cursor: string | null;
  has_more: boolean;
}

export async function previewDatabase(
  token: string,
  dbInput: string,
  target: "clients" | "leads",
): Promise<NotionPreview> {
  try {
    const dbId = parseDatabaseId(dbInput);

    const db = await notionFetch<DatabaseResponse>(
      token,
      `/databases/${dbId}`,
    );

    const dbTitle =
      db.title?.map((t) => t.plain_text).join("") || "Untitled";
    const columns = Object.entries(db.properties).map(([name, p]) => ({
      name,
      type: p.type,
    }));

    const queryRes = await notionFetch<QueryResponse>(
      token,
      `/databases/${dbId}/query`,
      {
        method: "POST",
        body: JSON.stringify({ page_size: 5 }),
      },
    );

    const rows: NotionRow[] = queryRes.results.map((page) => {
      const row: NotionRow = { _id: page.id };
      for (const [name, prop] of Object.entries(page.properties)) {
        row[name] = readPropertyValue(prop);
      }
      return row;
    });

    const hints = target === "clients" ? CLIENT_FIELD_HINTS : LEAD_FIELD_HINTS;
    const suggestedMapping = suggestMapping(columns, hints);

    return {
      ok: true,
      dbTitle,
      rowCount: rows.length,
      columns,
      rows,
      suggestedMapping,
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Nepoznata greška u preview-u Notion DB-a",
    };
  }
}

// =====================================================================
// Sync helpers — used by server actions to push HQ events into Notion
// =====================================================================

const ACTIVITY_LOG_DB_TITLE = "📓 Lamon HQ Activity Log";

export type ActivityType =
  | "outreach_sent"
  | "client_added"
  | "lead_scored"
  | "discovery_booked"
  | "deal_won"
  | "report_sent"
  | "task_done";

export interface ActivityPayload {
  type: ActivityType;
  title: string;
  summary?: string;
  hqRoom?: string; // outreach / clients / lead_scorer / etc.
  hqRowId?: string;
  amountEur?: number;
  tags?: string[];
}

interface CreateDatabaseResponse {
  id: string;
  parent: { type: string; page_id?: string };
  title?: { plain_text: string }[];
}

export async function findActivityLogDb(
  token: string,
): Promise<{ id: string } | null> {
  // Search Notion for the activity log DB by title
  const res = await fetch(`${NOTION_BASE}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: ACTIVITY_LOG_DB_TITLE,
      filter: { property: "object", value: "database" },
      page_size: 5,
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    results: { id: string; title?: { plain_text: string }[] }[];
  };
  const match = json.results.find((r) =>
    r.title?.map((t) => t.plain_text).join("").includes(ACTIVITY_LOG_DB_TITLE),
  );
  return match ? { id: match.id } : null;
}

export async function createActivityLogDb(
  token: string,
  parentPageId: string,
): Promise<{ id: string } | { error: string }> {
  const body = {
    parent: { type: "page_id", page_id: parentPageId },
    title: [
      {
        type: "text",
        text: { content: ACTIVITY_LOG_DB_TITLE },
      },
    ],
    properties: {
      Title: { title: {} },
      Type: {
        select: {
          options: [
            { name: "outreach_sent", color: "blue" },
            { name: "client_added", color: "green" },
            { name: "lead_scored", color: "yellow" },
            { name: "discovery_booked", color: "purple" },
            { name: "deal_won", color: "green" },
            { name: "report_sent", color: "default" },
            { name: "task_done", color: "gray" },
          ],
        },
      },
      Summary: { rich_text: {} },
      Room: { rich_text: {} },
      "HQ Row ID": { rich_text: {} },
      "Amount €": { number: { format: "euro" } },
      Tags: { multi_select: { options: [] } },
      When: { date: {} },
    },
  };
  try {
    const r = await notionFetch<CreateDatabaseResponse>(token, "/databases", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { id: r.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Greška kod create DB" };
  }
}

export async function appendActivityRow(
  token: string,
  dbId: string,
  payload: ActivityPayload,
): Promise<{ ok: boolean; error?: string; pageId?: string }> {
  const properties: Record<string, unknown> = {
    Title: {
      title: [{ type: "text", text: { content: payload.title.slice(0, 200) } }],
    },
    Type: { select: { name: payload.type } },
    When: { date: { start: new Date().toISOString() } },
  };
  if (payload.summary) {
    properties.Summary = {
      rich_text: [
        { type: "text", text: { content: payload.summary.slice(0, 1900) } },
      ],
    };
  }
  if (payload.hqRoom) {
    properties.Room = {
      rich_text: [{ type: "text", text: { content: payload.hqRoom } }],
    };
  }
  if (payload.hqRowId) {
    properties["HQ Row ID"] = {
      rich_text: [{ type: "text", text: { content: payload.hqRowId } }],
    };
  }
  if (typeof payload.amountEur === "number") {
    properties["Amount €"] = { number: payload.amountEur };
  }
  if (payload.tags && payload.tags.length > 0) {
    properties.Tags = {
      multi_select: payload.tags.map((t) => ({ name: t.slice(0, 100) })),
    };
  }

  try {
    const r = await notionFetch<{ id: string }>(token, "/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties,
      }),
    });
    return { ok: true, pageId: r.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Append greška",
    };
  }
}

// =====================================================================
// Knowledge Insights — auto-mirror of agent_actions completed runs
// DB created 2026-05-09 under "🎯 Lamon Command Center"
// =====================================================================

export const KNOWLEDGE_INSIGHTS_DB_ID =
  "4e05e5c9-524b-49e6-b217-957d570ce31f";

const ROOM_LABEL_FOR_NOTION: Record<string, string> = {
  nova: "Nova",
  holmes: "Holmes",
  jarvis: "Jarvis",
  comms: "Comms",
  treasury: "Treasury",
  steward: "Steward",
  atlas: "Atlas",
  mentat: "Mentat",
  forge: "Forge",
};

export interface PushInsightInput {
  room: string; // AgentId
  actionType: string; // matches "Action Type" select options
  title: string;
  summary: string;
  resultMd: string;
  tags: string[];
  sources: Array<{ title: string; url: string }>;
  /** Total cost in EUR. Surfaced as Cost (€) Notion property + Treasury burn aggregate. */
  costEur?: number;
  /** Wall-clock seconds from started_at to completed_at. */
  durationSec?: number;
  /** How many web_search Claude calls (or 0 for non-research kinds). */
  searchCalls?: number;
}

/**
 * Push a completed agent_actions row to the Knowledge Insights Notion DB.
 * Returns the Notion page ID so we can store it back on the Postgres row.
 */
export async function pushInsightToNotion(
  token: string,
  input: PushInsightInput,
): Promise<{ ok: boolean; pageId?: string; error?: string }> {
  const sourceLines = input.sources
    .map((s) => `${s.title} — ${s.url}`)
    .join("\n");

  const properties: Record<string, unknown> = {
    Title: {
      title: [{ type: "text", text: { content: input.title.slice(0, 200) } }],
    },
    Room: {
      select: { name: ROOM_LABEL_FOR_NOTION[input.room] ?? input.room },
    },
    "Action Type": {
      select: { name: input.actionType.slice(0, 100) },
    },
    Status: {
      status: { name: "Done" },
    },
    Summary: {
      rich_text: [
        { type: "text", text: { content: input.summary.slice(0, 1900) } },
      ],
    },
    Tags: {
      multi_select: input.tags
        .slice(0, 10)
        .map((t) => ({ name: t.slice(0, 100) })),
    },
    "Source URLs": {
      rich_text: [
        { type: "text", text: { content: sourceLines.slice(0, 1900) } },
      ],
    },
  };

  // Optional cost / runtime metadata — Notion DB has these props from
  // 2026-05-09 update. Skip silently if value missing.
  if (typeof input.costEur === "number") {
    properties["Cost (€)"] = { number: Number(input.costEur.toFixed(4)) };
  }
  if (typeof input.durationSec === "number") {
    properties["Duration (s)"] = { number: Math.round(input.durationSec) };
  }
  if (typeof input.searchCalls === "number") {
    properties["Search Calls"] = { number: input.searchCalls };
  }

  // Split markdown body into ≤2000-char paragraph blocks (Notion limit)
  const paragraphs = input.resultMd.split(/\n\n+/).filter(Boolean);
  const children: Array<Record<string, unknown>> = [];
  for (const p of paragraphs) {
    let remaining = p;
    while (remaining.length > 0 && children.length < 100) {
      const chunk = remaining.slice(0, 1900);
      remaining = remaining.slice(1900);
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: chunk } }],
        },
      });
    }
    if (children.length >= 100) break;
  }

  try {
    const r = await notionFetch<{ id: string }>(token, "/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: KNOWLEDGE_INSIGHTS_DB_ID },
        properties,
        children,
      }),
    });
    return { ok: true, pageId: r.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Notion insight push failed",
    };
  }
}

export async function fetchAllRows(
  token: string,
  dbId: string,
): Promise<NotionRow[]> {
  const all: NotionRow[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: QueryResponse = await notionFetch(
      token,
      `/databases/${dbId}/query`,
      {
        method: "POST",
        body: JSON.stringify({
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      },
    );
    for (const page of res.results) {
      const row: NotionRow = { _id: page.id };
      for (const [name, prop] of Object.entries(page.properties)) {
        row[name] = readPropertyValue(prop);
      }
      all.push(row);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return all;
}
