import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { audit } from '@/lib/crm/audit';

const ROLES = ['admin', 'manager', 'agent'];
const DEPTS = ['sales', 'marketing', 'support', 'other'];

function serialize(u: { id: string; name: string; email: string; role: string; teamFunction: string | null; status: string; createdAt: Date }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, department: u.teamFunction, status: u.status, createdAt: u.createdAt.toISOString() };
}

/** Included seats + overage price from the tenant's plan. */
async function seatPlan(tenantId: string): Promise<{ included: number | null; overagePrice: number; currency: string }> {
  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  const code = sub?.planCode ?? (await prisma.tenant.findUnique({ where: { id: tenantId } }))?.plan ?? 'trial';
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code } });
  const limits = (plan?.limits ?? null) as { users?: number; seatOveragePrice?: number } | null;
  return {
    included: typeof limits?.users === 'number' ? limits.users : null,
    overagePrice: typeof limits?.seatOveragePrice === 'number' ? limits.seatOveragePrice : 0,
    currency: plan?.currency ?? 'INR',
  };
}

function seatBilling(used: number, included: number | null, overagePrice: number, currency: string) {
  const overage = included !== null ? Math.max(used - included, 0) : 0;
  return { used, included, overage, overagePrice, currency, monthlyOverage: overage * overagePrice };
}

/** List the tenant's team members + seat billing (owner/admin/manager). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot view team members.' }, { status: 403 });
  }
  const [members, plan] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'asc' } }),
    seatPlan(user.tenantId),
  ]);
  const activeSeats = members.filter((m) => m.status === 'active').length;
  return NextResponse.json({ members: members.map(serialize), seats: seatBilling(activeSeats, plan.included, plan.overagePrice, plan.currency) });
}

/** Create a team member with an initial password (owner/admin only). Seat-limited. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Only the account owner or an admin can add members.' }, { status: 403 });
  }

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const name = str(b?.name);
  const email = str(b?.email).toLowerCase();
  const password = typeof b?.password === 'string' ? b.password : '';
  const role = ROLES.includes(str(b?.role)) ? str(b?.role) : 'agent';
  const department = DEPTS.includes(str(b?.department)) ? str(b?.department) : null;

  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 400 });

  // Seat handling: within included seats = free; beyond = allowed as paid
  // overage IF the plan supports it, else blocked (e.g. trial).
  const [activeSeats, plan] = await Promise.all([
    prisma.user.count({ where: { tenantId: user.tenantId, status: 'active' } }),
    seatPlan(user.tenantId),
  ]);
  if (plan.included !== null && activeSeats >= plan.included && plan.overagePrice <= 0) {
    return NextResponse.json({ error: `Your plan includes ${plan.included} seats and all are in use. Upgrade your plan to add more members.`, code: 'seat_limit' }, { status: 402 });
  }

  const created = await prisma.user.create({
    data: {
      tenantId: user.tenantId, name, email, passwordHash: await hashPassword(password),
      role, teamFunction: department, status: 'active', createdByUserId: user.id,
    },
  });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: 'member.created', targetType: 'user', targetId: created.id, detail: `${role}${department ? ` / ${department}` : ''}` });
  return NextResponse.json(serialize(created), { status: 201 });
}
