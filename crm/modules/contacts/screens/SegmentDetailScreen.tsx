import { ArrowLeft, Download, Megaphone, PhoneCall, SquarePen, Users } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import {
  Badge,
  Button,
  DataTable,
  ErrorState,
  type Column,
} from '@crm/design-system';
import { findBranch, findUser, findSegment, type Contact } from '@crm/mock-data';
import { ConsentBadge, ContactIdentity, SalesTierBadge, StageBadge } from '../components';
import { SegmentConditionRow } from '../components';
import { evaluateSegment } from '../segment-eval';

/**
 * CON-S05 — Segment Detail. Identity, conditions (read-only groups), the
 * recalculated match count and a sample of matching contacts, plus usage.
 */
export default function SegmentDetailScreen() {
  const { segmentId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [, setSearchParams] = useSearchParams();

  const segment = segmentId ? findSegment(segmentId) : undefined;

  if (!segment) {
    return (
      <ErrorState
        title="Segment not found"
        description="This segment may have been deleted or renamed."
        actions={
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/contacts/segments'))}>
            Back to Segments
          </Button>
        }
      />
    );
  }

  const owner = findUser(segment.ownerId);
  const branch = segment.scope.branchId ? findBranch(segment.scope.branchId) : undefined;
  const sample = evaluateSegment({
    groups: segment.conditionGroups ?? [],
    groupJoiner: segment.groupJoiner ?? 'and',
    scope: segment.scope,
  });

  const openExport = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'export');
      next.set('segmentId', segment.id);
      next.set('count', String(segment.count));
      return next;
    });

  const columns: Column<Contact>[] = [
    {
      key: 'identity',
      header: 'Contact',
      width: '30%',
      render: (c) => <ContactIdentity contact={c} to={scopedHref(`/contacts/customer/${c.id}`)} />,
    },
    { key: 'stage', header: 'Stage', render: (c) => <StageBadge stage={c.stage} /> },
    { key: 'consent', header: 'Consent', render: (c) => <ConsentBadge consent={c.consent} /> },
    { key: 'tier', header: 'Tier', render: (c) => <SalesTierBadge tier={c.salesTier} /> },
    { key: 'city', header: 'City', render: (c) => <span className="crm-segd__muted">{c.city}</span> },
  ];

  return (
    <div className="crm-segd">
      <PageHeader
        breadcrumbs={[
          { label: 'Contacts', to: scopedHref('/contacts') },
          { label: 'Segments', to: scopedHref('/contacts/segments') },
          { label: segment.name },
        ]}
        title={segment.name}
        description={segment.description}
        actions={
          <>
            <Button variant="secondary" iconLeft={<Users />} onClick={() => navigate(scopedHref('/contacts/all', { segmentId: segment.id }))}>
              View contacts
            </Button>
            <Button variant="secondary" iconLeft={<Download />} onClick={openExport}>
              Export
            </Button>
            <Button variant="secondary" iconLeft={<Megaphone />} onClick={() => navigate(scopedHref('/campaigns', { segmentId: segment.id, returnTo: `/contacts/segments/${segment.id}` }))}>
              Use in campaign
            </Button>
            <Button variant="secondary" iconLeft={<PhoneCall />} onClick={() => navigate(scopedHref('/calling/lists/new', { segmentId: segment.id, returnTo: `/contacts/segments/${segment.id}` }))}>
              Create Calling List
            </Button>
            <Button variant="primary" iconLeft={<SquarePen />} onClick={() => navigate(scopedHref(`/contacts/segments/${segment.id}/edit`))}>
              Edit
            </Button>
          </>
        }
      />

      <section className="crm-segd__summary">
        <SummaryItem label="Type" value={<Badge tone={segment.type === 'dynamic' ? 'info' : 'neutral'} appearance="outline">{segment.type === 'dynamic' ? 'Dynamic' : 'Snapshot'}</Badge>} />
        <SummaryItem label="Matches" value={<span className="crm-segd__bignum">{segment.count.toLocaleString('en-IN')}</span>} />
        <SummaryItem label="Owner" value={owner?.name ?? '—'} />
        <SummaryItem label="Scope" value={branch ? branch.name : 'All branches'} />
        <SummaryItem label="Last recalculated" value={formatDateTime(segment.updatedAt)} />
      </section>

      <section className="crm-segd__conditions">
        <h2 className="crm-segd__section-title">Conditions</h2>
        <div className="crm-segd__groups">
          {(segment.conditionGroups ?? []).map((group, gi) => (
            <div key={group.id} className="crm-segd__group">
              {gi > 0 ? (
                <span className="crm-segd__group-joiner">{(segment.groupJoiner ?? 'and').toUpperCase()}</span>
              ) : null}
              {group.conditions.map((cond, ci) => (
                <SegmentConditionRow key={cond.id} condition={cond} joiner={ci === 0 ? undefined : group.joiner} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="crm-segd__contacts">
        <h2 className="crm-segd__section-title">Sample of matching contacts</h2>
        <DataTable
          caption="Matching contacts"
          columns={columns}
          rows={sample}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(scopedHref(`/contacts/customer/${c.id}`))}
        />
        <p className="crm-segd__note">
          Showing {sample.length} contacts from the current workspace sample. The recalculated total
          for this segment is {segment.count.toLocaleString('en-IN')}.
        </p>
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="crm-segd__summary-item">
      <span className="crm-segd__summary-label">{label}</span>
      <span className="crm-segd__summary-value">{value}</span>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
