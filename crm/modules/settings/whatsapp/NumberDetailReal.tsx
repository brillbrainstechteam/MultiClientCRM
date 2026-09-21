import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, type BadgeTone } from '@crm/design-system';
import './NumbersReal.css';

interface NumberDetail {
  id: string; displayPhone: string | null; verifiedName: string | null; label: string | null;
  brand: string | null; department: string | null; branchId: string | null; status: string;
  statusReason: string | null; qualityRating: string | null; messagingTier: string | null;
  codeVerificationStatus: string | null; wabaId: string | null; phoneNumberId: string | null;
  connectedAt: string | null; qualitySyncedAt: string | null;
}

const QUALITY_TONE: Record<string, BadgeTone> = { GREEN: 'success', YELLOW: 'warning', RED: 'danger' };
const STATUS_TONE: Record<string, BadgeTone> = { connected: 'success', disconnected: 'danger', reconnect_required: 'warning' };
const TIER_LABEL: Record<string, string> = { TIER_50: '50 / day', TIER_250: '250 / day', TIER_1K: '1K / day', TIER_10K: '10K / day', TIER_100K: '100K / day', TIER_UNLIMITED: 'Unlimited' };

export default function NumberDetailReal() {
  const { numberId = '' } = useParams<{ numberId: string }>();
  const navigate = useNavigate();
  const [n, setN] = useState<NumberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: '', brand: '', department: '' });
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch(`/api/crm/whatsapp/${numberId}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => {
        if (j.number) { setN(j.number); setForm({ label: j.number.label ?? '', brand: j.number.brand ?? '', department: j.number.department ?? '' }); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [numberId]);

  const up = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    const res = await fetch(`/api/crm/whatsapp/${numberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(form),
    });
    const j = await res.json();
    if (res.ok) { setN(j.number); setDirty(false); setMsg('Saved'); setTimeout(() => setMsg(''), 1500); }
    else setMsg(j.error ?? 'Save failed');
  }

  async function refresh() {
    setSyncing(true); setMsg('');
    const res = await fetch(`/api/crm/whatsapp/${numberId}/sync`, { method: 'POST', credentials: 'same-origin' });
    const j = await res.json();
    setSyncing(false);
    if (res.ok && n) { setN({ ...n, qualityRating: j.qualityRating, messagingTier: j.messagingTier, codeVerificationStatus: j.codeVerificationStatus, qualitySyncedAt: j.qualitySyncedAt }); setMsg('Health refreshed'); setTimeout(() => setMsg(''), 1500); }
    else setMsg(j.error ?? 'Could not refresh');
  }

  if (loading) return <div className="wa-det"><p className="wa-reg__muted">Loading number…</p></div>;
  if (!n) return <div className="wa-det"><p>Number not found. <button className="wa-link" onClick={() => navigate('/settings/whatsapp')}>Back to registry</button></p></div>;

  return (
    <div className="wa-det">
      <button className="wa-link wa-det__back" onClick={() => navigate('/settings/whatsapp')}><ArrowLeft size={15} /> All numbers</button>

      <header className="wa-det__hero">
        <div>
          <h1>{n.label ?? n.verifiedName ?? n.displayPhone ?? 'WhatsApp number'}</h1>
          <p>{n.displayPhone}{n.department ? ` · ${n.department}` : ''}</p>
        </div>
        <div className="wa-det__hero-badges">
          <Badge tone={STATUS_TONE[n.status] ?? 'neutral'}>{n.status.replace(/_/g, ' ')}</Badge>
          {n.qualityRating ? <Badge tone={QUALITY_TONE[n.qualityRating] ?? 'neutral'}>Quality: {n.qualityRating}</Badge> : null}
        </div>
      </header>

      <div className="wa-det__grid">
        <section className="wa-det__card">
          <div className="wa-det__card-head"><h3>Health</h3><Button variant="secondary" size="sm" iconLeft={<RefreshCw />} disabled={syncing} onClick={refresh}>{syncing ? 'Refreshing…' : 'Refresh from Meta'}</Button></div>
          <dl className="wa-det__dl">
            <div><dt>Quality rating</dt><dd>{n.qualityRating ?? '—'}</dd></div>
            <div><dt>Messaging tier</dt><dd>{TIER_LABEL[n.messagingTier ?? ''] ?? n.messagingTier ?? '—'} <span className="wa-reg__muted">(shared across numbers)</span></dd></div>
            <div><dt>Verification</dt><dd>{n.codeVerificationStatus?.replace(/_/g, ' ').toLowerCase() ?? '—'}</dd></div>
            <div><dt>Last synced</dt><dd>{n.qualitySyncedAt ? new Date(n.qualitySyncedAt).toLocaleString() : '—'}</dd></div>
          </dl>
        </section>

        <section className="wa-det__card">
          <h3>Mapping</h3>
          <div className="wa-det__fields">
            <label><span>Label</span><input value={form.label} onChange={(e) => up('label', e.target.value)} placeholder="e.g. Aurelia Jewellers — Sales" /></label>
            <label><span>Brand</span><input value={form.brand} onChange={(e) => up('brand', e.target.value)} /></label>
            <label><span>Department</span><input value={form.department} onChange={(e) => up('department', e.target.value)} placeholder="Sales / Support" /></label>
          </div>
          {dirty ? <div className="wa-det__save"><Button variant="primary" size="sm" onClick={save}>Save mapping</Button></div> : null}
        </section>

        <section className="wa-det__card">
          <h3>Connection</h3>
          <dl className="wa-det__dl">
            <div><dt>WABA ID</dt><dd className="wa-mono">{n.wabaId ?? '—'}</dd></div>
            <div><dt>Phone number ID</dt><dd className="wa-mono">{n.phoneNumberId ?? '—'}</dd></div>
            <div><dt>Connected</dt><dd>{n.connectedAt ? new Date(n.connectedAt).toLocaleDateString() : '—'}</dd></div>
            {n.statusReason ? <div><dt>Note</dt><dd>{n.statusReason.replace(/_/g, ' ')}</dd></div> : null}
          </dl>
        </section>
      </div>

      {msg ? <div className="wa-det__toast">{msg}</div> : null}
    </div>
  );
}
