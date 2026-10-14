import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { ImportProgress } from './ImportProgress';
import '../onboarding.css';

/**
 * Where a coexistence connection lands.
 *
 * Dropping the owner straight into the Inbox right after connecting is the
 * wrong moment: history arrives over the following minutes, so the inbox looks
 * empty, then mysteriously fills, and they conclude something went wrong. This
 * screen shows the import happening and lets them leave whenever they like.
 */
export const dynamic = 'force-dynamic';

export default async function ImportingPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <main className="tt-onb-page">
      <div className="tt-onb-card">
        <ImportProgress />
      </div>
    </main>
  );
}
