/**
 * Per-run cost estimation for Find New Businesses, shown in the UI. Rates are
 * current list prices (2026) and overridable by env so finance can tune them:
 *   OPENAI_INPUT_PER_M / OPENAI_OUTPUT_PER_M  (USD per 1M tokens)
 *   OPENAI_WEBSEARCH_COST                     (USD per web_search tool call)
 *   PLACES_REQUEST_COST                       (USD per Places Text Search request)
 *   OPENAI_PROSPECTING_MODEL                  (default gpt-4o-mini)
 */
const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);

export const PROSPECTING_MODEL = process.env.OPENAI_PROSPECTING_MODEL || 'gpt-4o-mini';

const RATES = {
  openaiInputPerM: num(process.env.OPENAI_INPUT_PER_M, 0.15),  // gpt-4o-mini input
  openaiOutputPerM: num(process.env.OPENAI_OUTPUT_PER_M, 0.60), // gpt-4o-mini output
  webSearchCall: num(process.env.OPENAI_WEBSEARCH_COST, 0.01),  // $10 / 1000 calls
  placesRequest: num(process.env.PLACES_REQUEST_COST, 0.035),   // Text Search Enterprise (w/ phone)
};

export interface RunUsage {
  inputTokens?: number;
  outputTokens?: number;
  searchCalls?: number;
  placesRequests?: number;
}

export interface RunCost {
  usd: number;
  model: string;
  llm: number;
  search: number;
  places: number;
  inputTokens: number;
  outputTokens: number;
  searchCalls: number;
  placesRequests: number;
}

export function estimateRunCost(u: RunUsage): RunCost {
  const inputTokens = u.inputTokens ?? 0;
  const outputTokens = u.outputTokens ?? 0;
  const searchCalls = u.searchCalls ?? 0;
  const placesRequests = u.placesRequests ?? 0;
  const llm = (inputTokens * RATES.openaiInputPerM + outputTokens * RATES.openaiOutputPerM) / 1_000_000;
  const search = searchCalls * RATES.webSearchCall;
  const places = placesRequests * RATES.placesRequest;
  const usd = llm + search + places;
  return {
    usd: Math.round(usd * 10000) / 10000,
    model: PROSPECTING_MODEL,
    llm: Math.round(llm * 10000) / 10000,
    search: Math.round(search * 10000) / 10000,
    places: Math.round(places * 10000) / 10000,
    inputTokens, outputTokens, searchCalls, placesRequests,
  };
}
