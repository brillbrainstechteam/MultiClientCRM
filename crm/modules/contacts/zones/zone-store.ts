/**
 * Zone configuration store — the single live source of truth shared by:
 *   • Contacts → Zone & Assignment Settings
 *   • Settings → Team & Access → Zone Assignment
 *   • the zone-assignment engine (import routing)
 *
 * Seeded from the mock-data zone config. Edits made in one settings surface are
 * reflected in the other (and in import previews) within the session, matching
 * requirement §6 ("both entry points must use the same underlying config").
 */

import { useEffect, useState } from 'react';
import { zones as seedZones } from '@crm/mock-data';
import type { Zone } from '@crm/mock-data';

function clone(list: Zone[]): Zone[] {
  return list.map((z) => ({
    ...z,
    states: [...z.states],
    cities: [...z.cities],
    memberUserIds: [...z.memberUserIds],
  }));
}

let current: Zone[] = clone(seedZones);
const listeners = new Set<() => void>();

export function getZones(): Zone[] {
  return current;
}

export function setZones(next: Zone[]): void {
  current = next;
  listeners.forEach((l) => l());
}

export function updateZone(id: string, patch: Partial<Zone>): void {
  setZones(current.map((z) => (z.id === id ? { ...z, ...patch } : z)));
}

export function addZone(zone: Zone): void {
  setZones([...current, zone]);
}

export function findZoneLive(id: string): Zone | undefined {
  return current.find((z) => z.id === id);
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** React binding — re-renders on any change to the shared zone config. */
export function useZones(): Zone[] {
  const [, force] = useState(0);
  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  return getZones();
}
