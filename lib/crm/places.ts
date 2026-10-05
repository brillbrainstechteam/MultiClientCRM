/**
 * Google Places (New) business prospecting — Text Search with an optional
 * geocoded radius. Used only by the locked, B2B-only prospecting feature.
 */

export interface ProspectQuery {
  keyword?: string;   // business type, e.g. "jewellery wholesalers"
  area?: string;      // locality / market
  district?: string;
  city?: string;
  state?: string;
  radiusKm?: number;  // optional radius around the resolved location
  limit?: number;     // cap on results (1..20)
}

export interface ProspectResult {
  name: string;
  address: string;
  phone?: string;
}

async function geocode(address: string, key: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const loc = j?.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

export interface PlacePhoto { name: string; widthPx?: number; heightPx?: number }
export interface PlaceLookup { placeName: string; rating: number | null; address: string; mapsUri?: string; photos: PlacePhoto[] }

/**
 * Find a single business and return its verified facts + photo references.
 * Used by the showroom gallery (download the photos) and can back the kundli's
 * hard facts (rating / address) — these come from Places, not the LLM.
 */
export async function lookupPlaceWithPhotos(textQuery: string): Promise<PlaceLookup | null> {
  const key = process.env.PLACES_API_KEY;
  if (!key) throw new Error('PLACES_API_KEY is not configured.');
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.googleMapsUri,places.photos',
    },
    body: JSON.stringify({ textQuery, maxResultCount: 1, regionCode: 'IN' }),
  });
  if (!res.ok) throw new Error(`Places search failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const p = (j.places ?? [])[0] as {
    displayName?: { text?: string }; formattedAddress?: string; rating?: number; googleMapsUri?: string;
    photos?: { name?: string; widthPx?: number; heightPx?: number }[];
  } | undefined;
  if (!p) return null;
  return {
    placeName: p.displayName?.text ?? '',
    rating: typeof p.rating === 'number' ? p.rating : null,
    address: p.formattedAddress ?? '',
    mapsUri: p.googleMapsUri,
    photos: (p.photos ?? []).map((ph) => ({ name: ph.name ?? '', widthPx: ph.widthPx, heightPx: ph.heightPx })).filter((x) => x.name),
  };
}

/** Download one Place photo's bytes (billed per call, so callers cache the result). */
export async function downloadPlacePhoto(photoName: string, maxWidthPx = 1200): Promise<{ bytes: Buffer; mimeType: string }> {
  const key = process.env.PLACES_API_KEY;
  if (!key) throw new Error('PLACES_API_KEY is not configured.');
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place photo failed (${res.status}).`);
  return { bytes: Buffer.from(await res.arrayBuffer()), mimeType: res.headers.get('content-type') ?? 'image/jpeg' };
}

export async function searchBusinesses(q: ProspectQuery): Promise<ProspectResult[]> {
  const key = process.env.PLACES_API_KEY;
  if (!key) throw new Error('PLACES_API_KEY is not configured.');

  const locBits = [q.area, q.district, q.city, q.state].map((s) => s?.trim()).filter(Boolean) as string[];
  const textQuery = [q.keyword?.trim() || 'businesses', locBits.length ? `in ${locBits.join(', ')}` : '']
    .join(' ')
    .trim();
  const maxResultCount = Math.min(Math.max(q.limit ?? 20, 1), 20);

  const body: Record<string, unknown> = { textQuery, maxResultCount, regionCode: 'IN' };
  // Radius needs a centre point — geocode the location text (best-effort).
  if (q.radiusKm && q.radiusKm > 0 && locBits.length) {
    const c = await geocode(`${locBits.join(', ')}, India`, key);
    if (c) {
      body.locationBias = { circle: { center: { latitude: c.lat, longitude: c.lng }, radius: Math.min(q.radiusKm * 1000, 50000) } };
    }
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places search failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return (j.places ?? []).map((p: {
    displayName?: { text?: string }; formattedAddress?: string; nationalPhoneNumber?: string; internationalPhoneNumber?: string;
  }) => ({
    name: p.displayName?.text ?? 'Business',
    address: p.formattedAddress ?? '',
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || undefined,
  }));
}
