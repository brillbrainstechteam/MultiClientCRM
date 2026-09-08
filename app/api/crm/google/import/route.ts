import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getValidConnection, listGoogleContacts } from '@/lib/crm/google';
import { importContactRows } from '@/lib/crm/import-contacts';

/** Pull the connected account's Google Contacts and import them into the CRM (dedupe by mobile). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const conn = await getValidConnection(user.tenantId);
    if (!conn) return NextResponse.json({ error: 'Google is not connected.' }, { status: 400 });

    const rows = await listGoogleContacts(conn.accessToken);
    if (rows.length === 0) return NextResponse.json({ created: 0, updated: 0, skipped: 0, found: 0 });

    const result = await importContactRows(
      user.tenantId,
      rows.map((r) => ({ ...r, source: 'Google Contacts' })),
      'skip',
    );
    return NextResponse.json({ ...result, found: rows.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Google import failed.' }, { status: 502 });
  }
}
