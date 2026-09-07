import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { Customer360 } from './Customer360';
import '../contacts.css';

export default async function ContactDetailPage(ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { id } = await ctx.params;

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.tenantId !== user.tenantId) notFound();

  const [users, messageCount] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.message.count({ where: { conversation: { tenantId: user.tenantId, contactPhone: contact.phone } } }),
  ]);

  // serialise dates for the client component
  const c = JSON.parse(JSON.stringify(contact));
  return <Customer360 initial={c} users={users} messageCount={messageCount} />;
}
