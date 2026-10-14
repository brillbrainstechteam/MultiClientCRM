import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { contactScopeClause } from '@/lib/crm/scope';
import { propagateContactOwner } from '@/lib/crm/assignment';
import { recordConsent } from '@/lib/crm/consent';
import { audit } from '@/lib/crm/audit';

type Body = {
  ids?: unknown;
  op?: unknown;
  ownerId?: unknown;
  /** Second named slot; null clears it. */
  marketingOwnerId?: unknown;
  stage?: unknown;
  consent?: unknown;
  consentChannel?: unknown;
  consentWording?: unknown;
  consentSource?: unknown;
  tags?: unknown;
  tagMode?: unknown; // 'add' | 'remove'
};

/** Ops that change who the contact belongs to, or remove it outright. */
const PRIVILEGED_OPS = new Set(['assign', 'assignMarketing', 'delete']);

/**
 * Bulk operations on a tenant's contacts: assign (sales owner),
 * assignMarketing (marketing owner), stage, consent, tags (add/remove), delete.
 *
 * Two guards that were previously missing:
 *
 *  - **Row scope.** The filter was `tenantId` only, so an agent who knew an id
 *    could reassign, re-stage or delete any contact in the business. Writes are
 *    now intersected with the caller's visibility, and the response reports how
 *    many ids were skipped so a partial write is never silent.
 *  - **Reassignment is not an agent's job.** Changing ownership or deleting
 *    records is owner/admin/manager, matching conversation reassignment.
 *
 * Consent is deliberately *not* written as a column here — it goes through
 * recordConsent so the ledger entry (channel, wording, actor) is always created
 * with it. A consent value with no evidence behind it is worse than none.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const b = (await req.json().catch(() => null)) as Body | null;
  const ids = Array.isArray(b?.ids) ? (b!.ids as unknown[]).map(String).filter(Boolean) : [];
  const op = typeof b?.op === 'string' ? b.op : '';
  if (ids.length === 0 || !op) {
    return NextResponse.json({ error: 'ids and op are required.' }, { status: 400 });
  }
  if (PRIVILEGED_OPS.has(op) && !['owner', 'admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Your role cannot reassign or delete contacts.' }, { status: 403 });
  }

  // Resolve the ids the caller may actually act on, then work only on those.
  const scopeClause = await contactScopeClause(user);
  const allowed = await prisma.crmContact.findMany({
    where: { tenantId, id: { in: ids }, ...(scopeClause ? { AND: [scopeClause] } : {}) },
    select: { id: true, mobile: true, ownerId: true },
  });
  if (allowed.length === 0) {
    return NextResponse.json({ error: 'None of those contacts are assigned to you.' }, { status: 403 });
  }
  const allowedIds = allowed.map((c) => c.id);
  const skipped = ids.length - allowedIds.length;
  const where = { id: { in: allowedIds }, tenantId };
  const done = (affected: number) => NextResponse.json({ ok: true, affected, skipped });

  // A member must belong to this tenant before they can be handed contacts.
  const resolveMember = async (value: unknown): Promise<string | null | 'invalid'> => {
    if (value === null) return null;
    if (typeof value !== 'string' || !value) return 'invalid';
    const m = await prisma.user.findFirst({ where: { id: value, tenantId }, select: { id: true, status: true } });
    if (!m || m.status !== 'active') return 'invalid';
    return m.id;
  };

  try {
    if (op === 'assign') {
      const ownerId = await resolveMember(b?.ownerId);
      if (ownerId === 'invalid' || ownerId === null) {
        return NextResponse.json({ error: 'Choose an active team member to own these contacts.' }, { status: 400 });
      }
      const r = await prisma.crmContact.updateMany({ where, data: { ownerId, lastActivityAt: new Date() } });
      // The sales owner also answers the chat, so the open conversations move
      // with the contact — that is the link that was missing between the two.
      const moved = await propagateContactOwner({ tenantId, contacts: allowed, newOwnerId: ownerId, actorId: user.id });
      await audit({
        tenantId, actorId: user.id, action: 'contact.assigned', targetType: 'contact',
        detail: `${r.count} contact(s) -> ${ownerId}; ${moved} conversation(s) followed`,
      });
      return NextResponse.json({ ok: true, affected: r.count, skipped, conversationsMoved: moved });
    }

    if (op === 'assignMarketing') {
      const marketingOwnerId = await resolveMember(b?.marketingOwnerId);
      if (marketingOwnerId === 'invalid') {
        return NextResponse.json({ error: 'Choose an active team member, or clear the marketing owner.' }, { status: 400 });
      }
      const r = await prisma.crmContact.updateMany({ where, data: { marketingOwnerId, lastActivityAt: new Date() } });
      await audit({
        tenantId, actorId: user.id, action: 'contact.assignedMarketing', targetType: 'contact',
        detail: `${r.count} contact(s) -> ${marketingOwnerId ?? 'cleared'}`,
      });
      return done(r.count);
    }

    if (op === 'stage' && typeof b?.stage === 'string') {
      const r = await prisma.crmContact.updateMany({ where, data: { stage: b.stage, lastActivityAt: new Date() } });
      return done(r.count);
    }

    if (op === 'consent' && typeof b?.consent === 'string') {
      // Mirrors /api/crm/consent/record: a decision always carries its proof.
      const decision = b.consent === 'opted-in' ? 'in' : b.consent === 'opted-out' ? 'out' : null;
      if (!decision) {
        return NextResponse.json({ error: 'Consent must be opted-in or opted-out.' }, { status: 400 });
      }
      const channel = typeof b.consentChannel === 'string' ? b.consentChannel : 'manual';
      const wording = typeof b.consentWording === 'string' ? b.consentWording.trim() : '';
      if (decision === 'in' && wording.length < 10) {
        return NextResponse.json(
          { error: 'Record what these customers agreed to — an opt-in without its wording is not proof.' },
          { status: 400 },
        );
      }
      for (const c of allowed) {
        await recordConsent({
          tenantId,
          contactId: c.id,
          mobile: c.mobile,
          decision,
          channel: channel as 'call' | 'in_store' | 'web_form' | 'import' | 'manual',
          wording: wording || null,
          source: typeof b.consentSource === 'string' ? b.consentSource : null,
          actorId: user.id,
        });
      }
      return done(allowed.length);
    }

    if (op === 'delete') {
      const r = await prisma.crmContact.deleteMany({ where });
      await audit({
        tenantId, actorId: user.id, action: 'contact.deleted', targetType: 'contact',
        detail: `${r.count} contact(s) deleted in bulk`,
      });
      return done(r.count);
    }

    if (op === 'tags' && Array.isArray(b?.tags)) {
      // Array merge per row can't be expressed in updateMany, so update each.
      const tags = (b!.tags as unknown[]).map(String);
      const mode = b?.tagMode === 'remove' ? 'remove' : 'add';
      const rows = await prisma.crmContact.findMany({ where, select: { id: true, tags: true } });
      await prisma.$transaction(rows.map((row) => {
        const set = new Set(row.tags);
        for (const t of tags) { if (mode === 'add') set.add(t); else set.delete(t); }
        return prisma.crmContact.update({ where: { id: row.id }, data: { tags: [...set], lastActivityAt: new Date() } });
      }));
      return done(rows.length);
    }

    return NextResponse.json({ error: 'Unknown or malformed op.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Bulk operation failed.' },
      { status: 400 },
    );
  }
}
