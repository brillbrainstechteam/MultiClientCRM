/**
 * Provider-agnostic vision OCR for contact capture (business cards, hand-written
 * customer registers, PDFs). Prefers Gemini (cheaper, native PDF) when a real
 * AI-Studio key is set; otherwise falls back to OpenAI vision. No SDK — plain
 * REST so it runs in a Next route with zero new dependencies.
 */

export interface OcrContact {
  name?: string;
  company?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  city?: string;
  state?: string;
}

const PROMPT =
  'You are extracting contact records from an image or document — a business card, a ' +
  'hand-written customer register page, or a printed/PDF contact list. Return ONLY a JSON ' +
  'object of the form {"contacts":[{...}]}. Each contact may include: name, company, ' +
  'contactPerson, mobile, email, city, state. Extract EVERY distinct contact present (a ' +
  'register page has many rows). Keep phone numbers as digits (you may keep a leading +). ' +
  'Omit any field you cannot read. Do not invent data. No commentary.';

const GEMINI_MODEL = 'gemini-2.0-flash';
const OPENAI_MODEL = 'gpt-4o-mini';

function parseContacts(text: string): OcrContact[] {
  // Models occasionally wrap JSON in prose/fences — extract the JSON object.
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? match[0] : text;
  let obj: unknown;
  try { obj = JSON.parse(raw); } catch { return []; }
  const list = (obj as { contacts?: unknown })?.contacts;
  if (!Array.isArray(list)) return [];
  return list
    .map((c) => {
      const o = c as Record<string, unknown>;
      const s = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
      return { name: s(o.name), company: s(o.company), contactPerson: s(o.contactPerson), mobile: s(o.mobile), email: s(o.email), city: s(o.city), state: s(o.state) };
    })
    .filter((c) => c.mobile || c.name || c.company);
}

async function viaGemini(base64: string, mimeType: string, key: string): Promise<OcrContact[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini vision failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  return parseContacts(text);
}

async function viaOpenAI(base64: string, mimeType: string, key: string): Promise<OcrContact[]> {
  if (mimeType === 'application/pdf') {
    throw new Error('PDF scanning needs a Gemini key (AIza…). For OpenAI, upload an image (JPG/PNG) instead.');
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI vision failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return parseContacts(json?.choices?.[0]?.message?.content ?? '');
}

/** Extract contacts from a base64 image/PDF using the best available provider. */
export async function extractContacts(base64: string, mimeType: string): Promise<{ contacts: OcrContact[]; provider: string }> {
  const gem = process.env.GEMINI_API_KEY;
  if (gem && gem.startsWith('AIza')) return { contacts: await viaGemini(base64, mimeType, gem), provider: 'gemini' };
  const oai = process.env.OPENAI_API_KEY;
  if (oai) return { contacts: await viaOpenAI(base64, mimeType, oai), provider: 'openai' };
  throw new Error('No vision provider configured. Set GEMINI_API_KEY (AIza…) or OPENAI_API_KEY.');
}
