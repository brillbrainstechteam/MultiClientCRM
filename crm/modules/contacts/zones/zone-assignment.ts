/**
 * Zone-based automatic contact assignment (Contacts requirement §5).
 *
 * Pure functions over the shared zone config. The hierarchy is:
 *   Contact City → State → Zone → Assigned Team Member
 * City-level rules take priority over state-level rules. Contacts that can't be
 * mapped are never silently assigned — they return a typed exception status so
 * the UI can surface them for action.
 */

import { cityToState } from '@crm/mock-data';
import type { Zone } from '@crm/mock-data';
import { getZones, findZoneLive } from './zone-store';

export type AssignmentStatus =
  | 'assigned'
  | 'location-required'
  | 'unmapped-zone'
  | 'owner-not-assigned';

export interface ContactLocation {
  city: string | null | undefined;
  state?: string | null;
}

export interface AssignmentResult {
  status: AssignmentStatus;
  normalizedCity: string | null;
  normalizedState: string | null;
  zoneId: string | null;
  zoneName: string | null;
  ownerId: string | null;
  /** How the assignment was reached — 'city' | 'state' | null. */
  matchedBy: 'city' | 'state' | null;
  reason: string;
}

const EXCEPTION_STATUSES: AssignmentStatus[] = [
  'location-required',
  'unmapped-zone',
  'owner-not-assigned',
];

export function isException(status: AssignmentStatus): boolean {
  return EXCEPTION_STATUSES.includes(status);
}

/** Trim + Title Case a raw city string; empty → null. */
export function normalizeCity(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Resolve the state from an explicit value, else from the city map. */
export function resolveState(
  normalizedCity: string | null,
  rawState?: string | null,
): string | null {
  const explicit = (rawState ?? '').trim();
  if (explicit) return explicit;
  if (normalizedCity) {
    const mapped = cityToState[normalizedCity.toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
}

function cityMatchesZone(zone: Zone, normalizedCity: string): boolean {
  return zone.cities.some((c) => c.toLowerCase() === normalizedCity.toLowerCase());
}

function stateMatchesZone(zone: Zone, state: string): boolean {
  return zone.states.some((s) => s.toLowerCase() === state.toLowerCase());
}

/**
 * Assign a zone + owner for a contact location. City rules win over state rules.
 */
export function assignZone(loc: ContactLocation): AssignmentResult {
  const normalizedCity = normalizeCity(loc.city);
  const normalizedState = resolveState(normalizedCity, loc.state);

  const base = { normalizedCity, normalizedState };

  if (!normalizedCity && !normalizedState) {
    return {
      ...base,
      status: 'location-required',
      zoneId: null,
      zoneName: null,
      ownerId: null,
      matchedBy: null,
      reason: 'Missing city and state',
    };
  }

  const activeZones = getZones().filter((z) => z.active);

  // 1) City-level rule (priority).
  let matchedBy: 'city' | 'state' | null = null;
  let zone: Zone | undefined;
  if (normalizedCity) {
    zone = activeZones.find((z) => cityMatchesZone(z, normalizedCity));
    if (zone) matchedBy = 'city';
  }
  // 2) State-level rule.
  if (!zone && normalizedState) {
    zone = activeZones.find((z) => stateMatchesZone(z, normalizedState));
    if (zone) matchedBy = 'state';
  }

  if (!zone) {
    return {
      ...base,
      status: 'unmapped-zone',
      zoneId: null,
      zoneName: null,
      ownerId: null,
      matchedBy: null,
      reason: 'No zone matches this location',
    };
  }

  const ownerId = zone.primaryOwnerId ?? zone.memberUserIds[0] ?? null;
  if (!ownerId) {
    return {
      ...base,
      status: 'owner-not-assigned',
      zoneId: zone.id,
      zoneName: zone.name,
      ownerId: null,
      matchedBy,
      reason: `Zone "${zone.name}" has no team member`,
    };
  }

  return {
    ...base,
    status: 'assigned',
    zoneId: zone.id,
    zoneName: zone.name,
    ownerId,
    matchedBy,
    reason: `Matched by ${matchedBy}`,
  };
}

// ---- Batch aggregation (for import preview + summaries) -------------------

export interface AssignmentBatchSummary {
  total: number;
  assigned: number;
  byZone: { zoneId: string; zoneName: string; count: number }[];
  byOwner: { ownerId: string; count: number }[];
  exceptions: {
    locationRequired: number;
    unmappedZone: number;
    ownerNotAssigned: number;
  };
}

export function summarizeAssignments(
  locations: ContactLocation[],
): AssignmentBatchSummary {
  const results = locations.map(assignZone);
  const zoneCounts = new Map<string, number>();
  const ownerCounts = new Map<string, number>();
  const exceptions = { locationRequired: 0, unmappedZone: 0, ownerNotAssigned: 0 };
  let assigned = 0;

  for (const r of results) {
    if (r.status === 'assigned') {
      assigned += 1;
      if (r.zoneId) zoneCounts.set(r.zoneId, (zoneCounts.get(r.zoneId) ?? 0) + 1);
      if (r.ownerId) ownerCounts.set(r.ownerId, (ownerCounts.get(r.ownerId) ?? 0) + 1);
    } else if (r.status === 'location-required') {
      exceptions.locationRequired += 1;
    } else if (r.status === 'unmapped-zone') {
      exceptions.unmappedZone += 1;
    } else if (r.status === 'owner-not-assigned') {
      exceptions.ownerNotAssigned += 1;
    }
  }

  return {
    total: locations.length,
    assigned,
    byZone: [...zoneCounts.entries()].map(([zoneId, count]) => ({
      zoneId,
      zoneName: findZoneLive(zoneId)?.name ?? zoneId,
      count,
    })),
    byOwner: [...ownerCounts.entries()].map(([ownerId, count]) => ({ ownerId, count })),
    exceptions,
  };
}
