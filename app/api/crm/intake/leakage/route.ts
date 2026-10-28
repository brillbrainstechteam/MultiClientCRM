import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

/**
 * Lead-leakage / exception view (Lead Intake Hub — Lead Leakage Management).
 * Surfaces leads at risk of becoming invisible: no owner, waiting for first
 * contact, SLA breached, needs review, qualified-waiting-for-sales, duplicates,
 * and failed intake events. Exception-oriented, not an analytics module.
 */
const MANAGER_ROLES = ['owner', 'admin', 'manager'];
const OPEN_FOR_SLA = ['new', 'routed', 'needs_review', 'pending_assignment'];

const SELECT = {
  id: true, contactName: true, accountName: true, sourceName: true, sourceType: true,
  city: true, status: true, assignedUserId: true, contactId: true,
  slaDueAt: true, breachedAt: true, reviewReason: true, createdAt: true,
} satisfies Prisma.CrmIntakeEventSelect;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGER_ROLES.includes(user.role)) return NextResponse.json({ error: 'Only a manager can view lead leakage.' }, { status: 403 });
  const tenantId = user.tenantId;

  const buckets: { key: string; label: string; hint: string; where: Prisma.CrmIntakeEventWhereInput }[] = [
    { key: 'unassigned', label: 'No owner', hint: 'New leads with nobody assigned', where: { tenantId, assignedUserId: null, status: 'new' } },
    { key: 'awaiting', label: 'Waiting for first contact', hint: 'Assigned, reply clock running, not yet breached', where: { tenantId, firstResponseAt: null, breachedAt: null, slaDueAt: { not: null }, status: { in: OPEN_FOR_SLA } } },
    { key: 'breached', label: 'SLA breached', hint: 'First-response deadline missed', where: { tenantId, breachedAt: { not: null }, firstResponseAt: null } },
    { key: 'needs_review', label: 'Needs review', hint: 'Could not be matched/routed confidently', where: { tenantId, status: 'needs_review' } },
    { key: 'pending_sales', label: 'Qualified, awaiting Sales', hint: 'Marketing qualified; no salesperson chosen', where: { tenantId, status: 'pending_assignment' } },
    { key: 'duplicates', label: 'Possible duplicates', hint: 'Suspected duplicate customer', where: { tenantId, status: 'duplicate_suspected' } },
    { key: 'failed', label: 'Failed intake events', hint: 'A source event could not be processed', where: { tenantId, processingStatus: 'error' } },
  ];

  const results = await Promise.all(buckets.map(async (b) => {
    const [count, items] = await Promise.all([
      prisma.crmIntakeEvent.count({ where: b.where }),
      prisma.crmIntakeEvent.findMany({ where: b.where, orderBy: { createdAt: 'desc' }, take: 8, select: SELECT }),
    ]);
    return {
      key: b.key, label: b.label, hint: b.hint, count,
      items: items.map((e) => ({
        id: e.id,
        name: e.contactName || e.accountName || 'Unknown',
        source: e.sourceName ?? e.sourceType,
        city: e.city,
        status: e.status,
        assignedUserId: e.assignedUserId,
        contactId: e.contactId,
        reviewReason: e.reviewReason,
        slaDueAt: e.slaDueAt ? e.slaDueAt.toISOString() : null,
        breachedAt: e.breachedAt ? e.breachedAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }));

  return NextResponse.json({ buckets: results, total: results.reduce((n, b) => n + b.count, 0) });
}
