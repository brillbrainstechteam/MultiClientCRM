'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const LINKS: { href: string; label: string }[] = [
  { href: '#modules', label: 'Platform' },
  { href: '#lifecycle', label: 'Customer journey' },
  { href: '#india', label: 'Built for India' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#how', label: 'How it works' },
];

/**
 * Landing navigation. Below the mobile breakpoint the section links collapse
 * into a toggle panel — previously they were simply `display: none`, which left
 * phone visitors with no way to reach any section of the page.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  // Lock background scroll while the panel is open, and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // A resize past the breakpoint should not leave the panel stuck open.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 881px)');
    const onChange = () => { if (mq.matches) setOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <header className="land__nav">
      <div className="land__nav-in">
        <Link href="/" className="land__brand" onClick={() => setOpen(false)}>
          <span className="land__logo">TT</span>
          <span className="land__word">TalkTrack</span>
        </Link>

        <nav className="land__nav-links">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
          <Link href="/login" className="land__nav-login">Log in</Link>
          <Link href="/signup" className="land__btn land__btn--gold land__btn--sm">Get started</Link>
        </nav>

        <button
          type="button"
          className="land__nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="land-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        id="land-mobile-menu"
        className={`land__nav-panel${open ? ' land__nav-panel--open' : ''}`}
        hidden={!open}
      >
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
        ))}
        <div className="land__nav-panel-cta">
          <Link href="/login" className="land__btn land__btn--outline land__btn--sm" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link href="/signup" className="land__btn land__btn--gold land__btn--sm" onClick={() => setOpen(false)}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
