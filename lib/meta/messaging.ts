import { graphBase } from '@/lib/meta/config';

/**
 * Mark an inbound message as read (shows the customer the blue double-tick) and,
 * optionally, show a typing indicator. Both use the same Cloud API call:
 * POST /<PHONE_NUMBER_ID>/messages with status:"read". The typing indicator is
 * shown for up to 25s or until the business sends a message, and WhatsApp
 * requires it to be sent together with the read receipt.
 *
 * Best-effort: callers should not fail their own flow if this returns false.
 */
export async function markRead(
  phoneNumberId: string,
  token: string,
  messageId: string,
  opts: { typing?: boolean } = {},
): Promise<boolean> {
  try {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };
    if (opts.typing) payload.typing_indicator = { type: 'text' };

    const res = await fetch(`${graphBase()}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
