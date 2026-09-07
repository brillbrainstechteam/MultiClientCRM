/**
 * Per-contact zone/owner assignments (Contacts requirement §5).
 *
 * Records the zone and mapped team member a contact was assigned to, and
 * whether that happened automatically (by location) or manually. Zone mapping
 * is optional — a contact with no entry simply has no explicit zone. A manual
 * assignment is flagged so future auto-routing does not silently overwrite it.
 */

import { useEffect, useState } from 'react';

export interface ContactZoneAssignment {
  zoneId: string;
  zoneName: string;
  ownerId: string | null;
  mode: 'auto' | 'manual';
}

const assignments = new Map<string, ContactZoneAssignment>();
const listeners = new Set<() => void>();

export function getContactZone(contactId: string): ContactZoneAssignment | undefined {
  return assignments.get(contactId);
}

export function setContactZones(entries: Array<[string, ContactZoneAssignment]>): void {
  for (const [id, a] of entries) assignments.set(id, a);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Re-renders when any contact's zone assignment changes. */
export function useContactZones(): Map<string, ContactZoneAssignment> {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  return assignments;
}
