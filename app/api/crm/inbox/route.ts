import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { conversationScopeWhere } from '@/lib/crm/scope';

const digits = (s: string) => (s ?? '').replace(/\D/g, '');
// Match on the last 10 digits so a contact saved as "98…" still links to the
// WhatsApp conversation from "9198…" (country code present or not).
const matchKey = (s: string) => digits(s).slice(-10);

/**
 * Inbox hydration for the embedded CRM. Returns the tenant's real conversations
 * + messages, with each conversation linked to its CrmContact (by mobile) and to
 * the workspace WhatsApp number id (the WhatsAppAccount id, matching bootstrap).
 * The prototype maps these into its InboxConversation/InboxMessage shapes.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  // Strict per-role visibility: agents/managers see only conversations assigned
  // within their scope; owner/admin see all.
  const vScope = await conversationScopeWhere(user);
  const [accounts, conversations, crmContacts, favourites, missedCalls] = await Promise.all([
    prisma.whatsAppAccount.findMany({ where: { tenantId }, orderBy: { connectedAt: 'desc' } }),
    prisma.conversation.findMany({
      where: { tenantId, ...vScope },
      orderBy: { lastMessageAt: 'desc' },
      include: { messages: { orderBy: { at: 'asc' } }, notes: { orderBy: { createdAt: 'asc' } } },
      take: 200,
    }),
    // Lead state and ad attribution live on the contact, and the inbox needs
    // both to answer "show me new leads" and "show me leads from ads".
    prisma.crmContact.findMany({
      where: { tenantId },
      select: {
        id: true, mobile: true, leadStatus: true, lifecycleStage: true,
        salesTier: true, adSourceId: true,
      },
    }),
    // Starring is per person.
    prisma.conversationFavourite.findMany({
      where: { tenantId, userId: user.id },
      select: { conversationId: true },
    }),
    // A missed call is a real event from the Calling module, not a guess.
    prisma.crmCallLog.findMany({
      where: { tenantId, status: { in: ['no_answer', 'busy', 'failed'] } },
      select: { mobile: true },
    }),
  ]);

  const favouriteIds = new Set(favourites.map((f) => f.conversationId));
  const missedByDigits = new Set(missedCalls.map((c) => matchKey(c.mobile)).filter(Boolean));

  // phoneNumberId -> workspace number id (WhatsAppAccount.id, as bootstrap uses).
  const numberByPhoneId = new Map(accounts.filter((a) => a.phoneNumberId).map((a) => [a.phoneNumberId!, a.id]));
  const connected = accounts.find((a) => a.status === 'connected');
  const fallbackNumberId = connected?.id ?? accounts[0]?.id ?? '';

  // normalised mobile (last 10 digits) -> the contact, so the inbox can answer
  // questions about the customer and not just the thread.
  const crmByDigits = new Map(
    crmContacts.filter((c) => matchKey(c.mobile)).map((c) => [matchKey(c.mobile), c]),
  );

  const mapped = conversations.map((c) => {
    const d = digits(c.contactPhone);
    const contact = crmByDigits.get(matchKey(d)) ?? null;
    // A campaign reply is a thread we messaged from a campaign that the
    // customer then answered — not merely one a campaign touched.
    const campaignAt = c.messages.find((m) => m.source === 'campaign')?.at ?? null;
    const isCampaignReply = !!campaignAt
      && c.messages.some((m) => m.direction === 'inbound' && !m.isHistorical && m.at > campaignAt);
    // An ad lead is attributed on the contact (first touch) or visible on the
    // message that opened the thread.
    const isAdLead = !!contact?.adSourceId || c.messages.some((m) => m.referral !== null);
    // The 24-hour service window is anchored on LIVE customer messages only.
    // Backfilled history must never open it: Meta is explicit that Business-app
    // and historical messages do not create or extend the Cloud API window, and
    // a day-old imported message would otherwise show the window as open and
    // get the agent's free-form reply rejected.
    const lastInbound = [...c.messages]
      .reverse()
      .find((m) => m.direction === 'inbound' && !m.isHistorical);
    // Imported history is not unread work — the owner already saw it on their phone.
    const unread = c.messages.filter(
      (m) => m.direction === 'inbound' && !m.isHistorical && (!c.lastReadAt || m.at > c.lastReadAt),
    ).length;
    return {
      id: c.id,
      whatsappNumberId: numberByPhoneId.get(c.phoneNumberId) ?? fallbackNumberId,
      contactId: contact?.id ?? null,
      rawMobile: c.contactPhone ? `+${c.contactPhone}` : null,
      contactName: c.contactName ?? null,
      status: c.status,
      isHistorical: c.isHistorical,
      isBlocked: c.isBlocked,
      isFavourite: favouriteIds.has(c.id),
      // Real SLA input: when the oldest unanswered message arrived. This was
      // hardcoded to "ok" in the UI, so Overdue and SLA Breached matched nothing.
      awaitingSince: c.awaitingSince?.toISOString() ?? null,
      lastAgentReplyAt: c.lastAgentReplyAt?.toISOString() ?? null,
      leadStatus: contact?.leadStatus ?? null,
      lifecycleStage: contact?.lifecycleStage ?? null,
      salesTier: contact?.salesTier ?? null,
      isCampaignReply,
      isAdLead,
      hasMissedCall: missedByDigits.has(matchKey(d)),
      historyFrom: c.historyFrom ? c.historyFrom.toISOString() : null,
      assigneeUserId: c.assigneeUserId ?? null,
      labels: c.labels ?? [],
      isSpam: c.isSpam,
      unread,
      firstMessageAt: (c.messages[0]?.at ?? c.createdAt).toISOString?.() ?? String(c.messages[0]?.at ?? c.createdAt),
      lastMessageAt: c.lastMessageAt.toISOString(),
      lastInboundAt: lastInbound ? lastInbound.at.toISOString() : null,
      messages: c.messages.map((m) => ({
        id: m.id,
        waMessageId: m.waMessageId ?? null,
        direction: m.direction,
        type: m.type,
        text: m.text ?? '',
        status: m.status ?? null,
        // Where it came from, so the thread can show "sent from phone" or
        // "imported" rather than leaving an agent guessing.
        source: m.source,
        isHistorical: m.isHistorical,
        mediaUnavailable: m.mediaUnavailable,
        // Our stored copy, served from /api/crm/files/<id>. Null means the
        // attachment could not be fetched before Meta expired it.
        mediaFileId: m.mediaFileId,
        latitude: m.latitude,
        longitude: m.longitude,
        replyToWaId: m.replyToWaId,
        deliveredAt: m.deliveredAt?.toISOString() ?? null,
        readAt: m.readAt?.toISOString() ?? null,
        failedAt: m.failedAt?.toISOString() ?? null,
        failureCode: m.failureCode,
        failureReason: m.failureReason,
        at: m.at.toISOString(),
      })),
      notes: c.notes.map((n) => ({ id: n.id, text: n.text, authorUserId: n.authorUserId, createdAt: n.createdAt.toISOString() })),
    };
  });

  return NextResponse.json({
    connected: Boolean(connected),
    numberId: fallbackNumberId,
    conversations: mapped,
  });
}
