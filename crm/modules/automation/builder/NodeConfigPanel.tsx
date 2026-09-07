import { useEffect } from 'react';
import { Copy, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Checkbox, IconButton, Input, Select, Textarea, Toggle } from '@crm/design-system';
import { branches, teams, users } from '@crm/mock-data';
import { templates as approvedTemplates } from '@crm/modules/templates/data/mockTemplates';
import { isActive } from '@crm/modules/templates/domain/types';
import { findItem } from '@crm/modules/catalogue-orders/data';
import {
  aiAgents,
  contactFieldOptions,
  priorityOptions,
  stageOptions,
  tagOptions,
} from '../data/references';
import { answerTypeLabel, branchModeLabel, nodeLabel } from '../automation-labels';
import type {
  AutomationFlow,
  BranchPath,
  ContactUpdateEntry,
  FlowNode,
  QuestionAnswerType,
  SaveDestinationTarget,
  SimpleBranchMode,
} from '../domain/types';
import { nodeIcon } from './node-icons';

export function NodeConfigPanel({
  flow,
  node,
  canEdit,
  onUpdateNode,
  onDuplicate,
  onDelete,
  onClose,
}: {
  flow: AutomationFlow;
  node: FlowNode;
  canEdit: boolean;
  onUpdateNode: (node: FlowNode) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const Icon = nodeIcon[node.type];
  const isStart = node.id === flow.startNodeId;

  return (
    <div className="crm-aut-nodeconfig">
      <header className="crm-aut-nodeconfig__header">
        <span className="crm-aut-nodeconfig__icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <div className="crm-aut-nodeconfig__heading">
          <p className="crm-aut-nodeconfig__type">{nodeLabel[node.type]}</p>
          <Input
            label="Step name"
            hideLabel
            value={node.label}
            disabled={!canEdit}
            onChange={(e) => onUpdateNode({ ...node, label: e.target.value })}
          />
        </div>
        <IconButton label="Close panel" icon={<X />} size="sm" onClick={onClose} />
      </header>

      <div className="crm-aut-nodeconfig__body">
        <FormFor flow={flow} node={node} canEdit={canEdit} onUpdateNode={onUpdateNode} />
        <div className="crm-aut-form__note-block">
          <Textarea
            label="Notes (internal, not sent to the customer)"
            rows={2}
            value={node.notes ?? ''}
            disabled={!canEdit}
            onChange={(e) => onUpdateNode({ ...node, notes: e.target.value })}
          />
        </div>
      </div>

      {canEdit ? (
        <footer className="crm-aut-nodeconfig__footer">
          <Button variant="secondary" size="sm" iconLeft={<Copy />} onClick={onDuplicate}>
            Duplicate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Trash2 />}
            onClick={onDelete}
            disabled={isStart}
            title={isStart ? "This is the flow's first step — connect a different first step before deleting it." : undefined}
          >
            Delete
          </Button>
        </footer>
      ) : null}
    </div>
  );
}

