import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** Update a rule (enable/disable, rename, edit conditions/actions). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.crmAutomationRule.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) return NextResponse.json({ error: 'Rule not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof b.name === 'string') data.name = b.name.trim();
  if (typeof b.trigger === 'string') data.trigger = b.trigger;
  if (typeof b.enabled === 'boolean') data.enabled = b.enabled;
  if (Array.isArray(b.conditions)) data.conditions = b.conditions;
  if (Array.isArray(b.actions)) data.actions = b.actions;

  await prisma.crmAutomationRule.update({ where: { id }, data: data as never });
  return NextResponse.json({ ok: true });
}

/** Delete a rule. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  await prisma.crmAutomationRule.deleteMany({ where: { id, tenantId: user.tenantId } });
  return NextResponse.json({ ok: true });
}
