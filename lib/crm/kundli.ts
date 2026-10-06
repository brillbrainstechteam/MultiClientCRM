/**
 * "Kundli" — an AI-researched pre-call dossier for a jewellery retailer.
 *
 * Two stages, because identity is the expensive mistake. Stage 1 spends one or
 * two grounded searches working out whether we have found the right business at
 * all; only when that is confident does stage 2 research the full brief. A
 * wrong "Krishna Jewellers" researched in depth is worse than useless to a rep,
 * and costs five times as much as finding out early.
 *
 * Grounded search is billed per query, so each prompt names the few sources
 * worth checking rather than inviting the model to crawl fifteen.
 */

export interface KundliInput {
  company?: string | null;
  contactPerson?: string | null;
  name?: string | null;
  city?: string | null;
  state?: string | null;
  area?: string | null;
  address?: string | null;
  mobile?: string | null;
  website?: string | null;
  customerType?: string | null;         // b2b | b2c
  relationship: 'prospect' | 'customer';
  productInterests?: string[];
  tags?: string[];
}

export type KundliMode = 'identity' | 'full';
export type KundliLanguage = 'english' | 'hinglish' | 'hindi';

export interface StorePresence {
  totalCities: number | null;
  totalStores: number | null;
  byCity: { city: string; stores: number | null }[];
}

/** Did we find the right business? Everything else is worthless without this. */
export interface KundliIdentity {
  confidence: 'high' | 'medium' | 'low' | 'conflict';
  reason: string;
  verifyBeforeCalling: string[];
  /** Other businesses that could be this one, when the name is ambiguous. */
  possibleMatches: { name: string; area?: string; clue?: string; url?: string }[];
}

export interface Kundli {
  identity: KundliIdentity;

  // Snapshot
  companyOverview: string;
  industry: string;
  businessType: string;      // Retail / Wholesale / Manufacturing / Trading / Mixed / Not Found
  customerTypeServed: string; // End customers / Retailers / Both / Not Found
  brandLevel: string;        // Local / Regional / Chain / Premium / Not Found
  ownerDecisionMaker: string;
  sizeEstimate: string;
  establishedYear?: string;
  teamStrength?: string;
  googleRating?: string;
  storePresence: StorePresence;
  onlinePresence: { website?: string; socials?: string[] };
  socialProfiles: { platform: string; url?: string; followers?: string }[];

  // What they sell
  productCategories: string[];
  priceSegment: string;
  productsServices: string[];
  designStyle: string;
  occasionFocus: string;
  customerSegment: string;
  visibleProductFocus: string;

  // Why they are worth calling
  differentiation: string[];
  likelyNeeds: string[];
  talkingPoints: string[];
  pitchAngle: { bestProduct: string; whyItFits: string; mainBenefit: string; bestTiming: string };

  // On the call
  suggestedScript: {
    opening: string;
    discoveryQuestions: string[];
    valuePitch: string;
    objectionHandling: string[];
  };
  hinglishScript: { opening: string; valuePitch: string };
  whatNotToSay: string[];
  bestTimeOrChannel: string;

  // Context
  importantFestivals: string[];
  awards: string[];
  recentSignals: string[];
  risksNotes: string[];

  confidence: 'low' | 'medium' | 'high';
  sources: string[];
  generatedWith: string;
  /** Set when only stage 1 ran, so the UI can offer to continue. */
  identityOnly?: boolean;
  /** Primary call language chosen when the brief was generated. */
  language?: KundliLanguage;
  /** True when store presence / rating were verified from Google Places, not the LLM. */
  storePresenceVerified?: boolean;
}

// Pinned: "latest" drifts between generations, and grounding is billed at very
// different rates across them ($14 vs $35 per 1k queries).
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const OPENAI_MODEL = 'gpt-4o-mini';

const UNKNOWN = 'Not Found';

function knownFacts(input: KundliInput): string {
  const lines = [
    ['Brand / Firm name', input.company || input.name],
    ['Contact person', input.contactPerson],
    ['City', input.city],
    ['State', input.state],
    ['Area / locality', input.area],
    ['Address', input.address],
    ['Phone', input.mobile],
    ['Website / social', input.website],
    ['Known interests', input.productInterests?.join(', ')],
    ['CRM tags', input.tags?.join(', ')],
    ['Relationship', input.relationship === 'customer' ? 'Existing customer' : 'Prospect'],
  ].filter(([, v]) => v);
  return lines.map(([k, v]) => `- ${k}: ${v}`).join('\n');
}

