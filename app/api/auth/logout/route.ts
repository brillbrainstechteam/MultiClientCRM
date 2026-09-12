import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

/** Clears the httpOnly session cookie + deletes the session row. */
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
