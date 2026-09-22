import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/** Internal (agent-only) notes on a conversation — never sent to the customer. */

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const convo = await prisma.conversation.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
  if (!convo) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

  const notes = await prisma.conversationNote.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({
    notes: notes.map((n) => ({ id: n.id, text: n.text, authorUserId: n.authorUserId, createdAt: n.createdAt.toISOString() })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  const convo = await prisma.conversation.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
  if (!convo) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { text?: string };
  const text = b.text?.trim();
  if (!text) return NextResponse.json({ error: 'Note text is required.' }, { status: 400 });

  const note = await prisma.conversationNote.create({
    data: { tenantId: user.tenantId, conversationId: id, authorUserId: user.id, text },
  });
  return NextResponse.json({ id: note.id, text: note.text, authorUserId: note.authorUserId, createdAt: note.createdAt.toISOString() }, { status: 201 });
}
