'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'New passwords do not match.',
    path: ['confirmPassword'],
  });

export type ChangePasswordState = { error?: string; ok?: boolean };

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Your session has expired — please log in again.' };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' };

  const { currentPassword, newPassword } = parsed.data;

  // Re-read the hash (the session user projection may not include it downstream).
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!fresh || !(await verifyPassword(currentPassword, fresh.passwordHash))) {
    return { error: 'Your current password is incorrect.' };
  }
  if (await verifyPassword(newPassword, fresh.passwordHash)) {
    return { error: 'Your new password must be different from the current one.' };
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });

  return { ok: true };
}
