'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Enter a valid email and password.' };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: 'Incorrect email or password.' };
  }

  await createSession(user.id);

  // Send users who haven't connected a WhatsApp number to the connect screen
  // (which surfaces the three Embedded Signup options); otherwise the dashboard.
  const connected = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
  });
  redirect(connected ? '/crm/dashboard' : '/onboarding');
}
