/**
 * Message Central (VerifyNow) OTP integration — SMS OTP for passwordless login.
 *
 * Env:
 *   MESSAGE_CENTRAL_CUSTOMER_ID  your customer id (console home)
 *   MESSAGE_CENTRAL_EMAIL        your account login email
 *   MESSAGE_CENTRAL_PASSWORD     Base64 of your account password (used AS-IS as
 *                                the `key` on the token endpoint)
 *
 * The 24h authToken is minted here and cached in-process, then sent as the
 * `authToken` header on send/validate. On the default (no-DLT) route the OTP
 * message + sender are Message Central's pre-approved template.
 */
const BASE = 'https://cpaas.messagecentral.com';
const CUSTOMER_ID = process.env.MESSAGE_CENTRAL_CUSTOMER_ID ?? '';
const EMAIL = process.env.MESSAGE_CENTRAL_EMAIL ?? '';
const KEY = process.env.MESSAGE_CENTRAL_PASSWORD ?? ''; // Base64 of the password

export function messageCentralConfigured(): boolean {
  return Boolean(CUSTOMER_ID && EMAIL && KEY);
}

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const qp = new URLSearchParams({ customerId: CUSTOMER_ID, key: KEY, scope: 'NEW', country: '91', email: EMAIL });
  const res = await fetch(`${BASE}/auth/v1/authentication/token?${qp.toString()}`, { headers: { accept: 'application/json' } });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const token = (b.token ?? b.authToken ?? (b.data as Record<string, unknown> | undefined)?.token) as string | undefined;
  if (!token) throw new Error(String(b.message ?? b.error ?? 'Could not authenticate with the OTP provider.'));
  cached = { token, expiresAt: Date.now() + 23 * 3_600_000 }; // refresh ~1h before the 24h expiry
  return token;
}

/** Split a digits-only E.164 phone key into country code + 10-digit number. */
function splitPhone(phoneDigits: string): { countryCode: string; mobileNumber: string } {
  const d = phoneDigits.replace(/\D/g, '');
  if (d.length > 10) return { countryCode: d.slice(0, -10), mobileNumber: d.slice(-10) };
  return { countryCode: '91', mobileNumber: d };
}

/** Send an OTP; returns the verificationId needed to validate it. */
export async function sendOtp(phoneDigits: string): Promise<string> {
  const token = await getToken();
  const { countryCode, mobileNumber } = splitPhone(phoneDigits);
  const qp = new URLSearchParams({ countryCode, customerId: CUSTOMER_ID, flowType: 'SMS', mobileNumber });
  const res = await fetch(`${BASE}/verification/v3/send?${qp.toString()}`, { method: 'POST', headers: { authToken: token, accept: 'application/json' } });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const vid = ((b.data as Record<string, unknown> | undefined)?.verificationId ?? b.verificationId) as string | number | undefined;
  if (!vid) throw new Error(String(b.message ?? 'Could not send the OTP. Please try again.'));
  return String(vid);
}

/** Validate the code the user entered against a verificationId. */
export async function validateOtp(verificationId: string, code: string, phoneDigits: string): Promise<{ verified: boolean; error?: string }> {
  const token = await getToken();
  const { countryCode, mobileNumber } = splitPhone(phoneDigits);
  const qp = new URLSearchParams({ countryCode, customerId: CUSTOMER_ID, mobileNumber, verificationId, code });
  const res = await fetch(`${BASE}/verification/v3/validateOtp?${qp.toString()}`, { headers: { authToken: token, accept: 'application/json' } });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const data = (b.data ?? {}) as Record<string, unknown>;
  const status = String(data.verificationStatus ?? b.verificationStatus ?? '');
  if (status === 'VERIFICATION_COMPLETED') return { verified: true };

  const rc = Number(b.responseCode ?? data.responseCode ?? 0);
  const error = rc === 702 ? 'That code is incorrect.'
    : rc === 705 ? 'The code has expired — request a new one.'
    : rc === 800 ? 'Too many attempts. Please try again later.'
    : String(b.message ?? 'Could not verify the code.');
  return { verified: false, error };
}
