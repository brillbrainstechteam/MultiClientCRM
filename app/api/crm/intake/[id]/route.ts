import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/crm/audit';
import { notify } from '@/lib/billing/notify';
import { qualifiedSalesCandidates } from '@/lib/crm/routing';

/**
 * Triage actions on an intake event (Lead Capture §12/§14 + Marketing→Sales
 * handoff MKT-05/06/07/08): assign, mark contacted (stops the SLA), mark
 * invalid, mark reviewed, qualify (Marketing → Sales), not_interested (nurture).
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

    case 'qualify': {
      // Marketing marks an interested B2B lead Qualified → hand to Sales.
      if (!MANAGER_ROLES.includes(user.role) && e.assignedUserId !== user.id) {
        return NextResponse.json({ error: 'Only the lead’s marketing owner or a manager can qualify it.' }, { status: 403 });
      }
      const contact = e.contactId ? await prisma.crmContact.findFirst({ where: { id: e.contactId, tenantId: user.tenantId }, select: { id: true, city: true, state: true, name: true } }) : null;
      const candidates = await qualifiedSalesCandidates(user.tenantId, contact?.city ?? e.city, contact?.state ?? e.state);
      data.qualifiedAt = new Date();
      data.qualifiedByUserId = user.id;

      if (candidates.length === 1) {
        // MKT-05: exactly one eligible salesperson → auto-assign.
        const salesId = candidates[0];
        data.assignedUserId = salesId;
        data.assignmentReason = 'QUALIFIED_AUTO';
        data.status = 'routed';
        if (e.contactId) await prisma.crmContact.update({ where: { id: e.contactId }, data: { ownerId: salesId } }).catch(() => undefined);
        await notify({ tenantId: user.tenantId, userId: salesId, category: 'lead', kind: 'lead_assigned', severity: 'info', title: 'Qualified lead assigned', body: `${e.contactName ?? contact?.name ?? 'A lead'} was qualified and assigned to you.`, data: { intakeEventId: e.id, contactId: e.contactId } });
        if (e.assignedUserId && e.assignedUserId !== salesId) {
          await notify({ tenantId: user.tenantId, userId: e.assignedUserId, category: 'lead', kind: 'lead_qualified', severity: 'info', title: 'Lead handed to Sales', body: `${e.contactName ?? 'The lead'} you qualified is now with Sales.`, data: { intakeEventId: e.id, contactId: e.contactId } });
        }
      } else {
        // MKT-06: zero or several eligible → Pending Assignment for the Owner.
        data.status = 'pending_assignment';
        data.assignmentReason = 'QUALIFIED_PENDING';
        // MKT-07: tell the Owner/Manager pool and each eligible salesperson.
        await notify({ tenantId: user.tenantId, category: 'lead', kind: 'lead_pending_assignment', severity: 'warning', title: 'Qualified lead needs Sales assignment', body: `${e.contactName ?? contact?.name ?? 'A lead'} was qualified${candidates.length ? ` — ${candidates.length} eligible salespeople` : ' — no eligible salesperson yet'}.`, data: { intakeEventId: e.id, contactId: e.contactId }, dedupeKey: `qualify:${e.id}` });
        for (const sid of candidates) {
          await notify({ tenantId: user.tenantId, userId: sid, category: 'lead', kind: 'lead_pending_assignment', severity: 'info', title: 'A qualified lead may be assigned to you', body: `${e.contactName ?? contact?.name ?? 'A lead'} is awaiting Sales assignment.`, data: { intakeEventId: e.id, contactId: e.contactId } });
        }
      }
      break;
    }

    case 'not_interested':
      // MKT-08: stays with Marketing for follow-up / nurture (Communication Library).
      if (!MANAGER_ROLES.includes(user.role) && e.assignedUserId !== user.id) {
        return NextResponse.json({ error: 'Only the lead’s marketing owner or a manager can update it.' }, { status: 403 });
      }
      data.status = 'nurturing';
      break;

    default:
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const updated = await prisma.crmIntakeEvent.update({ where: { id }, data });
  await audit({ tenantId: user.tenantId, actorId: user.id, action: `intake.${b.action}`, targetType: 'intake_event', targetId: id });
  return NextResponse.json({ ok: true, status: updated.status, assignedUserId: updated.assignedUserId });
}
