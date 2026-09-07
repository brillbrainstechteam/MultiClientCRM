import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@crm/routes/AppRoutes';
import { AppSessionProvider } from './app-session';
import { WorkspaceProvider } from './workspace-context';

/**
 * Root of the prototype. The router sits outside WorkspaceProvider because the
 * workspace scope is derived from the URL. AppSessionProvider holds the
 * browser-persisted account state (connection, plan, wallet).
 */
export function App() {
  return (
    <BrowserRouter>
      <AppSessionProvider>
        <WorkspaceProvider>
          <AppRoutes />
        </WorkspaceProvider>
      </AppSessionProvider>
    </BrowserRouter>
  );
}
