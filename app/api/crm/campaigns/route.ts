import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** List the tenant's campaigns (newest first) with live counts. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const campaigns = await prisma.crmCampaign.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      templateId: c.templateId,
      templateName: c.templateName,
      templateLocale: c.templateLocale,
      whatsappNumberId: c.whatsappNumberId,
      segmentId: c.segmentId,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
      createdByUserId: c.createdByUserId,
      totalRecipients: c.totalRecipients,
      sentCount: c.sentCount,
      deliveredCount: c.deliveredCount,
      readCount: c.readCount,
      failedCount: c.failedCount,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}

/** Create a broadcast campaign (draft, or scheduled when scheduledAt is set). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof b?.name === 'string' ? b.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 });

  const scheduledAt = typeof b?.scheduledAt === 'string' && b.scheduledAt ? new Date(b.scheduledAt) : null;
  const isTrigger = b?.type === 'trigger';
  const triggerEvent = isTrigger && ['first_message', 'keyword', 'inbound_message'].includes(String(b?.triggerEvent)) ? String(b?.triggerEvent) : null;

  const campaign = await prisma.crmCampaign.create({
    data: {
      tenantId: user.tenantId,
      name,
      type: isTrigger ? 'trigger' : 'broadcast',
      // Event-based campaigns are 'live' once created (they fire on events);
      // broadcasts start as draft/scheduled.
      status: isTrigger ? 'sending' : scheduledAt ? 'scheduled' : 'draft',
      templateId: typeof b?.templateId === 'string' ? b.templateId : null,
      templateName: typeof b?.templateName === 'string' ? b.templateName : null,
      templateLocale: typeof b?.templateLocale === 'string' ? b.templateLocale : null,
      whatsappNumberId: typeof b?.whatsappNumberId === 'string' ? b.whatsappNumberId : null,
      segmentId: typeof b?.segmentId === 'string' ? b.segmentId : null,
      audienceFilter: (b?.audienceFilter ?? undefined) as never,
      triggerEvent,
      triggerKeyword: isTrigger && typeof b?.triggerKeyword === 'string' ? b.triggerKeyword.trim() : null,
      scheduledAt,
      createdByUserId: user.id,
    },
  });

  return NextResponse.json({ id: campaign.id });
}
