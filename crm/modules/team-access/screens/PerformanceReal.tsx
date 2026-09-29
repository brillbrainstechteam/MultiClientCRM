import { useEffect, useState, useCallback, useMemo } from 'react';
import { PhoneCall, Contact, ClipboardList, CalendarClock, Download } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Select } from '@crm/design-system';
import './PerformanceReal.css';

interface Row {
  userId: string; name: string; email: string; role: string; department: string | null; status: string;
  assignedContacts: number; calls: number; followUpInProgress: number; nextFollowUpAt: string | null;
  notInterested: number; enquiryReceived: number;
}
interface Totals { assignedContacts: number; calls: number; followUpInProgress: number; notInterested: number; enquiryReceived: number; }
interface Perf { scope: string; rows: Row[]; totals: Totals; }
interface GeoRow { label: string; data: number; activated: number; pct: number; }
interface Funnel { reach: number; enquiries: number; activations: number; enquiryRate: number; closureRate: number; }
interface FunnelData { funnel: Funnel; byZone: GeoRow[]; byState: GeoRow[]; byCity: GeoRow[]; }

const RANGES = [
  { key: '', label: 'All time' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: 'custom', label: 'Custom' },
];
const C = { enquiry: '#10B981', follow: '#3B82F6', not: '#EF4444', pending: '#94A3B8', calls: '#6366F1' };
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—');
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Per-member calling report. Admin sees all; a member sees only their own row
 *  (the API scopes it). Range filter (incl. custom), outcome charts and CSV export. */
