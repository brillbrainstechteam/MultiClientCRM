import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { notify } from '@/lib/billing/notify';

/**
 * Triage actions on an intake event (Lead Capture docs §12/§14 quick actions):
 * assign, mark contacted (stops the first-response SLA), mark invalid, mark
 * reviewed. Assigning also sets the owner on the linked contact.
 */
const MANAGER_ROLES = ['owner', 'admin', 'manager'];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await ctx.params;

  const e = await prisma.crmIntakeEvent.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!e) return NextResponse.json({ error: 'Intake event not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { action?: string; userId?: string };
  const data: Record<string, unknown> = {};

  switch (b.action) {
    case 'assign': {
      if (!MANAGER_ROLES.includes(user.role) && b.userId !== user.id) {
        return NextResponse.json({ error: 'Only a manager can assign to someone else.' }, { status: 403 });
      }
      const userId = typeof b.userId === 'string' && b.userId ? b.userId : user.id;
      data.assignedUserId = userId;
      data.assignmentReason = 'MANUAL';
      data.status = 'routed';
      if (e.contactId) await prisma.crmContact.update({ where: { id: e.contactId }, data: { ownerId: userId } }).catch(() => undefined);
      await notify({ tenantId: user.tenantId, userId, category: 'lead', kind: 'lead_assigned', severity: 'info', title: 'Lead assigned to you', body: `${e.contactName ?? 'A lead'} via ${e.sourceName ?? e.sourceType}.`, data: { intakeEventId: e.id, contactId: e.contactId } });
      break;
    }
    case 'mark_contacted':
      data.firstResponseAt = new Date();
      data.status = 'contacted';
      break;
    case 'mark_invalid':
      data.status = 'closed_invalid';
      if (typeof b.userId === 'string') data.reviewReason = b.userId; // reuse field for reason text when provided
      break;
    case 'mark_reviewed':
      data.status = e.assignedUserId ? 'routed' : 'new';
      data.reviewReason = null;
      break;
    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const updated = await prisma.crmIntakeEvent.update({ where: { id }, data });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: `intake.${b.action}`, targetType: 'intake_event', targetId: id });
  return NextResponse.json({ ok: true, status: updated.status, assignedUserId: updated.assignedUserId });
}
