import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

const schema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['assign', 'leadStatus', 'addTag', 'lifecycle']),
  value: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { ids, action, value } = parsed.data;

  // scope to tenant
  const scope = { id: { in: ids }, tenantId: user.tenantId };

  if (action === 'assign') {
    await prisma.contact.updateMany({ where: scope, data: { salesOwnerId: value || null, lastActivityAt: new Date() } });
  } else if (action === 'leadStatus' && value) {
    await prisma.contact.updateMany({ where: scope, data: { leadStatus: value, stageEnteredAt: new Date(), lastActivityAt: new Date() } });
  } else if (action === 'lifecycle' && value) {
    await prisma.contact.updateMany({ where: scope, data: { lifecycleStage: value, lastActivityAt: new Date(), ...(value === 'customer' ? { relationshipState: 'active' } : {}) } });
  } else if (action === 'addTag' && value) {
    const rows = await prisma.contact.findMany({ where: scope, select: { id: true, tags: true } });
    await prisma.$transaction(
      rows.filter((r) => !r.tags.includes(value)).map((r) =>
        prisma.contact.update({ where: { id: r.id }, data: { tags: { push: value } } }),
      ),
    );
  } else {
    return NextResponse.json({ error: 'Nothing to do.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: ids.length });
}
