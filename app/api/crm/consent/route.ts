import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { contactScopeClause } from '@/lib/crm/scope';
import {
  consentFunnel, consentStage, needsConsentWhere, CONSENT_RULES, CONSENT_TEMPLATE,
  CONSENT_OPTED_IN, CONSENT_OPTED_OUT, STAGE_LABEL, type ConsentStage,
} from '@/lib/crm/consent';

const PAGE = 50;

/**
 * The consent workspace in one call: the funnel counts, the queue of contacts
 * to ask next, and the rules the operator is working inside.
 *
 * ?stage=askable|awaiting_reply|no_reply|opted_in|opted_out  (default: askable)
 * ?q=                      name / company / mobile search
 * ?page=1
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage') || 'askable';
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);

  // Agents and managers only see their own scope, same as the contact list.
  const scopeClause = await contactScopeClause(user);

  const now = new Date();
  const window = new Date(now.getTime() - 7 * 86_400_000);
  const undecided = { consent: { notIn: [CONSENT_OPTED_IN, CONSENT_OPTED_OUT] } };

  const stageWhere: Record<string, Record<string, unknown>> = {
    askable: needsConsentWhere(user.tenantId, now),
    awaiting_reply: { tenantId: user.tenantId, ...undecided, consentRequestedAt: { gte: window } },
    no_reply: { tenantId: user.tenantId, ...undecided, consentRequestedAt: { lt: window } },
    opted_in: { tenantId: user.tenantId, consent: CONSENT_OPTED_IN },
    opted_out: { tenantId: user.tenantId, consent: CONSENT_OPTED_OUT },
  };

  const search = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { company: { contains: q, mode: 'insensitive' as const } },
          { mobile: { contains: q } },
        ],
      }
    : null;

  // Three fragments here are OR-shaped — the askable stage's re-ask window, the
  // text search, and the two-slot visibility clause. Spread into one object,
  // only the last OR would survive and the filter would quietly be wrong, so
  // they are composed under AND.
  const where = {
    tenantId: user.tenantId,
    AND: [stageWhere[stage] ?? stageWhere.askable, scopeClause, search]
      .filter((c): c is Record<string, unknown> => !!c),
  };

  const [funnel, total, rows] = await Promise.all([
    consentFunnel(user.tenantId, now),
    prisma.crmContact.count({ where }),
    prisma.crmContact.findMany({
      where,
      select: {
        id: true, name: true, company: true, mobile: true, city: true, tags: true,
        consent: true, consentRequestedAt: true, consentOptInAt: true,
        consentOptInSource: true, consentOptOutAt: true, lastActivityAt: true,
      },
      orderBy: [{ lastActivityAt: 'desc' }],
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
  ]);

  const contacts = rows.map((c) => {
    const s: ConsentStage = consentStage(c, now);
    return {
      id: c.id,
      name: c.name,
      company: c.company,
      mobile: c.mobile,
      city: c.city,
      tags: c.tags,
      stage: s,
      stageLabel: STAGE_LABEL[s],
      requestedAt: c.consentRequestedAt?.toISOString() ?? null,
      optInAt: c.consentOptInAt?.toISOString() ?? null,
      optInSource: c.consentOptInSource,
      optOutAt: c.consentOptOutAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    funnel,
    contacts,
    total,
    page,
    pageSize: PAGE,
    rules: CONSENT_RULES,
    suggestedTemplate: CONSENT_TEMPLATE,
  });
}
