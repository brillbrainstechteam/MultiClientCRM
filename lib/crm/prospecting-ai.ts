/**
 * AI business discovery for Find New Businesses. Given a free-text brief, Gemini
 * (grounded with Google Search) proposes real candidate businesses to prospect,
 * for when a plain Places search is too narrow. Reuses the kundli GEMINI setup.
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

export interface DiscoveredBusiness {
  name: string;
  area: string | null;
  city: string | null;
  category: string | null;
  note: string | null;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || null;
};

export async function discoverBusinesses(brief: string, count = 15): Promise<DiscoveredBusiness[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured.');
  const n = Math.min(Math.max(count, 1), 30);

  const prompt = `You are a B2B prospecting assistant for an Indian jewellery wholesaler / manufacturer
that sells stock to retail jewellers.

TASK: from the brief below, list up to ${n} REAL, specific candidate businesses worth prospecting
(retail jewellers or relevant B2B buyers) in India.

BRIEF: ${brief}

RULES:
- Only real, plausibly-existing businesses — prefer ones you can verify via search.
- Never invent phone numbers, emails, or fake data. Use null for anything you are unsure of.
- Keep each note to one short reason it fits the brief.
- Return ONLY a JSON array, no prose, no code fences:
[{"name":"","area":null,"city":null,"category":null,"note":""}]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 }, tools: [{ google_search: {} }] }),
  });
  if (!res.ok) throw new Error(`AI discovery failed (${res.status}).`);
  const json = (await res.json()) as GeminiResponse;
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

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
