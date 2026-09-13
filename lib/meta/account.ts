import { prisma } from '@/lib/db';

/**
 * Connection state repair for a tenant's WhatsApp account.
 *
 * A client can revoke our Business Integration on Facebook at any time. Meta
 * does not tell us, so the row keeps saying "connected" while every Graph call
 * fails — and the app happily sends the user to a dashboard that cannot load
 * anything. Whenever a Graph call comes back with an auth error we flip the
 * row, which puts the user back through Embedded Signup on next sign-in.
 */

export interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

/** True when Meta is rejecting the token itself, rather than the request. */
export function isAuthError(body: GraphErrorBody | undefined): boolean {
  const err = body?.error;
  if (!err) return false;
  // 190 expired/invalid, 102 session, 10 + 200-299 permission errors.
  if (err.code === 190 || err.code === 102 || err.code === 10) return true;
  if (typeof err.code === 'number' && err.code >= 200 && err.code < 300) return true;
  return err.type === 'OAuthException';
}

/**
 * Mark the account as needing a reconnect. The token is cleared so a stale
 * secret is not left at rest once we know it is worthless.
 */
export async function markTokenInvalid(accountId: string, reason: string): Promise<void> {
  await prisma.whatsAppAccount
    .update({
      where: { id: accountId },
      data: { status: 'reconnect_required', accessToken: null, statusReason: reason.slice(0, 300) },
    })
    .catch(() => undefined);
}
