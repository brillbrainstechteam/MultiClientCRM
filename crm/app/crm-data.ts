/**
 * Real-data bridge for the embedded CRM.
 *
 * The prototype's screens read data through synchronous imports (e.g. `contacts`
 * from mock-data). To keep them unchanged while running on real data, this
 * module (a) hydrates those live bindings from the API, and (b) exposes write
 * helpers that persist to the API and then re-hydrate + notify listeners so the
 * UI reflects the change. CrmRoot subscribes and remounts the routed subtree on
 * change, so no screen needs rewriting.
 */
import { setContacts } from '@crm/mock-data/contacts';
import { setWorkspaceData } from '@crm/mock-data/workspace';
import type { Contact } from '@crm/mock-data/types';

const listeners = new Set<() => void>();

/** Subscribe to data-changed events (returns an unsubscribe fn). */
export function onCrmDataChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() {
  for (const cb of listeners) cb();
}

/** Fetch the tenant's records and push them into the prototype data layer. */
export async function hydrateCrmData(): Promise<void> {
  const res = await fetch('/api/crm/bootstrap', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`bootstrap ${res.status}`);
  const data = await res.json();
  setWorkspaceData({
    branches: data.branches,
    whatsappNumbers: data.whatsappNumbers,
    teams: data.teams,
    users: data.users,
  });
  setContacts(data.contacts);
}

async function refreshAndNotify() {
  await hydrateCrmData();
  notify();
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const msg = (await res.json().catch(() => ({}))).error ?? 'Request failed.';
    throw new Error(msg);
  }
  return res.json().catch(() => ({}));
}

/** Create a contact, then refresh the visible data. */
export async function createContact(input: Partial<Contact>): Promise<void> {
  await jsonOrThrow(await fetch('/api/crm/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'same-origin',
  }));
  await refreshAndNotify();
}

/** Patch editable fields on a contact, then refresh. */
export async function updateContact(id: string, patch: Partial<Contact>): Promise<void> {
  await jsonOrThrow(await fetch(`/api/crm/contacts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    credentials: 'same-origin',
  }));
  await refreshAndNotify();
}

/** Delete a contact, then refresh. */
export async function deleteContact(id: string): Promise<void> {
  await jsonOrThrow(await fetch(`/api/crm/contacts/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  }));
  await refreshAndNotify();
}

export type BulkOp =
  | { op: 'assign'; ownerId: string }
  | { op: 'stage'; stage: string }
  | { op: 'consent'; consent: string }
  | { op: 'tags'; tags: string[]; tagMode: 'add' | 'remove' }
  | { op: 'delete' };

/**
 * Apply an operation to many contacts (or one). Works for both bulk selections
 * and single-contact quick actions — the caller just passes the id(s).
 */
export async function bulkContacts(ids: string[], operation: BulkOp): Promise<number> {
  const res = await jsonOrThrow(await fetch('/api/crm/contacts/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, ...operation }),
    credentials: 'same-origin',
  }));
  await refreshAndNotify();
  return (res as { affected?: number }).affected ?? ids.length;
}

/** Merge duplicate contacts into `primaryId`, deleting the rest; then refresh. */
export async function mergeContacts(primaryId: string, duplicateIds: string[]): Promise<void> {
  await jsonOrThrow(await fetch('/api/crm/contacts/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ primaryId, duplicateIds }),
    credentials: 'same-origin',
  }));
  await refreshAndNotify();
}

/** Parse a CSV string into row objects keyed by header. Minimal, quote-aware. */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let field = '', row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = []; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((x) => x.trim() !== ''));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
    return o;
  });
}

/** Import many contacts at once; returns how many were created vs skipped. */
export async function importContacts(
  rows: Array<Partial<Contact>>,
  onDuplicate: 'skip' | 'update',
): Promise<{ created: number; updated: number; skipped: number }> {
  const res = await jsonOrThrow(await fetch('/api/crm/contacts/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, onDuplicate }),
    credentials: 'same-origin',
  }));
  await refreshAndNotify();
  return res as { created: number; updated: number; skipped: number };
}
