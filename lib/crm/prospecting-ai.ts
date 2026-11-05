import { PROSPECTING_MODEL, type RunUsage } from '@/lib/crm/prospecting-cost';

/**
 * AI business discovery for Find New Businesses. Given a free-text brief, finds
 * real candidate businesses to prospect. Primary provider is OpenAI (Responses
 * API + web_search tool) using OPENAI_API_KEY; falls back to Gemini (grounded)
 * when only GEMINI_API_KEY is set. Returns the usage so the caller can price
 * each run.
 */
export interface DiscoveredBusiness {
  name: string;
  area: string | null;
  city: string | null;
  category: string | null;
  note: string | null;
}

export interface DiscoveryResult {
  results: DiscoveredBusiness[];
  usage: RunUsage;
  provider: 'openai' | 'gemini';
}

const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || null;
};

function buildPrompt(brief: string, n: number): string {
  return `You are a B2B prospecting assistant for an Indian jewellery wholesaler / manufacturer that sells stock to retail jewellers.

TASK: from the brief, list up to ${n} REAL, specific candidate businesses worth prospecting (retail jewellers or relevant B2B buyers) in India. Use web search to verify they exist.

BRIEF: ${brief}

RULES:
- Only real, verifiable businesses. Never invent phone numbers, emails or fake data. Use null for anything unsure.
- One short reason per business in "note".
- Return ONLY a JSON array, no prose, no code fences:
[{"name":"","area":null,"city":null,"category":null,"note":""}]`;
}

function parseBusinesses(text: string, n: number): DiscoveredBusiness[] {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  let arr: unknown[] = [];
  try { arr = JSON.parse(cleaned.slice(start, end + 1)) as unknown[]; } catch { arr = []; }
  return arr
    .map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      return { name: str(r.name) ?? '', area: str(r.area), city: str(r.city), category: str(r.category), note: str(r.note) };
    })
    .filter((b) => b.name)
    .slice(0, n);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function viaOpenAI(brief: string, n: number): Promise<DiscoveryResult> {
  const key = process.env.OPENAI_API_KEY!;
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: PROSPECTING_MODEL, tools: [{ type: 'web_search' }], input: buildPrompt(brief, n), temperature: 0.3 }),
  });
  if (!res.ok) throw new Error(`OpenAI discovery failed (${res.status}).`);
  const j = (await res.json()) as any;

  // Text: prefer the convenience field, else walk the output items.
  let text: string = typeof j.output_text === 'string' ? j.output_text : '';
  const output: any[] = Array.isArray(j.output) ? j.output : [];
  if (!text) {
    text = output
      .filter((o) => o?.type === 'message')
      .flatMap((o) => (Array.isArray(o.content) ? o.content : []))
      .filter((c: any) => c?.type === 'output_text')
      .map((c: any) => c.text ?? '')
      .join('');
  }
  const searchCalls = output.filter((o) => o?.type === 'web_search_call').length || 1;

  return {
    results: parseBusinesses(text, n),
    usage: { inputTokens: j.usage?.input_tokens ?? 0, outputTokens: j.usage?.output_tokens ?? 0, searchCalls },
    provider: 'openai',
  };
}

async function viaGemini(brief: string, n: number): Promise<DiscoveryResult> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(brief, n) }] }], generationConfig: { temperature: 0.3 }, tools: [{ google_search: {} }] }),
  });
  if (!res.ok) throw new Error(`AI discovery failed (${res.status}).`);
  const j = (await res.json()) as any;
  const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
  const usageMeta = j.usageMetadata ?? {};
  return {
    results: parseBusinesses(text, n),
    usage: { inputTokens: usageMeta.promptTokenCount ?? 0, outputTokens: usageMeta.candidatesTokenCount ?? 0, searchCalls: 1 },
    provider: 'gemini',
  };
}

export async function discoverBusinesses(brief: string, count = 15): Promise<DiscoveryResult> {
  const n = Math.min(Math.max(count, 1), 30);
  if (process.env.OPENAI_API_KEY) return viaOpenAI(brief, n);
  if (process.env.GEMINI_API_KEY) return viaGemini(brief, n);
  throw new Error('No AI provider configured (set OPENAI_API_KEY or GEMINI_API_KEY).');
}
