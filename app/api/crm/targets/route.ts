import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import {
  periodLabel, periodRange, attainment, countsTowardTarget,
  DEFAULT_FY_START_MONTH,
} from '@/lib/crm/targets';

/**
 * Gram targets (PRD §19, TEAM-05, TGT-01..07).
 *
 * Jewellery sales are measured in grams. Achievement is computed from orders
 * rather than stored, so it can never drift from the orders it claims to
 * summarise — a stored running total is one failed write away from being a
 * number nobody can explain.
 *
 * An agent sees their own target; an owner or manager sees the team's.
 */

const MANAGE_ROLES = ['owner', 'admin', 'manager'];

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || periodLabel(new Date());
  const range = periodRange(period, DEFAULT_FY_START_MONTH);
  if (!range) return NextResponse.json({ error: 'That period is not valid.' }, { status: 400 });

  const canSeeAll = MANAGE_ROLES.includes(user.role);

  const [targets, members, orders, activityTargets] = await Promise.all([
    prisma.crmGramTarget.findMany({
      where: { tenantId: user.tenantId, period, ...(canSeeAll ? {} : { userId: user.id }) },
    }),
    prisma.user.findMany({
      where: { tenantId: user.tenantId, ...(canSeeAll ? {} : { id: user.id }) },
      select: { id: true, name: true, teamFunction: true },
    }),
    // Every order in the window; what counts is decided per order below so the
    // rule lives in one place rather than being half a SQL filter.
    prisma.crmOrder.findMany({
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: range.start, lt: range.end },
        ...(canSeeAll ? {} : { salesOwnerId: user.id }),
      },
      select: {
        id: true, salesOwnerId: true, status: true,
        totalGrams: true, countsTowardTarget: true,
        items: { select: { grams: true } },
      },
    }),
    prisma.crmActivityTarget.findMany({
      where: { tenantId: user.tenantId, ...(canSeeAll ? {} : { userId: user.id }) },
    }),
  ]);

  const achievedByUser = new Map<string, number>();
  let unattributed = 0;
  for (const o of orders) {
    if (!countsTowardTarget(o)) continue;
    // Prefer the denormalised total, fall back to the lines — an order saved
    // before totalGrams existed still counts.
    const grams = o.totalGrams ?? o.items.reduce((s, i) => s + (Number(i.grams) || 0), 0);
    if (grams <= 0) continue;
    if (!o.salesOwnerId) { unattributed += grams; continue; }
    achievedByUser.set(o.salesOwnerId, (achievedByUser.get(o.salesOwnerId) ?? 0) + grams);
  }

  const targetByUser = new Map(targets.map((t) => [t.userId, t]));

  const rows = members
    // A target of zero with nothing achieved is noise on the dashboard, so
    // only people who have a target or have sold something appear.
    .filter((m) => targetByUser.has(m.id) || (achievedByUser.get(m.id) ?? 0) > 0)
    .map((m) => {
      const t = targetByUser.get(m.id);
      return {
        userId: m.id,
        name: m.name,
        teamFunction: m.teamFunction,
        note: t?.note ?? null,
        ...attainment(t?.targetGrams ?? 0, achievedByUser.get(m.id) ?? 0),
      };
    })
    .sort((a, b) => b.percent - a.percent);

  const totals = attainment(
    rows.reduce((s, r) => s + r.targetGrams, 0),
    rows.reduce((s, r) => s + r.achievedGrams, 0),
  );

  return NextResponse.json({
    period,
    periodStart: range.start.toISOString(),
    periodEnd: range.end.toISOString(),
    rows,
    totals,
    // Surfaced rather than hidden: grams on orders with no salesperson belong
    // to nobody's target, and a business whose totals do not add up deserves
    // to be told why rather than left to find it.
    unattributedGrams: unattributed,
    activityTargets: activityTargets.map((a) => ({
      userId: a.userId, kind: a.kind, value: a.value, period: a.period,
    })),
    canEdit: canSeeAll,
  });
}

/** Set or change a target. Owners and managers only (TGT-01). */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Only an owner, admin or manager can set targets.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => null)) as {
    userId?: string; period?: string; targetGrams?: number; note?: string;
    activity?: { kind?: string; value?: number; period?: string | null };
  } | null;
  if (!b?.userId) return NextResponse.json({ error: 'Choose a team member.' }, { status: 400 });

  const member = await prisma.user.findFirst({
    where: { id: b.userId, tenantId: user.tenantId }, select: { id: true, name: true },
  });
  if (!member) return NextResponse.json({ error: 'That person is not on this workspace.' }, { status: 404 });

  const period = (b.period || periodLabel(new Date())).trim();
  if (!periodRange(period)) return NextResponse.json({ error: 'That period is not valid.' }, { status: 400 });

  // A marketing member's daily calling target (TGT-07) rides on the same route
  // because it is the same screen and the same permission.
  if (b.activity?.kind) {
    const value = Number(b.activity.value);
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json({ error: 'A daily target must be zero or more.' }, { status: 400 });
    }
    // find-then-write rather than upsert: `period` is nullable, and Prisma
    // cannot look a null up through a compound unique.
    const existingActivity = await prisma.crmActivityTarget.findFirst({
      where: {
        tenantId: user.tenantId, userId: b.userId,
        kind: b.activity.kind, period: b.activity.period ?? null,
      },
      select: { id: true },
    });
    if (existingActivity) {
      await prisma.crmActivityTarget.update({
        where: { id: existingActivity.id },
        data: { value: Math.floor(value), setByUserId: user.id },
      });
    } else {
      await prisma.crmActivityTarget.create({
        data: {
          tenantId: user.tenantId, userId: b.userId, kind: b.activity.kind,
          period: b.activity.period ?? null, value: Math.floor(value), setByUserId: user.id,
        },
      });
    }
  }

  if (b.targetGrams != null) {
    const grams = Number(b.targetGrams);
    if (!Number.isFinite(grams) || grams < 0) {
      return NextResponse.json({ error: 'A gram target must be zero or more.' }, { status: 400 });
    }
    await prisma.crmGramTarget.upsert({
      where: { tenantId_userId_period: { tenantId: user.tenantId, userId: b.userId, period } },
      update: { targetGrams: grams, note: (b.note ?? '').trim() || null, setByUserId: user.id },
      create: {
        tenantId: user.tenantId, userId: b.userId, period,
        targetGrams: grams, note: (b.note ?? '').trim() || null, setByUserId: user.id,
      },
    });
    await audit({
      tenantId: user.tenantId, actorId: user.id, action: 'crm.target.set',
      targetType: 'user', targetId: b.userId, detail: `${grams} g for ${period}`,
    });
  }

  return NextResponse.json({ ok: true });
}
