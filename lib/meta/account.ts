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
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
  };
}

/**
 * True only when Meta is rejecting the token itself — 190 (invalid, expired or
 * revoked) and 102 (session). Permission errors (10, 200–299) and invalid
 * parameters (100, which Meta also types as OAuthException — e.g. a template
 * that fails validation) arrive on a perfectly good token, so treating them as
 * fatal would wipe a healthy connection over one bad request.
 */
export function isAuthError(body: GraphErrorBody | undefined): boolean {
  const code = body?.error?.code;
  return code === 190 || code === 102;
}

/** Readable Graph error, preferring the user-facing text Meta provides. */
export function graphErrorMessage(body: GraphErrorBody | undefined, fallback: string): string {
  const err = body?.error;
  if (!err) return fallback;
  if (err.error_user_msg) return err.error_user_title ? `${err.error_user_title}: ${err.error_user_msg}` : err.error_user_msg;
  return err.message ?? fallback;
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
