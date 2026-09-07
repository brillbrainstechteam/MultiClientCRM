/**
 * Standalone, chrome-free Inbox window (`/inbox-window`).
 *
 * Opened via the "Open in new window" control in the Inbox. Renders the full
 * Inbox workspace without the global AppShell (sidebar/topbar) so agents get a
 * larger, focused surface to manage conversations. Workspace scope is carried
 * through the URL query, so the popped-out window opens in the same context.
 */

import { useWorkspace } from '@crm/app/workspace-context';
import InboxPage from './InboxPage';

export default function InboxWindowScreen() {
  const { role } = useWorkspace();

  return (
    <div className="crm-inbox-window">
      <header className="crm-inbox-window__bar">
        <span className="crm-inbox-window__brand">TalkTrack</span>
        <span className="crm-inbox-window__sep">›</span>
        <span className="crm-inbox-window__title">Inbox</span>
        <span className="crm-inbox-window__role">Viewing as {role}</span>
      </header>
      <div className="crm-inbox-window__body">
        <InboxPage standalone />
      </div>
    </div>
  );
}
