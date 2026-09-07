import { Bot, Megaphone, MessageSquare, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

const highlights = [
  { icon: MessageSquare, text: 'One shared team inbox for every WhatsApp chat' },
  { icon: Megaphone, text: 'Run bulk campaigns and re-engage customers' },
  { icon: Bot, text: 'Automate replies with human handover' },
  { icon: ShieldCheck, text: 'Official WhatsApp Business API — safe and compliant' },
];

/**
 * Public (pre-auth) split-screen shell for the Login and Signup screens. Left:
 * brand + value props on navy. Right: the form card. Renders outside AppShell —
 * no sidebar, top bar or scope bar.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="crm-auth">
      <aside className="crm-auth__brand" aria-hidden="true">
        <div className="crm-auth__brand-top">
          <span className="crm-auth__logo">TT</span>
          <span className="crm-auth__wordmark">TalkTrack</span>
        </div>
        <div className="crm-auth__brand-body">
          <h2 className="crm-auth__brand-headline">The WhatsApp CRM for growing Indian businesses</h2>
          <ul className="crm-auth__highlights">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text}>
                  <span className="crm-auth__highlight-icon">
                    <Icon />
                  </span>
                  {item.text}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="crm-auth__endorsement">
          <span className="crm-auth__endorsement-label">An initiative by</span>
          <span className="crm-auth__endorsement-name">BrillBrains Consultants</span>
        </div>
      </aside>

      <main className="crm-auth__panel">
        <div className="crm-auth__card">{children}</div>
      </main>
    </div>
  );
}
