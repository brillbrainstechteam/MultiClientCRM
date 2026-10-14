import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { CONSENT_OPTED_IN, CONSENT_OPTED_OUT } from '@/lib/crm/consent';

/** Same shape the send route uses, so the preview cannot drift from the send. */
function audienceWhere(tenantId: string, filter: Record<string, unknown> | null) {
  const where: Record<string, unknown> = { tenantId };
  const eq = (k: string, v: unknown) => { if (typeof v === 'string' && v) where[k] = v; };
  if (filter) {
    eq('customerType', filter.customerType);
    eq('leadStatus', filter.leadStatus);
    eq('lifecycleStage', filter.lifecycleStage);
    eq('city', filter.city);
    eq('state', filter.state);
    eq('salesTier', filter.salesTier);
    if (Array.isArray(filter.tags) && filter.tags.length) where.tags = { hasSome: filter.tags };
  }
  return where;
}

/**
 * How many contacts a campaign would actually reach, split by why they are or
 * are not reachable. The builder shows this before the send so "500 contacts"
 * never turns into 38 messages at the moment of truth.
 *
 * Body: { audienceFilter?: object, templateCategory?: 'MARKETING'|'UTILITY'|'AUTHENTICATION' }
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    audienceFilter?: Record<string, unknown> | null;
    templateCategory?: string;
  };
  const isMarketing = (body.templateCategory ?? 'MARKETING').toUpperCase() === 'MARKETING';
  const base = audienceWhere(user.tenantId, body.audienceFilter ?? null);

  const [matching, optedIn, optedOut] = await Promise.all([
    prisma.crmContact.count({ where: base }),
    prisma.crmContact.count({ where: { ...base, consent: CONSENT_OPTED_IN } }),
    prisma.crmContact.count({ where: { ...base, consent: CONSENT_OPTED_OUT } }),
  ]);
  const undecided = matching - optedIn - optedOut;

  return NextResponse.json({
    matching,
    optedIn,
    optedOut,
    undecided,
    reachable: isMarketing ? optedIn : matching - optedOut,
    gate: isMarketing ? 'opt_in_required' : 'opt_out_suppressed',
    // What the operator should do about the gap, in the builder's own words.
    blockedReason: isMarketing && undecided > 0
      ? `${undecided} contact(s) have not answered a consent request yet and will be skipped.`
      : null,
  });
}
