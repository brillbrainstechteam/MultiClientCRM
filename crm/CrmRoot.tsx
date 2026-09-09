'use client';

import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@crm/routes/AppRoutes';
import { AppSessionProvider } from '@crm/app/app-session';
import { WorkspaceProvider } from '@crm/app/workspace-context';
import { hydrateCrmData, onCrmDataChanged } from '@crm/app/crm-data';
import { hydrateInboxData } from '@crm/modules/inbox/inbox-mock-data';
import { hydrateTemplates } from '@crm/modules/templates/data/mockTemplates';

/**
 * Entry point for the embedded CRM (Approach A) with real-data hydration.
 *
 * Fetches the tenant's live records before rendering, then remounts the routed
 * subtree whenever a write changes the data (via a bumped `dataVersion` key), so
 * the prototype's synchronous-import screens reflect DB changes without any
 * per-screen rewrite. Router is basenamed to "/crm" inside the Next host.
 */
export default function CrmRoot() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Inbox conversations are best-effort — a failure there shouldn't block the
    // whole workspace, so it never rejects the combined hydration.
    Promise.all([hydrateCrmData(), hydrateInboxData().catch(() => {}), hydrateTemplates().catch(() => {})])
      .then(() => { if (!cancelled) setState('ready'); })
      .catch(() => { if (!cancelled) setState('error'); });
    // Remount the app subtree after each successful write so screens re-read data.
    const off = onCrmDataChanged(() => setDataVersion((v) => v + 1));
    return () => { cancelled = true; off(); };
  }, []);

  if (state === 'loading') return <div style={shell}>Loading your workspace…</div>;
  if (state === 'error') return <div style={shell}>Couldn’t load your workspace. Please refresh.</div>;

  return (
    <BrowserRouter basename="/crm">
      <AppSessionProvider>
        <WorkspaceProvider>
          <AppRoutes key={dataVersion} />
        </WorkspaceProvider>
      </AppSessionProvider>
    </BrowserRouter>
  );
}

const shell: React.CSSProperties = {
  display: 'grid', placeItems: 'center', minHeight: '100vh',
  color: '#4a5d6e', fontSize: 15, fontFamily: 'system-ui, sans-serif',
};