const SHARED_RULES = `
RULES (follow strictly):
1. Do not guess. Use only information you actually found.
2. Never merge two businesses that share a name. If unsure, say so.
3. Unavailable information must be written exactly as "${UNKNOWN}".
4. Unclear information must be written exactly as "Needs Manual Verification".
5. Keep every field short and practical for a telecaller. No essays.
6. Return ONLY a JSON object. No markdown, no commentary, no code fences.`;

/**
 * Stage 1 — just enough searching to know whether we have the right shop.
 * Deliberately capped: this runs for every contact, so it must stay cheap.
 */
function buildIdentityPrompt(input: KundliInput): string {
  return `You are a jewellery client research assistant for India, preparing B2B outreach to a
jewellery retailer.

WHAT THE CRM KNOWS:
${knownFacts(input)}

TASK: establish ONLY whether this specific business can be identified online.
Run AT MOST 2 web searches. Prefer Google Business Profile and the business's own
website or Instagram. Do not research products, pitch or history yet.

Judge identity by: name + city + area/address + phone + owner name + website/social handle.
- high: name + city plus at least one of address / phone / website / owner match.
- medium: name + city match, but nothing else is confirmed.
- low: only the name matches, or public information is too thin.
- conflict: several similar jewellers exist in the same city or area.
${SHARED_RULES}

JSON shape:
{"identity":{"confidence":"high|medium|low|conflict","reason":"one sentence","verifyBeforeCalling":["question the rep should confirm"],"possibleMatches":[{"name":"","area":"","clue":"","url":""}]},
 "onlinePresence":{"website":"","socials":[""]},
 "sources":[""]}`;
}

