import { useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Bot,
  Copy,
  Globe,
  Megaphone,
  RefreshCw,
  RotateCcw,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Banner,
  Button,
  ConfirmDialog,
  ErrorState,
  PermissionRestricted,
  Tabs,
  Toast,
  type TabItem,
} from '@crm/design-system';
import { users } from '@crm/mock-data';
import { TemplateStatusBadge, WhatsAppTemplatePreview } from '../components';
import type { CrmTemplateState, MetaTemplateStatus } from '../domain/types';
import { findTemplate, templatesByFamily } from '../data/mockTemplates';
import { findWaba } from '../data/wabas';
import { metaCategoryLabel, useCaseLabel, formatLabel } from '../templates-labels';
import { can, canEditTemplate } from '../permissions';

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'languages', label: 'Language Versions' },
  { id: 'history', label: 'History' },
  { id: 'performance', label: 'Performance' },
];

/**
 * TPL-S02 — Template Detail. Complete source of truth for one template, with
 * a dynamic primary CTA driven by lifecycle state (spec §Template Detail).
 * Archive/Restore/Delete/Sync are simulated locally (no production backend);
 * Fix & Resubmit opens the Rejection & Resolution drawer (TPL-S09, Batch 2+).
 */
export default function TemplateDetailScreen() {
  const { templateId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();

  const template = templateId ? findTemplate(templateId) : undefined;

  const [localCrmState, setLocalCrmState] = useState<CrmTemplateState | null>(null);
  const [localMetaStatus] = useState<MetaTemplateStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);

  if (!template) {
    return (
      <ErrorState
        title="Template not found"
        description="This template may have been permanently deleted, or the link is out of date."
        actions={
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/templates'))}>
            Back to Templates
          </Button>
        }
      />
    );
  }

  if (searchParams.get('state') === 'permission-denied') {
    return (
      <PermissionRestricted
        title="You do not have access to this template"
        description={`Your role (${currentUser.roleLabel}) cannot open this record.`}
        actions={
          <Button variant="secondary" onClick={() => navigate(scopedHref('/templates'))}>
            Back to Templates
          </Button>
        }
      />
    );
  }

  const crmState = localCrmState ?? template.crmState;
  const metaStatus = localMetaStatus ?? template.metaStatus;
  const working = { ...template, crmState, metaStatus };

  const waba = findWaba(template.wabaId);
  const creator = users.find((u) => u.id === template.creatorId);
  const activeTab = searchParams.get('tab') ?? 'overview';
  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  const editable = canEditTemplate(role, currentUser.id, working);
  const returnTo = `/templates/${template.id}`;

  const openRejection = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'rejection');
      next.set('templateId', template.id);
      return next;
    });

  const continueEditing = () =>
    navigate(scopedHref('/templates/new', { source: 'edit', templateId: template.id, step: 'compose', format: template.format }));

  const familyMembers = templatesByFamily(template.familyId);

  return (
    <div className="crm-tpl-detail">
      <PageHeader
        breadcrumbs={[{ label: 'Templates', to: scopedHref('/templates') }, { label: template.name }]}
        title={template.name}
        description={`${useCaseLabel[template.useCase]} · ${metaCategoryLabel[template.metaCategory]} · ${template.localeLabel} · ${formatLabel[template.format]}`}
        actions={
          <>
            {crmState === 'draft' && editable ? (
              <Button variant="primary" iconLeft={<SquarePen />} onClick={continueEditing}>Continue Editing</Button>
            ) : null}
            {metaStatus === 'approved' && crmState === 'normal' ? (
              <Button
                variant="primary"
                iconLeft={<Megaphone />}
                onClick={() => navigate(scopedHref('/campaigns', { templateId: template.id, locale: template.locale, waba: template.wabaId, returnTo }))}
              >
                Use Template
              </Button>
            ) : null}
            {metaStatus === 'rejected' ? (
              <Button variant="primary" iconLeft={<SquarePen />} onClick={openRejection}>Fix & Resubmit</Button>
            ) : null}
            {crmState === 'archived' ? (
              <Button
                variant="primary"
                iconLeft={<RotateCcw />}
                onClick={() => {
                  setLocalCrmState('normal');
                  setToast('Template restored to the active repository.');
                }}
                disabled={!can(role, 'archive')}
              >
                Restore
              </Button>
            ) : null}

            <Button variant="secondary" iconLeft={<Copy />} onClick={() => navigate(scopedHref('/templates/new', { source: 'clone', cloneFrom: template.id, step: 'basics' }))}>
              Clone
            </Button>
            <Button variant="secondary" iconLeft={<Globe />} onClick={() => navigate(scopedHref('/templates/new', { source: 'language', familyId: template.familyId, step: 'basics' }))}>
              Add language
            </Button>
            {crmState === 'normal' ? (
              <Button variant="ghost" iconLeft={<Archive />} disabled={!can(role, 'archive')} onClick={() => setConfirmAction('archive')}>
                Archive
              </Button>
            ) : null}
            {can(role, 'delete') && crmState !== 'deleted' ? (
              <Button variant="ghost" iconLeft={<Trash2 />} onClick={() => setConfirmAction('delete')}>
                Delete
              </Button>
            ) : null}
            <Button
              variant="ghost"
              iconLeft={<RefreshCw />}
              onClick={() => setToast('Synced with Meta — status is up to date.')}
            >
              Sync
            </Button>
            <Button variant="ghost" iconLeft={<Bot />} onClick={() => navigate(scopedHref('/automation', { templateId: template.id, returnTo }))}>
              Add to Journey
            </Button>
          </>
        }
      />

      <StatusBanner crmState={crmState} metaStatus={metaStatus} onFix={openRejection} />

      <div className="crm-tpl-detail__meta">
        <TemplateStatusBadge template={working} />
        <span>Creator: {creator?.name ?? 'Unknown'}</span>
        <span>Updated: {formatDateTime(template.updatedAt)}</span>
        {template.metaTemplateId ? <span>Meta ID: {template.metaTemplateId}</span> : null}
        {waba ? <span>WABA: {waba.name}</span> : null}
      </div>

      <Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Template detail sections" />

      <div className="crm-tpl-detail__layout">
        <section className="crm-tpl-detail__panel">
          {activeTab === 'overview' ? (
            <FieldGrid
              fields={[
                ['Template name', template.name],
                ['Business use case', useCaseLabel[template.useCase]],
                ['Meta category', metaCategoryLabel[template.metaCategory]],
                ['Language', template.localeLabel],
                ['Writing style', template.writingStyle === 'hinglish' ? 'Hinglish' : 'Standard'],
                ['Format', formatLabel[template.format]],
                ['Footer', template.components.footer ?? '—'],
                ['Buttons', template.components.buttons.length ? template.components.buttons.map((b) => b.label).join(', ') : 'None'],
                ['Variables', template.components.variables.length ? template.components.variables.map((v) => `{{${v.index}}} — ${v.description}`).join('; ') : 'None'],
                ['Tags', template.tags.length ? template.tags.join(', ') : '—'],
                ['Folder', template.folder ?? '—'],
              ]}
            />
          ) : null}

          {activeTab === 'languages' ? (
            <div className="crm-tpl-detail__languages">
              {familyMembers.map((member) => (
                <button
                  key={member.id}
                  className={`crm-tpl-detail__lang-row${member.id === template.id ? ' is-current' : ''}`}
                  onClick={() => member.id !== template.id && navigate(scopedHref(`/templates/${member.id}`))}
                >
                  <span>{member.localeLabel}</span>
                  <TemplateStatusBadge template={member} />
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Globe />}
                onClick={() => navigate(scopedHref('/templates/new', { source: 'language', familyId: template.familyId, step: 'basics' }))}
              >
                Add language
              </Button>
            </div>
          ) : null}

          {activeTab === 'history' ? (
            <p className="crm-tpl-detail__deferred">Version history is deferred to Phase 2/3 — submission history is shown below.</p>
          ) : null}

          {activeTab === 'performance' ? (
            <p className="crm-tpl-detail__deferred">Template performance is deferred — aggregated attribution belongs to Campaigns/Reports.</p>
          ) : null}

          {template.submissionHistory.length > 0 ? (
            <div className="crm-tpl-detail__submissions">
              <h2 className="crm-tpl-detail__section-title">Submission history</h2>
              <ul>
                {template.submissionHistory.map((submission, index) => (
                  <li key={index}>
                    <span>{formatDateTime(submission.submittedAt)}</span>
                    <span>{submission.status}</span>
                    {submission.metaReference ? <span>{submission.metaReference}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="crm-tpl-detail__preview">
          <WhatsAppTemplatePreview components={template.components} format={template.format} />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === 'delete' ? 'Delete this template?' : 'Archive this template?'}
        message={
          confirmAction === 'delete'
            ? 'This moves the template to Deleted. It stops appearing in the repository and cannot be used in campaigns or journeys.'
            : 'Archiving removes this template from active use. You can restore it later.'
        }
        confirmLabel={confirmAction === 'delete' ? 'Delete' : 'Archive'}
        tone={confirmAction === 'delete' ? 'danger' : 'default'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction === 'delete') {
            setLocalCrmState('deleted');
            setToast('Template deleted.');
          } else {
            setLocalCrmState('archived');
            setToast('Template archived.');
          }
          setConfirmAction(null);
        }}
      />

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function StatusBanner({
  crmState,
  metaStatus,
  onFix,
}: {
  crmState: CrmTemplateState;
  metaStatus: MetaTemplateStatus;
  onFix: () => void;
}) {
  if (crmState === 'deleted') {
    return <Banner tone="danger" title="This template is deleted" description="It is hidden from the repository and cannot be used." />;
  }
  if (crmState === 'archived') {
    return <Banner tone="info" title="This template is archived" description="Restore it to use it again in campaigns or journeys." />;
  }
  if (crmState === 'draft') {
    return <Banner tone="info" title="Draft — not yet submitted to Meta" description="Continue editing to complete and submit this template." />;
  }
  if (metaStatus === 'approved') {
    return <Banner tone="info" title="Approved and usable" description="This template can be sent in campaigns, journeys and Inbox re-engagement." />;
  }
  if (metaStatus === 'pending') {
    return <Banner tone="warning" title="Under Meta review" description="Editing is restricted while a submission is pending." />;
  }
  if (metaStatus === 'rejected') {
    return (
      <Banner
        tone="danger"
        title="Rejected by Meta — action required"
        description="Review the rejection reason and fix the template before resubmitting."
        actions={<Button variant="secondary" size="sm" onClick={onFix}>View rejection</Button>}
      />
    );
  }
  if (metaStatus === 'in_appeal') {
    return <Banner tone="warning" title="Appeal in progress" description="Meta is re-reviewing this template following your appeal." />;
  }
  if (metaStatus === 'disabled') {
    return <Banner tone="warning" title="Disabled by Meta" description="This template is not currently usable. Contact support if this is unexpected." />;
  }
  return null;
}

function FieldGrid({ fields }: { fields: [string, string][] }) {
  return (
    <dl className="crm-tpl-fieldgrid">
      {fields.map(([label, value]) => (
        <div key={label} className="crm-tpl-fieldgrid__item">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
