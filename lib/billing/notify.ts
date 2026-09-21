import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { NotificationEvent } from '@prisma/client';

/**
 * Notification feed (§38). Thin wrapper so services emit consistent events;
 * the customer UI + (later) push read from NotificationEvent.
 */

export type NotifyCategory = 'subscription' | 'wallet' | 'campaign' | 'whatsapp';
export type NotifySeverity = 'info' | 'warning' | 'critical';

export interface NotifyInput {
  tenantId: string;
  category: NotifyCategory;
  kind: string;
  title: string;
  body?: string;
  severity?: NotifySeverity;
  data?: Record<string, unknown>;
  /** When set, skip if an unread event with the same (kind, dedupeKey) exists. */
  dedupeKey?: string;
}

export async function notify(input: NotifyInput): Promise<NotificationEvent | null> {
  if (input.dedupeKey) {
    const existing = await prisma.notificationEvent.findFirst({
      where: { tenantId: input.tenantId, kind: input.kind, readAt: null, data: { path: ['dedupeKey'], equals: input.dedupeKey } },
    });
    if (existing) return null;
  }
  return prisma.notificationEvent.create({
    data: {
      tenantId: input.tenantId,
      category: input.category,
      kind: input.kind,
      severity: input.severity ?? 'info',
      title: input.title,
      body: input.body,
      data: (input.dedupeKey
        ? { ...(input.data ?? {}), dedupeKey: input.dedupeKey }
        : (input.data ?? undefined)) as Prisma.InputJsonValue | undefined,
    },
  });
}
