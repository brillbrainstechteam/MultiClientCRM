import { Outlet, useLocation } from 'react-router-dom';
import { GlobalSidebar } from './GlobalSidebar';
import { ScopeBar } from './ScopeBar';
import { TopBar } from './TopBar';

/** Modules that fill the viewport as a workspace (no page padding/scroll). */
const WORKSPACE_PATHS = ['/inbox'];

/** The Flow Builder canvas (`/automation/:flowId`, excluding the Library and Starter Gallery) is a workspace too. */
const AUTOMATION_BUILDER_PATH = /^\/automation\/(?!new$)[^/]+$/;

/**
 * Global chrome wrapping every route: sidebar + top bar + scope bar + content.
 * Target frame is 1440px desktop (CLAUDE.md §7).
 */
export function AppShell() {
  const location = useLocation();
  const isWorkspace =
    WORKSPACE_PATHS.some((p) => location.pathname.startsWith(p)) || AUTOMATION_BUILDER_PATH.test(location.pathname);

  return (
    <div className="crm-app-shell">
      <GlobalSidebar />
      <div className="crm-app-shell__body">
        <TopBar />
        <ScopeBar />
        <main
          className={`crm-app-shell__content${isWorkspace ? ' crm-app-shell__content--workspace' : ''}`}
          id="crm-main-content"
        >
          <div className={`crm-app-shell__container${isWorkspace ? ' crm-app-shell__container--workspace' : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
