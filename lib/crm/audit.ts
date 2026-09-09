import { prisma } from '@/lib/db';

/**
 * Append an entry to the workspace audit trail (Team & Access -> Audit).
 * Best-effort: never throws into the caller.
 */
export async function audit(entry: {
  tenantId: string;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
}): Promise<void> {
  try {
    await prisma.crmAuditLog.create({
      data: {
        tenantId: entry.tenantId,
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        detail: entry.detail ?? null,
      },
    });
  } catch {
    // audit must never break the primary operation
  }
}
