import { prisma } from '@/lib/db';
import type { GoogleConnection } from '@prisma/client';

/**
 * Google integration (OAuth + People API + Sheets/Drive), all via plain REST
 * fetch — no SDK dependency, matching the OCR/Places approach. One connection
 * per tenant. Used to import Google Contacts into the CRM, push CRM contacts
 * back to Google Contacts, and sync contacts into a Google Sheet the tenant owns.
 */

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'email',
].join(' ');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';

export function googleConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/** The OAuth redirect URI for a given request origin (must be registered in the Google console). */
export function redirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/auth/google/callback`;
}

/** Build the Google consent URL. `state` is an anti-CSRF token echoed back to the callback. */
export function buildAuthUrl(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent', // force a refresh_token even on re-consent
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

/** Exchange an auth code for tokens. */
export async function exchangeCode(code: string, origin: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  return res.json();
}

/** Decode the email claim from an id_token (no signature check — we just got it from Google over TLS). */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'));
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

/**
 * Return the tenant's connection with a currently-valid access token, refreshing
 * (and persisting) it when it is within 60s of expiry. Returns null if the
 * tenant hasn't connected Google.
 */
export async function getValidConnection(tenantId: string): Promise<GoogleConnection | null> {
  const conn = await prisma.googleConnection.findUnique({ where: { tenantId } });
  if (!conn) return null;
  if (conn.expiresAt.getTime() - Date.now() > 60_000) return conn;
  if (!conn.refreshToken) throw new Error('Google session expired and no refresh token is stored — please reconnect Google.');

  const t = await refreshAccessToken(conn.refreshToken);
  return prisma.googleConnection.update({
    where: { tenantId },
    data: {
      accessToken: t.access_token,
      expiresAt: new Date(Date.now() + t.expires_in * 1000),
      scope: t.scope ?? conn.scope,
    },
  });
}

/** Authorized fetch against a Google API. */
async function api(accessToken: string, url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
}

export interface GoogleContactRow {
  name: string;
  mobile: string;
  email: string;
  company: string;
  contactPerson: string;
}

/** List the connected account's Google Contacts, normalised to import rows. */
export async function listGoogleContacts(accessToken: string): Promise<GoogleContactRow[]> {
  const rows: GoogleContactRow[] = [];
  let pageToken: string | undefined;
  do {
    const p = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers,organizations',
      pageSize: '1000',
      sortOrder: 'LAST_MODIFIED_DESCENDING',
    });
    if (pageToken) p.set('pageToken', pageToken);
    const res = await api(accessToken, `https://people.googleapis.com/v1/people/me/connections?${p.toString()}`);
    if (!res.ok) throw new Error(`Google Contacts read failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as {
      connections?: Array<Record<string, unknown>>;
      nextPageToken?: string;
    };
    for (const person of data.connections ?? []) {
      const names = (person.names as Array<{ displayName?: string }>) ?? [];
      const phones = (person.phoneNumbers as Array<{ value?: string }>) ?? [];
      const emails = (person.emailAddresses as Array<{ value?: string }>) ?? [];
      const orgs = (person.organizations as Array<{ name?: string; title?: string }>) ?? [];
      const mobile = phones[0]?.value ?? '';
      const name = names[0]?.displayName ?? '';
      if (!mobile || !name) continue; // import requires both
      rows.push({
        name,
        mobile,
        email: emails[0]?.value ?? '',
        company: orgs[0]?.name ?? '',
        contactPerson: '',
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return rows;
}

/** Push contacts to the connected account's Google Contacts (batched, ≤200/call). */
export async function pushContactsToGoogle(
  accessToken: string,
  contacts: Array<{ name: string; mobile: string; email?: string | null; company?: string | null }>,
): Promise<number> {
  let created = 0;
  for (let i = 0; i < contacts.length; i += 200) {
    const batch = contacts.slice(i, i + 200).filter((c) => c.mobile && c.name);
    if (batch.length === 0) continue;
    const res = await api(accessToken, 'https://people.googleapis.com/v1/people:batchCreateContacts', {
      method: 'POST',
      body: JSON.stringify({
        contacts: batch.map((c) => ({
          contactPerson: {
            names: [{ givenName: c.name }],
            phoneNumbers: [{ value: c.mobile }],
            ...(c.email ? { emailAddresses: [{ value: c.email }] } : {}),
            ...(c.company ? { organizations: [{ name: c.company }] } : {}),
          },
        })),
        readMask: 'names',
      }),
    });
    if (!res.ok) throw new Error(`Google Contacts write failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { createdPeople?: unknown[] };
    created += data.createdPeople?.length ?? batch.length;
  }
  return created;
}

/** Create a spreadsheet owned by the connected account; returns its id. */
async function createSheet(accessToken: string, title: string): Promise<string> {
  const res = await api(accessToken, 'https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify({ properties: { title } }),
  });
  if (!res.ok) throw new Error(`Google Sheet create failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { spreadsheetId: string };
  return data.spreadsheetId;
}

const SHEET_HEADERS = ['Name', 'Company', 'Contact person', 'Mobile', 'Email', 'City', 'Type', 'Lead status', 'Lifecycle', 'Source'];

/**
 * Full-sync the tenant's contacts into its Google Sheet (creates the sheet on
 * first sync and persists its id). Clears then rewrites so the sheet mirrors the
 * CRM. Returns the sheet id and row count.
 */
export async function syncContactsToSheet(
  conn: GoogleConnection,
  rows: Array<Record<string, unknown>>,
): Promise<{ sheetId: string; rows: number }> {
  let sheetId = conn.sheetId;
  if (!sheetId) {
    sheetId = await createSheet(conn.accessToken, 'TalkTrack CRM — Contacts');
    await prisma.googleConnection.update({ where: { tenantId: conn.tenantId }, data: { sheetId } });
  }

  const values = [
    SHEET_HEADERS,
    ...rows.map((c) => [
      String(c.name ?? ''), String(c.company ?? ''), String(c.contactPerson ?? ''),
      String(c.mobile ?? ''), String(c.email ?? ''), String(c.city ?? ''),
      String(c.customerType ?? ''), String(c.leadStatus ?? ''), String(c.lifecycleStage ?? ''),
      String(c.source ?? ''),
    ]),
  ];

  // Clear the existing sheet region, then write the current snapshot.
  const clear = await api(conn.accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:Z:clear`, { method: 'POST', body: '{}' });
  if (!clear.ok && clear.status !== 400) throw new Error(`Google Sheet clear failed (${clear.status}): ${await clear.text()}`);

  const write = await api(
    conn.accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1?valueInputOption=RAW`,
    { method: 'PUT', body: JSON.stringify({ values }) },
  );
  if (!write.ok) throw new Error(`Google Sheet write failed (${write.status}): ${await write.text()}`);

  return { sheetId, rows: rows.length };
}

/** Best-effort revoke of the account's grant. */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
}
