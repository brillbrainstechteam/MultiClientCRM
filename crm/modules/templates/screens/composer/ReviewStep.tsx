import { Banner, Select } from '@crm/design-system';
import { users } from '@crm/mock-data';
import { WhatsAppTemplatePreview } from '../../components';
import type { WhatsAppBusinessAccount } from '../../domain/types';
import type { ValidationResult } from '../../domain/validation';
import { metaCategoryLabel, useCaseLabel, formatLabel } from '../../templates-labels';
import type { ComposerDraft } from './composer-state';

export function ReviewStep({
  draft,
  waba,
  validation,
  creatorId,
  approvalMode,
  onApprovalModeChange,
  canApproveDirectly,
}: {
  draft: ComposerDraft;
  waba: WhatsAppBusinessAccount;
  validation: ValidationResult;
  creatorId: string;
  approvalMode: 'off' | 'required';
  onApprovalModeChange: (mode: 'off' | 'required') => void;
  canApproveDirectly: boolean;
}) {
  const creator = users.find((u) => u.id === creatorId);

  return (
    <div className="crm-review-step">
      <div className="crm-review-step__summary">
        <dl className="crm-tpl-fieldgrid crm-review-step__fields">
          <div className="crm-tpl-fieldgrid__item"><dt>Name</dt><dd>{draft.name}</dd></div>
          <div className="crm-tpl-fieldgrid__item"><dt>WhatsApp account</dt><dd>{waba.name}</dd></div>
          <div className="crm-tpl-fieldgrid__item"><dt>Use case</dt><dd>{useCaseLabel[draft.useCase]}</dd></div>
          <div className="crm-tpl-fieldgrid__item"><dt>Meta category</dt><dd>{metaCategoryLabel[draft.metaCategory]}</dd></div>
          <div className="crm-tpl-fieldgrid__item"><dt>Language</dt><dd>{draft.localeLabel || draft.locale}</dd></div>
          <div className="crm-tpl-fieldgrid__item"><dt>Format</dt><dd>{formatLabel[draft.format]}</dd></div>
          <div className="crm-tpl-fieldgrid__item"><dt>Creator</dt><dd>{creator?.name ?? 'Unknown'}</dd></div>
          <div className="crm-tpl-fieldgrid__item">
            <dt>Validation status</dt>
            <dd>{validation.errors.length === 0 ? `Ready${validation.warnings.length ? ` (${validation.warnings.length} warning${validation.warnings.length === 1 ? '' : 's'})` : ''}` : `${validation.errors.length} blocking error${validation.errors.length === 1 ? '' : 's'}`}</dd>
          </div>
        </dl>

        <div className="crm-review-step__approval">
          <Select
            label="Internal approval"
            options={[{ value: 'off', label: 'Off — submit directly to Meta' }, { value: 'required', label: 'Required — route through internal review' }]}
            value={approvalMode}
            onChange={(e) => onApprovalModeChange(e.target.value as 'off' | 'required')}
          />
          <p className="crm-review-step__approval-hint">Recommended default is Off for small teams; configurable per workspace.</p>
        </div>

        {approvalMode === 'required' && !canApproveDirectly ? (
          <Banner tone="info" title="This submission needs approval" description="Your role sends templates for internal review before they reach Meta." />
        ) : null}

        <Banner tone="warning" title="Editing may be restricted while pending" description="Once submitted, Meta review can take from minutes to a few days. You can still view this template but some edits are locked until a decision is returned." />
      </div>

      <div className="crm-review-step__preview">
        <WhatsAppTemplatePreview components={draft.components} format={draft.format} />
      </div>
    </div>
  );
}
