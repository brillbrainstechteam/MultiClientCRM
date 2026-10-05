import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { putFile, storageStatus } from '@/lib/storage';
import { lookupPlaceWithPhotos, downloadPlacePhoto } from '@/lib/crm/places';

/**
 * Fetch a contact's STORE photos from Google Places and store them in the
 * showroom gallery (kind 'showroom'). Places photo media is billed per call, so
 * this is cache-first: once a contact has Google-sourced photos we return those
 * without calling Places again, unless { refresh: true } is passed.
 */
const MAX_PHOTOS = 4;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const shape = (f: { id: string; fileName: string; mimeType: string; size: number; caption: string | null; createdAt: Date }) => ({
  id: f.id, fileName: f.fileName, mimeType: f.mimeType, size: f.size, caption: f.caption,
  createdAt: f.createdAt.toISOString(), url: `/api/crm/files/${f.id}`,
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot fetch store photos.' }, { status: 403 });
  }
  const { id } = await params;
  const refresh = (await req.json().catch(() => ({}))).refresh === true;

  const status = storageStatus();
  if (!status.ready) return NextResponse.json({ error: status.detail }, { status: 503 });

  const contact = await prisma.crmContact.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { id: true, name: true, company: true, city: true, state: true },
  });
  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  if (!(contact.company || contact.name) || !contact.city) {
    return NextResponse.json({ error: 'Add a business name and city before fetching store photos.' }, { status: 400 });
  }

  // Cache-first: reuse Google photos we already downloaded for this contact.
  const existing = await prisma.crmFile.findMany({
    where: { tenantId: user.tenantId, contactId: id, kind: 'showroom', fileName: { startsWith: 'google-store' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, fileName: true, mimeType: true, size: true, caption: true, createdAt: true },
  });
  if (!refresh && existing.length) {
    return NextResponse.json({ cached: true, images: existing.map(shape) });
  }

  let place;
  try {
    place = await lookupPlaceWithPhotos(`${contact.company || contact.name} ${contact.city}${contact.state ? ', ' + contact.state : ''} jewellery`);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Places lookup failed.' }, { status: 502 });
  }
  if (!place || place.photos.length === 0) {
    return NextResponse.json({ error: 'No store photos found on Google for this business. Verify the name/city, or add photos manually.' }, { status: 404 });
  }

  const saved = [];
  for (let i = 0; i < Math.min(place.photos.length, MAX_PHOTOS); i++) {
    try {
      const { bytes, mimeType } = await downloadPlacePhoto(place.photos[i].name, 1200);
      if (!bytes.length) continue;
      const fileId = crypto.randomUUID();
      const key = `tenants/${user.tenantId}/contacts/${id}/${fileId}.${EXT[mimeType] ?? 'jpg'}`;
      const driver = await putFile(key, bytes, mimeType);
      const row = await prisma.crmFile.create({
        data: {
          tenantId: user.tenantId, contactId: id, kind: 'showroom', driver, storageKey: key,
          fileName: `google-store-${i + 1}.${EXT[mimeType] ?? 'jpg'}`, mimeType, size: bytes.length,
          caption: place.placeName ? `Google · ${place.placeName}` : 'Google Places',
          uploadedById: user.id,
        },
        select: { id: true, fileName: true, mimeType: true, size: true, caption: true, createdAt: true },
      });
      saved.push(shape(row));
    } catch { /* skip a failed photo, keep the rest */ }
  }

  if (saved.length === 0) {
    return NextResponse.json({ error: 'Found photos on Google but could not download them. Try again.' }, { status: 502 });
  }

  await audit({
    tenantId: user.tenantId, actorId: user.id, action: 'contact.image.places',
    targetType: 'contact', targetId: id, detail: `${saved.length} store photo(s) from Google for ${contact.name}`,
  });

  return NextResponse.json({ ok: true, placeName: place.placeName, rating: place.rating, images: saved });
}
