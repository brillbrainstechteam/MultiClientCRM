import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { importContactRows, type ImportRow } from '@/lib/crm/import-contacts';

/**
 * Bulk-import contacts from parsed rows, de-duplicating by mobile within the
 * tenant. `onDuplicate` = 'skip' leaves existing rows untouched; 'update' merges
 * the incoming fields into the existing contact. Delegates to the shared
 * importContactRows helper (also used by the Google Contacts sync).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { rows?: ImportRow[]; onDuplicate?: string } | null;
  const rows = Array.isArray(body?.rows) ? body!.rows : [];
  const onDuplicate = body?.onDuplicate === 'update' ? 'update' : 'skip';
  if (rows.length === 0) return NextResponse.json({ error: 'No rows to import.' }, { status: 400 });

  const result = await importContactRows(user.tenantId, rows, onDuplicate);
  return NextResponse.json(result);
}
