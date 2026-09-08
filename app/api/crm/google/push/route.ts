import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { getValidConnection, pushContactsToGoogle } from '@/lib/crm/google';

/** Push the tenant's CRM contacts to the connected account's Google Contacts. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const conn = await getValidConnection(user.tenantId);
    if (!conn) return NextResponse.json({ error: 'Google is not connected.' }, { status: 400 });

    const contacts = await prisma.crmContact.findMany({
      where: { tenantId: user.tenantId },
      select: { name: true, mobile: true, email: true, company: true },
    });
    if (contacts.length === 0) return NextResponse.json({ created: 0 });

    const created = await pushContactsToGoogle(conn.accessToken, contacts);
    return NextResponse.json({ created });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Google push failed.' }, { status: 502 });
  }
}
