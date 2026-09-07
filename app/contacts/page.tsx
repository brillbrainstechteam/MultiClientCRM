import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { ContactsClient } from './ContactsClient';
import './contacts.css';

export default async function ContactsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const users = await prisma.user.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return (
    <ContactsClient
      businessName={user.tenant.businessName}
      businessModel={user.tenant.businessModel}
      users={users}
    />
  );
}
