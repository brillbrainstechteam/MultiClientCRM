import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { AppSidebar } from './AppSidebar';
import './app-shell.css';

/**
 * Authenticated app shell: a persistent left sidebar with every module stacked
 * vertically, and the active page rendered to its right. Wraps all signed-in
 * modules (dashboard, inbox, contacts) via the (app) route group, so navigation
 * is consistent instead of each page carrying its own ad-hoc links.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="shell">
      <AppSidebar business={user.tenant.businessName} email={user.email} />
      <main className="shell__main">{children}</main>
    </div>
  );
}
