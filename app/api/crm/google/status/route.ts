import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { googleConfigured } from '@/lib/crm/google';

/** Whether the signed-in tenant has connected Google, and to which account. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const conn = await prisma.googleConnection.findUnique({ where: { tenantId: user.tenantId } });
  return NextResponse.json({
    configured: googleConfigured(),
    connected: Boolean(conn),
    email: conn?.email ?? null,
    sheetId: conn?.sheetId ?? null,
    sheetUrl: conn?.sheetId ? `https://docs.google.com/spreadsheets/d/${conn.sheetId}/edit` : null,
  });
}
