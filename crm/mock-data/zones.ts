import type { Zone } from './types';

/**
 * Zone routing configuration (shared source of truth).
 *
 * Consumed by the Contacts "Zone & Assignment Settings" shortcut and by
 * Settings → Team & Access → Zone Assignment — both read/write this same list,
 * so a change in one surface is reflected in the other. City rules take
 * priority over state rules during assignment (see `cityToState` note below).
 */
export const zones: Zone[] = [
  {
    id: 'zone_delhi_ncr',
    name: 'Delhi NCR',
    active: true,
    states: ['Delhi'],
    cities: ['New Delhi', 'Delhi', 'Gurugram', 'Gurgaon', 'Noida', 'Ghaziabad', 'Faridabad'],
    memberUserIds: ['user_meera', 'user_vikram'],
    primaryOwnerId: 'user_meera',
  },
  {
    id: 'zone_north',
    name: 'North',
    active: true,
    states: ['Punjab', 'Haryana', 'Himachal Pradesh', 'Chandigarh'],
    cities: ['Chandigarh', 'Ludhiana', 'Amritsar', 'Shimla'],
    memberUserIds: ['user_rohan'],
    primaryOwnerId: 'user_rohan',
  },
  {
    id: 'zone_west',
    name: 'West',
    active: true,
    states: ['Maharashtra', 'Gujarat', 'Goa'],
    cities: ['Mumbai', 'Pune', 'Ahmedabad', 'Surat', 'Panaji'],
    memberUserIds: ['user_karan'],
    primaryOwnerId: 'user_karan',
  },
  {
    id: 'zone_south',
    name: 'South',
    active: true,
    states: ['Karnataka', 'Tamil Nadu', 'Telangana', 'Kerala', 'Andhra Pradesh'],
    cities: ['Bengaluru', 'Bangalore', 'Chennai', 'Hyderabad', 'Kochi'],
    // Deliberately left without a primary owner to demonstrate the
    // "Owner not assigned" exception path.
    memberUserIds: [],
    primaryOwnerId: null,
  },
];

/**
 * Fallback for contacts that can't be mapped. `null` = leave unassigned and
 * surface as an exception rather than silently assigning an arbitrary owner.
 */
export const zoneFallback: { unmappedOwnerId: string | null } = {
  unmappedOwnerId: null,
};

/**
 * City → State normalisation used before zone matching. Note Gurugram/Faridabad
 * resolve to Haryana (a North state) but are claimed by Delhi NCR at city level,
 * which is exactly why city rules must win over state rules.
 */
export const cityToState: Record<string, string> = {
  'new delhi': 'Delhi',
  delhi: 'Delhi',
  gurugram: 'Haryana',
  gurgaon: 'Haryana',
  noida: 'Uttar Pradesh',
  ghaziabad: 'Uttar Pradesh',
  faridabad: 'Haryana',
  mumbai: 'Maharashtra',
  pune: 'Maharashtra',
  ahmedabad: 'Gujarat',
  surat: 'Gujarat',
  panaji: 'Goa',
  bengaluru: 'Karnataka',
  bangalore: 'Karnataka',
  chennai: 'Tamil Nadu',
  hyderabad: 'Telangana',
  kochi: 'Kerala',
  chandigarh: 'Chandigarh',
  ludhiana: 'Punjab',
  amritsar: 'Punjab',
  shimla: 'Himachal Pradesh',
};

export function findZone(zoneId: string): Zone | undefined {
  return zones.find((z) => z.id === zoneId);
}
