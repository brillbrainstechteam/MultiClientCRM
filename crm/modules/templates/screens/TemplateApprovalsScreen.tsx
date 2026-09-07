import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, Drawer, EmptyState, PermissionRestricted, Tabs, Textarea, type TabItem } from '@crm/design-system';
import { users } from '@crm/mock-data';
import { WhatsAppTemplatePreview } from '../components';
import { templates } from '../data/mockTemplates';
import type { InternalApprovalStage } from '../domain/types';
import { useCaseLabel, metaCategoryLabel } from '../templates-labels';
import { can } from '../permissions';

const tabs: TabItem[] = [
  { id: 'awaiting-review', label: 'Awaiting Review' },
  { id: 'changes-requested', label: 'Changes Requested' },
  { id: 'approved-internally', label: 'Approved Internally' },
  { id: 'submitted-meta', label: 'Submitted to Meta' },
];

/** TPL-S13/S14 — Internal Approval Queue and Internal Template Review. Only shown when internal approval is enabled. */
export default function TemplateApprovalsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();

  const [overrides, setOverrides] = useState<Record<string, InternalApprovalStage>>({});

  if (!can(role, 'viewApprovalsQueue')) {
    return (
      <PermissionRestricted
        title="You do not have access to Internal Approvals"
        description={`Your role (${currentUser.roleLabel}) cannot review templates.`}
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/templates'))}>Back to Templates</Button>}
      />
    );
  }

  if (searchParams.get('state') === 'disabled') {
    return (
      <EmptyState
        title="Internal approval is turned off"
        description="This workspace submits templates directly to Meta. Enable internal approval in Settings to route templates through review first."
      />
    );
  }

  const view = (searchParams.get('view') as InternalApprovalStage | null) ?? 'awaiting-review';
  const setParam = (key: string, value: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    });

  const stageOf = (id: string, fallback?: InternalApprovalStage) => overrides[id] ?? fallback;
  const rows = templates.filter((t) => t.internalApproval && stageOf(t.id, t.internalApproval.stage) === view);

  const reviewId = searchParams.get('drawer') === 'review' ? searchParams.get('templateId') : null;
  const reviewTemplate = templates.find((t) => t.id === reviewId);

  const openReview = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'review');
      next.set('templateId', id);
      return next;
    });

  const closeReview = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.delete('templateId');
      return next;
    });

  const decide = (id: string, stage: InternalApprovalStage) => {
    setOverrides((prev) => ({ ...prev, [id]: stage }));
    closeReview();
  };

  return (
    <div className="crm-tpl-approvals">
      <PageHeader
        title="Internal Approvals"
        description="Templates awaiting internal sign-off before they reach Meta."
        toolbar={<Tabs tabs={tabs.map((t) => ({ ...t, count: templates.filter((x) => x.internalApproval && stageOf(x.id, x.internalApproval.stage) === t.id).length }))} activeId={view} onChange={(id) => setParam('view', id)} ariaLabel="Approval stage" />}
      />

      {rows.length === 0 ? (
        <EmptyState title="Nothing here" description="No templates are currently in this stage." />
      ) : (
        <ul className="crm-tpl-approvals__list">
          {rows.map((t) => (
            <li key={t.id}>
              <button className="crm-tpl-approvals__row" onClick={() => openReview(t.id)}>
                <div>
                  <p className="crm-tpl-approvals__name">{t.name}</p>
                  <p className="crm-tpl-approvals__meta">{useCaseLabel[t.useCase]} · {metaCategoryLabel[t.metaCategory]} · {users.find((u) => u.id === t.creatorId)?.name}</p>
                </div>
                <Badge tone="neutral">{tabs.find((tab) => tab.id === view)?.label}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={Boolean(reviewTemplate)}
        title="Internal Template Review"
        subtitle={reviewTemplate?.name}
        onClose={closeReview}
        footer={
          reviewTemplate ? (
            <ReviewActions template={reviewTemplate} onDecide={decide} />
          ) : undefined
        }
      >
        {reviewTemplate ? <ReviewBody template={reviewTemplate} /> : null}
      </Drawer>
    </div>
  );
}

function ReviewBody({ template }: { template: (typeof templates)[number] }) {
  return (
    <div className="crm-tpl-approvals__review">
      <WhatsAppTemplatePreview components={template.components} format={template.format} />
      <dl className="crm-tpl-approvals__review-meta">
        <div><dt>Author</dt><dd>{users.find((u) => u.id === template.creatorId)?.name ?? 'Unknown'}</dd></div>
        <div><dt>Use case</dt><dd>{useCaseLabel[template.useCase]}</dd></div>
        <div><dt>Category</dt><dd>{metaCategoryLabel[template.metaCategory]}</dd></div>
        <div><dt>Language</dt><dd>{template.localeLabel}</dd></div>
      </dl>
    </div>
  );
}

function ReviewActions({
  template,
  onDecide,
}: {
  template: (typeof templates)[number];
  onDecide: (id: string, stage: InternalApprovalStage) => void;
}) {
  const [showReasonFor, setShowReasonFor] = useState<'request-changes' | 'reject' | null>(null);
  const [reason, setReason] = useState('');

  if (showReasonFor) {
    return (
      <div className="crm-tpl-approvals__reason">
        <Textarea
          label={showReasonFor === 'reject' ? 'Reason for rejection' : 'What needs to change?'}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="crm-tpl-approvals__reason-actions">
          <Button variant="secondary" onClick={() => setShowReasonFor(null)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!reason.trim()}
            onClick={() => onDecide(template.id, showReasonFor === 'reject' ? 'changes-requested' : 'changes-requested')}
          >
            Submit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setShowReasonFor('reject')}>Reject Internally</Button>
      <Button variant="secondary" onClick={() => setShowReasonFor('request-changes')}>Request Changes</Button>
      <Button variant="primary" onClick={() => onDecide(template.id, 'submitted-meta')}>Approve & Submit</Button>
    </>
  );
}
