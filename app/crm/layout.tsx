import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import './crm-bundle.css';

/**
 * Host layout for the embedded CRM prototype. Guards access (same session as the
 * rest of the app) and loads the prototype's bundled global stylesheet. Kept
 * OUTSIDE the (app) route group so the prototype renders in its own shell rather
 * than nested inside the Next sidebar.
 */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <>{children}</>;
}
