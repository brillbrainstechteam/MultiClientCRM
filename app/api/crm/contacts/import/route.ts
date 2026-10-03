import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { importContactRows, type ImportRow } from '@/lib/crm/import-contacts';

/**
 * Bulk-import contacts from parsed rows, de-duplicating by mobile within the
 * tenant. `onDuplicate` = 'skip' leaves existing rows untouched; 'update' merges
 * the incoming fields into the existing contact. Records a CrmImportJob so the
 * Imports & Sync hub shows real history. Delegates row work to the shared
 * importContactRows helper (also used by the Google Contacts sync).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { rows?: ImportRow[]; onDuplicate?: string; source?: string; fileName?: string } | null;
  const rows = Array.isArray(body?.rows) ? body!.rows : [];
  const onDuplicate = body?.onDuplicate === 'update' ? 'update' : 'skip';
  const source = (typeof body?.source === 'string' && body.source.trim()) ? body.source.trim() : 'CSV upload';
  const fileName = typeof body?.fileName === 'string' && body.fileName.trim() ? body.fileName.trim() : null;
  if (rows.length === 0) return NextResponse.json({ error: 'No rows to import.' }, { status: 400 });

  const result = await importContactRows(user.tenantId, rows, onDuplicate);

  const job = await prisma.crmImportJob.create({
    data: {
      tenantId: user.tenantId, source, fileName,
      total: rows.length, created: result.created, updated: result.updated, skipped: result.skipped,
      status: result.skipped > 0 && result.created + result.updated === 0 ? 'partial' : 'completed',
      createdByUserId: user.id,
    },
  });

  return NextResponse.json({ ...result, jobId: job.id });
}

/** List recent import jobs for the Imports & Sync hub. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const jobs = await prisma.crmImportJob.findMany({
    where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' }, take: 50,
  });
  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id, source: j.source, fileName: j.fileName,
      total: j.total, created: j.created, updated: j.updated, skipped: j.skipped,
      status: j.status, createdAt: j.createdAt.toISOString(),
    })),
  });
}
