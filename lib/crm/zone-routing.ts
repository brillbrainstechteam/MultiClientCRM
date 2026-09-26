import { prisma } from '@/lib/db';
import type { CrmZone } from '@prisma/client';

/**
 * Server-side zone routing. A new inbound is mapped City → State → Zone, then to
 * the zone's members. Zones are persisted per tenant (CrmZone) and seeded with a
 * default India set; the admin assigns members to each zone.
 */

// Default India zones (states). Seeded once per tenant; members start empty.
const DEFAULT_ZONES: { name: string; code: string; states: string[] }[] = [
  { name: 'North', code: 'north', states: ['Delhi', 'Punjab', 'Haryana', 'Himachal Pradesh', 'Chandigarh', 'Uttar Pradesh', 'Uttarakhand', 'Rajasthan', 'Jammu and Kashmir', 'Ladakh'] },
  { name: 'West', code: 'west', states: ['Maharashtra', 'Gujarat', 'Goa', 'Madhya Pradesh', 'Dadra and Nagar Haveli and Daman and Diu'] },
  { name: 'South', code: 'south', states: ['Karnataka', 'Tamil Nadu', 'Telangana', 'Kerala', 'Andhra Pradesh', 'Puducherry'] },
  { name: 'East', code: 'east', states: ['West Bengal', 'Bihar', 'Odisha', 'Jharkhand', 'Assam', 'Chhattisgarh', 'Sikkim', 'Meghalaya', 'Tripura', 'Manipur', 'Nagaland', 'Mizoram', 'Arunachal Pradesh'] },
];

// Minimal major-city → state map so routing works when only a city is known.
const CITY_TO_STATE: Record<string, string> = {
  'mumbai': 'Maharashtra', 'pune': 'Maharashtra', 'nagpur': 'Maharashtra', 'nashik': 'Maharashtra', 'thane': 'Maharashtra',
  'delhi': 'Delhi', 'new delhi': 'Delhi',
  'gurugram': 'Haryana', 'gurgaon': 'Haryana', 'faridabad': 'Haryana',
  'noida': 'Uttar Pradesh', 'ghaziabad': 'Uttar Pradesh', 'lucknow': 'Uttar Pradesh', 'kanpur': 'Uttar Pradesh', 'agra': 'Uttar Pradesh', 'varanasi': 'Uttar Pradesh',
  'bengaluru': 'Karnataka', 'bangalore': 'Karnataka', 'mysuru': 'Karnataka', 'mysore': 'Karnataka', 'hubli': 'Karnataka',
  'chennai': 'Tamil Nadu', 'coimbatore': 'Tamil Nadu', 'madurai': 'Tamil Nadu',
  'hyderabad': 'Telangana', 'warangal': 'Telangana',
  'kolkata': 'West Bengal', 'howrah': 'West Bengal', 'siliguri': 'West Bengal',
  'ahmedabad': 'Gujarat', 'surat': 'Gujarat', 'rajkot': 'Gujarat', 'vadodara': 'Gujarat', 'baroda': 'Gujarat',
  'jaipur': 'Rajasthan', 'jodhpur': 'Rajasthan', 'udaipur': 'Rajasthan',
  'chandigarh': 'Chandigarh', 'amritsar': 'Punjab', 'ludhiana': 'Punjab', 'jalandhar': 'Punjab',
  'kochi': 'Kerala', 'cochin': 'Kerala', 'thiruvananthapuram': 'Kerala', 'kozhikode': 'Kerala', 'calicut': 'Kerala',
  'indore': 'Madhya Pradesh', 'bhopal': 'Madhya Pradesh',
  'patna': 'Bihar', 'bhubaneswar': 'Odisha', 'guwahati': 'Assam', 'ranchi': 'Jharkhand', 'raipur': 'Chhattisgarh',
  'visakhapatnam': 'Andhra Pradesh', 'vijayawada': 'Andhra Pradesh', 'goa': 'Goa', 'panaji': 'Goa',
};

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** Ensure the tenant has zones; seed the India defaults on first use. */
export async function ensureZones(tenantId: string): Promise<CrmZone[]> {
  const existing = await prisma.crmZone.findMany({ where: { tenantId } });
  if (existing.length > 0) return existing;
  await prisma.crmZone.createMany({ data: DEFAULT_ZONES.map((z) => ({ tenantId, name: z.name, code: z.code, states: z.states })) });
  return prisma.crmZone.findMany({ where: { tenantId } });
}

/** Resolve state from an explicit value, else from the city map. */
export function resolveState(city?: string | null, state?: string | null): string | null {
  const s = (state ?? '').trim();
  if (s) return s;
  const mapped = CITY_TO_STATE[norm(city)];
  return mapped ?? null;
}

/** Find the zone whose states/cities include the contact's location. */
export function matchZone(zones: CrmZone[], city?: string | null, state?: string | null): CrmZone | null {
  const c = norm(city);
  const st = norm(resolveState(city, state));
  if (c) { const byCity = zones.find((z) => z.cities.some((x) => norm(x) === c)); if (byCity) return byCity; }
  if (st) { const byState = zones.find((z) => z.states.some((x) => norm(x) === st)); if (byState) return byState; }
  return null;
}

export interface RoutingResult {
  zoneId: string | null;
  zoneName: string | null;
  memberUserIds: string[];
  assigneeUserId: string | null; // set when exactly one member covers the zone
  needsPick: boolean;            // true when >1 member (admin chooses)
}

/** Resolve a contact location to a zone + an assignment decision. */
export async function routeLocation(tenantId: string, city?: string | null, state?: string | null): Promise<RoutingResult> {
  const zones = await ensureZones(tenantId);
  const zone = matchZone(zones, city, state);
  if (!zone) return { zoneId: null, zoneName: null, memberUserIds: [], assigneeUserId: null, needsPick: false };
  const members = zone.memberUserIds ?? [];
  return {
    zoneId: zone.id, zoneName: zone.name, memberUserIds: members,
    assigneeUserId: members.length === 1 ? members[0] : null,
    needsPick: members.length > 1,
  };
}
