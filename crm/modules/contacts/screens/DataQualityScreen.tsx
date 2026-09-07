import { Wand2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Tabs,
  type Column,
  type TabItem,
} from '@crm/design-system';
import { findContact, findUser, type Contact } from '@crm/mock-data';
import { ConsentBadge, ContactIdentity, StageBadge } from '../components';
import {
  consentIssues,
  dataQualityCounts,
  duplicateClustersInScope,
  incompleteProfiles,
  missingFields,
  missingOwnership,
  phoneQueue,
} from '../data-quality';

/**
 * CON-S09 — Data Quality. Five issue views (incomplete, phone/format,
 * duplicates, missing ownership, consent) with drilldowns to Customer 360,
 * Merge Review (CON-S11) and the operational overlays. Tab is URL-driven.
 */
export default function DataQualityScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { branchId, whatsappNumberId } = useWorkspace();

  const scope = {
    branchId: branchId === 'all' ? null : branchId,
    whatsappNumberId: whatsappNumberId === 'all' ? null : whatsappNumberId,
  };
  const counts = dataQualityCounts(scope);

  const tabs: TabItem[] = [
    { id: 'incomplete', label: 'Incomplete profiles', count: counts.incomplete },
    { id: 'phone', label: 'Phone format', count: counts.phone },
    { id: 'duplicates', label: 'Possible duplicates', count: counts.duplicates },
    { id: 'ownership', label: 'Missing ownership', count: counts.ownership },
    { id: 'consent', label: 'Consent issues', count: counts.consent },
  ];
  const activeTab = searchParams.get('tab') ?? 'incomplete';
  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  const openOverlay = (contactId: string, params: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('contactId', contactId);
      for (const [k, v] of Object.entries(params)) next.set(k, v);
      return next;
    });

  const flash = (message: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('flash', message);
      return next;
    });

  const identityCol: Column<Contact> = {
    key: 'identity',
    header: 'Contact',
    width: '28%',
    render: (c) => <ContactIdentity contact={c} to={scopedHref(`/contacts/customer/${c.id}`)} />,
  };

  return (
    <div className="crm-dq">
      <PageHeader
        title="Data Quality"
        description="Find and fix contacts that need attention. Corrections here keep your database clean and campaign-ready."
      />

      <Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Data quality issues" />

      <div className="crm-dq__panel">
        {activeTab === 'incomplete' ? (
          <DataTable
            caption="Incomplete profiles"
            columns={[
              identityCol,
              { key: 'missing', header: 'Missing', render: (c) => (
                <span className="crm-dq__missing">
                  {missingFields(c).map((m) => <Badge key={m} tone="warning">{m}</Badge>)}
                </span>
              ) },
              { key: 'owner', header: 'Owner', render: (c) => ownerCell(c) },
              { key: 'action', header: '', align: 'right', render: (c) => (
                <Button variant="secondary" size="sm" onClick={() => openOverlay(c.id, { drawer: 'contact', mode: 'edit' })}>Fix</Button>
              ) },
            ]}
            rows={incompleteProfiles(scope)}
            rowKey={(c) => c.id}
            emptyState={<NoIssues label="All profiles are complete." />}
          />
        ) : null}

        {activeTab === 'phone' ? (
          <div className="crm-dq__phone">
            <div className="crm-dq__phone-head">
              <p className="crm-dq__note">These numbers can be standardized to the E.164 format. No hard-invalid numbers were found in scope.</p>
              <Button variant="secondary" size="sm" iconLeft={<Wand2 />} onClick={() => flash('All numbers standardized')}>
                Standardize all
              </Button>
            </div>
            <div className="crm-dq__phone-table">
              <div className="crm-dq__phone-row crm-dq__phone-row--head"><span>Contact</span><span>Stored</span><span>Standardized</span><span /></div>
              {phoneQueue.map((p) => (
                <div key={p.contactId} className="crm-dq__phone-row">
                  <span className="crm-dq__strong">{p.name}</span>
                  <span className="crm-dq__raw">{p.raw}</span>
                  <span className="crm-dq__norm">{p.normalized}</span>
                  <Button variant="ghost" size="sm" onClick={() => flash(`Standardized ${p.name}`)}>Fix</Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'duplicates' ? (
          <div className="crm-dq__dupes">
            {duplicateClustersInScope(scope).map((cluster) => (
              <div key={cluster.id} className="crm-dq__dupe">
                <div className="crm-dq__dupe-info">
                  <div className="crm-dq__dupe-top">
                    <Badge tone={cluster.matchStrength === 'strong' ? 'danger' : 'warning'}>
                      {cluster.matchStrength === 'strong' ? 'Strong match' : 'Possible match'}
                    </Badge>
                    <span className="crm-dq__dupe-reason">{cluster.matchReason}</span>
                  </div>
                  <span className="crm-dq__dupe-names">
                    {cluster.contactIds.map((id) => findContact(id)?.name ?? id).join('  ·  ')}
                  </span>
                </div>
                <Button variant="primary" size="sm" onClick={() => navigate(scopedHref(`/contacts/data-quality/duplicates/${cluster.id}`))}>
                  Review &amp; merge
                </Button>
              </div>
            ))}
            {duplicateClustersInScope(scope).length === 0 ? <NoIssues label="No possible duplicates in scope." /> : null}
          </div>
        ) : null}

        {activeTab === 'ownership' ? (
          <>
            <div className="crm-dq__bulk">
              <span>{counts.ownership} contacts have no owner.</span>
              <Button variant="secondary" size="sm" onClick={() => openOverlay('', { drawer: 'assign', count: String(counts.ownership) })}>
                Assign all
              </Button>
            </div>
            <DataTable
              caption="Missing ownership"
              columns={[
                identityCol,
                { key: 'stage', header: 'Stage', render: (c) => <StageBadge stage={c.stage} /> },
                { key: 'source', header: 'Source', render: (c) => <span className="crm-dq__muted">{c.source}</span> },
                { key: 'action', header: '', align: 'right', render: (c) => (
                  <Button variant="secondary" size="sm" onClick={() => openOverlay(c.id, { drawer: 'assign' })}>Assign</Button>
                ) },
              ]}
              rows={missingOwnership(scope)}
              rowKey={(c) => c.id}
              emptyState={<NoIssues label="Every contact has an owner." />}
            />
          </>
        ) : null}

        {activeTab === 'consent' ? (
          <DataTable
            caption="Consent issues"
            columns={[
              identityCol,
              { key: 'consent', header: 'Consent', render: (c) => <ConsentBadge consent={c.consent} /> },
              { key: 'eligibility', header: 'Campaigns', render: () => <Badge tone="danger">Excluded</Badge> },
              { key: 'action', header: '', align: 'right', render: (c) => (
                <Button variant="secondary" size="sm" onClick={() => openOverlay(c.id, { drawer: 'consent' })}>Manage consent</Button>
              ) },
            ]}
            rows={consentIssues(scope)}
            rowKey={(c) => c.id}
            emptyState={<NoIssues label="Everyone in scope is opted in." />}
          />
        ) : null}
      </div>
    </div>
  );
}

function ownerCell(c: Contact) {
  const owner = findUser(c.ownerId);
  return owner ? <span>{owner.name}</span> : <span className="crm-dq__unassigned">Unassigned</span>;
}

function NoIssues({ label }: { label: string }) {
  return <EmptyState title="No issues here" description={label} />;
}
