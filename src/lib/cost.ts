/**
 * Cost calculation for AI agent actions.
 *
 * Surfaces the cost of every Inngest action run so Leonardo always
 * knows what each click cost. Saved into agent_actions.usage and
 * pushed to Notion as Cost (€) per insight + aggregated in the
 * Treasury monthly burn dashboard.
 *
 * Pricing snapshots (2026-05; refresh when vendors update):
 *   - Anthropic Sonnet 4.6:    $3 / 1M input,  $15 / 1M output tokens
 *   - Anthropic Sonnet 4.6 cache read: $0.30 / 1M tokens (90% discount)
 *   - Anthropic web_search tool: $0.01 per request
 *   - Apollo enrich (Free):    $0.10 estimated per call (free tier limit ≠ free if exceeded)
 *   - Google Places Search:    $0.005 per call (Pro tier)
 *   - OpenAI / Gemini council: tracked separately (LLM Council skill)
 *
 * Returns ALL values in EUR using a fixed conversion (USD → EUR ≈ 0.92).
 * Roughed in — not for accounting, just for at-a-glance burn.
 */

const USD_TO_EUR = 0.92;

const PRICES_USD = {
  anthropic_sonnet_input_per_mtok: 3.0,
  anthropic_sonnet_output_per_mtok: 15.0,
  anthropic_sonnet_cache_read_per_mtok: 0.3,
  anthropic_web_search_per_call: 0.01,
  apollo_enrich_per_call: 0.1,
  google_places_per_call: 0.005,
} as const;

export interface UsageInputs {
  /** Anthropic input tokens (raw + cache miss). */
  input_tokens?: number;
  /** Anthropic output tokens. */
  output_tokens?: number;
  /** Cache-read tokens (cheaper). */
  cache_read_input_tokens?: number;
  /** How many web_search invocations the model made. */
  web_search_calls?: number;
  /** Apollo enrichment calls. */
  apollo_calls?: number;
  /** Google Places API hits. */
  places_calls?: number;
}

export interface CostBreakdown extends UsageInputs {
  cost_usd: number;
  cost_eur: number;
  /** Per-component cost in USD for transparency. */
  components_usd: {
    anthropic_input: number;
    anthropic_output: number;
    anthropic_cache_read: number;
    web_search: number;
    apollo: number;
    places: number;
  };
}

export function computeCost(input: UsageInputs): CostBreakdown {
  const ai_in =
    ((input.input_tokens ?? 0) / 1_000_000) *
    PRICES_USD.anthropic_sonnet_input_per_mtok;
  const ai_out =
    ((input.output_tokens ?? 0) / 1_000_000) *
    PRICES_USD.anthropic_sonnet_output_per_mtok;
  const ai_cache =
    ((input.cache_read_input_tokens ?? 0) / 1_000_000) *
    PRICES_USD.anthropic_sonnet_cache_read_per_mtok;
  const ws =
    (input.web_search_calls ?? 0) * PRICES_USD.anthropic_web_search_per_call;
  const ap =
    (input.apollo_calls ?? 0) * PRICES_USD.apollo_enrich_per_call;
  const pl =
    (input.places_calls ?? 0) * PRICES_USD.google_places_per_call;

  const cost_usd = ai_in + ai_out + ai_cache + ws + ap + pl;

  return {
    ...input,
    cost_usd,
    cost_eur: cost_usd * USD_TO_EUR,
    components_usd: {
      anthropic_input: ai_in,
      anthropic_output: ai_out,
      anthropic_cache_read: ai_cache,
      web_search: ws,
      apollo: ap,
      places: pl,
    },
  };
}

/**
 * Extract Anthropic token counts from a Messages API response or stream
 * usage object. Defensive — returns zeros if shape is unexpected.
 */
export function extractAnthropicUsage(usage: unknown): UsageInputs {
  if (!usage || typeof usage !== "object") return {};
  const u = usage as Record<string, unknown>;
  const input_tokens = typeof u.input_tokens === "number" ? u.input_tokens : 0;
  const output_tokens =
    typeof u.output_tokens === "number" ? u.output_tokens : 0;
  const cache_read_input_tokens =
    typeof u.cache_read_input_tokens === "number"
      ? u.cache_read_input_tokens
      : 0;
  // server_tool_use.web_search_requests on newer SDK versions
  let web_search_calls = 0;
  const stu = u.server_tool_use as
    | { web_search_requests?: number }
    | null
    | undefined;
  if (stu && typeof stu.web_search_requests === "number") {
    web_search_calls = stu.web_search_requests;
  }
  return {
    input_tokens,
    output_tokens,
    cache_read_input_tokens,
    web_search_calls,
  };
}

export function fmtEur(eur: number): string {
  if (eur < 0.01) return "<€0.01";
  if (eur < 1) return `€${eur.toFixed(2)}`;
  return `€${eur.toFixed(2)}`;
}
