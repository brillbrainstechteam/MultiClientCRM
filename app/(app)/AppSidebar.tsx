'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, MessagesSquare, Contact, PhoneCall, FileText, Megaphone,
  Workflow, ShoppingBag, TrendingUp, Users, Settings, LogOut, Menu, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logoutAction } from './actions';

/** Modules that are actually built and navigable. */
const LIVE: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', Icon: MessagesSquare },
  { href: '/contacts', label: 'Contacts', Icon: Contact },
];

/**
 * Modules on the roadmap — shown greyed with a "Soon" tag so the full product
 * is visible in the nav (and in demos) before each module is built.
 * Note: there is deliberately no standalone "AI" item — AI assistance is woven
 * into the modules above (inbox replies, contact enrichment, etc.), not a page.
 */
const SOON: { label: string; Icon: LucideIcon }[] = [
  { label: 'Calling', Icon: PhoneCall },
  { label: 'Templates', Icon: FileText },
  { label: 'Campaigns', Icon: Megaphone },
  { label: 'Flow & Automation', Icon: Workflow },
  { label: 'Catalogue & Orders', Icon: ShoppingBag },
  { label: 'Enquiries & Sales', Icon: TrendingUp },
  { label: 'Team & Access', Icon: Users },
];

export function AppSidebar({ business, email }: { business: string; email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer on route change.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile top bar */}
      <div className="shell__topbar">
        <Link href="/dashboard" className="shell__brand">
          <span className="shell__logo">TT</span>
          <span className="shell__word">TalkTrack</span>
        </Link>
        <button
          type="button"
          className="shell__burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && <div className="shell__scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside className={`shell__side${open ? ' shell__side--open' : ''}`}>
        <Link href="/dashboard" className="shell__brand shell__brand--side">
          <span className="shell__logo">TT</span>
          <span className="shell__word">TalkTrack</span>
        </Link>

        <nav className="shell__nav" aria-label="Primary">
          {LIVE.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`shell__link${isActive(href) ? ' shell__link--active' : ''}`}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              <Icon size={18} /> <span>{label}</span>
            </Link>
          ))}

          <p className="shell__nav-label">Coming soon</p>
          {SOON.map(({ label, Icon }) => (
            <span key={label} className="shell__link shell__link--soon" aria-disabled="true">
              <Icon size={18} /> <span>{label}</span>
              <em className="shell__soon-tag">Soon</em>
            </span>
          ))}
        </nav>

        <div className="shell__foot">
          <Link
            href="/account"
            className={`shell__link${isActive('/account') ? ' shell__link--active' : ''}`}
          >
            <Settings size={18} /> <span>Settings</span>
          </Link>
          <div className="shell__who">
            <span className="shell__who-name">{business}</span>
            <span className="shell__who-mail">{email}</span>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="shell__link shell__logout">
              <LogOut size={18} /> <span>Log out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
