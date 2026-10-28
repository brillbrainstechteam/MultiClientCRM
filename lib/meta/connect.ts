import { metaConfig, graphBase } from '@/lib/meta/config';
import { appSecretProof } from '@/lib/crypto/secrets';

/**
 * Meta multi-tenant connection helpers (Facebook Login for Business → delegated
 * access to a client's own Pages / Instagram / Lead Ads). See
 * docs/SOCIAL_CONNECTIONS_ARCHITECTURE.md. Graph version comes from metaConfig
 * (keep it in step with the App Dashboard subscription version).
 *
 * Every call that carries an access token also sends appsecret_proof, as Meta
 * requires for server-to-server calls.
 */

type Json = Record<string, unknown>;

async function graph(path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'GET'): Promise<Json> {
  const token = params.access_token;
  const qp = new URLSearchParams(token ? { ...params, appsecret_proof: appSecretProof(token) } : params);
  const url = `${graphBase()}/${path}`;
  const res = method === 'GET'
    ? await fetch(`${url}?${qp.toString()}`)
    : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: qp.toString() });
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) {
    const err = (body?.error as Json | undefined)?.message ?? `Graph ${res.status}`;
    throw new Error(String(err));
  }
  return body;
}

/** Exchange a Facebook Login for Business auth code (SDK response_type=code) for a token. */
export async function exchangeCodeForToken(code: string): Promise<{ accessToken: string; expiresIn: number | null }> {
  const body = await graph('oauth/access_token', {
    client_id: metaConfig.appId,
    client_secret: metaConfig.appSecret,
    code,
  });
  return { accessToken: String(body.access_token ?? ''), expiresIn: typeof body.expires_in === 'number' ? body.expires_in : null };
}

/** The client's business id behind a Business Integration System User token. */
export async function getClientBusinessId(token: string): Promise<string | null> {
  const body = await graph('me', { fields: 'client_business_id', access_token: token });
  return typeof body.client_business_id === 'string' ? body.client_business_id : null;
}

export interface MetaPage {
  id: string;
  name: string;
  accessToken: string; // page access token (used to subscribe + retrieve leads)
  tasks: string[];
  instagram?: { id: string; username?: string } | null;
}

/** Pages the client granted, each with its page token and linked IG account. */
export async function listPages(token: string): Promise<MetaPage[]> {
  const body = await graph('me/accounts', {
    fields: 'id,name,access_token,tasks,instagram_business_account{id,username}',
    access_token: token,
    limit: '100',
  });
  const data = Array.isArray(body.data) ? (body.data as Json[]) : [];
  return data.map((p) => {
    const ig = p.instagram_business_account as Json | undefined;
    return {
      id: String(p.id),
      name: String(p.name ?? 'Facebook Page'),
      accessToken: String(p.access_token ?? ''),
      tasks: Array.isArray(p.tasks) ? (p.tasks as string[]) : [],
      instagram: ig && ig.id ? { id: String(ig.id), username: typeof ig.username === 'string' ? ig.username : undefined } : null,
    };
  });
}

/** Subscribe a Page to the app for the given webhook fields (default: lead ads + DMs). */
export async function subscribePage(pageId: string, pageToken: string, fields = 'leadgen,messages,messaging_postbacks'): Promise<void> {
  await graph(`${pageId}/subscribed_apps`, { subscribed_fields: fields, access_token: pageToken }, 'POST');
}

/** Subscribe an Instagram account (Instagram Login) to messaging webhooks. */
export async function subscribeInstagram(igId: string, igToken: string, fields = 'messages,messaging_postbacks'): Promise<void> {
  await graph(`${igId}/subscribed_apps`, { subscribed_fields: fields, access_token: igToken }, 'POST');
}

export interface FetchedLead {
  id: string;
  createdTime: string | null;
  adId: string | null;
  formId: string | null;
  fields: Record<string, string>;
}

/** Retrieve a lead's answers from a leadgen_id (needs leads_retrieval + a page token). */
export async function fetchLead(leadgenId: string, token: string): Promise<FetchedLead> {
  const body = await graph(leadgenId, { fields: 'created_time,id,ad_id,form_id,field_data', access_token: token });
  const fields: Record<string, string> = {};
  const fd = Array.isArray(body.field_data) ? (body.field_data as Json[]) : [];
  for (const f of fd) {
    const name = String(f.name ?? '');
    const values = Array.isArray(f.values) ? (f.values as unknown[]) : [];
    if (name) fields[name] = values.map((v) => String(v)).join(', ');
  }
  return {
    id: String(body.id ?? leadgenId),
    createdTime: typeof body.created_time === 'string' ? body.created_time : null,
    adId: typeof body.ad_id === 'string' ? body.ad_id : null,
    formId: typeof body.form_id === 'string' ? body.form_id : null,
    fields,
  };
}

/** Map a Meta Lead Ad's common field names to intake fields (jewellery-friendly). */
export function mapLeadFields(fields: Record<string, string>): {
  name: string | null; mobile: string | null; email: string | null; city: string | null; productInterest: string | null; company: string | null;
} {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const hit = Object.entries(fields).find(([n]) => n.toLowerCase().replace(/[^a-z]/g, '').includes(k));
      if (hit && hit[1]) return hit[1];
    }
    return null;
  };
  return {
    name: pick('fullname', 'name'),
    mobile: pick('phone', 'mobile', 'contactnumber'),
    email: pick('email'),
    city: pick('city', 'town'),
    productInterest: pick('product', 'interest', 'category', 'lookingfor'),
    company: pick('company', 'business', 'firm'),
  };
}
