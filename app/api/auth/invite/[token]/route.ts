import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';

/**
 * Team invite acceptance (no auth). The invited member opens /invite/<token>,
 * which calls GET to show who they are, then POSTs their chosen password to
 * activate the account. The token is single-use and time-limited.
 */
async function findValid(token: string) {
  const u = await prisma.user.findUnique({ where: { inviteToken: token }, select: { id: true, name: true, email: true, status: true, inviteExpiresAt: true } });
  if (!u || u.status !== 'invited') return null;
  if (u.inviteExpiresAt && u.inviteExpiresAt.getTime() < Date.now()) return null;
  return u;
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const u = await findValid(token);
  if (!u) return NextResponse.json({ error: 'This invite link is invalid or has expired.' }, { status: 404 });
  return NextResponse.json({ name: u.name, email: u.email });
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const u = await findValid(token);
  if (!u) return NextResponse.json({ error: 'This invite link is invalid or has expired.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { password?: string };
  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

  await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash: await hashPassword(password), status: 'active', inviteToken: null, inviteExpiresAt: null },
  });
  return NextResponse.json({ ok: true, email: u.email });
}
