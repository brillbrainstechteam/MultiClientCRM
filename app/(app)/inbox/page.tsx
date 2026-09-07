import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { InboxClient } from './InboxClient';
import './inbox.css';

export default async function InboxPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const hasTestEnv = Boolean(process.env.WHATSAPP_TEST_PHONE_NUMBER_ID && process.env.WHATSAPP_TEST_TOKEN);
  return <InboxClient business={user.tenant.businessName} hasTestEnv={hasTestEnv} />;
}