/** Stage 2 — the full brief, run only once identity holds up. */
function buildFullPrompt(input: KundliInput, language: KundliLanguage): string {
  const langName = language === 'hinglish' ? 'Hinglish (Hindi + English in Roman script)'
    : language === 'hindi' ? 'Hindi (Devanagari script)' : 'English';
  const secondScriptNote = language === 'hindi'
    ? 'in natural Hindi, Devanagari script'
    : 'Hinglish — Hindi + English in Roman script';
  return `You are a jewellery client research assistant for India. You work for a B2B JEWELLERY
MANUFACTURER / WHOLESALER (the supplier) whose business is selling gold/diamond
jewellery STOCK to retail jewellers. Prepare a short, accurate, telecaller-friendly
profile of the RETAIL JEWELLER below so the supplier's rep knows what to pitch and
ask before calling. Everything is from the SUPPLIER's side — the goal is to sell
them jewellery to stock, not to help their marketing.

PRIMARY CALL LANGUAGE: ${langName}. The rep will speak mainly in ${langName}, so make
that script the natural, fluent one. Still fill both suggestedScript (English) and
hinglishScript (Hinglish) so either can be shown.

WHAT THE CRM KNOWS:
${knownFacts(input)}

SEARCH BUDGET: run AT MOST 5 web searches, choosing from the sources most likely to
carry something: Google Business Profile, the business's website, Instagram,
Justdial / IndiaMART, and local news or association listings. Stop early once you
have enough; do not sweep every source.

THE ONLY THING THAT MATTERS is: what JEWELLERY does this retailer sell, and what
jewellery stock could the supplier sell THEM. Everything must help the rep decide
which designs/categories to offer.
- productCategories: tick the jewellery they actually retail (Gold, Diamond,
  Polki/Kundan, Silver, Platinum, Gemstone/Coloured stones, Temple/Antique,
  Daily-wear/Lightweight, Bridal/Heavy, Coins/Bullion).
- priceSegment: Mass / Mid-market / Premium / Luxury.
- likelyNeeds here means the jewellery CATEGORIES OR DESIGNS they would most likely
  BUY from a wholesaler/manufacturer to stock (e.g. "lightweight 18K diamond
  daily-wear", "bridal polki sets", "22K temple jewellery") — NOT business services.
- pitchAngle.bestProduct is a specific jewellery line the supplier should offer them.
STRICTLY FORBIDDEN: do NOT suggest software, CRM, inventory/management systems,
marketing services, digital marketing, websites or consulting. The supplier sells
PHYSICAL JEWELLERY ONLY. Any such suggestion is wrong.

For a small local jeweller keep everything compact and lean on verification questions.
For a known chain, give a little more on categories, design style and fit.
${SHARED_RULES}

JSON shape (use "${UNKNOWN}" for anything you could not establish):
{"identity":{"confidence":"high|medium|low|conflict","reason":"","verifyBeforeCalling":[""],"possibleMatches":[{"name":"","area":"","clue":"","url":""}]},
 "companyOverview":"2-3 sentences","industry":"","businessType":"Retail|Wholesale|Manufacturing|Trading|Mixed|${UNKNOWN}","customerTypeServed":"End customers|Retailers|Both|${UNKNOWN}","brandLevel":"Local|Regional|Chain|Premium|${UNKNOWN}","ownerDecisionMaker":"","sizeEstimate":"","establishedYear":"","teamStrength":"","googleRating":"",
 "storePresence":{"totalCities":null,"totalStores":null,"byCity":[{"city":"","stores":null}]},
 "onlinePresence":{"website":"","socials":[""]},
 "socialProfiles":[{"platform":"","url":"","followers":""}],
 "productCategories":["from the list above"],"priceSegment":"Mass|Mid-market|Premium|Luxury|${UNKNOWN}",
 "productsServices":["specific jewellery they sell"],"designStyle":"","occasionFocus":"","customerSegment":"","visibleProductFocus":"collections visible on their site/Instagram now",
 "differentiation":["3-5 short points, only what you actually saw"],
 "likelyNeeds":["jewellery categories/designs they would BUY to stock"],"talkingPoints":["5 jewellery-supply points"],
 "pitchAngle":{"bestProduct":"a specific jewellery line to offer them","whyItFits":"","mainBenefit":"","bestTiming":""},
 "suggestedScript":{"opening":"one polite personalised line, no unverified facts","discoveryQuestions":["5 questions about their buying needs"],"valuePitch":"","objectionHandling":[""]},
 "hinglishScript":{"opening":"${secondScriptNote}","valuePitch":"${secondScriptNote}"},
 "whatNotToSay":["3-5 points, e.g. do not assume they need suppliers"],
 "bestTimeOrChannel":"","importantFestivals":[""],"awards":[""],"recentSignals":[""],"risksNotes":[""],
 "confidence":"low|medium|high","sources":["url"]}`;
}

/* ---- Response handling --------------------------------------------------- */

const str = (v: unknown, fallback = UNKNOWN): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || fallback;
};
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : [];