function FormFor({
  flow,
  node,
  canEdit,
  onUpdateNode,
}: {
  flow: AutomationFlow;
  node: FlowNode;
  canEdit: boolean;
  onUpdateNode: (node: FlowNode) => void;
}) {
  const disabled = !canEdit;

  switch (node.type) {
    case 'send_message':
      return (
        <SendMessageForm
          flowId={flow.id}
          config={node.config}
          onChange={(config) => onUpdateNode({ ...node, config })}
          disabled={disabled}
        />
      );
    case 'question':
      return (
        <QuestionForm config={node.config} onChange={(config) => onUpdateNode({ ...node, config })} disabled={disabled} />
      );
    case 'simple_branch':
      return (
        <SimpleBranchForm
          flow={flow}
          config={node.config}
          onChange={(config) => onUpdateNode({ ...node, config })}
          disabled={disabled}
        />
      );
    case 'delay_wait':
      return (
        <DelayWaitForm config={node.config} onChange={(config) => onUpdateNode({ ...node, config })} disabled={disabled} />
      );
    case 'update_contact':
      return (
        <UpdateContactForm config={node.config} onChange={(config) => onUpdateNode({ ...node, config })} disabled={disabled} />
      );
    case 'human_handover':
      return (
        <HumanHandoverForm config={node.config} onChange={(config) => onUpdateNode({ ...node, config })} disabled={disabled} />
      );
    case 'ai_agent_handoff':
      return (
        <AiAgentHandoffForm config={node.config} onChange={(config) => onUpdateNode({ ...node, config })} disabled={disabled} />
      );
    case 'end':
      return <EndForm config={node.config} onChange={(config) => onUpdateNode({ ...node, config })} disabled={disabled} />;
    case 'api_call':
      return (
        <IntegrationForm
          labelText="Label"
          labelValue={node.config.endpointLabel}
          available={node.config.available}
          disabled={disabled}
          onLabelChange={(endpointLabel) => onUpdateNode({ ...node, config: { ...node.config, endpointLabel } })}
          onAvailableChange={(available) => onUpdateNode({ ...node, config: { ...node.config, available } })}
        />
      );
    case 'webhook':
      return (
        <IntegrationForm
          labelText="Label"
          labelValue={node.config.webhookLabel}
          available={node.config.available}
          disabled={disabled}
          onLabelChange={(webhookLabel) => onUpdateNode({ ...node, config: { ...node.config, webhookLabel } })}
          onAvailableChange={(available) => onUpdateNode({ ...node, config: { ...node.config, available } })}
        />
      );
    case 'external_integration':
      return (
        <IntegrationForm
          labelText="Integration name"
          labelValue={node.config.integrationName}
          available={node.config.available}
          disabled={disabled}
          onLabelChange={(integrationName) => onUpdateNode({ ...node, config: { ...node.config, integrationName } })}
          onAvailableChange={(available) => onUpdateNode({ ...node, config: { ...node.config, available } })}
        />
      );
    default:
      return <Phase2Form config={node.config} />;
  }
}

/* ------------------------------------------------------------------------- */

