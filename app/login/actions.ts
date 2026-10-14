'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { looksLikeEmail, phoneKey } from '@/lib/auth/identifier';

/**
 * Sign in with **either** a business email or a mobile number.
 *
 * Team members created by an owner are often field sales people who know their
 * phone number and not much else, so an email-only login shuts them out. The
 * identifier is one field: if it contains an '@' it is treated as an email,
 * otherwise it is normalised to E.164 (assuming +91) and matched on `phone`,
 * which is stored without the '+' so formatting cannot defeat the unique index.
 */
const schema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // `email` is still accepted so an older cached form keeps working.
  const raw = {
    identifier: String(formData.get('identifier') ?? formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'Enter your email or mobile number, and your password.' };

  const { identifier, password } = parsed.data;
  let user = null;
  if (looksLikeEmail(identifier)) {
    user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
  } else {
    const key = phoneKey(identifier);
    if (key) user = await prisma.user.findUnique({ where: { phone: key } });
  }

  // One message for both failures, so the form cannot be used to discover
  // which emails or numbers exist.
  if (!user || user.status !== 'active' || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Incorrect details. Check your email or mobile number and password.' };
  }

  await createSession(user.id);

  // Always land on the dashboard — it is connection-aware and shows a
  // "Get Started / Connect your number" launchpad when nothing is connected yet.
  redirect('/crm/dashboard');
}
