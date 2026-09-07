import { NextResponse } from 'next/server';
import { metaConfig } from '@/lib/meta/config';
import { prisma } from '@/lib/db';

/**
 * WhatsApp webhook — ONE endpoint for all tenants.
 * GET  = Meta's verification handshake.
 * POST = inbound events (messages, statuses). Raw event is persisted first,
 *        then messages are routed to the owning tenant by phone_number_id and
 *        stored as Conversation + Message.
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
    const value = change?.value;
    const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;

    // Always keep the raw event (reliable, replayable).
    await prisma.webhookEvent.create({
      data: {
        phoneNumberId: phoneNumberId ?? null,
        wabaId: entry?.id ?? null,
        field: change?.field ?? null,
        payload: (payload ?? {}) as object,
      },
    });

    if (phoneNumberId) {
      // Which tenant owns this number?
      const account = await prisma.whatsAppAccount.findFirst({ where: { phoneNumberId } });
      const tenantId = account?.tenantId;

      if (tenantId) {
        // Names from the contacts block.
        const nameByWaId: Record<string, string> = {};
        for (const c of value?.contacts ?? []) {
          if (c?.wa_id) nameByWaId[c.wa_id] = c?.profile?.name ?? '';
        }

        // Inbound messages → upsert conversation + message.
        for (const m of value?.messages ?? []) {
          const from: string = m.from;
          const text: string = m.text?.body ?? `[${m.type ?? 'message'}]`;
          const at = m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date();

          const convo = await prisma.conversation.upsert({
            where: { tenantId_phoneNumberId_contactPhone: { tenantId, phoneNumberId, contactPhone: from } },
            update: { lastMessageAt: at, contactName: nameByWaId[from] || undefined },
            create: { tenantId, phoneNumberId, contactPhone: from, contactName: nameByWaId[from] || null, lastMessageAt: at },
          });

          // Keep a Contact record in sync (the Customer-360 source).
          await prisma.contact.upsert({
            where: { tenantId_phone: { tenantId, phone: from } },
            update: { lastMessageAt: at, name: nameByWaId[from] || undefined },
            create: { tenantId, phone: from, name: nameByWaId[from] || null, lastMessageAt: at },
          });

          await prisma.message
            .create({
              data: {
                conversationId: convo.id,
                waMessageId: m.id ?? null,
                direction: 'inbound',
                type: m.type ?? 'text',
                text,
                at,
              },
            })
            .catch(() => undefined); // ignore duplicate waMessageId on webhook retries
        }

        // Outbound delivery/read status updates.
        for (const s of value?.statuses ?? []) {
          if (s?.id && s?.status) {
            await prisma.message.updateMany({ where: { waMessageId: s.id }, data: { status: s.status } }).catch(() => undefined);
          }
        }
      }
    }
  } catch {
    // Never fail the webhook — Meta retries aggressively on non-200.
  }

  return NextResponse.json({ received: true });
}