function SendMessageForm({
  flowId,
  config,
  onChange,
  disabled,
}: {
  flowId: string;
  config: Extract<FlowNode, { type: 'send_message' }>['config'];
  onChange: (c: Extract<FlowNode, { type: 'send_message' }>['config']) => void;
  disabled: boolean;
}) {
  const active = approvedTemplates.filter(isActive);
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = `${location.pathname}${location.search}`;
  const openCatalogue = () =>
    navigate(scopedHref('/catalogue-orders/picker', { source: 'automation', mode: 'single', automationId: flowId, returnTo }));

  // Consumes the Catalogue Picker's return handoff (SKILL.md §10 Automation —
  // "Use catalogue entity/event handoffs"). `returnTo` above round-trips back
  // to this exact node's URL, so the picked item ID lands here once and is
  // then stripped from the URL so it isn't reapplied on further edits.
  useEffect(() => {
    const pickedItemId = searchParams.get('itemIds')?.split(',')[0];
    if (!pickedItemId) return;
    const item = findItem(pickedItemId);
    onChange({ ...config, productRef: { connected: true, productId: pickedItemId, productName: item?.title ?? pickedItemId } });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('itemIds');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="crm-aut-form">
      <Select
        label="Message type"
        options={[
          { value: 'text', label: 'Text' },
          { value: 'media', label: 'Media' },
          { value: 'template', label: 'Approved template' },
          { value: 'interactive', label: 'Interactive message' },
        ]}
        value={config.mode}
        disabled={disabled}
        onChange={(e) => onChange({ ...config, mode: e.target.value as typeof config.mode })}
      />

      {config.mode === 'text' || config.mode === 'interactive' ? (
        <Textarea
          label="Message text"
          rows={3}
          value={config.text ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
        />
      ) : null}

      {config.mode === 'media' ? (
        <Input
          label="Media description"
          hint="Prototype placeholder — describes the image/video/document that would be attached."
          value={config.mediaLabel ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, mediaLabel: e.target.value })}
        />
      ) : null}

      {config.mode === 'template' ? (
        <Select
          label="Approved template"
          options={[{ value: '', label: 'Select a template…' }, ...active.map((t) => ({ value: t.id, label: t.name }))]}
          value={config.templateId ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const template = active.find((t) => t.id === e.target.value);
            onChange({ ...config, templateId: template?.id, templateName: template?.name });
          }}
        />
      ) : null}

      {config.mode === 'interactive' ? (
        <OptionListEditor
          label="Interactive options"
          items={config.interactiveOptions ?? []}
          disabled={disabled}
          onChange={(interactiveOptions) => onChange({ ...config, interactiveOptions })}
        />
      ) : null}

      <div className="crm-aut-form__note-block">
        <p className="crm-aut-form__list-label">Capability-dependent references (optional)</p>
        <div className="crm-aut-form__list">
          <div className="crm-aut-form__cap-row">
            <span>Product / Catalogue</span>
            {config.productRef?.connected ? (
              <Badge tone="success">{config.productRef.productName ?? 'Linked'}</Badge>
            ) : (
              <Button variant="ghost" size="sm" iconLeft={<ExternalLink size={14} />} onClick={openCatalogue}>
                Link a product
              </Button>
            )}
          </div>
          <div className="crm-aut-form__cap-row">
            <span>WhatsApp Flow</span>
            {config.flowRef?.connected ? (
              <Badge tone="success">{config.flowRef.flowName ?? 'Linked'}</Badge>
            ) : (
              <Badge tone="neutral" appearance="outline">
                Not connected
              </Badge>
            )}
          </div>
          <div className="crm-aut-form__cap-row">
            <span>Payment / Checkout</span>
            {config.paymentRef?.available ? (
              <Badge tone="success">Available</Badge>
            ) : (
              <Button variant="ghost" size="sm" iconLeft={<ExternalLink size={14} />} onClick={openCatalogue}>
                Configure
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="crm-aut-form__note">
        This message can use an interactive message while the customer session is open. Use an approved template when the
        send may occur outside it.
      </p>
    </div>
  );
}

function QuestionForm({
  config,
  onChange,
  disabled,
}: {
  config: Extract<FlowNode, { type: 'question' }>['config'];
  onChange: (c: Extract<FlowNode, { type: 'question' }>['config']) => void;
  disabled: boolean;
}) {
  const answerTypes = Object.keys(answerTypeLabel) as QuestionAnswerType[];
  const saveTargets: { value: SaveDestinationTarget; label: string }[] = [
    { value: 'field', label: 'Contact field' },
    { value: 'tag', label: 'Add as tag' },
    { value: 'stage', label: 'Stage' },
    { value: 'owner', label: 'Owner' },
    { value: 'priority', label: 'Priority' },
    { value: 'followUpDate', label: 'Follow-up date' },
  ];

  return (
    <div className="crm-aut-form">
      <Textarea label="Question" required rows={2} value={config.prompt} disabled={disabled} onChange={(e) => onChange({ ...config, prompt: e.target.value })} />
      <Select
        label="Answer type"
        options={answerTypes.map((type) => ({ value: type, label: answerTypeLabel[type] }))}
        value={config.answerType}
        disabled={disabled}
        onChange={(e) => onChange({ ...config, answerType: e.target.value as QuestionAnswerType })}
      />

      {config.answerType === 'single_select' || config.answerType === 'multi_select' ? (
        <TextListEditor label="Answer options" items={config.options ?? []} disabled={disabled} onChange={(options) => onChange({ ...config, options })} />
      ) : null}

      <Checkbox label="Required" checked={config.required} disabled={disabled} onChange={(e) => onChange({ ...config, required: e.target.checked })} />
      <Input label="Retry / invalid-response message" value={config.retryMessage ?? ''} disabled={disabled} onChange={(e) => onChange({ ...config, retryMessage: e.target.value })} />

      <div className="crm-aut-form__row">
        <Select
          label="Save answer to"
          options={[{ value: '', label: "Don't save" }, ...saveTargets.map((t) => ({ value: t.value, label: t.label }))]}
          value={config.saveTo?.target ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const target = e.target.value as SaveDestinationTarget | '';
            if (!target) {
              onChange({ ...config, saveTo: undefined });
              return;
            }
            onChange({ ...config, saveTo: { target, label: saveTargets.find((t) => t.value === target)?.label ?? target } });
          }}
        />
        {config.saveTo?.target === 'field' ? (
          <Select
            label="Field"
            options={[{ value: '', label: 'Select field…' }, ...contactFieldOptions.map((f) => ({ value: f.key, label: f.label }))]}
            value={config.saveTo.key ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, saveTo: { ...config.saveTo!, key: e.target.value } })}
          />
        ) : null}
      </div>
    </div>
  );
}

