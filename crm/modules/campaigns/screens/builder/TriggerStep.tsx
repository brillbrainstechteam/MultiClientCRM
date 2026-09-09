import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Banner, Button, Input, Select, Toast } from '@crm/design-system';
import { templates } from '@crm/modules/templates/data/mockTemplates';
import type { Campaign } from '../../domain/types';

const EVENT_OPTIONS = [
  { value: 'first_message', label: 'First message from a new contact' },
  { value: 'keyword', label: 'Message contains a keyword' },
  { value: 'inbound_message', label: 'Any inbound message' },
];

/**
 * Event-based (trigger) campaign setup: pick the event + template, then create.
 * The campaign fires automatically to a contact when the event occurs on the
 * WhatsApp webhook (handled by the automation engine). Creates via the real
 * campaigns API.
 */
export function TriggerStep({ draft }: { draft: Campaign }) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const approved = templates.filter((t) => t.metaStatus === 'approved');

  const [event, setEvent] = useState('first_message');
  const [keyword, setKeyword] = useState('');
  const [templateId, setTemplateId] = useState(approved[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const create = async () => {
    if (!draft.name.trim()) { setToast('Give the campaign a name on the Setup step first.'); return; }
    if (!templateId) { setToast('Pick an approved template.'); return; }
    if (event === 'keyword' && !keyword.trim()) { setToast('Enter a keyword to match.'); return; }
    const tpl = approved.find((t) => t.id === templateId);
    setBusy(true);
    try {
      const res = await fetch('/api/crm/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          name: draft.name.trim(),
          type: 'trigger',
          triggerEvent: event,
          triggerKeyword: event === 'keyword' ? keyword.trim() : undefined,
          templateId: tpl?.metaTemplateId ?? tpl?.id,
          templateName: tpl?.name,
          templateLocale: tpl?.locale,
          whatsappNumberId: draft.whatsappNumberId,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setToast(String(d.error ?? 'Could not create the campaign.')); return; }
      navigate(scopedHref('/campaigns'));
    } catch {
      setToast('Could not create the campaign.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="crm-camp-setup-step">
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <Banner
        tone="info"
        title="Event-based campaign"
        description="This template is sent automatically to a contact when the chosen event occurs — no manual audience. Each contact receives it once per campaign."
      />
      <Select label="When this happens" options={EVENT_OPTIONS} value={event} onChange={(e) => setEvent(e.target.value)} />
      {event === 'keyword' ? (
        <Input label="Keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. price, catalogue" />
      ) : null}
      <Select
        label="Send this template"
        options={approved.length ? approved.map((t) => ({ value: t.id, label: `${t.name} (${t.localeLabel})` })) : [{ value: '', label: 'No approved templates yet' }]}
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
      />
      {approved.length === 0 ? (
        <Banner tone="warning" title="No approved templates" description="Get a template approved on the connected WhatsApp number first — event-based campaigns can only send approved templates." />
      ) : null}
      <div>
        <Button variant="primary" disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create event-based campaign'}</Button>
      </div>
    </div>
  );
}
