'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';

const schema = z.object({
  businessName: z.string().min(1),
  businessType: z.string().min(1),
  businessPhone: z.string().min(6),
  email: z.string().email(),
  gst: z.string().optional(),
  cin: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export type SignupState = { error?: string };

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return { error: 'An account with this email already exists. Try logging in.' };

  const passwordHash = await hashPassword(d.password);
  const user = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        businessName: d.businessName,
        businessPhone: d.businessPhone,
        gstNumber: d.gst || null,
        cin: d.cin || null,
        entityType: d.businessType,
      },
    });
    return tx.user.create({
      data: { tenantId: tenant.id, name: d.businessName, email: d.email, passwordHash, role: 'owner' },
    });
  });

  await createSession(user.id);
  // New account → guided onboarding to connect the WhatsApp number.
  redirect('/onboarding');
}