function SimpleBranchForm({
  flow,
  config,
  onChange,
  disabled,
}: {
  flow: AutomationFlow;
  config: Extract<FlowNode, { type: 'simple_branch' }>['config'];
  onChange: (c: Extract<FlowNode, { type: 'simple_branch' }>['config']) => void;
  disabled: boolean;
}) {
  const questionNodes = flow.nodes.filter((n) => n.type === 'question');
  const modes: SimpleBranchMode[] = ['answer_option', 'reply_no_reply', 'field_tag_equality'];

  const updateBranch = (id: string, patch: Partial<BranchPath>) =>
    onChange({ ...config, branches: config.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

  const addBranch = () =>
    onChange({ ...config, branches: [...config.branches, { id: `branch_${Math.random().toString(36).slice(2, 7)}`, label: '', matchValue: '', next: null }] });

  const removeBranch = (id: string) => onChange({ ...config, branches: config.branches.filter((b) => b.id !== id) });

  return (
    <div className="crm-aut-form">
      <Select
        label="Branch by"
        options={modes.map((mode) => ({ value: mode, label: branchModeLabel[mode] }))}
        value={config.mode}
        disabled={disabled}
        onChange={(e) => onChange({ ...config, mode: e.target.value as SimpleBranchMode })}
      />

      {config.mode === 'answer_option' ? (
        <Select
          label="Question to branch on"
          options={[{ value: '', label: 'Select a question…' }, ...questionNodes.map((n) => ({ value: n.id, label: n.label }))]}
          value={config.sourceQuestionNodeId ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, sourceQuestionNodeId: e.target.value })}
        />
      ) : null}

      {config.mode === 'field_tag_equality' ? (
        <Input label="Field or tag to check" value={config.fieldKey ?? ''} disabled={disabled} onChange={(e) => onChange({ ...config, fieldKey: e.target.value, fieldLabel: e.target.value })} />
      ) : null}

      {config.mode !== 'reply_no_reply' ? (
        <div className="crm-aut-form__list">
          <p className="crm-aut-form__list-label">Branches (next step is set on the canvas)</p>
          {config.branches.map((branch) => (
            <div className="crm-aut-form__list-row" key={branch.id}>
              <Input label="Label" hideLabel value={branch.label} disabled={disabled} onChange={(e) => updateBranch(branch.id, { label: e.target.value })} placeholder="Branch label" />
              <Input label="Match value" hideLabel value={branch.matchValue ?? ''} disabled={disabled} onChange={(e) => updateBranch(branch.id, { matchValue: e.target.value })} placeholder="Value to match" />
              {!disabled ? <IconButton label="Remove branch" icon={<Trash2 size={14} />} size="sm" onClick={() => removeBranch(branch.id)} /> : null}
            </div>
          ))}
          {!disabled ? (
            <Button variant="ghost" size="sm" iconLeft={<Plus />} onClick={addBranch}>
              Add branch
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="crm-aut-form__note">Two paths: "Replied" and the fallback "No reply" below.</p>
      )}

      <Input
        label="Fallback label"
        hint="Every branch needs a fallback so unmatched replies still continue."
        value={config.fallback.label}
        disabled={disabled}
        onChange={(e) => onChange({ ...config, fallback: { ...config.fallback, label: e.target.value } })}
      />
    </div>
  );
}

function DelayWaitForm({
  config,
  onChange,
  disabled,
}: {
  config: Extract<FlowNode, { type: 'delay_wait' }>['config'];
  onChange: (c: Extract<FlowNode, { type: 'delay_wait' }>['config']) => void;
  disabled: boolean;
}) {
  const active = approvedTemplates.filter(isActive);

  return (
    <div className="crm-aut-form">
      <Select
        label="Wait for"
        options={[
          { value: 'duration', label: 'A duration' },
          { value: 'until_datetime', label: 'A specific date/time' },
          { value: 'wait_for_reply', label: 'A customer reply' },
        ]}
        value={config.mode}
        disabled={disabled}
        onChange={(e) => onChange({ ...config, mode: e.target.value as typeof config.mode })}
      />

      {config.mode === 'duration' ? (
        <div className="crm-aut-form__row">
          <Input label="Duration" type="number" min={1} value={config.durationValue ?? ''} disabled={disabled} onChange={(e) => onChange({ ...config, durationValue: Number(e.target.value) })} />
          <Select
            label="Unit"
            options={[
              { value: 'minutes', label: 'Minutes' },
              { value: 'hours', label: 'Hours' },
              { value: 'days', label: 'Days' },
            ]}
            value={config.durationUnit ?? 'hours'}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, durationUnit: e.target.value as typeof config.durationUnit })}
          />
        </div>
      ) : null}

      {config.mode === 'until_datetime' ? (
        <Input label="Wait until" type="datetime-local" value={config.untilDateTime ?? ''} disabled={disabled} onChange={(e) => onChange({ ...config, untilDateTime: e.target.value })} />
      ) : null}

      {config.mode === 'wait_for_reply' ? (
        <Input
          label="Reply deadline (hours)"
          type="number"
          min={1}
          value={config.replyDeadlineHours ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, replyDeadlineHours: Number(e.target.value) })}
          hint="The no-response path (set on the canvas) is taken once this deadline passes."
        />
      ) : null}

      <Toggle label="Business hours only" description="Only count waiting time during business hours." checked={config.businessHoursOnly ?? false} disabled={disabled} onChange={(checked) => onChange({ ...config, businessHoursOnly: checked })} />

      <div className="crm-aut-form__note-block">
        <p className="crm-aut-form__note">
          This message can use an interactive message while the customer session is open. Use an approved template when the
          send may occur outside it.
        </p>
        <Select
          label="Approved-template fallback"
          options={[{ value: '', label: 'None configured' }, ...active.map((t) => ({ value: t.id, label: t.name }))]}
          value={config.templateFallbackId ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const template = active.find((t) => t.id === e.target.value);
            onChange({ ...config, templateFallbackId: template?.id, templateFallbackName: template?.name });
          }}
        />
      </div>
    </div>
  );
}

