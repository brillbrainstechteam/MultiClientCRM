import { useEffect, useState } from 'react';
import { Contact as ContactIcon, Download, ExternalLink, RefreshCw, Upload } from 'lucide-react';
import { Button, StatusBadge, Toast } from '@crm/design-system';
import { refreshCrmData } from '@crm/app/crm-data';

interface Status {
  configured: boolean;
  connected: boolean;
  email: string | null;
  sheetUrl: string | null;
}

/**
 * Google Contacts + Sheets sync. Connect a Google account, then import its
 * contacts into the CRM, push CRM contacts back to Google Contacts, and
 * full-sync contacts into a Google Sheet the tenant owns. OAuth + all API
 * calls are handled server-side; this panel reflects the connection state.
 */
export function GoogleSyncPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = () =>
    fetch('/api/crm/google/status', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));

  useEffect(() => {
    void load();
    // Surface the OAuth round-trip result once we land back on the hub.
    const q = new URLSearchParams(window.location.search);
    if (q.get('googleAuth') === 'connected') setToast('Google account connected.');
    else if (q.get('googleAuth') === 'error') setToast('Could not connect Google. Please try again.');
  }, []);

  if (status === null) return null;

  const connect = () => { window.location.href = '/api/auth/google/start'; };

  const post = async (path: string): Promise<Record<string, unknown> | null> => {
    const res = await fetch(path, { method: 'POST', credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setToast(String(data.error ?? 'Something went wrong.')); return null; }
    return data;
  };

  const doImport = async () => {
    setBusy('import');
    const d = await post('/api/crm/google/import');
    if (d) { setToast(`Imported ${d.created} new · ${d.updated} updated · ${d.skipped} skipped (of ${d.found} in Google).`); await refreshCrmData(); }
    setBusy(null);
  };

  const doPush = async () => {
    setBusy('push');
    const d = await post('/api/crm/google/push');
    if (d) setToast(`Pushed ${d.created} contact(s) to Google Contacts.`);
    setBusy(null);
  };

  const doSync = async () => {
    setBusy('sheet');
    const d = await post('/api/crm/google/sync-sheet');
    if (d) { setToast(`Synced ${d.rows} contact(s) to Google Sheet.`); void load(); }
    setBusy(null);
  };

  const disconnect = async () => {
    setBusy('disconnect');
    await post('/api/crm/google/disconnect');
    setToast('Google disconnected.');
    await load();
    setBusy(null);
  };

  return (
    <>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <div className="crm-hub__source">
        <div className="crm-hub__source-left">
          <ContactIcon aria-hidden="true" />
          <div>
            <p className="crm-hub__source-name">Google Contacts &amp; Sheets</p>
            <p className="crm-hub__source-meta">
              {status.connected ? `Connected · ${status.email}` : 'Import contacts, push back, and sync to a Google Sheet.'}
            </p>
          </div>
        </div>

        {!status.configured ? (
          <StatusBadge tone="neutral">Not configured</StatusBadge>
        ) : status.connected ? (
          <div className="crm-hub__source-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
            <StatusBadge tone="success">Connected</StatusBadge>
            <Button variant="secondary" size="sm" iconLeft={<Download />} disabled={busy !== null} onClick={doImport}>
              {busy === 'import' ? 'Importing…' : 'Import from Google'}
            </Button>
            <Button variant="secondary" size="sm" iconLeft={<Upload />} disabled={busy !== null} onClick={doPush}>
              {busy === 'push' ? 'Pushing…' : 'Push to Google'}
            </Button>
            <Button variant="secondary" size="sm" iconLeft={<RefreshCw />} disabled={busy !== null} onClick={doSync}>
              {busy === 'sheet' ? 'Syncing…' : 'Sync to Sheet'}
            </Button>
            {status.sheetUrl ? (
              <Button variant="secondary" size="sm" iconLeft={<ExternalLink />} onClick={() => window.open(status.sheetUrl!, '_blank', 'noopener')}>
                Open Sheet
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" disabled={busy !== null} onClick={disconnect}>
              {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={connect}>Connect Google</Button>
        )}
      </div>
    </>
  );
}