export default function PerformanceReal() {
  const [data, setData] = useState<Perf | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [geoDim, setGeoDim] = useState<'byZone' | 'byState' | 'byCity'>('byZone');
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('');
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [assignee, setAssignee] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (range === 'custom') { if (from) p.set('from', from); if (to) p.set('to', to); }
    else if (range) p.set('from', iso(new Date(Date.now() - Number(range) * 864e5)));
    const qs = p.toString() ? `?${p.toString()}` : '';
    fetch(`/api/crm/team/performance${qs}`, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => { setData(d.error ? null : d); setLoading(false); })
      .catch(() => setLoading(false));
    const fp = new URLSearchParams(p);
    if (assignee) fp.set('assignee', assignee);
    fetch(`/api/crm/reports/funnel${fp.toString() ? `?${fp.toString()}` : ''}`, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => setFunnel(d.error ? null : d))
      .catch(() => setFunnel(null));
  }, [range, from, to, assignee]);
  useEffect(() => { load(); }, [load]);

  const shownRows = data ? (assignee ? data.rows.filter((r) => r.userId === assignee) : data.rows) : [];
  const t = data
    ? (assignee
        ? shownRows.reduce((a, r) => ({ assignedContacts: a.assignedContacts + r.assignedContacts, calls: a.calls + r.calls, followUpInProgress: a.followUpInProgress + r.followUpInProgress, notInterested: a.notInterested + r.notInterested, enquiryReceived: a.enquiryReceived + r.enquiryReceived }), { assignedContacts: 0, calls: 0, followUpInProgress: 0, notInterested: 0, enquiryReceived: 0 })
        : data.totals)
    : undefined;
  const rangeLabel = range === 'custom' ? `${from} to ${to}` : (RANGES.find((r) => r.key === range)?.label ?? 'All time');

  const donut = useMemo(() => {
    if (!t) return [];
    const pending = Math.max(t.assignedContacts - t.followUpInProgress - t.notInterested - t.enquiryReceived, 0);
    return [
      { label: 'Enquiries received', value: t.enquiryReceived, color: C.enquiry },
      { label: 'Follow-up in progress', value: t.followUpInProgress, color: C.follow },
      { label: 'Not interested', value: t.notInterested, color: C.not },
      { label: 'Yet to action', value: pending, color: C.pending },
    ].filter((s) => s.value > 0);
  }, [t]);

  const bars = useMemo(() => {
    if (!data) return [];
    const rows = assignee ? data.rows.filter((r) => r.userId === assignee) : data.rows;
    return [...rows].sort((a, b) => b.assignedContacts - a.assignedContacts).slice(0, 8);
  }, [data, assignee]);
  const maxAssigned = Math.max(1, ...bars.map((b) => b.assignedContacts));

  const exportCsv = () => {
    if (!data) return;
    const head = ['Member', 'Role', 'Department', 'Assigned', 'Calls done', 'Follow-up in progress', 'Next follow-up', 'Not interested', 'Enquiry received'];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [head.map(esc).join(',')];
    for (const r of shownRows) {
      lines.push([r.name, roleLabel(r.role), r.department ? dept(r.department) : '—', r.assignedContacts, r.calls, r.followUpInProgress, fmtDate(r.nextFollowUpAt), r.notInterested, r.enquiryReceived].map(esc).join(','));
    }
    lines.push(['TOTAL', '', '', t!.assignedContacts, t!.calls, t!.followUpInProgress, '', t!.notInterested, t!.enquiryReceived].map(esc).join(','));
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `performance-${range === 'custom' ? `${from}_${to}` : (range || 'all-time')}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="pf">
      <PageHeader title="Performance" description="Calling activity and lead outcomes by team member" actions={
        <div className="pf-controls">
          <div className="pf-range">
            {RANGES.map((r) => (
              <button key={r.key} className={`pf-range__btn${range === r.key ? ' pf-range__btn--on' : ''}`} onClick={() => setRange(r.key)}>{r.label}</button>
            ))}
          </div>
          {data && data.rows.length > 1 ? (
            <Select label="Assignee" hideLabel size="sm" options={[{ value: '', label: 'Everyone' }, ...data.rows.map((r) => ({ value: r.userId, label: r.name }))]} value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          ) : null}
          <Button variant="secondary" onClick={exportCsv} disabled={!data}><Download size={15} /> Download CSV</Button>
        </div>
      } />

      {range === 'custom' ? (
        <div className="pf-daterow">
          <label className="pf-datefield"><span>From</span><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="pf-datefield"><span>To</span><input type="date" value={to} min={from} max={iso(new Date())} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      ) : null}

      {loading ? <p className="pf-muted">Loading performance…</p> : !data ? <p className="pf-muted">Couldn’t load performance.</p> : (
        <>
          <div className="pf-tiles">
            <Tile icon={Contact} label="Assigned" value={t!.assignedContacts} />
            <Tile icon={PhoneCall} label="Calls done" value={t!.calls} />
            <Tile icon={CalendarClock} label="Follow-up in progress" value={t!.followUpInProgress} />
            <Tile icon={ClipboardList} label="Enquiries received" value={t!.enquiryReceived} tone="ok" />
          </div>

          {funnel ? (
            <div className="pf-funnelwrap">
              <section className="pf-card">
                <h3 className="pf-card__title">Marketing funnel <span className="pf-card__sub">Reach → Enquiry → Activation</span></h3>
                <div className="pf-funnel">
                  <FunnelStage label="New reach" value={funnel.funnel.reach} tone="a" />
                  <FunnelArrow pct={funnel.funnel.enquiryRate} caption="enquiry rate" />
                  <FunnelStage label="New enquiries" value={funnel.funnel.enquiries} tone="b" />
                  <FunnelArrow pct={funnel.funnel.closureRate} caption="closure %" />
                  <FunnelStage label="New activations" value={funnel.funnel.activations} tone="c" />
                </div>
              </section>

              <section className="pf-card">
                <div className="pf-geohead">
                  <h3 className="pf-card__title">Data vs activated</h3>
                  <div className="pf-range">
                    {([['byZone', 'Zone'], ['byState', 'State'], ['byCity', 'City']] as const).map(([k, l]) => (
                      <button key={k} className={`pf-range__btn${geoDim === k ? ' pf-range__btn--on' : ''}`} onClick={() => setGeoDim(k)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="pf-geo">
                  {funnel[geoDim].length === 0 ? <p className="pf-muted">No data in scope.</p> : funnel[geoDim].map((g) => (
                    <div key={g.label} className="pf-georow">
                      <span className="pf-georow__label" title={g.label}>{g.label}</span>
                      <span className="pf-georow__bar"><span className="pf-georow__fill" style={{ width: `${g.pct}%` }} /></span>
                      <span className="pf-georow__val">{g.activated}/{g.data} <em>· {g.pct}%</em></span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          <div className="pf-charts">
            <section className="pf-card">
              <h3 className="pf-card__title">Lead outcomes <span className="pf-card__sub">{rangeLabel}</span></h3>
              {donut.length === 0 ? <p className="pf-muted">No assigned leads yet.</p> : (
                <div className="pf-donutwrap">
                  <Donut segments={donut} center={t!.assignedContacts} caption="assigned" />
                  <ul className="pf-legend">
                    {donut.map((s) => (
                      <li key={s.label}><span className="pf-legend__dot" style={{ background: s.color }} /><span className="pf-legend__label">{s.label}</span><span className="pf-legend__val">{s.value}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="pf-card">
              <h3 className="pf-card__title">Assigned by member</h3>
              {bars.length === 0 ? <p className="pf-muted">No members in scope.</p> : (
                <div className="pf-bars">
                  {bars.map((b) => (
                    <div key={b.userId} className="pf-bar">
                      <span className="pf-bar__name" title={b.name}>{b.name}</span>
                      <span className="pf-bar__track"><span className="pf-bar__fill" style={{ width: `${(b.assignedContacts / maxAssigned) * 100}%` }} /></span>
                      <span className="pf-bar__val">{b.assignedContacts}<em>· {b.calls} calls</em></span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="pf-table">
            <div className="pf-thead">
              <span>Member</span>
              <span className="pf-num">Assigned</span>
              <span className="pf-num">Calls done</span>
              <span className="pf-num">Follow-up in progress</span>
              <span className="pf-num">Next follow-up</span>
              <span className="pf-num">Not interested</span>
              <span className="pf-num">Enquiry received</span>
            </div>
            {shownRows.map((r) => (
              <div key={r.userId} className={`pf-row${r.status === 'disabled' ? ' pf-row--off' : ''}`}>
                <div className="pf-member">
                  <span className="pf-ava">{r.name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()}</span>
                  <div><strong>{r.name}</strong><span>{roleLabel(r.role)}{r.department ? ` · ${dept(r.department)}` : ''}</span></div>
                </div>
                <span className="pf-num">{r.assignedContacts}</span>
                <span className="pf-num pf-strong">{r.calls}</span>
                <span className="pf-num"><em className="pf-dot pf-dot--info" />{r.followUpInProgress}</span>
                <span className="pf-num pf-date">{fmtDate(r.nextFollowUpAt)}</span>
                <span className="pf-num"><em className="pf-dot pf-dot--bad" />{r.notInterested}</span>
                <span className="pf-num"><em className="pf-dot pf-dot--ok" />{r.enquiryReceived}</span>
              </div>
            ))}
            {shownRows.length === 0 ? <div className="pf-empty">No members in scope.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

function Donut({ segments, center, caption }: { segments: { label: string; value: number; color: string }[]; center: number; caption: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 52, cx = 70, cy = 70, C2 = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="pf-donut" role="img" aria-label="Lead outcome distribution">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--crm-surface-sunken, #eef2f6)" strokeWidth="16" />
      {segments.map((s) => {
        const len = (s.value / total) * C2;
        const el = <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${len} ${C2 - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`} />;
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" className="pf-donut__num">{center}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" className="pf-donut__cap">{caption}</text>
    </svg>
  );
}

function FunnelStage({ label, value, tone }: { label: string; value: number; tone: 'a' | 'b' | 'c' }) {
  return (
    <div className={`pf-fstage pf-fstage--${tone}`}>
      <span className="pf-fstage__val">{value}</span>
      <span className="pf-fstage__label">{label}</span>
    </div>
  );
}
function FunnelArrow({ pct, caption }: { pct: number; caption: string }) {
  return <div className="pf-farrow"><strong>{pct}%</strong><span>{caption}</span></div>;
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
function dept(s: string) { return s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }
function roleLabel(r: string) { return r === 'owner' ? 'Owner' : r === 'admin' ? 'Admin' : r === 'manager' ? 'Manager' : r === 'agent' ? 'Team member' : dept(r); }
