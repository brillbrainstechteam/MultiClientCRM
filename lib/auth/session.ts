import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

const COOKIE = 'tt_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { tenant: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    store.delete(COOKIE);
  }
}
