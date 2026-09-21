import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

function serialize(a: {
  id: string; displayPhone: string | null; verifiedName: string | null; label: string | null;
  brand: string | null; department: string | null; branchId: string | null; status: string;
  statusReason: string | null; qualityRating: string | null; messagingTier: string | null;
  codeVerificationStatus: string | null; wabaId: string | null; phoneNumberId: string | null;
  connectedAt: Date | null; qualitySyncedAt: Date | null;
}) {
  return {
    id: a.id,
    displayPhone: a.displayPhone,
    verifiedName: a.verifiedName,
    label: a.label ?? a.verifiedName,
    brand: a.brand,
    department: a.department,
    branchId: a.branchId,
    status: a.status,
    statusReason: a.statusReason,
    qualityRating: a.qualityRating,
    messagingTier: a.messagingTier,
    codeVerificationStatus: a.codeVerificationStatus,
    wabaId: a.wabaId,
    phoneNumberId: a.phoneNumberId,
    connectedAt: a.connectedAt?.toISOString() ?? null,
    qualitySyncedAt: a.qualitySyncedAt?.toISOString() ?? null,
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;
  const a = await prisma.whatsAppAccount.findUnique({ where: { id } });
  if (!a || a.tenantId !== user.tenantId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ number: serialize(a) });
}

const patchSchema = z.object({
  label: z.string().max(80).optional().nullable(),
  brand: z.string().max(80).optional().nullable(),
  department: z.string().max(40).optional().nullable(),
  branchId: z.string().max(80).optional().nullable(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot edit number settings.' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const a = await prisma.whatsAppAccount.findUnique({ where: { id } });
  if (!a || a.tenantId !== user.tenantId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });

  const updated = await prisma.whatsAppAccount.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ number: serialize(updated) });
}
