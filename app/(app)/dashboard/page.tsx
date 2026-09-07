import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Contact, MessagesSquare, PhoneCall, FileText, Megaphone, Workflow,
  ShoppingBag, TrendingUp, Users, ArrowRight, CheckCircle2, Plug,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import './dashboard.css';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const [account, contacts, conversations, messages] = await Promise.all([
    prisma.whatsAppAccount.findFirst({
      where: { tenantId: user.tenantId, status: 'connected' },
      orderBy: { connectedAt: 'desc' },
    }),
    prisma.contact.count({ where: { tenantId: user.tenantId } }),
    prisma.conversation.count({ where: { tenantId: user.tenantId } }),
    prisma.message.count({ where: { conversation: { tenantId: user.tenantId } } }),
  ]);

  const stats: { label: string; value: number }[] = [
    { label: 'Contacts', value: contacts },
    { label: 'Conversations', value: conversations },
    { label: 'Messages', value: messages },
  ];

  const live: { href: string; label: string; blurb: string; Icon: LucideIcon }[] = [
    { href: '/inbox', label: 'Inbox', blurb: 'Shared WhatsApp inbox with ownership and 24-hour window guidance.', Icon: MessagesSquare },
    { href: '/contacts', label: 'Contacts', blurb: 'Customer 360, lead status, import and segmentation.', Icon: Contact },
  ];
  const soon: { label: string; Icon: LucideIcon }[] = [
    { label: 'Calling', Icon: PhoneCall },
    { label: 'Templates', Icon: FileText },
    { label: 'Campaigns', Icon: Megaphone },
    { label: 'Flow & Automation', Icon: Workflow },
    { label: 'Catalogue & Orders', Icon: ShoppingBag },
    { label: 'Enquiries & Sales', Icon: TrendingUp },
    { label: 'Team & Access', Icon: Users },
  ];

  return (
    <div className="dash">
      <header className="dash__head">
        <p className="dash__eyebrow">{user.tenant.businessName}</p>
        <h1 className="dash__title">Dashboard</h1>
      </header>

      {account ? (
        <div className="dash__conn dash__conn--ok">
          <span className="dash__conn-ic"><CheckCircle2 size={20} /></span>
          <div>
            <strong>WhatsApp connected</strong>
            <p>{account.displayPhone ?? 'Your number'} is linked. Open the inbox to start messaging.</p>
          </div>
          <Link href="/inbox" className="dash__conn-btn">Open inbox <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="dash__conn dash__conn--warn">
          <span className="dash__conn-ic"><Plug size={20} /></span>
          <div>
            <strong>Connect your WhatsApp number</strong>
            <p>Keep your WhatsApp Business app (coexistence), connect an existing account, or set up a new number.</p>
          </div>
          <Link href="/onboarding" className="dash__conn-btn">Connect WhatsApp <ArrowRight size={16} /></Link>
        </div>
      )}

      <div className="dash__stats">
        {stats.map((s) => (
          <div key={s.label} className="dash__stat">
            <span className="dash__stat-val">{s.value.toLocaleString('en-IN')}</span>
            <span className="dash__stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <section className="dash__section">
        <h2 className="dash__h2">Your modules</h2>
        <div className="dash__grid">
          {live.map(({ href, label, blurb, Icon }) => (
            <Link key={href} href={href} className="dash__card">
              <span className="dash__card-ic"><Icon size={20} /></span>
              <h3>{label}</h3>
              <p>{blurb}</p>
              <span className="dash__card-go">Open <ArrowRight size={14} /></span>
            </Link>
          ))}
          {soon.map(({ label, Icon }) => (
            <div key={label} className="dash__card dash__card--soon" aria-disabled="true">
              <span className="dash__card-ic"><Icon size={20} /></span>
              <h3>{label}</h3>
              <em className="dash__soon-tag">Coming soon</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
