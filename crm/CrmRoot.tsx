'use client';

import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@crm/routes/AppRoutes';
import { AppSessionProvider } from '@crm/app/app-session';
import { WorkspaceProvider } from '@crm/app/workspace-context';

/**
 * Entry point for the embedded CRM prototype (Approach A). It is the prototype's
 * own App, but with the router basenamed to "/crm" so all its internal links and
 * routes live under that path inside the Next host. Rendered client-only.
 */
export default function CrmRoot() {
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
