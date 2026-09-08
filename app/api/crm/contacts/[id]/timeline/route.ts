import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Lead-status / lifecycle transition history for one contact (req 43).
 * Tenant-scoped, newest first.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const rows = await prisma.crmStageTransition.findMany({
    where: { tenantId: user.tenantId, contactId: id },
    orderBy: { at: 'desc' },
  });

  return NextResponse.json({
    transitions: rows.map((t) => ({
      id: t.id, kind: t.kind, from: t.fromValue, to: t.toValue,
      byUserId: t.byUserId, note: t.note, at: t.at.toISOString(),
    })),
  });
}
