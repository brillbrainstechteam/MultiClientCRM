import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { KpiCard, Select } from '@crm/design-system';
import { contactsInScope, findUser, type Contact } from '@crm/mock-data';
import { BreakdownBars, contentStateView, type BreakdownItem } from '../components';
import { isIncomplete } from '../contact-selectors';
import { salesTierLabel, stageLabel } from '../contact-labels';
import { assignZone } from '../zones/zone-assignment';

const REFERENCE_NOW = new Date('2026-08-10T00:00:00+05:30').getTime();
const STAGE_ORDER: Contact['stage'][] = ['new', 'engaged', 'qualified', 'customer', 'dormant'];
const TIER_ORDER: Contact['salesTier'][] = ['platinum', 'gold', 'silver', 'standard'];

/**
 * CON-S10 — Contact Reports. Growth, mix and quality distributions with scope +
 * period controls. Every distribution row drills into the exact filtered
 * Contacts (CON-S02) or Data Quality (CON-S09) view behind it.
 */
export default function ContactReportsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scopedHref = useScopedHref();
  const { branchId, whatsappNumberId, branch, whatsappNumber } = useWorkspace();

  const period = searchParams.get('period') ?? '30';
  const scope = {
    branchId: branchId === 'all' ? null : branchId,
    whatsappNumberId: whatsappNumberId === 'all' ? null : whatsappNumberId,
  };

  const rows = useMemo(() => contactsInScope(scope), [scope.branchId, scope.whatsappNumberId]);
  const total = rows.length;

  const periodDays = Number(period);
  const newInPeriod = rows.filter(
    (c) => REFERENCE_NOW - new Date(c.createdAt).getTime() <= periodDays * 24 * 60 * 60 * 1000,
  ).length;
  const unassigned = rows.filter((c) => !c.ownerId).length;
  const incomplete = rows.filter(isIncomplete).length;
  const customers = rows.filter((c) => c.stage === 'customer').length;
  const qualified = rows.filter((c) => c.stage === 'qualified').length;
  const conversion = qualified + customers === 0 ? 0 : Math.round((customers / (qualified + customers)) * 100);
  const completeness = total === 0 ? 0 : Math.round(((total - incomplete) / total) * 100);

  const byStage: BreakdownItem[] = STAGE_ORDER.map((stage) => ({
    label: stageLabel[stage],
    value: rows.filter((c) => c.stage === stage).length,
    href: scopedHref('/contacts/all', { stage }),
  })).filter((i) => i.value > 0);

  const bySource: BreakdownItem[] = groupBy(rows, (c) => c.source).map((g) => ({
    label: g.key,
    value: g.count,
    href: scopedHref('/contacts/all', { source: g.key }),
  }));

  const byOwner: BreakdownItem[] = groupBy(rows, (c) => c.ownerId).map((g) => ({
    label: g.key ? findUser(g.key)?.name ?? g.key : 'Unassigned',
    value: g.count,
    href: g.key
      ? scopedHref('/contacts/all', { ownerId: g.key })
      : scopedHref('/contacts/data-quality', { tab: 'ownership' }),
  }));

  const byTier: BreakdownItem[] = TIER_ORDER.map((tier) => ({
    label: salesTierLabel[tier],
    value: rows.filter((c) => c.salesTier === tier).length,
  })).filter((i) => i.value > 0);

  const byCity: BreakdownItem[] = groupBy(rows, (c) => c.city).map((g) => ({
    label: g.key,
    value: g.count,
    href: scopedHref('/contacts/all', { q: g.key }),
  }));

  const byZone: BreakdownItem[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of rows) {
      const r = assignZone({ city: c.city });
      const label =
        r.zoneName ?? (r.status === 'location-required' ? 'Location required' : 'Unmapped zone');
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const scopeNote = [branch ? branch.name : 'All branches', whatsappNumber ? whatsappNumber.displayName : 'All numbers'].join(' · ');

  const state = searchParams.get('state');
  const stateView = contentStateView(state, {
    onRetry: () => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('state'); return n; }),
  });

  return (
    <div className="crm-reports">
      <PageHeader
        title="Contact Reports"
        description={`Growth and quality across ${scopeNote}. Click any bar to open the exact contacts behind it.`}
        actions={
          <Select
            label="Period"
            hideLabel
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
              { value: '365', label: 'Last 12 months' },
            ]}
            value={period}
            onChange={(e) => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('period', e.target.value); return n; })}
          />
        }
      />

      {stateView}
      {stateView ? null : (
      <>
      <section className="crm-reports__kpis">
        <KpiCard label="Total contacts" value={total} meta="In current scope" />
        <KpiCard label={`New (last ${period}d)`} value={newInPeriod} meta="Growth" emphasis="gold" />
        <KpiCard label="Qualified → Customer" value={`${conversion}%`} meta="Conversion" />
        <KpiCard label="Profile completeness" value={`${completeness}%`} meta={`${incomplete} incomplete`} />
      </section>

      <section className="crm-reports__grid">
        <BreakdownBars title="By stage" items={byStage} total={total} />
        <BreakdownBars title="By source" items={bySource} total={total} />
        <BreakdownBars title="By team member" items={byOwner} total={total} />
        <BreakdownBars title="By zone" items={byZone} total={total} />
        <BreakdownBars title="Sales tier distribution" items={byTier} total={total} />
        <BreakdownBars title="By city" items={byCity} total={total} />
        <div className="crm-reports__quality">
          <h3 className="crm-reports__quality-title">Data quality</h3>
          <QualityRow label="Complete profiles" value={total - incomplete} total={total} />
          <QualityRow label="Incomplete" value={incomplete} total={total} tone="warn" href={scopedHref('/contacts/data-quality', { tab: 'incomplete' })} />
          <QualityRow label="Unassigned" value={unassigned} total={total} tone="warn" href={scopedHref('/contacts/data-quality', { tab: 'ownership' })} />
        </div>
      </section>
      </>
      )}
    </div>
  );
}

function QualityRow({ label, value, total, tone, href }: { label: string; value: number; total: number; tone?: 'warn'; href?: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const body = (
    <>
      <span className="crm-reports__q-label">{label}</span>
      <span className="crm-reports__q-bar" aria-hidden="true">
        <span className={`crm-reports__q-fill${tone === 'warn' ? ' crm-reports__q-fill--warn' : ''}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="crm-reports__q-value">{value}</span>
    </>
  );
  return href ? (
    <Link className="crm-reports__q-row crm-reports__q-row--link" to={href}>{body}</Link>
  ) : (
    <div className="crm-reports__q-row">{body}</div>
  );
}

function groupBy(rows: Contact[], key: (c: Contact) => string): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) map.set(key(row), (map.get(key(row)) ?? 0) + 1);
  return [...map.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}
