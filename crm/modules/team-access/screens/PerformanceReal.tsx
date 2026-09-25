import { useEffect, useState, useCallback } from 'react';
import { PhoneCall, Contact, ClipboardList, TrendingUp } from 'lucide-react';
import { PageHeader } from '@crm/components';
import './PerformanceReal.css';

interface Row {
  userId: string; name: string; email: string; role: string; department: string | null; status: string;
  assignedContacts: number; calls: number; followUp: number; notInterested: number; enquiries: number; conversion: number;
}
interface Totals { assignedContacts: number; calls: number; followUp: number; notInterested: number; enquiries: number; }
interface Perf { scope: string; rows: Row[]; totals: Totals; }

const RANGES = [
  { key: '', label: 'All time' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
];

/** Per-member calling performance (Phase 6). Admin sees all members; a member
 *  sees only their own row (the API scopes it). */
export default function PerformanceReal() {
  const [data, setData] = useState<Perf | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    let qs = '';
    if (range) {
      const from = new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      qs = `?from=${from}`;
    }
    fetch(`/api/crm/team/performance${qs}`, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => { setData(d.error ? null : d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const t = data?.totals;
  const totalConv = t && t.calls > 0 ? Math.round((t.enquiries / t.calls) * 100) : 0;

  return (
    <div className="pf">
      <PageHeader title="Performance" actions={
        <div className="pf-range">
          {RANGES.map((r) => (
            <button key={r.key} className={`pf-range__btn${range === r.key ? ' pf-range__btn--on' : ''}`} onClick={() => setRange(r.key)}>{r.label}</button>
          ))}
        </div>
      } />

      {loading ? <p className="pf-muted">Loading performance…</p> : !data ? <p className="pf-muted">Couldn’t load performance.</p> : (
        <>
          <div className="pf-tiles">
            <Tile icon={Contact} label="Assigned contacts" value={t!.assignedContacts} />
            <Tile icon={PhoneCall} label="Calls made" value={t!.calls} />
            <Tile icon={ClipboardList} label="Enquiries generated" value={t!.enquiries} tone="ok" />
            <Tile icon={TrendingUp} label="Conversion" value={`${totalConv}%`} tone="ok" />
          </div>

          <div className="pf-table">
            <div className="pf-thead">
              <span>Member</span><span className="pf-num">Assigned</span><span className="pf-num">Calls</span>
              <span className="pf-num">Follow-up</span><span className="pf-num">Not interested</span><span className="pf-num">Enquiries</span><span className="pf-num">Conversion</span>
            </div>
            {data.rows.map((r) => (
              <div key={r.userId} className={`pf-row${r.status === 'disabled' ? ' pf-row--off' : ''}`}>
                <div className="pf-member">
                  <span className="pf-ava">{r.name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()}</span>
                  <div><strong>{r.name}</strong><span>{cap(r.role)}{r.department ? ` · ${cap(r.department)}` : ''}</span></div>
                </div>
                <span className="pf-num">{r.assignedContacts}</span>
                <span className="pf-num pf-strong">{r.calls}</span>
                <span className="pf-num"><em className="pf-dot pf-dot--info" />{r.followUp}</span>
                <span className="pf-num"><em className="pf-dot pf-dot--bad" />{r.notInterested}</span>
                <span className="pf-num"><em className="pf-dot pf-dot--ok" />{r.enquiries}</span>
                <span className="pf-num"><span className={`pf-conv${r.conversion >= 20 ? ' pf-conv--good' : ''}`}>{r.conversion}%</span></span>
              </div>
            ))}
            {data.rows.length === 0 ? <div className="pf-empty">No members in scope.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ size?: number }>; label: string; value: number | string; tone?: 'ok' }) {
  return (
    <div className="pf-tile">
      <span className={`pf-tile__ic${tone === 'ok' ? ' pf-tile__ic--ok' : ''}`}><Icon size={18} /></span>
      <span className="pf-tile__val">{value}</span>
      <span className="pf-tile__label">{label}</span>
    </div>
  );
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
