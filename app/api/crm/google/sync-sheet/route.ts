import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { getValidConnection, syncContactsToSheet } from '@/lib/crm/google';

/** Full-sync the tenant's CRM contacts into its Google Sheet (creates it on first run). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const conn = await getValidConnection(user.tenantId);
    if (!conn) return NextResponse.json({ error: 'Google is not connected.' }, { status: 400 });

    const contacts = await prisma.crmContact.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { lastActivityAt: 'desc' },
      select: {
        name: true, company: true, contactPerson: true, mobile: true, email: true,
        city: true, customerType: true, leadStatus: true, lifecycleStage: true, source: true,
      },
    });

    const { sheetId, rows } = await syncContactsToSheet(conn, contacts as Array<Record<string, unknown>>);
    return NextResponse.json({ sheetId, rows, sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Google Sheet sync failed.' }, { status: 502 });
  }
}
