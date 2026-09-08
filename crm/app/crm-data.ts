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
import { setContacts, type Contact } from '@crm/mock-data/contacts';
import { setWorkspaceData } from '@crm/mock-data/workspace';

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
