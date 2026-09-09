import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';

/**
 * The connected WABA's message templates, straight from Meta Graph. Returned
 * raw (name/language/status/category/components) — the Templates module maps
 * them into its repository shape. Empty when no number is connected yet.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.wabaId || !account.accessToken) {
    return NextResponse.json({ connected: false, wabaId: null, templates: [] });
  }

  try {
    const token = decrypt(account.accessToken);
    const url = `${graphBase()}/${account.wabaId}/message_templates?limit=200&fields=name,language,status,category,components,id`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json().catch(() => ({}))) as { data?: unknown[]; error?: { message?: string } };
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message ?? 'Could not load templates from Meta.' }, { status: 502 });
    }
    return NextResponse.json({ connected: true, wabaId: account.wabaId, templates: json.data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load templates.' }, { status: 502 });
  }
}