function UpdateContactForm({
  config,
  onChange,
  disabled,
}: {
  config: Extract<FlowNode, { type: 'update_contact' }>['config'];
  onChange: (c: Extract<FlowNode, { type: 'update_contact' }>['config']) => void;
  disabled: boolean;
}) {
  const kindOptions: { value: ContactUpdateEntry['kind']; label: string }[] = [
    { value: 'field', label: 'Contact field' },
    { value: 'tagAdd', label: 'Add tag' },
    { value: 'tagRemove', label: 'Remove tag' },
    { value: 'stage', label: 'Stage' },
    { value: 'owner', label: 'Owner' },
    { value: 'priority', label: 'Priority' },
    { value: 'followUpDate', label: 'Follow-up date' },
  ];

  const update = (id: string, patch: Partial<ContactUpdateEntry>) =>
    onChange({ updates: config.updates.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  const add = () => onChange({ updates: [...config.updates, { id: `u_${Math.random().toString(36).slice(2, 7)}`, kind: 'tagAdd', value: '' }] });
  const remove = (id: string) => onChange({ updates: config.updates.filter((u) => u.id !== id) });

  return (
    <div className="crm-aut-form">
      <div className="crm-aut-form__list">
        {config.updates.map((entry) => (
          <div className="crm-aut-form__update-row" key={entry.id}>
            <Select label="Type" hideLabel options={kindOptions.map((k) => ({ value: k.value, label: k.label }))} value={entry.kind} disabled={disabled} onChange={(e) => update(entry.id, { kind: e.target.value as ContactUpdateEntry['kind'], value: '' })} />
            <UpdateValueField entry={entry} disabled={disabled} onChange={(value) => update(entry.id, { value })} onKeyChange={(key) => update(entry.id, { key })} />
            {!disabled ? <IconButton label="Remove update" icon={<Trash2 size={14} />} size="sm" onClick={() => remove(entry.id)} /> : null}
          </div>
        ))}
      </div>
      {!disabled ? (
        <Button variant="ghost" size="sm" iconLeft={<Plus />} onClick={add}>
          Add update
        </Button>
      ) : null}
    </div>
  );
}

function UpdateValueField({
  entry,
  disabled,
  onChange,
  onKeyChange,
}: {
  entry: ContactUpdateEntry;
  disabled: boolean;
  onChange: (value: string) => void;
  onKeyChange: (key: string) => void;
}) {
  if (entry.kind === 'tagAdd' || entry.kind === 'tagRemove') {
    return <Select label="Tag" hideLabel options={[{ value: '', label: 'Select tag…' }, ...tagOptions.map((t) => ({ value: t, label: t }))]} value={entry.value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
  if (entry.kind === 'stage') {
    return <Select label="Stage" hideLabel options={stageOptions.map((s) => ({ value: s.key, label: s.label }))} value={entry.value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
  if (entry.kind === 'priority') {
    return <Select label="Priority" hideLabel options={priorityOptions.map((p) => ({ value: p.key, label: p.label }))} value={entry.value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
  if (entry.kind === 'owner') {
    return <Select label="Owner" hideLabel options={[{ value: '', label: 'Select owner…' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} value={entry.value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
  if (entry.kind === 'followUpDate') {
    return <Input label="Follow-up date" hideLabel type="date" value={entry.value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div className="crm-aut-form__field-value">
      <Select label="Field" hideLabel options={[{ value: '', label: 'Select field…' }, ...contactFieldOptions.map((f) => ({ value: f.key, label: f.label }))]} value={entry.key ?? ''} disabled={disabled} onChange={(e) => onKeyChange(e.target.value)} />
      <Input label="Value" hideLabel value={entry.value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function HumanHandoverForm({
  config,
  onChange,
  disabled,
}: {
  config: Extract<FlowNode, { type: 'human_handover' }>['config'];
  onChange: (c: Extract<FlowNode, { type: 'human_handover' }>['config']) => void;
  disabled: boolean;
}) {
  const targetOptions =
    config.targetType === 'user'
      ? users.map((u) => ({ value: u.id, label: u.name }))
      : config.targetType === 'team'
        ? teams.map((t) => ({ value: t.id, label: t.name }))
        : branches.map((b) => ({ value: b.id, label: b.name }));

  return (
    <div className="crm-aut-form">
      <Select
        label="Hand off to"
        options={[
          { value: 'user', label: 'A specific user' },
          { value: 'team', label: 'A team' },
          { value: 'branch', label: 'A branch' },
        ]}
        value={config.targetType}
        disabled={disabled}
        onChange={(e) => onChange({ ...config, targetType: e.target.value as typeof config.targetType, targetId: undefined, targetLabel: undefined })}
      />
      <Select
        label={config.targetType === 'user' ? 'User' : config.targetType === 'team' ? 'Team' : 'Branch'}
        options={[{ value: '', label: 'Select…' }, ...targetOptions]}
        value={config.targetId ?? ''}
        disabled={disabled}
        onChange={(e) => onChange({ ...config, targetId: e.target.value, targetLabel: targetOptions.find((o) => o.value === e.target.value)?.label })}
      />
      <Textarea label="Reason" rows={2} value={config.reason} disabled={disabled} onChange={(e) => onChange({ ...config, reason: e.target.value })} />
      <Checkbox label="Preserve full conversation context" checked={config.preserveContext} disabled={disabled} onChange={(e) => onChange({ ...config, preserveContext: e.target.checked })} />
    </div>
  );
}

function AiAgentHandoffForm({
  config,
  onChange,
  disabled,
}: {
  config: Extract<FlowNode, { type: 'ai_agent_handoff' }>['config'];
  onChange: (c: Extract<FlowNode, { type: 'ai_agent_handoff' }>['config']) => void;
  disabled: boolean;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  return (
    <div className="crm-aut-form">
      <Select
        label="AI Agent"
        options={[{ value: '', label: 'Select an agent…' }, ...aiAgents.map((a) => ({ value: a.id, label: a.name }))]}
        value={config.agentId ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const agent = aiAgents.find((a) => a.id === e.target.value);
          onChange({ agentId: agent?.id, agentName: agent?.name });
        }}
      />
      {config.agentId ? <p className="crm-aut-form__note">{aiAgents.find((a) => a.id === config.agentId)?.purpose}</p> : null}
      <Button variant="ghost" size="sm" iconLeft={<ExternalLink />} onClick={() => navigate(scopedHref('/ai-assistance', { source: 'automation' }))}>
        Manage AI Agents
      </Button>
      <p className="crm-aut-form__note">Agent behaviour, tools, knowledge and guardrails are configured in the AI Assistance module, not here.</p>
    </div>
  );
}

function EndForm({
  config,
  onChange,
  disabled,
}: {
  config: Extract<FlowNode, { type: 'end' }>['config'];
  onChange: (c: Extract<FlowNode, { type: 'end' }>['config']) => void;
  disabled: boolean;
}) {
  return <Input label="Outcome label" value={config.outcomeLabel} disabled={disabled} onChange={(e) => onChange({ outcomeLabel: e.target.value })} />;
}

function IntegrationForm({
  labelText,
  labelValue,
  available,
  disabled,
  onLabelChange,
  onAvailableChange,
}: {
  labelText: string;
  labelValue: string;
  available: boolean;
  disabled: boolean;
  onLabelChange: (value: string) => void;
  onAvailableChange: (value: boolean) => void;
}) {
  return (
    <div className="crm-aut-form">
      <Input label={labelText} value={labelValue} disabled={disabled} onChange={(e) => onLabelChange(e.target.value)} />
      <Toggle
        label="Integration connected"
        description="Advanced blocks depend on a connection made in Settings / Integrations, not in this builder."
        checked={available}
        disabled={disabled}
        onChange={onAvailableChange}
      />
      {!available ? <Badge tone="warning">Not connected — this blocks Go Live until resolved</Badge> : null}
    </div>
  );
}

function Phase2Form({ config }: { config: { description: string } }) {
  return (
    <div className="crm-aut-form">
      <Badge tone="neutral">Phase 2</Badge>
      <p className="crm-aut-form__note">{config.description || 'This block is a deliberate Phase 2 deferral and is not configurable in this prototype.'}</p>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function TextListEditor({ label, items, disabled, onChange }: { label: string; items: string[]; disabled: boolean; onChange: (items: string[]) => void }) {
  return (
    <div className="crm-aut-form__list">
      <p className="crm-aut-form__list-label">{label}</p>
      {items.map((item, index) => (
        <div className="crm-aut-form__list-row" key={index}>
          <Input
            label={`Option ${index + 1}`}
            hideLabel
            value={item}
            disabled={disabled}
            onChange={(e) => onChange(items.map((it, i) => (i === index ? e.target.value : it)))}
          />
          {!disabled ? (
            <IconButton label="Remove option" icon={<Trash2 size={14} />} size="sm" onClick={() => onChange(items.filter((_, i) => i !== index))} />
          ) : null}
        </div>
      ))}
      {!disabled ? (
        <Button variant="ghost" size="sm" iconLeft={<Plus />} onClick={() => onChange([...items, ''])}>
          Add option
        </Button>
      ) : null}
    </div>
  );
}

function OptionListEditor({
  label,
  items,
  disabled,
  onChange,
}: {
  label: string;
  items: { id: string; label: string }[];
  disabled: boolean;
  onChange: (items: { id: string; label: string }[]) => void;
}) {
  return (
    <div className="crm-aut-form__list">
      <p className="crm-aut-form__list-label">{label}</p>
      {items.map((item) => (
        <div className="crm-aut-form__list-row" key={item.id}>
          <Input label="Option" hideLabel value={item.label} disabled={disabled} onChange={(e) => onChange(items.map((it) => (it.id === item.id ? { ...it, label: e.target.value } : it)))} />
          {!disabled ? (
            <IconButton label="Remove option" icon={<Trash2 size={14} />} size="sm" onClick={() => onChange(items.filter((it) => it.id !== item.id))} />
          ) : null}
        </div>
      ))}
      {!disabled ? (
        <Button variant="ghost" size="sm" iconLeft={<Plus />} onClick={() => onChange([...items, { id: `opt_${Math.random().toString(36).slice(2, 7)}`, label: '' }])}>
          Add option
        </Button>
      ) : null}
    </div>
  );
}
