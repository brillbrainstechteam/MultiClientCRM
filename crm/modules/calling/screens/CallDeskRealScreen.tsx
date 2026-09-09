import { useEffect, useMemo, useState } from 'react';
import { Phone, PhoneCall, Plug } from 'lucide-react';
import { PageHeader } from '@crm/components';
import {
  Badge, Banner, Button, DataTable, EmptyState, Input, LoadingSkeleton, Modal, Select, Textarea, Toast, type BadgeTone, type Column,
} from '@crm/design-system';

/**
 * Calling — real call log + manual call logging + BYOT telephony connection,
 * wired to /api/crm/calls and /api/crm/telephony. Click-to-call auto-dialing
 * activates once telephony credentials are connected; until then reps log call
 * outcomes here. No mock data.
 */

interface Call {
  id: string; mobile: string; direction: string; status: string;
  durationSec: number | null; disposition: string | null; summary: string | null; createdAt: string;
}
interface Telephony { connected: boolean; provider: string | null; status: string }

const STATUS_TONE: Record<string, BadgeTone> = { completed: 'success', answered: 'success', no_answer: 'warning', busy: 'warning', failed: 'danger' };
const fmtDur = (s: number | null) => (s == null ? '—' : `${Math.floor(s / 60)}m ${s % 60}s`);

export default function CallDeskRealScreen() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [tel, setTel] = useState<Telephony | null>(null);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [f, setF] = useState({ mobile: '', status: 'completed', durationSec: '', summary: '' });
  const [provider, setProvider] = useState('exotel');

  const load = () => Promise.all([
    fetch('/api/crm/calls', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { calls: [] })),
    fetch('/api/crm/telephony', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)),
  ]).then(([c, t]) => { setCalls(c.calls ?? []); setTel(t); }).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);

  const logCall = async () => {
    if (!f.mobile.replace(/\D/g, '')) { setToast('Enter a phone number.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/crm/calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ mobile: f.mobile, status: f.status, durationSec: f.durationSec ? Number(f.durationSec) : undefined, disposition: f.status, summary: f.summary }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setToast(String(d.error ?? 'Could not log the call.')); return; }
      setLogOpen(false); setF({ mobile: '', status: 'completed', durationSec: '', summary: '' }); await load(); setToast('Call logged.');
    } finally { setBusy(false); }
  };

  const connect = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/crm/telephony', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setToast(String(d.error ?? 'Could not save provider.')); return; }
      setConnectOpen(false); await load(); setToast(`Provider set to ${provider}. Add credentials to enable dialing.`);
    } finally { setBusy(false); }
  };

  const columns: Column<Call>[] = useMemo(() => [
    { key: 'mobile', header: 'Number', render: (c) => c.mobile },
    { key: 'direction', header: 'Direction', render: (c) => <Badge tone="neutral">{c.direction}</Badge> },
    { key: 'status', header: 'Outcome', render: (c) => <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>{(c.disposition ?? c.status).replace(/_/g, ' ')}</Badge> },
    { key: 'dur', header: 'Duration', render: (c) => fmtDur(c.durationSec) },
    { key: 'summary', header: 'Summary', render: (c) => c.summary ?? '—' },
    { key: 'at', header: 'When', render: (c) => new Date(c.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) },
  ], []);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <PageHeader
        title="Calling"
        description="Log calls and their outcomes. Connect telephony (BYOT) to enable click-to-call and recordings."
        actions={<Button variant="primary" iconLeft={<PhoneCall />} onClick={() => setLogOpen(true)}>Log a call</Button>}
      />

      <Banner
        tone={tel?.connected ? 'info' : 'warning'}
        title={tel?.connected ? `Telephony connected · ${tel.provider}` : tel?.provider ? `Provider selected: ${tel.provider} (credentials pending)` : 'No telephony connected'}
        description={tel?.connected ? 'Click-to-call and recording are active.' : 'Bring your own telephony (Exotel / Knowlarity). Select a provider, then add credentials to enable dialing.'}
        actions={<Button variant="secondary" size="sm" iconLeft={<Plug />} onClick={() => setConnectOpen(true)}>{tel?.provider ? 'Change provider' : 'Connect provider'}</Button>}
      />

      {loading ? <LoadingSkeleton height={56} /> : calls.length === 0
        ? <EmptyState title="No calls logged yet" description="Log your first call outcome." actions={<Button variant="primary" iconLeft={<Phone />} onClick={() => setLogOpen(true)}>Log a call</Button>} />
        : <DataTable caption="Call log" columns={columns} rows={calls} rowKey={(c) => c.id} />}

      <Modal open={logOpen} title="Log a call" onClose={() => setLogOpen(false)} footer={<>
        <Button variant="secondary" onClick={() => setLogOpen(false)}>Cancel</Button>
        <Button variant="primary" disabled={busy} onClick={logCall}>{busy ? 'Saving…' : 'Save call'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Phone number" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} placeholder="+91…" />
          <Select label="Outcome" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}
            options={[{ value: 'completed', label: 'Completed' }, { value: 'answered', label: 'Answered' }, { value: 'no_answer', label: 'No answer' }, { value: 'busy', label: 'Busy' }, { value: 'failed', label: 'Failed' }]} />
          <Input label="Duration (seconds)" value={f.durationSec} onChange={(e) => setF({ ...f, durationSec: e.target.value })} inputMode="numeric" placeholder="Optional" />
          <Textarea label="Summary / disposition notes" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="Optional" />
        </div>
      </Modal>

      <Modal open={connectOpen} title="Connect telephony (BYOT)" onClose={() => setConnectOpen(false)} footer={<>
        <Button variant="secondary" onClick={() => setConnectOpen(false)}>Cancel</Button>
        <Button variant="primary" disabled={busy} onClick={connect}>{busy ? 'Saving…' : 'Save provider'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label="Provider" value={provider} onChange={(e) => setProvider(e.target.value)}
            options={[{ value: 'exotel', label: 'Exotel' }, { value: 'knowlarity', label: 'Knowlarity' }]} />
          <p style={{ fontSize: 13, color: 'var(--crm-text-muted, #6b7a88)', margin: 0 }}>Credentials are added once you are onboarded to the provider — dialing/recording activate then.</p>
        </div>
      </Modal>
    </div>
  );
}
