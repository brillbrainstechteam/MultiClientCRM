import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { putFile } from '@/lib/storage';
import { checkLimit, checkStorage } from '@/lib/billing/limits';
import { uploadMediaForSend, sendTypeFor, MAX_MEDIA_BYTES } from '@/lib/whatsapp/media';

/**
 * Send a photo, video or document to a customer.
 *
 * Body: { to, fileBase64, mimeType, fileName, caption?, contextMessageId? }
 *
 * Two steps, because our files are not publicly reachable and the `link` form
 * of a media message needs a URL Meta can fetch: the bytes go to Meta, and the
 * id that comes back is what gets sent. We keep our own copy too, so the thread
 * can render the attachment without going back to Meta — whose media expires in
 * about two weeks.
 *
 * Media only goes out inside the 24-hour customer service window. Outside it,
 * WhatsApp accepts nothing but an approved template, and Meta returns an error
 * that is passed straight through rather than dressed up.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    to?: string; fileBase64?: string; mimeType?: string; fileName?: string;
    caption?: string; contextMessageId?: string;
  } | null;

  const to = body?.to?.replace(/\D/g, '');
  const base64 = typeof body?.fileBase64 === 'string' ? body.fileBase64 : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : '';
  const fileName = (body?.fileName || 'attachment').slice(0, 180);
  const caption = body?.caption?.trim() || '';

  if (!to) return NextResponse.json({ error: 'Provide a recipient.' }, { status: 400 });
  if (!base64 || !mimeType) return NextResponse.json({ error: 'Attach a file to send.' }, { status: 400 });

  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
  if (bytes.length > MAX_MEDIA_BYTES) {
    return NextResponse.json(
      { error: `Attachments are limited to ${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)}MB.` },
      { status: 400 },
    );
  }

  // A send counts against the plan's monthly message allowance, and our copy
  // counts against its storage.
  const allowance = await checkLimit(user.tenantId, 'messages');
  if (!allowance.allowed) return NextResponse.json({ error: allowance.reason, code: 'plan_limit' }, { status: 402 });
  const room = await checkStorage(user.tenantId, bytes.length);
  if (!room.allowed) return NextResponse.json({ error: room.reason, code: 'plan_limit' }, { status: 402 });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.phoneNumberId || !account.accessToken) {
    return NextResponse.json({ error: 'No connected WhatsApp number.' }, { status: 400 });
  }
  const token = decrypt(account.accessToken);

  const uploaded = await uploadMediaForSend({
    phoneNumberId: account.phoneNumberId, token, bytes, mimeType, fileName,
  });
  if (!uploaded.ok) return NextResponse.json({ error: uploaded.error }, { status: 502 });

  const sendType = sendTypeFor(mimeType);
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: sendType,
    [sendType]: {
      id: uploaded.mediaId,
      // Only documents carry a filename; a caption is not allowed on audio.
      ...(sendType === 'document' ? { filename: fileName } : {}),
      ...(caption && sendType !== 'audio' ? { caption } : {}),
    },
    ...(body?.contextMessageId ? { context: { message_id: body.contextMessageId } } : {}),
  };

  const res = await fetch(`${graphBase()}/${account.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>; error?: { message?: string };
  };
  if (!res.ok) {
    return NextResponse.json({ error: json.error?.message ?? 'Send failed.' }, { status: 502 });
  }
  const waMessageId = json.messages?.[0]?.id ?? null;

  // Keep our own copy so the thread renders without asking Meta, whose media
  // expires after roughly two weeks.
  let mediaFileId: string | null = null;
  try {
    const key = `tenants/${user.tenantId}/whatsapp/out-${uploaded.mediaId}`;
    const driver = await putFile(key, bytes, mimeType);
    const file = await prisma.crmFile.create({
      data: {
        tenantId: user.tenantId, kind: 'whatsapp', driver, storageKey: key,
        fileName, mimeType, size: bytes.length, uploadedById: user.id,
      },
      select: { id: true },
    });
    mediaFileId = file.id;
  } catch {
    // The customer has the file; our copy is a convenience.
  }

  const convo = await prisma.conversation.upsert({
    where: {
      tenantId_phoneNumberId_contactPhone: {
        tenantId: user.tenantId, phoneNumberId: account.phoneNumberId, contactPhone: to,
      },
    },
    // Replying clears the waiting state that the SLA views read.
    update: { lastMessageAt: new Date(), awaitingSince: null, lastAgentReplyAt: new Date() },
    create: {
      tenantId: user.tenantId, phoneNumberId: account.phoneNumberId,
      contactPhone: to, lastMessageAt: new Date(),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: convo.id,
      waMessageId,
      direction: 'outbound',
      type: sendType,
      text: caption || fileName,
      status: 'sent',
      source: 'crm_agent',
      mediaFileId,
      mediaId: uploaded.mediaId,
      replyToWaId: body?.contextMessageId ?? null,
    },
  });

  return NextResponse.json({ ok: true, waMessageId, mediaFileId });
}
