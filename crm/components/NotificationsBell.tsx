import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { IconButton } from '@crm/design-system';

interface Notice {
  id: string;
  category: string;
  kind: string;
  severity: 'info' | 'warning' | 'critical' | string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const dotColor: Record<string, string> = { critical: '#dc2626', warning: '#d97706', info: '#2563eb' };

/** Global notification bell: unread badge + dropdown, backed by /api/crm/notifications. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/crm/notifications', { credentials: 'same-origin' });
      if (!r.ok) return;
      const d = await r.json();
      setNotices(Array.isArray(d.events) ? d.events : []);
      setUnread(Number(d.unreadCount) || 0);
    } catch { /* bell never breaks the shell */ }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markAllRead = async () => {
    try {
      await fetch('/api/crm/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ all: true }) });
      setUnread(0);
      setNotices((xs) => xs.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const toggle = () => { const next = !open; setOpen(next); if (next) load(); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <IconButton label="Notifications" icon={<Bell />} onClick={toggle} aria-expanded={open} />
        {unread > 0 ? (
          <span aria-hidden="true" style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 10, lineHeight: '16px', textAlign: 'center', fontWeight: 700 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </span>

      {open ? (
        <div role="menu" style={{ position: 'absolute', right: 0, top: '110%', width: 340, maxHeight: 420, overflowY: 'auto', background: 'var(--crm-surface, #fff)', color: 'var(--crm-text, #111)', border: '1px solid var(--crm-border, #e5e7eb)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.16)', zIndex: 1000 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--crm-border, #e5e7eb)' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {unread > 0 ? (
              <button type="button" onClick={markAllRead} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 12 }}>Mark all read</button>
            ) : null}
          </div>
          {notices.length === 0 ? (
            <p style={{ padding: '18px 12px', margin: 0, color: 'var(--crm-text-muted, #6b7280)', fontSize: 13 }}>You&apos;re all caught up.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notices.map((n) => (
                <li key={n.id} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--crm-border, #f1f1f1)', background: n.read ? 'transparent' : 'var(--crm-surface-subtle, #f8fafc)' }}>
                  <span aria-hidden="true" style={{ flex: '0 0 auto', width: 8, height: 8, marginTop: 5, borderRadius: 4, background: dotColor[n.severity] ?? '#6b7280' }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{n.title}</span>
                    {n.body ? <span style={{ display: 'block', fontSize: 12, color: 'var(--crm-text-muted, #6b7280)' }}>{n.body}</span> : null}
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--crm-text-muted, #9ca3af)', marginTop: 2 }}>{relative(n.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
