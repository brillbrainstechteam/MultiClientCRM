import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { markRead as metaMarkRead } from '@/lib/meta/messaging';
import { audit } from '@/lib/crm/audit';

/**
 * Update conversation state — status (open|pending|resolved), labels, spam flag,
 * and mark-read. All persisted; audited where it matters. Body may include any
 * subset of: { status, labels, isSpam, markRead, typing }.
 *
 * markRead also sends the WhatsApp read receipt (blue ticks) for the latest
 * inbound message; `typing` additionally shows a typing indicator.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;

  const convo = await prisma.conversation.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, status: true, phoneNumberId: true } });
  if (!convo) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as {
    status?: string; labels?: string[]; isSpam?: boolean; markRead?: boolean; typing?: boolean;
  };
  const data: Record<string, unknown> = {};
  if (typeof b.status === 'string' && ['open', 'pending', 'resolved'].includes(b.status)) data.status = b.status;
  if (Array.isArray(b.labels)) data.labels = b.labels.map(String).filter(Boolean);
  if (typeof b.isSpam === 'boolean') data.isSpam = b.isSpam;
  if (b.markRead) data.lastReadAt = new Date();

  // Send the WhatsApp read receipt (+ optional typing) for the latest inbound
  // message. Best-effort — never blocks the state update.
  if (b.markRead || b.typing) {
    try {
      const lastInbound = await prisma.message.findFirst({
        where: { conversationId: id, direction: 'inbound', waMessageId: { not: null } },
        orderBy: { at: 'desc' },
        select: { waMessageId: true },
      });
      const account = convo.phoneNumberId
        ? await prisma.whatsAppAccount.findFirst({ where: { tenantId: user.tenantId, phoneNumberId: convo.phoneNumberId }, orderBy: { connectedAt: 'desc' }, select: { phoneNumberId: true, accessToken: true } })
        : null;
      if (lastInbound?.waMessageId && account?.phoneNumberId && account.accessToken) {
        await metaMarkRead(account.phoneNumberId, decrypt(account.accessToken), lastInbound.waMessageId, { typing: Boolean(b.typing) });
      }
    } catch { /* read receipts never block the PATCH */ }
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

  await prisma.conversation.update({ where: { id }, data });

  if (data.status && data.status !== convo.status) {
    await audit({ tenantId: user.tenantId, actorId: user.id, action: 'conversation.status', targetType: 'conversation', targetId: id, detail: `${convo.status} -> ${data.status}` });
  }
  if (typeof data.isSpam === 'boolean') {
    await audit({ tenantId: user.tenantId, actorId: user.id, action: data.isSpam ? 'conversation.spam' : 'conversation.unspam', targetType: 'conversation', targetId: id });
  }
  return NextResponse.json({ ok: true });
}
