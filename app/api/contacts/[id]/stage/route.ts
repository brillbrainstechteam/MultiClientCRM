import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const schema = z.object({
  field: z.enum(['lead', 'lifecycle']),
  toStage: z.string().min(1),
  reason: z.string().optional(),
});

/** Change lead status or lifecycle stage — writes an auditable StageTransition. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.tenantId !== user.tenantId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { field, toStage, reason } = parsed.data;

  const from = field === 'lead' ? contact.leadStatus : contact.lifecycleStage;
  if (from === toStage) return NextResponse.json({ contact });

  const data: Record<string, unknown> = { lastActivityAt: new Date() };
  if (field === 'lead') {
    data.leadStatus = toStage;
    data.stageEnteredAt = new Date();
  } else {
    data.lifecycleStage = toStage;
    if (toStage === 'customer') {
      // Activation: record the moment, set relationship active, stop treating as prospect.
      if (!contact.activatedAt) data.activatedAt = new Date();
      data.relationshipState = 'active';
    }
  }

  // StageTransition is the audit log AND the timeline entry — no separate activity
  // (the timeline already merges transitions), which would otherwise duplicate it.
  const [updated] = await prisma.$transaction([
    prisma.contact.update({ where: { id }, data }),
    prisma.stageTransition.create({
      data: { contactId: id, tenantId: user.tenantId, field, fromStage: from, toStage, reason, byUserId: user.id },
    }),
  ]);

  return NextResponse.json({ contact: updated });
}
