import { ArrowRight, Plus, Upload } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, EmptyState, KpiCard } from '@crm/design-system';
import { contentStateView } from '../components';
import { overviewStats } from '../contact-selectors';
import { needsAttention, type AttentionTone } from '../needs-attention';

const TONE_BADGE: Record<AttentionTone, 'warning' | 'danger' | 'neutral'> = {
  warn: 'warning',
  danger: 'danger',
  neutral: 'neutral',
};

/**
 * CON-S01 — Contacts Overview. An action-oriented operational snapshot: totals,
 * what needs a person to act now, and quick actions. Analytical breakdowns and
 * trends live in Reports (CON-S10), not here — the two must not duplicate.
 */
export default function OverviewScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branchId, whatsappNumberId, branch, whatsappNumber } = useWorkspace();

  const scope = {
    branchId: branchId === 'all' ? null : branchId,
    whatsappNumberId: whatsappNumberId === 'all' ? null : whatsappNumberId,
  };
  const stats = overviewStats(scope);
  const attention = needsAttention(scope);

  const state = searchParams.get('state');
  const clearState = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('state');
      return next;
    });
  const stateView = contentStateView(state, { onRetry: clearState });

  const scopeNote = [
    branch ? branch.name : 'All branches',
    whatsappNumber ? whatsappNumber.displayName : 'All numbers',
  ].join(' · ');

  return (
    <div className="crm-overview">
      <PageHeader
        title="Contacts Overview"
        description={`Operational snapshot for ${scopeNote}. For trends and breakdowns, see Reports.`}
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={<Upload />}
              onClick={() => navigate(scopedHref('/contacts/imports/new/method'))}
            >
              Import
            </Button>
            <Button
              variant="primary"
              iconLeft={<Plus />}
              onClick={() => navigate(scopedHref('/contacts/all', { drawer: 'contact', mode: 'add' }))}
            >
              Add contact
            </Button>
          </>
        }
      />

      {stateView ??
        (state === 'empty' ? (
          <EmptyState
            title="No contacts in this workspace yet"
            description="Add your first contact or import a list to see your operational snapshot here."
            actions={
              <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate(scopedHref('/contacts/all', { drawer: 'contact', mode: 'add' }))}>
                Add contact
              </Button>
            }
          />
        ) : (
          <OverviewBody />
        ))}
    </div>
  );

  function OverviewBody() {
    return (
      <>
        <section aria-label="Key figures" className="crm-overview__kpis">
          <KpiCard label="Total contacts" value={stats.total} meta="In current scope" to={scopedHref('/contacts/all')} />
          <KpiCard label="Newly added" value={stats.newlyAdded} meta="Last 14 days" emphasis="gold" to={scopedHref('/contacts/all', { added: '14d' })} />
          <KpiCard
            label="Requiring assignment"
            value={attention.requiringAssignment}
            meta="Zone or owner unresolved"
            to={scopedHref('/contacts/zones')}
          />
          <KpiCard
            label="Possible duplicates"
            value={attention.possibleDuplicates}
            meta="Flagged for review"
            to={scopedHref('/contacts/data-quality')}
          />
        </section>

        <section aria-label="Needs attention" className="crm-overview__section">
          <div className="crm-overview__section-head">
            <h2 className="crm-overview__section-title">Needs attention</h2>
            <Link className="crm-overview__section-link" to={scopedHref('/contacts/reports')}>
              See trends in Reports <ArrowRight size={13} />
            </Link>
          </div>

          {attention.items.length === 0 ? (
            <div className="crm-overview__all-clear">
              You’re all caught up — no contacts need attention right now.
            </div>
          ) : (
            <ul className="crm-overview__attn-list">
              {attention.items.map((item) => (
                <li key={item.key} className="crm-overview__attn-item">
                  <Badge tone={TONE_BADGE[item.tone]}>{item.count}</Badge>
                  <span className="crm-overview__attn-msg">{item.message}</span>
                  <Link
                    className="crm-overview__attn-action"
                    to={scopedHref(item.path, item.query)}
                  >
                    {item.actionLabel} <ArrowRight size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }
}
