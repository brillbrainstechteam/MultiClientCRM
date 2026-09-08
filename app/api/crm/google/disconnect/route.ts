import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { revokeToken } from '@/lib/crm/google';

/** Disconnect Google: best-effort revoke, then drop the stored connection. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const conn = await prisma.googleConnection.findUnique({ where: { tenantId: user.tenantId } });
  if (conn) {
    await revokeToken(conn.refreshToken ?? conn.accessToken);
    await prisma.googleConnection.delete({ where: { tenantId: user.tenantId } });
  }
  return NextResponse.json({ disconnected: true });
}
