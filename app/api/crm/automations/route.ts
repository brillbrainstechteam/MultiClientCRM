import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const serialize = (r: {
  id: string; name: string; enabled: boolean; trigger: string; conditions: unknown; actions: unknown;
  runCount: number; lastRunAt: Date | null; createdAt: Date; updatedAt: Date;
}) => ({
  id: r.id, name: r.name, enabled: r.enabled, trigger: r.trigger,
  conditions: r.conditions ?? [], actions: r.actions ?? [],
  runCount: r.runCount, lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
  createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
});

/** List the tenant's automation rules. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const rules = await prisma.crmAutomationRule.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ rules: rules.map(serialize) });
}

/** Create an automation rule (disabled by default). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof b?.name === 'string' ? b.name.trim() : '';
  const trigger = typeof b?.trigger === 'string' ? b.trigger : '';
  if (!name || !trigger) return NextResponse.json({ error: 'Name and trigger are required.' }, { status: 400 });

  const rule = await prisma.crmAutomationRule.create({
    data: {
      tenantId: user.tenantId,
      name,
      trigger,
      enabled: b?.enabled === true,
      conditions: (Array.isArray(b?.conditions) ? b.conditions : []) as never,
      actions: (Array.isArray(b?.actions) ? b.actions : []) as never,
      createdByUserId: user.id,
    },
  });
  return NextResponse.json(serialize(rule));
}
