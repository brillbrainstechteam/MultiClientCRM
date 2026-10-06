import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { generateKundli, type Kundli } from '@/lib/crm/kundli';
import { fetchStorePresence } from '@/lib/crm/places';
import { audit } from '@/lib/crm/audit';

/** Return the cached kundli (pre-call dossier) for a contact, if any. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const c = await prisma.crmContact.findFirst({
    where: { id, tenantId: user.tenantId },
    select: { kundli: true, kundliGeneratedAt: true },
  });
  if (!c) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  return NextResponse.json({ kundli: c.kundli ?? null, generatedAt: c.kundliGeneratedAt ? c.kundliGeneratedAt.toISOString() : null });
}

/** Generate (or refresh) the kundli for a contact and cache it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  // Stage 1 ("identity") spends one or two searches checking we have the right
  // business; stage 2 only runs once that holds up, so a wrong match costs a
  // fraction of a full brief. `refresh` forces a new call; otherwise an already
  // cached result that satisfies the requested mode is served WITHOUT paying for
  // a model call again.
  const body = (await req.json().catch(() => ({}))) as { mode?: string; refresh?: boolean; language?: string };
  const mode = body.mode === 'full' ? 'full' : 'identity';
  const refresh = body.refresh === true;
  const language = body.language === 'hinglish' ? 'hinglish' : body.language === 'hindi' ? 'hindi' : 'english';

  const c = await prisma.crmContact.findFirst({
    where: { id, tenantId: user.tenantId },
    select: {
      name: true, company: true, contactPerson: true, city: true, state: true, mobile: true,
      customerType: true, lifecycleStage: true, productInterests: true, tags: true,
      website: true, pincode: true, kundli: true, kundliGeneratedAt: true,
    },
  });
  if (!c) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  // Cache-first: a stored brief already covers an identity request, and a stored
  // FULL brief covers a full request. Only a forced refresh (or upgrading an
  // identity-only cache to a full brief) actually calls the model again.
  const cached = (c.kundli ?? null) as ({ identityOnly?: boolean } & Record<string, unknown>) | null;
  if (!refresh && cached) {
    const cachedIsFull = cached.identityOnly !== true;
    if (mode === 'identity' || cachedIsFull) {
      return NextResponse.json({
        kundli: cached,
        generatedAt: c.kundliGeneratedAt ? c.kundliGeneratedAt.toISOString() : null,
        cached: true,
      });
    }
  }

  // Nothing to search on means nothing to pay for.
  if (!(c.company || c.name) || !c.city) {
    return NextResponse.json(
      { error: 'Add a business name and city to this contact first — there is nothing to research without them.' },
      { status: 400 },
    );
  }

  try {
    const kundli: Kundli = await generateKundli({
      company: c.company, contactPerson: c.contactPerson, name: c.name, city: c.city, state: c.state,
      mobile: c.mobile, customerType: c.customerType,
      relationship: c.lifecycleStage === 'customer' ? 'customer' : 'prospect',
      productInterests: c.productInterests, tags: c.tags, website: c.website,
    }, mode, language);
    kundli.language = language;

    // Verified facts beat the model: pull the real store footprint + rating from
    // Google Places and overwrite the brief's store presence for the full brief.
    if (mode === 'full') {
      try {
        const sp = await fetchStorePresence(c.company || c.name || '', c.city, c.state);
        if (sp) {
          kundli.storePresence = { totalCities: sp.totalCities, totalStores: sp.totalStores, byCity: sp.byCity };
          if (sp.rating != null) kundli.googleRating = sp.ratingCount ? `${sp.rating} (${sp.ratingCount})` : String(sp.rating);
          kundli.storePresenceVerified = true;
        }
      } catch { /* Places is best-effort; keep the model's estimate on failure */ }
    }
    const generatedAt = new Date();
    await prisma.crmContact.update({ where: { id }, data: { kundli: kundli as never, kundliGeneratedAt: generatedAt } });
    await audit({ tenantId: user.tenantId, actorId: user.id, action: mode === 'identity' ? 'kundli.identity' : 'kundli.generated', targetType: 'contact', targetId: id, detail: c.company ?? c.name });
    return NextResponse.json({ kundli, generatedAt: generatedAt.toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not generate the dossier.' }, { status: 502 });
  }
}
