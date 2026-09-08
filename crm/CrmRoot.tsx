'use client';

import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@crm/routes/AppRoutes';
import { AppSessionProvider } from '@crm/app/app-session';
import { WorkspaceProvider } from '@crm/app/workspace-context';
import { setContacts } from '@crm/mock-data/contacts';
import { setWorkspaceData } from '@crm/mock-data/workspace';

/**
 * Entry point for the embedded CRM (Approach A) with the real-data hydration.
 *
 * Before rendering any screen, it fetches the tenant's live records from
 * /api/crm/bootstrap and pushes them into the prototype's data layer (which was
 * converted to live, replaceable bindings). Screens keep their synchronous
 * `contacts` / `users` imports but now read real DB rows — no per-screen
 * rewrite. The router is basenamed to "/crm" inside the Next host.
 */
export default function CrmRoot() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/crm/bootstrap', { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`bootstrap ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setWorkspaceData({
          branches: data.branches,
          whatsappNumbers: data.whatsappNumbers,
          teams: data.teams,
          users: data.users,
        });
        setContacts(data.contacts);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') {
    return <div style={shell}>Loading your workspace…</div>;
  }
  if (state === 'error') {
    return <div style={shell}>Couldn’t load your workspace. Please refresh.</div>;
  }

  return (
    <BrowserRouter basename="/crm">
      <AppSessionProvider>
        <WorkspaceProvider>
          <AppRoutes />
        </WorkspaceProvider>
      </AppSessionProvider>
    </BrowserRouter>
  );
}

const shell: React.CSSProperties = {
  display: 'grid', placeItems: 'center', minHeight: '100vh',
  color: '#4a5d6e', fontSize: 15, fontFamily: 'system-ui, sans-serif',
};
