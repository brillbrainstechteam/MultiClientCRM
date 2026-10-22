import { useCallback, useEffect, useState } from 'react';
import { Target, Pencil, TrendingUp, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Button, Input, Modal, Select } from '@crm/design-system';
import './TargetsPage.css';

/**
 * Yearly gram targets (PRD §19, TGT-01..07).
 *
 * Jewellery sales are measured in grams, not rupees, and there was no target of
 * any kind in the product before this.
 *
 * Achievement is computed server-side from orders rather than stored, so the
 * number here can never disagree with the orders it claims to summarise.
 */

interface Row {
  userId: string;
  name: string;
  teamFunction: string | null;
  note: string | null;
  targetGrams: number;
  achievedGrams: number;
  remainingGrams: number;
  percent: number;
  met: boolean;
}

interface ActivityTarget { userId: string; kind: string; value: number; period: string | null }

interface Payload {
  period: string;
  rows: Row[];
  totals: { targetGrams: number; achievedGrams: number; remainingGrams: number; percent: number; met: boolean };
  unattributedGrams: number;
  activityTargets: ActivityTarget[];
  canEdit: boolean;
}

function formatGrams(g: number): string {
  if (!Number.isFinite(g)) return '0 g';
  if (Math.abs(g) >= 1000) return `${(g / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`;
  return `${g.toLocaleString('en-IN', { maximumFractionDigits: 2 })} g`;
}

/** The financial years a business would plausibly be looking at. */
function periodOptions(): string[] {
  const now = new Date();
  const startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return [startYear + 1, startYear, startYear - 1, startYear - 2]
    .map((y) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`);
}

export default function TargetsPage() {
  const periods = periodOptions();
  const [period, setPeriod] = useState(periods[1]);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback((p: string) => {
    setLoading(true);
    fetch(`/api/crm/targets?period=${encodeURIComponent(p)}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: Payload & { error?: string }) => {
        if (d.error) setError(d.error);
        else { setData(d); setError(null); }
      })
      .catch(() => setError('Could not load targets.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(period); }, [load, period]);

  return (
    <div className="tg">
      <PageHeader
        title="Targets"
        description="Yearly gram targets for the sales team, measured against confirmed orders."
        actions={
          <Select
            label="Year" hideLabel size="sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={periods.map((p) => ({ value: p, label: `FY ${p}` }))}
          />
        }
      />

      {error && <p className="tg__error">{error}</p>}
      {loading && <p className="tg__muted">Loading…</p>}

      {data && !loading && (
        <>
          <section className="tg__summary">
            <div className="tg__stat">
              <span className="tg__statlabel">Team target</span>
              <strong>{formatGrams(data.totals.targetGrams)}</strong>
            </div>
            <div className="tg__stat">
              <span className="tg__statlabel">Achieved</span>
              <strong className="tg__achieved">{formatGrams(data.totals.achievedGrams)}</strong>
            </div>
            <div className="tg__stat">
              <span className="tg__statlabel">Remaining</span>
              <strong>{formatGrams(data.totals.remainingGrams)}</strong>
            </div>
            <div className="tg__stat">
              <span className="tg__statlabel">Attainment</span>
              <strong>{data.totals.percent}%</strong>
            </div>
          </section>

          {/* Grams on orders with no salesperson belong to nobody's target.
              Saying so is better than letting the totals quietly not add up. */}
          {data.unattributedGrams > 0 && (
            <p className="tg__note">
              <AlertTriangle size={14} aria-hidden="true" />
              {formatGrams(data.unattributedGrams)} is on orders with no salesperson set, so it
              counts toward nobody&rsquo;s target.
            </p>
          )}

          {data.rows.length === 0 ? (
            <div className="tg__empty">
              <Target size={40} aria-hidden="true" />
              <h2>No targets set for FY {data.period}</h2>
              <p>
                {data.canEdit
                  ? 'Set a gram target for each salesperson and progress will build from their confirmed orders.'
                  : 'Your manager has not set a target for this year yet.'}
              </p>
            </div>
          ) : (
            <ul className="tg__list">
              {data.rows.map((r) => (
                <li key={r.userId} className="tg__row">
                  <div className="tg__who">
                    <strong>{r.name}</strong>
                    {r.teamFunction && <Badge tone="neutral">{r.teamFunction}</Badge>}
                    {r.met && <Badge tone="success"><TrendingUp size={11} /> Target met</Badge>}
                  </div>

                  <div className="tg__bar" role="img"
                    aria-label={`${r.percent}% of ${formatGrams(r.targetGrams)}`}>
                    <span
                      className={`tg__fill${r.met ? ' tg__fill--met' : ''}`}
                      style={{ width: `${Math.min(100, r.percent)}%` }}
                    />
                  </div>

                  <div className="tg__numbers">
                    <span><em>{formatGrams(r.achievedGrams)}</em> of {formatGrams(r.targetGrams)}</span>
                    <span className="tg__pct">{r.percent}%</span>
                    {data.canEdit && (
                      <button className="tg__edit" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}'s target`}>
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {editing && (
        <EditTarget
          row={editing}
          period={period}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(period); }}
        />
      )}
    </div>
  );
}

function EditTarget({
  row, period, onClose, onSaved,
}: { row: Row; period: string; onClose: () => void; onSaved: () => void }) {
  const [grams, setGrams] = useState(String(row.targetGrams || ''));
  const [note, setNote] = useState(row.note ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    const n = Number(grams);
    if (!Number.isFinite(n) || n < 0) { setErr('Enter the target in grams.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/crm/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId: row.userId, period, targetGrams: n, note }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr((d as { error?: string }).error ?? 'Could not save.'); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${row.name} — FY ${period}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save target'}
          </Button>
        </>
      }
    >
      <div className="tg__form">
        <Input
          label="Yearly target (grams)"
          type="number"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          placeholder="e.g. 12000"
          hint="Counted from confirmed orders onward — quotations and enquiries do not count."
        />
        <Input
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Includes the Chennai accounts"
        />
        {err && <p className="tg__error">{err}</p>}
      </div>
    </Modal>
  );
}
