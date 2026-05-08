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
