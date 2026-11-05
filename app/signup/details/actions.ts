'use server';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { phoneKey } from '@/lib/auth/identifier';
import { PENDING_COOKIE, decodePending } from '@/lib/auth/pending-signup';

/**
 * Complete a Google/OTP signup: the verified identity comes from the encrypted
 * pending-signup cookie (not the form, so it can't be forged), the business
 * profile comes from the form. Creates the Tenant + owner and signs them in.
 */
const schema = z.object({
  businessName: z.string().trim().min(1),
  businessType: z.string().trim().min(1),
  businessModel: z.enum(['b2b', 'b2c', 'both']).default('b2b'),
  businessPhone: z.string().trim().min(6),
  email: z.string().trim().email().optional().or(z.literal('')),
  gst: z.string().optional(),
  cin: z.string().optional(),
});

export type DetailsState = { error?: string };

export async function completeSignupAction(_prev: DetailsState, formData: FormData): Promise<DetailsState> {
  const store = await cookies();
  const pending = decodePending(store.get(PENDING_COOKIE)?.value);
  if (!pending) return { error: 'Your signup session expired. Please start again.' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  const d = parsed.data;

  // The identity is authoritative from the verified cookie.
  const email = (pending.provider === 'google' ? pending.email : d.email || '')?.toLowerCase() ?? '';
  if (!email) return { error: 'A business email is required.' };
  const loginPhone = pending.provider === 'otp' ? pending.phone ?? null : null;

  // Guard against a race / re-submit: if this identity already has an account, sign in.
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(loginPhone ? [{ phone: loginPhone }] : [])] },
    select: { id: true },
  });
  if (existing) {
    await createSession(existing.id);
    store.delete(PENDING_COOKIE);
    redirect('/crm/dashboard');
  }

  const user = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        businessName: d.businessName,
        businessPhone: d.businessPhone,
        gstNumber: d.gst || null,
        cin: d.cin || null,
        entityType: d.businessType,
        businessModel: d.businessModel,
      },
    });
    return tx.user.create({
      data: {
        tenantId: tenant.id,
        name: d.businessName,
        email,
        phone: loginPhone,
        // No usable password — they sign in with Google/OTP. They can set one later.
        passwordHash: await hashPassword(randomBytes(18).toString('hex')),
        role: 'owner',
      },
    });
  });

  await createSession(user.id);
  store.delete(PENDING_COOKIE);
  redirect('/crm/dashboard');
}
