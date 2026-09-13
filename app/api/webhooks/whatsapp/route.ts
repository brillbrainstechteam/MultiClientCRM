import { NextResponse } from 'next/server';
import { metaConfig } from '@/lib/meta/config';
import { prisma } from '@/lib/db';
import { ingestWebhookPayload } from '@/lib/whatsapp/ingest';

/**
 * WhatsApp webhook — ONE endpoint for all tenants.
 * GET  = Meta's verification handshake.
 * POST = inbound events (messages, statuses). Raw event is persisted first,
 *        then routed to the owning tenant by phone_number_id.
 *
 * Routing lives in lib/whatsapp/ingest so the diagnostics page can replay a
 * stored event and see the real error — this handler must always answer 200
 * (Meta retries aggressively on anything else), which hides failures.
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === metaConfig.webhookVerifyToken) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as any;

  try {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];

    // Always keep the raw event first (reliable, replayable).
    await prisma.webhookEvent.create({
      data: {
        phoneNumberId: change?.value?.metadata?.phone_number_id ?? null,
        wabaId: entry?.id ?? null,
        field: change?.field ?? null,
        payload: (payload ?? {}) as object,
      },
    });

    const result = await ingestWebhookPayload(payload);
    if (result.errors.length) {
      console.error('[whatsapp-webhook] routing errors', result.errors);
    }
  } catch (err) {
    console.error('[whatsapp-webhook] fatal', err);
  }

  return NextResponse.json({ received: true });
}
