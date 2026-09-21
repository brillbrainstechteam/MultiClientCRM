import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Onboarding session — powers the progress bar + resume. The client writes
 * progress as the flow moves (strategy chosen, Meta launched, cancelled at a
 * step, errored); the server writes 'ready'/'registering' when a connection
 * finalises (see lib/meta/finalize.ts).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const session = await prisma.onboardingSession.findUnique({ where: { tenantId: user.tenantId } });
  const connected = await prisma.whatsAppAccount.count({ where: { tenantId: user.tenantId, status: 'connected' } });
  return NextResponse.json({ session, connectedCount: connected });
}

const schema = z.object({
  status: z.enum(['started', 'strategy_selected', 'meta_launched', 'meta_returned', 'registering', 'ready', 'cancelled', 'error']).optional(),
  strategy: z.string().optional().nullable(),
  lastStep: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  const d = parsed.data;

  const session = await prisma.onboardingSession.upsert({
    where: { tenantId: user.tenantId },
    create: { tenantId: user.tenantId, ...d },
    update: { ...d },
  });
  return NextResponse.json({ session });
}