function coerce(raw: string, generatedWith: string, grounded: string[], identityOnly: boolean): Kundli {
  // Models still wrap JSON in fences now and then.
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  let d: Record<string, unknown> = {};
  try { d = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>; } catch { /* keep defaults */ }

  const ident = (d.identity ?? {}) as Record<string, unknown>;
  const conf = String(ident.confidence ?? '').toLowerCase();
  const sp = (d.storePresence ?? {}) as Record<string, unknown>;
  const op = (d.onlinePresence ?? {}) as Record<string, unknown>;
  const pa = (d.pitchAngle ?? {}) as Record<string, unknown>;
  const sc = (d.suggestedScript ?? {}) as Record<string, unknown>;
  const hs = (d.hinglishScript ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  const sources = [...new Set([...list(d.sources), ...grounded])];

  return {
    identity: {
      confidence: (['high', 'medium', 'low', 'conflict'].includes(conf) ? conf : 'low') as KundliIdentity['confidence'],
      reason: str(ident.reason, 'No identity assessment returned.'),
      verifyBeforeCalling: list(ident.verifyBeforeCalling),
      possibleMatches: Array.isArray(ident.possibleMatches)
        ? (ident.possibleMatches as Record<string, unknown>[]).map((m) => ({
            name: str(m?.name, ''), area: str(m?.area, ''), clue: str(m?.clue, ''), url: str(m?.url, ''),
          })).filter((m) => m.name)
        : [],
    },
    companyOverview: str(d.companyOverview, ''),
    industry: str(d.industry),
    businessType: str(d.businessType),
    customerTypeServed: str(d.customerTypeServed),
    brandLevel: str(d.brandLevel),
    ownerDecisionMaker: str(d.ownerDecisionMaker),
    sizeEstimate: str(d.sizeEstimate),
    establishedYear: str(d.establishedYear, ''),
    teamStrength: str(d.teamStrength, ''),
    googleRating: str(d.googleRating, ''),
    storePresence: {
      totalCities: num(sp.totalCities),
      totalStores: num(sp.totalStores),
      byCity: Array.isArray(sp.byCity)
        ? (sp.byCity as Record<string, unknown>[]).map((c) => ({ city: str(c?.city, ''), stores: num(c?.stores) })).filter((c) => c.city)
        : [],
    },
    onlinePresence: { website: str(op.website, ''), socials: list(op.socials) },
    socialProfiles: Array.isArray(d.socialProfiles)
      ? (d.socialProfiles as Record<string, unknown>[]).map((s) => ({
          platform: str(s?.platform, ''), url: str(s?.url, ''), followers: str(s?.followers, ''),
        })).filter((s) => s.platform)
      : [],
    productCategories: list(d.productCategories),
    priceSegment: str(d.priceSegment),
    productsServices: list(d.productsServices),
    designStyle: str(d.designStyle),
    occasionFocus: str(d.occasionFocus),
    customerSegment: str(d.customerSegment),
    visibleProductFocus: str(d.visibleProductFocus),
    differentiation: list(d.differentiation),
    likelyNeeds: list(d.likelyNeeds),
    talkingPoints: list(d.talkingPoints),
    pitchAngle: {
      bestProduct: str(pa.bestProduct, ''), whyItFits: str(pa.whyItFits, ''),
      mainBenefit: str(pa.mainBenefit, ''), bestTiming: str(pa.bestTiming, ''),
    },
    suggestedScript: {
      opening: str(sc.opening, ''), discoveryQuestions: list(sc.discoveryQuestions),
      valuePitch: str(sc.valuePitch, ''), objectionHandling: list(sc.objectionHandling),
    },
    hinglishScript: { opening: str(hs.opening, ''), valuePitch: str(hs.valuePitch, '') },
    whatNotToSay: list(d.whatNotToSay),
    bestTimeOrChannel: str(d.bestTimeOrChannel, ''),
    importantFestivals: list(d.importantFestivals),
    awards: list(d.awards),
    recentSignals: list(d.recentSignals),
    risksNotes: list(d.risksNotes),
    confidence: (['low', 'medium', 'high'].includes(String(d.confidence)) ? String(d.confidence) : 'low') as Kundli['confidence'],
    sources,
    generatedWith,
    ...(identityOnly ? { identityOnly: true } : {}),
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string } }> };
  }>;
}

async function callGemini(prompt: string, key: string, useSearch: boolean, identityOnly: boolean): Promise<Kundli> {
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
  const grounded = (cand?.groundingMetadata?.groundingChunks ?? []).map((c) => c.web?.uri ?? '').filter(Boolean);
  return coerce(text, useSearch ? `${GEMINI_MODEL}+search` : GEMINI_MODEL, grounded, identityOnly);
}

async function callOpenAI(prompt: string, key: string, identityOnly: boolean): Promise<Kundli> {
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
  return coerce(json?.choices?.[0]?.message?.content ?? '', OPENAI_MODEL, [], identityOnly);
}

/**
 * Research a contact. `mode: 'identity'` runs only the cheap identification
 * pass; 'full' runs the complete brief. Prefers Gemini with Google Search
 * grounding, falls back to model knowledge, then to OpenAI.
 */
export async function generateKundli(input: KundliInput, mode: KundliMode = 'full', language: KundliLanguage = 'english'): Promise<Kundli> {
  const identityOnly = mode === 'identity';
  const prompt = identityOnly ? buildIdentityPrompt(input) : buildFullPrompt(input, language);
  const gem = process.env.GEMINI_API_KEY;
  const oai = process.env.OPENAI_API_KEY;

  if (gem) {
    try { return await callGemini(prompt, gem, true, identityOnly); }        // grounded (live web)
    catch { try { return await callGemini(prompt, gem, false, identityOnly); } // model knowledge only
    catch (e) { if (!oai) throw e; } }
  }
  if (oai) return await callOpenAI(prompt, oai, identityOnly);
  throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
}
