import { CheckCheck, MessagesSquare, Repeat, ShieldCheck, ShoppingBag } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { HeroShader } from '@/app/HeroShader';
import './AuthShell.css';

const highlights = [
  { icon: MessagesSquare, text: 'One shared inbox for every WhatsApp number' },
  { icon: Repeat, text: 'Acquire new customers and grow existing ones' },
  { icon: ShoppingBag, text: 'Catalogue, orders and payments inside chat' },
  { icon: ShieldCheck, text: 'Official WhatsApp Business Platform — safe & compliant' },
];

/** Split-screen shell for Login and Signup — brand rail on navy (with hero shader), form card on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="crm-auth">
      <aside className="crm-auth__brand">
        <div className="crm-auth__brand-shader" aria-hidden="true"><HeroShader /></div>
        <div className="crm-auth__brand-veil" aria-hidden="true" />
        <div className="crm-auth__brand-inner">
          <Link href="/" className="crm-auth__brand-top">
            <span className="crm-auth__logo">TT</span>
            <span className="crm-auth__wordmark">TalkTrack</span>
          </Link>
          <div className="crm-auth__brand-body">
            <span className="crm-auth__eyebrow"><CheckCheck aria-hidden="true" /> Official WhatsApp Business Platform</span>
            <h2 className="crm-auth__brand-headline">Turn every WhatsApp chat into a <span>customer</span>.</h2>
            <ul className="crm-auth__highlights">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text}>
                    <span className="crm-auth__highlight-icon"><Icon /></span>
                    {item.text}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="crm-auth__endorsement">
            <span className="crm-auth__endorsement-label">An initiative by</span>
            <span className="crm-auth__endorsement-name">BrillBrains Consultants Pvt. Ltd.</span>
          </div>
        </div>
      </aside>

      <main className="crm-auth__panel">
        <Link href="/" className="crm-auth__back">← Back to site</Link>
        <div className="crm-auth__card">{children}</div>
      </main>
    </div>
  );
}
