import { prisma } from '@/lib/db';
import { runInboundAutomations } from '@/lib/crm/automation';

/**
 * Routing for a WhatsApp webhook payload: resolve the owning tenant from the
 * phone_number_id, then persist inbound messages as Conversation + Message and
 * apply outbound status updates.
 *
 * Kept separate from the webhook route so the same code can be replayed over
 * stored WebhookEvent rows by the diagnostics page — the route deliberately
 * swallows errors (Meta retries hard on non-200), which makes a routing bug
 * invisible in production. Here failures are collected and returned.
 */

export interface IngestResult {
  phoneNumberId: string | null;
  tenantId: string | null;
  inboundSeen: number;
  statusesSeen: number;
  conversationsTouched: number;
  messagesStored: number;
  errors: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function ingestWebhookPayload(payload: any): Promise<IngestResult> {
  const result: IngestResult = {
    phoneNumberId: null,
    tenantId: null,
    inboundSeen: 0,
    statusesSeen: 0,
    conversationsTouched: 0,
    messagesStored: 0,
    errors: [],
  };

  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
  result.phoneNumberId = phoneNumberId ?? null;

  if (!phoneNumberId) {
    result.errors.push('Payload has no metadata.phone_number_id — nothing to route.');
    return result;
  }

  // A number can have several rows (re-connects create history). Always prefer
  // the live one, newest first, so events never land under a stale tenant.
  const account =
    (await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId, status: 'connected' },
      orderBy: { connectedAt: 'desc' },
    })) ??
    (await prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId },
      orderBy: { connectedAt: 'desc' },
    }));

  if (!account) {
    result.errors.push(`No WhatsAppAccount row owns phone_number_id ${phoneNumberId}.`);
    return result;
  }
  const tenantId = account.tenantId;
  result.tenantId = tenantId;

  const nameByWaId: Record<string, string> = {};
  for (const c of value?.contacts ?? []) {
    if (c?.wa_id) nameByWaId[c.wa_id] = c?.profile?.name ?? '';
  }

  for (const m of value?.messages ?? []) {
    result.inboundSeen += 1;
    try {
      const from: string = m.from;
      const text: string = m.text?.body ?? `[${m.type ?? 'message'}]`;
      const at = m.timestamp ? new Date(Number(m.timestamp) * 1000) : new Date();

      const convo = await prisma.conversation.upsert({
        where: { tenantId_phoneNumberId_contactPhone: { tenantId, phoneNumberId, contactPhone: from } },
        update: { lastMessageAt: at, contactName: nameByWaId[from] || undefined },
        create: { tenantId, phoneNumberId, contactPhone: from, contactName: nameByWaId[from] || null, lastMessageAt: at },
      });
      result.conversationsTouched += 1;

      await prisma.contact.upsert({
        where: { tenantId_phone: { tenantId, phone: from } },
        update: { lastMessageAt: at, name: nameByWaId[from] || undefined },
        create: { tenantId, phone: from, name: nameByWaId[from] || null, lastMessageAt: at },
      });

      const existing = m.id ? await prisma.message.findUnique({ where: { waMessageId: m.id } }) : null;
      if (!existing) {
        await prisma.message.create({
          data: {
            conversationId: convo.id,
            waMessageId: m.id ?? null,
            direction: 'inbound',
            type: m.type ?? 'text',
            text,
            at,
          },
        });
        result.messagesStored += 1;
      }

      const inboundCount = await prisma.message.count({ where: { conversationId: convo.id, direction: 'inbound' } });
      await runInboundAutomations({
        tenantId,
        phoneNumberId,
        from,
        text,
        isFirstMessage: inboundCount <= 1,
        accessToken: account.accessToken ?? null,
      }).catch((e) => result.errors.push(`Automation: ${e instanceof Error ? e.message : String(e)}`));
    } catch (e) {
      result.errors.push(`Message ${m?.id ?? '?'}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const s of value?.statuses ?? []) {
    result.statusesSeen += 1;
    if (s?.id && s?.status) {
      try {
        await prisma.message.updateMany({ where: { waMessageId: s.id }, data: { status: s.status } });
      } catch (e) {
        result.errors.push(`Status ${s.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return result;
}
