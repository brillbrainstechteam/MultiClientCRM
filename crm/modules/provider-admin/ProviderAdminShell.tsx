import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@crm/design-system';

/**
 * Provider Admin — separate shell, never the client CRM chrome (SKILL.md
 * "Provider Admin"). No `AppShell`, no ScopeBar, no tenant-scoped nav: this
 * shell is Provider Support's own workspace and structurally cannot reach
 * customer conversation or business data (least privilege), since none of the
 * Contacts/Inbox modules are mounted anywhere in this tree.
 */
export function ProviderAdminShell() {
  const navigate = useNavigate();
  return (
    <div className="crm-provider-shell">
      <header className="crm-provider-shell__bar">
        <div className="crm-provider-shell__brand">
          <span className="crm-provider-shell__tile" aria-hidden="true">TT</span>
          <span className="crm-provider-shell__wordmark">TalkTrack Provider Admin</span>
          <span className="crm-provider-shell__badge">Provider Support</span>
        </div>
        <div>
          <span className="crm-provider-shell__note">Technical &amp; billing support access only — no customer data.</span>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} style={{ marginLeft: 16, color: '#fff' }}>
            Exit to client CRM
          </Button>
        </div>
      </header>
      <main className="crm-provider-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
