/**
 * "Kundli" — an AI-generated pre-call dossier. Given whatever the CRM knows
 * about a contact/company, it researches public information online (via Gemini
 * with Google Search grounding) and returns a call-ready brief: company profile,
 * likely needs, talking points and a tailored script — so the rep is prepared
 * before dialing. Plain REST, no SDK. Falls back to model knowledge if grounding
 * is unavailable, and to OpenAI (knowledge-only) if no Gemini key.
 */

export interface KundliInput {
  company?: string | null;
  contactPerson?: string | null;
  name?: string | null;
  city?: string | null;
  state?: string | null;
  mobile?: string | null;
  customerType?: string | null;         // b2b | b2c
  relationship: 'prospect' | 'customer';
  productInterests?: string[];
  tags?: string[];
}

export interface Kundli {
  companyOverview: string;
  industry: string;
  sizeEstimate: string;
  productsServices: string[];
  onlinePresence: { website?: string; socials?: string[] };
  recentSignals: string[];
  likelyNeeds: string[];
  talkingPoints: string[];
  suggestedScript: {
    opening: string;
    discoveryQuestions: string[];
    valuePitch: string;
    objectionHandling: string[];
  };
  bestTimeOrChannel: string;
  risksNotes: string[];
  confidence: 'low' | 'medium' | 'high';
  sources: string[];
  generatedWith: string;
}

const GEMINI_MODEL = 'gemini-flash-latest';
const OPENAI_MODEL = 'gpt-4o-mini';

function buildPrompt(input: KundliInput): string {
  const known = {
    company: input.company ?? 'unknown',
    contactPerson: input.contactPerson ?? input.name ?? 'unknown',
    location: [input.city, input.state].filter(Boolean).join(', ') || 'unknown',
    phone: input.mobile ?? 'unknown',
    customerType: input.customerType ?? 'unknown',
    relationship: input.relationship,
    productInterests: (input.productInterests ?? []).join(', ') || 'unknown',
    tags: (input.tags ?? []).join(', ') || 'none',
  };
  return [
    'You are a sales research assistant preparing a rep to CALL this company/contact.',
    'Using the details below and any PUBLIC information you can find online, produce a concise, accurate PRE-CALL DOSSIER.',
    'Rules: Only include facts you are reasonably confident about. If something is unknown, write "unknown" — NEVER fabricate revenue, headcount, names or news.',
    `Tailor the script to a ${known.relationship === 'customer' ? 'EXISTING CUSTOMER (retention/upsell/reactivation)' : 'NEW PROSPECT (introduction/qualification)'}.`,
    'Prefer specifics over generic filler. Keep every string tight and useful on a live call.',
    '',
    'KNOWN DETAILS:',
    JSON.stringify(known, null, 2),
    '',
    'Return ONLY a JSON object (no markdown, no commentary) of EXACTLY this shape:',
    `{
  "companyOverview": string,
  "industry": string,
  "sizeEstimate": string,
  "productsServices": string[],
  "onlinePresence": { "website": string, "socials": string[] },
  "recentSignals": string[],
  "likelyNeeds": string[],
  "talkingPoints": string[],
  "suggestedScript": { "opening": string, "discoveryQuestions": string[], "valuePitch": string, "objectionHandling": string[] },
  "bestTimeOrChannel": string,
  "risksNotes": string[],
  "confidence": "low" | "medium" | "high",
  "sources": string[]
}`,
    'Put any public URLs you relied on in "sources".',
  ].join('\n');
}

function coerce(text: string, generatedWith: string, extraSources: string[]): Kundli {
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? match[0] : text;
  let o: Record<string, unknown> = {};
  try { o = JSON.parse(raw) as Record<string, unknown>; } catch { /* leave defaults */ }
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') as string[] : []);
  const str = (v: unknown, d = 'unknown'): string => (typeof v === 'string' && v.trim() ? v.trim() : d);
  const script = (o.suggestedScript ?? {}) as Record<string, unknown>;
  const presence = (o.onlinePresence ?? {}) as Record<string, unknown>;
  const conf = ['low', 'medium', 'high'].includes(String(o.confidence)) ? (o.confidence as Kundli['confidence']) : 'low';
  const sources = [...new Set([...arr(o.sources), ...extraSources])];
  return {
    companyOverview: str(o.companyOverview),
    industry: str(o.industry),
    sizeEstimate: str(o.sizeEstimate),
    productsServices: arr(o.productsServices),
    onlinePresence: { website: typeof presence.website === 'string' ? presence.website : undefined, socials: arr(presence.socials) },
    recentSignals: arr(o.recentSignals),
    likelyNeeds: arr(o.likelyNeeds),
    talkingPoints: arr(o.talkingPoints),
    suggestedScript: {
      opening: str(script.opening, ''),
      discoveryQuestions: arr(script.discoveryQuestions),
      valuePitch: str(script.valuePitch, ''),
      objectionHandling: arr(script.objectionHandling),
    },
    bestTimeOrChannel: str(o.bestTimeOrChannel, ''),
    risksNotes: arr(o.risksNotes),
    confidence: conf,
    sources,
    generatedWith,
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string } }> };
  }>;
}

async function callGemini(prompt: string, key: string, useSearch: boolean): Promise<Kundli> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  };
  if (useSearch) body.tools = [{ google_search: {} }];
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as GeminiResponse;
  const cand = json.candidates?.[0];
  const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const groundingSources = (cand?.groundingMetadata?.groundingChunks ?? []).map((c) => c.web?.uri ?? '').filter(Boolean);
  return coerce(text, useSearch ? 'gemini+search' : 'gemini', groundingSources);
}

async function callOpenAI(prompt: string, key: string): Promise<Kundli> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: OPENAI_MODEL, temperature: 0.2, response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return coerce(json?.choices?.[0]?.message?.content ?? '', 'openai', []);
}

/** Generate a pre-call dossier for a contact. Prefers Gemini + Google Search grounding. */
export async function generateKundli(input: KundliInput): Promise<Kundli> {
  const prompt = buildPrompt(input);
  const gem = process.env.GEMINI_API_KEY;
  const oai = process.env.OPENAI_API_KEY;
  if (gem) {
    try { return await callGemini(prompt, gem, true); }         // grounded (live web)
    catch { try { return await callGemini(prompt, gem, false); } // model knowledge
    catch (e) { if (!oai) throw e; } }
  }
  if (oai) return await callOpenAI(prompt, oai);
  throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
}
