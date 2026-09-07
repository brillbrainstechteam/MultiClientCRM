import { Play, X } from 'lucide-react';
import { Badge, IconButton, Input, Select } from '@crm/design-system';
import { campaignsRef, contactFieldOptions, stageOptions, tagOptions } from '../data/references';
import { triggerTypeLabel } from '../automation-labels';
import type { AutomationFlow, CoreTriggerType, FlowTrigger } from '../domain/types';
import { coreTriggerTypes, advancedTriggerTypes } from '../domain/types';

/**
 * Start/Trigger configuration (AUTOMATION_GENERATION_SPEC.md §8). One fixed
 * entry configuration rather than scattering trigger nodes on the canvas.
 */
export function TriggerPanel({
  flow,
  canEdit,
  onChange,
  onClose,
}: {
  flow: AutomationFlow;
  canEdit: boolean;
  onChange: (trigger: FlowTrigger) => void;
  onClose: () => void;
}) {
  const disabled = !canEdit;
  const trigger = flow.trigger;

  const setType = (type: CoreTriggerType) => {
    const base: FlowTrigger = { type, summary: triggerTypeLabel[type] };
    if (type === 'keyword') onChange({ ...base, keyword: '', keywordMatch: 'contains', summary: 'Keyword: (not set)' });
    else onChange(base);
  };

  return (
    <div className="crm-aut-nodeconfig">
      <header className="crm-aut-nodeconfig__header">
        <span className="crm-aut-nodeconfig__icon" aria-hidden="true">
          <Play size={16} />
        </span>
        <div className="crm-aut-nodeconfig__heading">
          <p className="crm-aut-nodeconfig__type">Start</p>
          <p className="crm-aut-trigger__title">Trigger</p>
        </div>
        <IconButton label="Close panel" icon={<X />} size="sm" onClick={onClose} />
      </header>

      <div className="crm-aut-nodeconfig__body">
        <div className="crm-aut-form">
          <Select
            label="Trigger type"
            options={coreTriggerTypes.map((type) => ({ value: type, label: triggerTypeLabel[type] }))}
            value={trigger.type}
            disabled={disabled}
            onChange={(e) => setType(e.target.value as CoreTriggerType)}
          />

          {trigger.type === 'keyword' ? (
            <>
              <Input
                label="Keyword / phrase"
                required
                value={trigger.keyword ?? ''}
                disabled={disabled}
                onChange={(e) => onChange({ ...trigger, keyword: e.target.value, summary: `Keyword: ${e.target.value || '(not set)'}` })}
              />
              <Select
                label="Match type"
                options={[
                  { value: 'contains', label: 'Message contains keyword' },
                  { value: 'exact', label: 'Message is exactly the keyword' },
                ]}
                value={trigger.keywordMatch ?? 'contains'}
                disabled={disabled}
                onChange={(e) => onChange({ ...trigger, keywordMatch: e.target.value as 'exact' | 'contains' })}
              />
              <p className="crm-aut-form__note">Checked against every other Live flow's keyword when you save or Go Live.</p>
            </>
          ) : null}

          {trigger.type === 'campaign_reply' ? (
            <Select
              label="Campaign"
              options={[{ value: '', label: 'Select a campaign…' }, ...campaignsRef.map((c) => ({ value: c.id, label: c.name }))]}
              value={trigger.campaignId ?? ''}
              disabled={disabled}
              onChange={(e) => {
                const campaign = campaignsRef.find((c) => c.id === e.target.value);
                onChange({ ...trigger, campaignId: campaign?.id, campaignName: campaign?.name, summary: campaign ? `Reply to "${campaign.name}"` : 'Campaign reply' });
              }}
            />
          ) : null}

          {trigger.type === 'field_change' ? (
            <>
              <Select
                label="Field or tag"
                options={[{ value: '', label: 'Select…' }, ...contactFieldOptions.map((f) => ({ value: f.key, label: f.label })), { value: 'stage', label: 'Stage' }, { value: 'tag', label: 'Tag' }]}
                value={trigger.fieldKey ?? ''}
                disabled={disabled}
                onChange={(e) => onChange({ ...trigger, fieldKey: e.target.value, fieldLabel: e.target.value })}
              />
              {trigger.fieldKey === 'stage' ? (
                <Select
                  label="New value"
                  options={stageOptions.map((s) => ({ value: s.key, label: s.label }))}
                  value={trigger.fieldValue ?? ''}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...trigger, fieldValue: e.target.value, summary: `Stage changes to "${e.target.value}"` })}
                />
              ) : trigger.fieldKey === 'tag' ? (
                <Select
                  label="Tag"
                  options={tagOptions.map((t) => ({ value: t, label: t }))}
                  value={trigger.fieldValue ?? ''}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...trigger, fieldValue: e.target.value, summary: `Tag changes to "${e.target.value}"` })}
                />
              ) : (
                <Input
                  label="New value"
                  value={trigger.fieldValue ?? ''}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...trigger, fieldValue: e.target.value, summary: `${trigger.fieldLabel ?? 'Field'} changes to "${e.target.value}"` })}
                />
              )}
            </>
          ) : null}

          {trigger.type === 'date' ? (
            <>
              <Select
                label="Date mode"
                options={[
                  { value: 'fixed', label: 'Fixed date' },
                  { value: 'relative', label: 'Relative to a contact date field' },
                ]}
                value={trigger.dateMode ?? 'fixed'}
                disabled={disabled}
                onChange={(e) => onChange({ ...trigger, dateMode: e.target.value as 'fixed' | 'relative' })}
              />
              {trigger.dateMode === 'relative' ? (
                <Input
                  label="Days offset from contact date"
                  type="number"
                  value={trigger.relativeOffsetDays ?? 0}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...trigger, relativeOffsetDays: Number(e.target.value), summary: `${e.target.value} days relative to contact date` })}
                />
              ) : (
                <Input
                  label="Date"
                  type="date"
                  value={trigger.fixedDate ?? ''}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...trigger, fixedDate: e.target.value, summary: `On ${e.target.value}` })}
                />
              )}
            </>
          ) : null}

          <div className="crm-aut-form__note-block">
            <p className="crm-aut-form__list-label">Advanced / use-case triggers</p>
            <div className="crm-aut-trigger__advanced">
              {advancedTriggerTypes.map((type) => (
                <Badge key={type} tone="neutral" appearance="outline">
                  {triggerTypeLabel[type]}
                </Badge>
              ))}
            </div>
            <p className="crm-aut-form__note">
              These need a connection set up in Settings / Integrations before they can be used as a trigger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
