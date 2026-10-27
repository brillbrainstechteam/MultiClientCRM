import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { processIntake, type IntakeInput } from '@/lib/crm/intake';

/**
 * Unified intake queue + create endpoint (Lead Capture docs §5, §12, §14).
 *
 * GET  : the intake/triage queue, filterable by status / customerType / source /
 *        assignment. Managers see all; others see their own + unassigned.
 * POST : capture a lead from any source (manual Quick-Add, or an internal
 *        connector) → runs the intake pipeline.
 */
const MANAGER_ROLES = ['owner', 'admin', 'manager'];

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const where: Record<string, unknown> = { tenantId: user.tenantId };
  const status = sp.get('status');
  const customerType = sp.get('customerType');
  const source = sp.get('source');
  const assigned = sp.get('assigned'); // 'me' | 'unassigned' | <userId>
  if (status) where.status = status;
  if (customerType) where.customerType = customerType;
  if (source) where.sourceType = source;
  if (assigned === 'unassigned') where.assignedUserId = null;
  else if (assigned === 'me') where.assignedUserId = user.id;
  else if (assigned) where.assignedUserId = assigned;

  // Non-managers only see their own leads and the unassigned pool.
  if (!MANAGER_ROLES.includes(user.role) && !assigned) {
    where.OR = [{ assignedUserId: user.id }, { assignedUserId: null }];
  }

  const events = await prisma.crmIntakeEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(sp.get('limit')) || 100, 500),
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      sourceType: e.sourceType,
      sourceName: e.sourceName,
      customerType: e.customerType,
      accountName: e.accountName,
      contactName: e.contactName,
      mobile: e.mobile,
      city: e.city,
      state: e.state,
      productInterest: e.productInterest,
      budgetRange: e.budgetRange,
      occasion: e.occasion,
      classification: e.classification,
      status: e.status,
      reviewReason: e.reviewReason,
      contactId: e.contactId,
      assignedUserId: e.assignedUserId,
      assignmentReason: e.assignmentReason,
      zoneResolution: e.zoneResolution,
      slaDueAt: e.slaDueAt ? e.slaDueAt.toISOString() : null,
      firstResponseAt: e.firstResponseAt ? e.firstResponseAt.toISOString() : null,
      breachedAt: e.breachedAt ? e.breachedAt.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => ({}))) as Partial<IntakeInput>;
  if (!b.sourceType) return NextResponse.json({ error: 'A sourceType is required.' }, { status: 400 });
  if (!b.mobile && !b.whatsappNumber && !b.email && !b.contactName && !b.accountName) {
    return NextResponse.json({ error: 'Provide at least a mobile, email or name.' }, { status: 400 });
  }

  try {
    const result = await processIntake({
      ...(b as IntakeInput),
      tenantId: user.tenantId,
      createdByUserId: user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not capture the lead.' }, { status: 500 });
  }
}
