import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.tenantId !== user.tenantId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const [activities, transitions, messages] = await Promise.all([
    prisma.contactActivity.findMany({ where: { contactId: id }, orderBy: { at: 'desc' }, take: 100 }),
    prisma.stageTransition.findMany({ where: { contactId: id }, orderBy: { at: 'desc' }, take: 50 }),
    prisma.message.findMany({
      where: { conversation: { tenantId: user.tenantId, contactPhone: contact.phone } },
      orderBy: { at: 'desc' }, take: 40,
      select: { id: true, direction: true, text: true, at: true, type: true },
    }),
  ]);

  type Item = { id: string; kind: string; title: string; detail?: string | null; at: string };
  const items: Item[] = [
    ...activities.map((a) => ({ id: `a_${a.id}`, kind: a.kind, title: a.title, detail: a.detail, at: a.at.toISOString() })),
    ...transitions.map((t) => ({
      id: `t_${t.id}`, kind: 'stage',
      title: `${t.field === 'lead' ? 'Lead status' : 'Lifecycle'} → ${t.toStage.replace(/_/g, ' ')}`,
      detail: t.reason, at: t.at.toISOString(),
    })),
    ...messages.map((m) => ({
      id: `m_${m.id}`, kind: 'message',
      title: m.direction === 'inbound' ? 'Message received' : 'Message sent',
      detail: m.text, at: m.at.toISOString(),
    })),
  ].sort((x, y) => (x.at < y.at ? 1 : -1));

  return NextResponse.json({ items });
}

const noteSchema = z.object({ kind: z.string().default('note'), title: z.string().min(1), detail: z.string().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.tenantId !== user.tenantId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const parsed = noteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid note.' }, { status: 400 });

  const activity = await prisma.contactActivity.create({
    data: { contactId: id, tenantId: user.tenantId, kind: parsed.data.kind, title: parsed.data.title, detail: parsed.data.detail, byUserId: user.id },
  });
  await prisma.contact.update({ where: { id }, data: { lastActivityAt: new Date() } });
  return NextResponse.json({ activity }, { status: 201 });
}
