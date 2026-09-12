import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, CircleHelp, LogOut } from 'lucide-react';
import './TopBar.css'; // loads after crm-bundle.css so the account dropdown styles apply
import { useAppSession } from '@crm/app/app-session';
import { useWorkspace } from '@crm/app/workspace-context';
import { Avatar, IconButton, SearchField, Select } from '@crm/design-system';
import type { RoleKey } from '@crm/mock-data';

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'agent', label: 'Agent' },
];

const connectionOptions = [
  { value: 'connected', label: 'Connected' },
  { value: 'new', label: 'New (not connected)' },
];

/**
 * Global top bar: search affordance, notifications and the acting user.
 *
 * The role switcher is a prototype-review control, not a product feature — it
 * writes `?role=` so reviewers can capture each permission variant by URL.
 */
export function TopBar() {
  const { currentUser, role, setScope } = useWorkspace();
  const { connected, setConnected } = useAppSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // close the account menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  const logout = async () => {
    setLoggingOut(true);
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* proceed to login anyway */ }
    // Full navigation out of the SPA so the server re-evaluates the (now cleared) session.
    window.location.href = '/login';
  };

  return (
    <header className="crm-topbar">
      <SearchField
        label="Search across the workspace"
        placeholder="Search contacts, conversations, campaigns…"
        width="380px"
        disabled
        title="Global search is defined by a later batch"
      />

      <div className="crm-topbar__right">
        {/* Prototype review controls — flip workspace state and acting role to
            reach every screen state. In production these come from real auth. */}
        <div className="crm-topbar__review-control">
          <Select
            label="Workspace"
            size="sm"
            options={connectionOptions}
            value={connected ? 'connected' : 'new'}
            onChange={(event) => setConnected(event.target.value === 'connected')}
          />
          <Select
            label="View as role"
            size="sm"
            options={roleOptions}
            value={role}
            onChange={(event) => setScope({ role: event.target.value as RoleKey })}
          />
        </div>

        <IconButton label="Help" icon={<CircleHelp />} disabled />
        <IconButton label="Notifications" icon={<Bell />} disabled />

        <div className="crm-topbar__account" ref={accountRef}>
          <button
            type="button"
            className="crm-topbar__user"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar
              initials={currentUser.initials}
              name={currentUser.name}
              availability={currentUser.availability}
            />
            <span className="crm-topbar__user-text">
              <span className="crm-topbar__user-name">{currentUser.name}</span>
              <span className="crm-topbar__user-role">{currentUser.roleLabel}</span>
            </span>
            <ChevronDown className="crm-topbar__user-caret" size={16} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="crm-topbar__menu" role="menu">
              <div className="crm-topbar__menu-head">
                <span className="crm-topbar__menu-name">{currentUser.name}</span>
                <span className="crm-topbar__menu-role">{currentUser.roleLabel}</span>
              </div>
              <button type="button" className="crm-topbar__menu-item" role="menuitem" onClick={logout} disabled={loggingOut}>
                <LogOut size={16} aria-hidden="true" />
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
