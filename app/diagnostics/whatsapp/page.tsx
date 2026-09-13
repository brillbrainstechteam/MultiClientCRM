import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { runWhatsAppDiagnostics, resubscribeWaba, type CheckStatus } from '@/lib/meta/diagnostics';
import './diagnostics.css';

export const dynamic = 'force-dynamic';

const ICON: Record<CheckStatus, string> = { ok: '✓', warn: '!', fail: '✕', skip: '–' };

export default async function WhatsAppDiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  const { checks, callbackUrl, verifyToken, wabaId } = await runWhatsAppDiagnostics(user.tenantId, origin);
  const { result } = await searchParams;

  async function resubscribe() {
    'use server';
    const me = await getSessionUser();
    if (!me) redirect('/login');
    const message = await resubscribeWaba(me.tenantId);
    revalidatePath('/diagnostics/whatsapp');
    redirect(`/diagnostics/whatsapp?result=${encodeURIComponent(message)}`);
  }

  const failing = checks.filter((c) => c.status === 'fail');

  return (
    <main className="tt-diag">
      <header className="tt-diag__head">
        <h1>WhatsApp connection health</h1>
        <p>
          Every link in the chain, checked live against Meta. WABA <code>{wabaId ?? '—'}</code>.
        </p>
      </header>

      {result ? <div className="tt-diag__result">{result}</div> : null}

      <ol className="tt-diag__checks">
        {checks.map((c) => (
          <li key={c.id} className={`tt-diag__check tt-diag__check--${c.status}`}>
            <span className="tt-diag__icon" aria-hidden>{ICON[c.status]}</span>
            <div className="tt-diag__body">
              <strong>{c.label}</strong>
              <p>{c.detail}</p>
              {c.fix ? <p className="tt-diag__fix">Fix: {c.fix}</p> : null}
            </div>
          </li>
        ))}
      </ol>

      <section className="tt-diag__panel">
        <h2>Paste these into Meta → WhatsApp → Configuration</h2>
        <dl>
          <dt>Callback URL</dt>
          <dd><code>{callbackUrl}</code></dd>
          <dt>Verify token</dt>
          <dd><code>{verifyToken || '(not set on the server)'}</code></dd>
          <dt>Webhook fields</dt>
          <dd>Subscribe to <code>messages</code> (minimum). <code>message_template_status_update</code> keeps template statuses fresh.</dd>
        </dl>
      </section>

      <section className="tt-diag__panel">
        <h2>Actions</h2>
        <form action={resubscribe}>
          <button type="submit" className="tt-diag__btn">Re-subscribe webhooks to this WABA</button>
        </form>
        <p className="tt-diag__hint">
          Runs <code>POST /{'{waba-id}'}/subscribed_apps</code> — the step that runs at connect time but is
          allowed to fail silently there.
        </p>
        <p className="tt-diag__hint">
          <Link href="/onboarding">Reconnect the number →</Link> {' · '}
          <Link href="/crm/templates">Templates →</Link> {' · '}
          <Link href="/crm/inbox">Inbox →</Link>
        </p>
      </section>

      {failing.length ? (
        <p className="tt-diag__summary">
          {failing.length} check(s) failing. Start with the first one — later steps depend on it.
        </p>
      ) : (
        <p className="tt-diag__summary tt-diag__summary--ok">All checks passing.</p>
      )}
    </main>
  );
}
