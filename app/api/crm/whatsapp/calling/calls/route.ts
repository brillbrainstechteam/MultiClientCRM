import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { audit } from '@/lib/crm/audit';
import { startCall, actOnCall } from '@/lib/meta/calling-api';
import { checkCallGate, isLive } from '@/lib/whatsapp/calling';

/**
 * WhatsApp call signalling (Part 2 doc §5.2, §5.3).
 *
 * GET  — the call log for a contact or the whole workspace.
 * POST — start a call, or act on one that is already ringing.
 *
 * The SDP itself is produced by the agent's browser (WebRTC) and passed
 * through; the server never touches media. What the server does own is the
 * permission gate, the audit trail, and the record of what happened.
 */

async function account(tenantId: string, phoneNumberId?: string | null) {
  return prisma.whatsAppAccount.findFirst({
    where: phoneNumberId ? { tenantId, phoneNumberId } : { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
    select: { phoneNumberId: true, accessToken: true },
  });
}

function serialize(c: {
  id: string; waCallId: string; contactPhone: string; contactId: string | null;
  conversationId: string | null; direction: string; status: string;
  ringingAt: Date; connectedAt: Date | null; endedAt: Date | null;
  durationSec: number | null; source: string; sourcePayload: string | null;
  terminateReason: string | null; errorMessage: string | null;
  assigneeUserId: string | null; answeredByUserId: string | null;
  recordingStatus: string | null; recordingFileId: string | null;
  transcriptStatus: string | null; aiSummary: string | null;
}) {
  return {
    id: c.id,
    waCallId: c.waCallId,
    phone: c.contactPhone,
    contactId: c.contactId,
    conversationId: c.conversationId,
    direction: c.direction,
    status: c.status,
    ringingAt: c.ringingAt.toISOString(),
    connectedAt: c.connectedAt?.toISOString() ?? null,
    endedAt: c.endedAt?.toISOString() ?? null,
    durationSec: c.durationSec,
    source: c.source,
    sourcePayload: c.sourcePayload,
    outcome: c.terminateReason,
    error: c.errorMessage,
    assigneeUserId: c.assigneeUserId,
    answeredByUserId: c.answeredByUserId,
    recordingStatus: c.recordingStatus,
    recordingFileId: c.recordingFileId,
    transcriptStatus: c.transcriptStatus,
    summary: c.aiSummary,
  };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const url = new URL(req.url);
  const phone = (url.searchParams.get('phone') ?? '').replace(/[^\d]/g, '');
  const conversationId = url.searchParams.get('conversationId');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200);

  const calls = await prisma.whatsAppCall.findMany({
    where: {
      tenantId: user.tenantId,
      ...(phone ? { contactPhone: phone } : {}),
      ...(conversationId ? { conversationId } : {}),
    },
    orderBy: { ringingAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ calls: calls.map(serialize) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as {
    action?: string;
    phone?: string;
    callId?: string;         // our row id, or Meta's wacid
    phoneNumberId?: string;
    sdp?: string;
    sdpType?: 'offer' | 'answer';
  } | null;
  if (!b?.action) return NextResponse.json({ error: 'An action is required.' }, { status: 400 });

  const acc = await account(user.tenantId, b.phoneNumberId);
  if (!acc?.phoneNumberId || !acc.accessToken) {
    return NextResponse.json({ error: 'Connect a WhatsApp number first.' }, { status: 409 });
  }
  const token = decrypt(acc.accessToken);

  // ---- Start a call --------------------------------------------------------
  if (b.action === 'connect') {
    const contactPhone = (b.phone ?? '').replace(/[^\d]/g, '');
    if (!contactPhone) return NextResponse.json({ error: 'A customer number is required.' }, { status: 400 });
    if (!b.sdp) return NextResponse.json({ error: 'The browser did not provide an audio offer.' }, { status: 400 });

    // Permission is re-checked against Meta here, not read from our cache: a
    // customer can revoke at any moment, and four unanswered calls revoke it
    // automatically. Calling without the check means an error code instead of
    // a sentence.
    const gate = await checkCallGate({
      tenantId: user.tenantId,
      phoneNumberId: acc.phoneNumberId,
      token,
      contactPhone,
    });
    if (!gate.canCall) {
      return NextResponse.json(
        { error: gate.message, canRequestPermission: gate.canRequestPermission },
        { status: 403 },
      );
    }

    const r = await startCall(acc.phoneNumberId, token, contactPhone, {
      sdp_type: b.sdpType ?? 'offer',
      sdp: b.sdp,
    });
    if (!r.ok) return NextResponse.json({ error: r.error ?? 'The call could not be placed.' }, { status: 502 });

    const waCallId = r.data?.calls?.[0]?.id;
    if (!waCallId) {
      return NextResponse.json({ error: 'WhatsApp accepted the call but returned no call id.' }, { status: 502 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        tenantId_phoneNumberId_contactPhone: {
          tenantId: user.tenantId, phoneNumberId: acc.phoneNumberId, contactPhone,
        },
      },
      select: { id: true },
    });

    const call = await prisma.whatsAppCall.upsert({
      where: { waCallId },
      update: { assigneeUserId: user.id },
      create: {
        tenantId: user.tenantId,
        phoneNumberId: acc.phoneNumberId,
        waCallId,
        contactPhone,
        conversationId: conversation?.id ?? null,
        direction: 'business_initiated',
        status: 'ringing',
        assigneeUserId: user.id,
        source: 'crm',
      },
    });
    await prisma.whatsAppCallEvent.create({
      data: { callId: call.id, origin: 'outbound', kind: 'connect', payload: { by: user.id } },
    });
    await audit({
      tenantId: user.tenantId, actorId: user.id, action: 'whatsapp.calling.call_started',
      targetType: 'contact', targetId: contactPhone, detail: waCallId,
    });

    return NextResponse.json({ call: serialize(call) });
  }

  // ---- Act on an existing call --------------------------------------------
  const action = b.action as 'pre_accept' | 'accept' | 'reject' | 'terminate';
  if (!['pre_accept', 'accept', 'reject', 'terminate'].includes(action)) {
    return NextResponse.json({ error: `Unknown action "${b.action}".` }, { status: 400 });
  }
  if (!b.callId) return NextResponse.json({ error: 'A call id is required.' }, { status: 400 });

  const call = await prisma.whatsAppCall.findFirst({
    where: {
      tenantId: user.tenantId,
      OR: [{ id: b.callId }, { waCallId: b.callId }],
    },
  });
  if (!call) return NextResponse.json({ error: 'That call is not on record.' }, { status: 404 });
  if (!isLive(call.status)) {
    return NextResponse.json({ error: `That call has already ${call.status === 'missed' ? 'been missed' : 'ended'}.` }, { status: 409 });
  }

  const r = await actOnCall(
    acc.phoneNumberId, token, call.waCallId, action,
    b.sdp ? { sdp_type: b.sdpType ?? 'answer', sdp: b.sdp } : undefined,
  );
  if (!r.ok) return NextResponse.json({ error: r.error ?? `The ${action} failed.` }, { status: 502 });

  const now = new Date();
  // Only the terminate webhook can say a call truly ended, with Meta's own
  // duration. What we set here is what we know from our side of the wire.
  const patch =
    action === 'pre_accept' ? { status: 'pre_accepted' as const }
    : action === 'accept' ? { status: 'connected' as const, acceptedAt: now, connectedAt: now, answeredByUserId: user.id }
    : action === 'reject' ? { status: 'rejected' as const, endedAt: now }
    : { status: 'ended' as const, endedAt: now };

  const updated = await prisma.whatsAppCall.update({ where: { id: call.id }, data: patch });
  await prisma.whatsAppCallEvent.create({
    data: { callId: call.id, origin: 'outbound', kind: action, payload: { by: user.id } },
  });

  return NextResponse.json({ call: serialize(updated) });
}
