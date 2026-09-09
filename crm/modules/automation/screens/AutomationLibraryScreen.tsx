import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { PageHeader } from '@crm/components';
import {
  Badge, Button, ConfirmDialog, DataTable, EmptyState, IconButton, Input,
  LoadingSkeleton, Modal, Select, Textarea, Toast, Toggle, type Column,
} from '@crm/design-system';

/**
 * Automation — real rules manager (Option B). Lists the tenant's rules from
 * /api/crm/automations and lets you create / enable / delete them. Rules run on
 * the WhatsApp webhook (see lib/crm/automation.ts). The visual flow-builder
 * (Option A) remains a separate, deferred surface.
 */

interface Rule {
  id: string; name: string; enabled: boolean; trigger: string;
  conditions: Array<{ field?: string; op?: string; value?: string }>;
  actions: Array<{ type?: string; text?: string; tag?: string; value?: string }>;
  runCount: number; lastRunAt: string | null;
}

const TRIGGER_LABEL: Record<string, string> = {
  first_message: 'First message', keyword: 'Keyword match', inbound_message: 'Any inbound message',
};
const LEAD_STATUSES = ['new', 'assigned', 'attempted', 'connected', 'engaged', 'enquiry_generated', 'not_interested', 'dormant'];

function actionSummary(a: Rule['actions'][number]): string {
  if (a.type === 'send_message') return `Auto-reply: "${(a.text ?? '').slice(0, 40)}${(a.text ?? '').length > 40 ? '…' : ''}"`;
  if (a.type === 'add_tag') return `Add tag: ${a.tag}`;
  if (a.type === 'set_lead_status') return `Set lead status: ${a.value}`;
  return a.type ?? '—';
}

export default function AutomationLibraryScreen() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Rule | null>(null);
  const [busy, setBusy] = useState(false);

  // Create-form state
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('first_message');
  const [keyword, setKeyword] = useState('');
  const [actionType, setActionType] = useState('send_message');
  const [message, setMessage] = useState('');
  const [tag, setTag] = useState('');
  const [leadStatus, setLeadStatus] = useState('connected');
  const [enabled, setEnabled] = useState(true);

  const load = () =>
    fetch('/api/crm/automations', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { rules: [] }))
      .then((d) => setRules(d.rules ?? []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);

  const resetForm = () => { setName(''); setTrigger('first_message'); setKeyword(''); setActionType('send_message'); setMessage(''); setTag(''); setLeadStatus('connected'); setEnabled(true); };

  const create = async () => {
    if (!name.trim()) { setToast('Give the rule a name.'); return; }
    const conditions = trigger === 'keyword' && keyword.trim() ? [{ field: 'text', op: 'contains', value: keyword.trim() }] : [];
    const actions =
      actionType === 'send_message' ? [{ type: 'send_message', text: message.trim() }]
        : actionType === 'add_tag' ? [{ type: 'add_tag', tag: tag.trim() }]
          : [{ type: 'set_lead_status', value: leadStatus }];
    if (actionType === 'send_message' && !message.trim()) { setToast('Enter the auto-reply message.'); return; }
    if (actionType === 'add_tag' && !tag.trim()) { setToast('Enter a tag.'); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/crm/automations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ name: name.trim(), trigger, enabled, conditions, actions }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setToast(String(d.error ?? 'Could not create the rule.')); return; }
      setModalOpen(false); resetForm(); await load();
      setToast('Rule created.');
    } finally { setBusy(false); }
  };

  const toggle = async (rule: Rule) => {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))); // optimistic
    await fetch(`/api/crm/automations/${rule.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ enabled: !rule.enabled }),
    }).catch(() => void load());
  };

  const remove = async (rule: Rule) => {
    setConfirmDelete(null);
    await fetch(`/api/crm/automations/${rule.id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
    await load();
    setToast('Rule deleted.');
  };

  const columns: Column<Rule>[] = useMemo(() => [
    { key: 'name', header: 'Rule', render: (r) => <strong>{r.name}</strong> },
    { key: 'trigger', header: 'When', render: (r) => TRIGGER_LABEL[r.trigger] ?? r.trigger },
    { key: 'condition', header: 'Condition', render: (r) => (r.conditions[0]?.value ? `contains "${r.conditions[0].value}"` : '—') },
    { key: 'action', header: 'Then', render: (r) => (r.actions[0] ? actionSummary(r.actions[0]) : '—') },
    { key: 'runs', header: 'Runs', render: (r) => String(r.runCount) },
    { key: 'enabled', header: 'Enabled', render: (r) => <Toggle checked={r.enabled} onChange={() => toggle(r)} label={`Enable ${r.name}`} hideLabel /> },
    { key: 'actions', header: '', align: 'right', render: (r) => <IconButton label="Delete rule" icon={<Trash2 />} size="sm" onClick={() => setConfirmDelete(r)} /> },
  ], []);

  return (
    <div style={{ padding: 24 }}>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <PageHeader
        title="Automation rules"
        description="Trigger → condition → action rules that run automatically on incoming WhatsApp messages."
        actions={<Button variant="primary" iconLeft={<Plus />} onClick={() => setModalOpen(true)}>New rule</Button>}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>{[1, 2, 3].map((i) => <LoadingSkeleton key={i} height={56} />)}</div>
      ) : rules.length === 0 ? (
        <EmptyState
          title="No automation rules yet"
          description="Create a rule to auto-reply, tag, or update lead status when a message comes in."
          actions={<Button variant="primary" iconLeft={<Zap />} onClick={() => setModalOpen(true)}>Create your first rule</Button>}
        />
      ) : (
        <DataTable caption="Automation rules" columns={columns} rows={rules} rowKey={(r) => r.id} />
      )}

      <Modal
        open={modalOpen}
        title="New automation rule"
        onClose={() => setModalOpen(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create rule'}</Button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Rule name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome new contacts" />
          <Select label="When this happens" value={trigger} onChange={(e) => setTrigger(e.target.value)}
            options={Object.entries(TRIGGER_LABEL).map(([value, label]) => ({ value, label }))} />
          {trigger === 'keyword' ? <Input label="Keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. price" /> : null}
          <Select label="Do this" value={actionType} onChange={(e) => setActionType(e.target.value)}
            options={[{ value: 'send_message', label: 'Send an auto-reply' }, { value: 'add_tag', label: 'Add a tag' }, { value: 'set_lead_status', label: 'Set lead status' }]} />
          {actionType === 'send_message' ? <Textarea label="Auto-reply message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi! Thanks for reaching out — how can we help?" /> : null}
          {actionType === 'add_tag' ? <Input label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. hot-lead" /> : null}
          {actionType === 'set_lead_status' ? <Select label="Lead status" value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)} options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))} /> : null}
          <Toggle checked={enabled} onChange={() => setEnabled((v) => !v)} label="Enable immediately" />
        </div>
      </Modal>

      {confirmDelete ? (
        <ConfirmDialog open title="Delete this rule?" message={`"${confirmDelete.name}" will stop running.`} confirmLabel="Delete" tone="danger"
          onConfirm={() => remove(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      ) : null}
    </div>
  );
}
