import { encrypt, decrypt } from '@/lib/crypto';

/**
 * A verified identity (Google email or OTP-verified phone) awaiting the Business
 * Details step of signup. Stored in a short-lived, encrypted (tamper-proof)
 * cookie so the details form can trust who it is creating the account for — the
 * user can't forge the email/phone.
 */
export interface PendingSignup {
  provider: 'google' | 'otp';
  email?: string;
  phone?: string; // digits-only E.164 (phoneKey form)
  at: number;
}

export const PENDING_COOKIE = 'pending_signup';
const MAX_AGE_MS = 15 * 60 * 1000;

export function encodePending(p: Omit<PendingSignup, 'at'>): string {
  return encrypt(JSON.stringify({ ...p, at: Date.now() }));
}

export function decodePending(token: string | undefined | null): PendingSignup | null {
  if (!token) return null;
  try {
    const p = JSON.parse(decrypt(token)) as PendingSignup;
    if (!p || (p.provider !== 'google' && p.provider !== 'otp')) return null;
    if (!p.at || Date.now() - p.at > MAX_AGE_MS) return null;
    if (!p.email && !p.phone) return null;
    return p;
  } catch {
    return null;
  }
}

export const pendingCookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 900,
};
