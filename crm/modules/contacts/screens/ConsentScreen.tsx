import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, ShieldOff, Clock, HelpCircle, Send, ClipboardCheck, Info, RefreshCw,
} from 'lucide-react';
import {
  Badge, Banner, Button, Checkbox, DataTable, EmptyState, Input, KpiCard, Modal,
  SearchField, Select, Textarea, Toast, LoadingSkeleton, ErrorState,
  type Column,
} from '@crm/design-system';
import './ConsentScreen.css';

/**
 * Consent collection, end to end, on one screen (CON-S30).
 *
 * The order of the page follows the order of the job: see where the book stands,
 * pick who to ask, send the approved request, then watch the replies land. The
 * replies themselves are captured by the webhook — nothing here polls Meta.
 *
 * The rules panel is not decoration. The expensive failure in WhatsApp is not a
 * template rejection, it is a number whose quality rating falls because people
 * blocked it, and that is driven by messaging contacts who never agreed and
 * giving them no way to stop. Everything on this screen exists to avoid that.
 */

type Stage = 'opted_in' | 'opted_out' | 'awaiting_reply' | 'request_expired' | 'never_asked';

interface ConsentContact {
  id: string;
  name: string;
  company: string | null;
  mobile: string;
  city: string | null;
  tags: string[];
  stage: Stage;
  stageLabel: string;
  requestedAt: string | null;
  optInAt: string | null;
  optInSource: string | null;
  optOutAt: string | null;
}

interface Funnel {
  total: number; optedIn: number; optedOut: number;
  awaitingReply: number; noReply: number; neverAsked: number; askable: number;
}

interface Rule { title: string; detail: string }

interface SuggestedTemplate {
  suggestedName: string; category: string; language: string;
  body: string; footer: string;
  buttons: { type: string; text: string; payload: string }[];
}

interface ConsentPayload {
  funnel: Funnel;
  contacts: ConsentContact[];
  total: number;
  page: number;
  pageSize: number;
  rules: Rule[];
  suggestedTemplate: SuggestedTemplate;
}

interface MetaTemplate {
  id?: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: Array<{ type: string; text?: string; buttons?: Array<{ type: string; text?: string }> }>;
}

const STAGE_TABS: { key: string; label: string }[] = [
  { key: 'askable', label: 'To ask' },
  { key: 'awaiting_reply', label: 'Awaiting reply' },
  { key: 'no_reply', label: 'No reply' },
  { key: 'opted_in', label: 'Opted in' },
  { key: 'opted_out', label: 'Opted out' },
];

const STAGE_TONE: Record<Stage, 'success' | 'danger' | 'warning' | 'neutral'> = {
  opted_in: 'success',
  opted_out: 'danger',
  awaiting_reply: 'warning',
  request_expired: 'neutral',
  never_asked: 'neutral',
};

const CHANNEL_OPTIONS = [
  { value: 'call', label: 'On a call' },
  { value: 'in_store', label: 'At the counter / showroom' },
  { value: 'web_form', label: 'Website or form' },
  { value: 'import', label: 'Came with an import' },
  { value: 'manual', label: 'Other (noted by the team)' },
];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

/** A template can collect consent only if it is approved and offers a way out. */
function isConsentCapable(t: MetaTemplate): boolean {
  if (t.status !== 'APPROVED') return false;
  const buttons = t.components?.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  return buttons.length >= 1;
}

export default function ConsentScreen() {
  const [data, setData] = useState<ConsentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState('askable');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [showRules, setShowRules] = useState(false);

  const [askOpen, setAskOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<ConsentContact | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ stage, ...(query ? { q: query } : {}) });
    fetch(`/api/crm/consent?${qs}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: ConsentPayload & { error?: string }) => {
        if (d.error) { setError(d.error); setData(null); }
        else { setData(d); setError(null); }
        setLoading(false);
      })
      .catch(() => { setError('Could not load consent status.'); setLoading(false); });
  }, [stage, query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(new Set()); }, [stage, query]);

  const contacts = data?.contacts ?? [];
  const funnel = data?.funnel;

  const toggleRow = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((prev) =>
    prev.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id)));

  const columns = useMemo<Column<ConsentContact>[]>(() => [
    {
      key: 'name',
      header: 'Contact',
      render: (c) => (
        <div className="consent__who">
          <span className="consent__who-name">{c.name}</span>
          {c.company ? <span className="consent__who-sub">{c.company}</span> : null}
        </div>
      ),
      sortable: true,
      sortValue: (c) => c.name.toLowerCase(),
    },
    { key: 'mobile', header: 'Mobile', render: (c) => <span className="consent__mono">{c.mobile}</span>, width: '150px' },
    { key: 'city', header: 'City', render: (c) => c.city ?? '—', width: '120px' },
    {
      key: 'stage',
      header: 'Consent',
      width: '140px',
      render: (c) => <Badge tone={STAGE_TONE[c.stage]}>{c.stageLabel}</Badge>,
    },
    {
      key: 'when',
      header: 'Last change',
      width: '130px',
      render: (c) => (
        <span className="consent__when">
          {fmtDate(c.optInAt ?? c.optOutAt ?? c.requestedAt)}
          {c.optInSource ? <span className="consent__when-sub">{c.optInSource.replace(/_/g, ' ')}</span> : null}
        </span>
      ),
      sortable: true,
      sortValue: (c) => c.optInAt ?? c.optOutAt ?? c.requestedAt ?? '',
    },
    {
      key: 'history',
      header: '',
      width: '90px',
      align: 'right',
      render: (c) => (
        <Button variant="ghost" size="sm" onClick={() => setHistoryFor(c)}>History</Button>
      ),
    },
  ], []);

  if (loading && !data) {
    return <div className="consent"><LoadingSkeleton lines={6} /></div>;
  }
  if (error && !data) {
    return <div className="consent">
        <ErrorState
          title="Could not load consent status"
          description={error}
          actions={<Button variant="secondary" onClick={load}>Try again</Button>}
        />
      </div>;
  }

  return (
    <div className="consent">
      <header className="consent__head">
        <div>
          <h1 className="consent__title">Consent</h1>
          <p className="consent__sub">
            WhatsApp only lets you start a conversation with someone who agreed to it.
            Ask here, and every reply is captured and stored with its proof.
          </p>
        </div>
        <div className="consent__headactions">
          <Button variant="ghost" size="sm" iconLeft={<Info />} onClick={() => setShowRules((s) => !s)}>
            {showRules ? 'Hide rules' : 'Rules that keep you approved'}
          </Button>
          <Button variant="secondary" size="sm" iconLeft={<RefreshCw />} onClick={load}>Refresh</Button>
        </div>
      </header>

      {funnel && funnel.optedIn === 0 && funnel.total > 0 ? (
        <Banner
          tone="warning"
          title="No contact has opted in yet"
          description="Marketing campaigns will find no recipients until consent is collected. Start with the contacts who messaged you recently — they are the most likely to agree."
        />
      ) : null}

      {showRules && data ? (
        <section className="consent__rules">
          {data.rules.map((r) => (
            <div key={r.title} className="consent__rule">
              <span className="consent__rule-title">{r.title}</span>
              <span className="consent__rule-detail">{r.detail}</span>
            </div>
          ))}
          <div className="consent__rule consent__rule--template">
            <span className="consent__rule-title">Wording that passes review</span>
            <p className="consent__rule-body">{data.suggestedTemplate.body}</p>
            <div className="consent__rule-buttons">
              {data.suggestedTemplate.buttons.map((b) => (
                <span key={b.payload} className="consent__fakebtn">{b.text}</span>
              ))}
            </div>
            <span className="consent__rule-detail">
              Submit it as {data.suggestedTemplate.category} under the name
              {' '}<code>{data.suggestedTemplate.suggestedName}</code> in Templates, then come back here to send it.
            </span>
          </div>
        </section>
      ) : null}

      {funnel ? (
        <div className="consent__kpis">
          <KpiCard
            label="Opted in"
            value={funnel.optedIn}
            meta="can receive campaigns"
            emphasis="gold"
            icon={<ShieldCheck aria-hidden="true" />}
          />
          <KpiCard label="Awaiting reply" value={funnel.awaitingReply} meta="asked in the last 7 days" icon={<Clock aria-hidden="true" />} />
          <KpiCard label="No reply" value={funnel.noReply} meta="asked, never answered" icon={<HelpCircle aria-hidden="true" />} />
          <KpiCard label="Never asked" value={funnel.neverAsked} meta={`${funnel.askable} ready to ask`} icon={<Send aria-hidden="true" />} />
          <KpiCard label="Opted out" value={funnel.optedOut} meta="never message again" icon={<ShieldOff aria-hidden="true" />} />
        </div>
      ) : null}

      <div className="consent__toolbar">
        <div className="consent__tabs" role="tablist" aria-label="Consent stage">
          {STAGE_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={stage === t.key}
              className={stage === t.key ? 'consent__tab consent__tab--active' : 'consent__tab'}
              onClick={() => setStage(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <SearchField
          label="Search contacts"
          hideLabel
          placeholder="Name, company or mobile"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {selected.size > 0 ? (
        <div className="consent__bulk">
          <span className="consent__bulk-count">{selected.size} selected</span>
          <Button variant="primary" size="sm" iconLeft={<Send />} onClick={() => setAskOpen(true)}>
            Send consent request
          </Button>
          <Button variant="secondary" size="sm" iconLeft={<ClipboardCheck />} onClick={() => setRecordOpen(true)}>
            Record consent collected offline
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      ) : null}

      <DataTable
        caption="Contacts by consent stage"
        columns={columns}
        rows={contacts}
        rowKey={(c) => c.id}
        selectable
        selectedIds={selected}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        emptyState={
          <EmptyState
            title={stage === 'askable' ? 'Nobody left to ask' : 'Nothing here yet'}
            description={
              stage === 'askable'
                ? 'Every contact in your scope has either answered or was asked in the last 30 days.'
                : 'Change the stage above to see other contacts.'
            }
          />
        }
      />

      {data && data.total > data.contacts.length ? (
        <p className="consent__more">
          Showing {data.contacts.length} of {data.total}. Narrow with search, or send to everyone
          awaiting a request from the Send dialog.
        </p>
      ) : null}

      {askOpen ? (
        <AskModal
          selectedIds={[...selected]}
          askableTotal={funnel?.askable ?? 0}
          suggested={data?.suggestedTemplate}
          onClose={() => setAskOpen(false)}
          onDone={(msg) => {
            setAskOpen(false);
            setSelected(new Set());
            setToast({ tone: 'success', text: msg });
            load();
          }}
          onError={(msg) => setToast({ tone: 'error', text: msg })}
        />
      ) : null}

      {recordOpen ? (
        <RecordModal
          selectedIds={[...selected]}
          onClose={() => setRecordOpen(false)}
          onDone={(msg) => {
            setRecordOpen(false);
            setSelected(new Set());
            setToast({ tone: 'success', text: msg });
            load();
          }}
          onError={(msg) => setToast({ tone: 'error', text: msg })}
        />
      ) : null}

      {historyFor ? (
        <HistoryModal contact={historyFor} onClose={() => setHistoryFor(null)} />
      ) : null}

      {toast ? (
        <Toast tone={toast.tone} message={toast.text} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

/* ---- Send the request ---------------------------------------------------- */

function AskModal({
  selectedIds, askableTotal, suggested, onClose, onDone, onError,
}: {
  selectedIds: string[];
  askableTotal: number;
  suggested?: SuggestedTemplate;
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [templates, setTemplates] = useState<MetaTemplate[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chosen, setChosen] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [everyone, setEveryone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/crm/templates', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { templates?: MetaTemplate[]; error?: string; connected?: boolean }) => {
        if (d.error) { setLoadError(d.error); return; }
        if (d.connected === false) { setLoadError('Connect a WhatsApp number to send consent requests.'); return; }
        const usable = (d.templates ?? []).filter(isConsentCapable);
        setTemplates(usable);
        const preferred = usable.find((t) => /consent|opt.?in/i.test(t.name));
        if (preferred) setChosen(`${preferred.name}|${preferred.language}`);
      })
      .catch(() => setLoadError('Could not load your approved templates.'));
  }, []);

  const picked = templates?.find((t) => `${t.name}|${t.language}` === chosen) ?? null;
  const bodyText = picked?.components?.find((c) => c.type === 'BODY')?.text ?? '';
  const placeholders = (bodyText.match(/\{\{\d+\}\}/g) ?? []).length;
  const recipientCount = everyone ? askableTotal : selectedIds.length;

  const submit = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const res = await fetch('/api/crm/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ...(everyone ? { all: true } : { contactIds: selectedIds }),
          templateName: picked.name,
          templateLocale: picked.language,
          wording: bodyText,
          // {{1}} is the contact's name by convention; anything after it is fixed.
          nameAsFirstParam: placeholders >= 1,
          bodyParams: placeholders >= 2 && businessName ? [businessName] : [],
        }),
      });
      const d = (await res.json()) as { asked?: number; failed?: number; error?: string };
      if (!res.ok || d.error) { onError(d.error ?? 'Could not send the requests.'); return; }
      const failedNote = d.failed ? `, ${d.failed} failed` : '';
      onDone(`Consent request sent to ${d.asked} contact(s)${failedNote}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Send consent request"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy || !picked || recipientCount === 0}>
            {busy ? 'Sending…' : `Send to ${recipientCount} contact${recipientCount === 1 ? '' : 's'}`}
          </Button>
        </>
      }
    >
      {loadError ? (
        <Banner tone="warning" title="Cannot send yet" description={loadError} />
      ) : templates === null ? (
        <LoadingSkeleton lines={3} />
      ) : templates.length === 0 ? (
        <Banner
          tone="warning"
          title="No approved template can collect consent"
          description={
            suggested
              ? `Create one in Templates — "${suggested.suggestedName}" with two quick replies — then come back. The recommended wording is on the Consent screen under "Rules that keep you approved".`
              : 'Create an approved template with quick-reply buttons in Templates first.'
          }
        />
      ) : (
        <div className="consent__form">
          <Select
            label="Approved template"
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
            options={[
              { value: '', label: 'Choose a template…' },
              ...templates.map((t) => ({
                value: `${t.name}|${t.language}`,
                label: `${t.name} · ${t.language} · ${t.category}`,
              })),
            ]}
          />

          {picked ? (
            <>
              <div className="consent__preview">
                <span className="consent__preview-label">What the customer sees</span>
                <p className="consent__preview-body">{bodyText || '(no body text)'}</p>
                <div className="consent__rule-buttons">
                  {(picked.components?.find((c) => c.type === 'BUTTONS')?.buttons ?? []).map((b, i) => (
                    <span key={i} className="consent__fakebtn">{b.text}</span>
                  ))}
                </div>
              </div>

              {picked.category !== 'MARKETING' && picked.category !== 'UTILITY' ? (
                <Banner
                  tone="warning"
                  title="Unusual category"
                  description={`This template is ${picked.category}. A consent request is normally MARKETING, or UTILITY when it genuinely follows a transaction.`}
                />
              ) : null}

              {placeholders >= 2 ? (
                <Input
                  label="Business name for {{2}}"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Shree Jewellers"
                  hint="{{1}} is filled with each contact's name automatically."
                />
              ) : null}
            </>
          ) : null}

          <Checkbox
            label={`Send to everyone awaiting a request (${askableTotal}) instead of my ${selectedIds.length} selected`}
            checked={everyone}
            onChange={(e) => setEveryone(e.target.checked)}
          />

          <p className="consent__fineprint">
            Contacts who already opted in or out are skipped, duplicates of the same
            number get one message, and anyone asked in the last 30 days is left alone.
          </p>
        </div>
      )}
    </Modal>
  );
}

/* ---- Record consent collected elsewhere ---------------------------------- */

function RecordModal({
  selectedIds, onClose, onDone, onError,
}: {
  selectedIds: string[];
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [decision, setDecision] = useState<'in' | 'out'>('in');
  const [channel, setChannel] = useState('call');
  const [wording, setWording] = useState('');
  const [source, setSource] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/crm/consent/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ contactIds: selectedIds, decision, channel, wording, source, reason }),
      });
      const d = (await res.json()) as { updated?: number; error?: string };
      if (!res.ok || d.error) { onError(d.error ?? 'Could not record consent.'); return; }
      onDone(`Consent recorded for ${d.updated} contact(s).`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record consent collected offline"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : `Record for ${selectedIds.length}`}
          </Button>
        </>
      }
    >
      <div className="consent__form">
        <Select
          label="Decision"
          value={decision}
          onChange={(e) => setDecision(e.target.value as 'in' | 'out')}
          options={[
            { value: 'in', label: 'They agreed to receive WhatsApp messages' },
            { value: 'out', label: 'They asked not to be messaged' },
          ]}
        />
        <Select
          label="How it was collected"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          options={CHANNEL_OPTIONS}
        />
        {decision === 'in' ? (
          <Textarea
            label="What they agreed to"
            value={wording}
            onChange={(e) => setWording(e.target.value)}
            rows={3}
            required
            placeholder="Asked on the call whether we may send new design catalogues and stock updates on WhatsApp, around 2-4 a month. He agreed."
            hint="Stored as the proof behind this opt-in. An opt-in with no record of what was agreed is not evidence."
          />
        ) : (
          <Input
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Asked to be removed during the call"
          />
        )}
        <Input
          label="Who collected it (optional)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Meera — showroom visit, 12 Oct"
        />
      </div>
    </Modal>
  );
}

/* ---- The ledger for one contact ------------------------------------------ */

interface LedgerEvent {
  id: string; event: string; channel: string; source: string | null;
  wording: string | null; at: string; actor: string;
}

const EVENT_LABEL: Record<string, string> = {
  requested: 'Request sent',
  opted_in: 'Opted in',
  opted_out: 'Opted out',
  reset: 'Reset',
};

function HistoryModal({ contact, onClose }: { contact: ConsentContact; onClose: () => void }) {
  const [events, setEvents] = useState<LedgerEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/crm/consent/record?contactId=${encodeURIComponent(contact.id)}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { events?: LedgerEvent[]; error?: string }) => {
        if (d.error) setError(d.error); else setEvents(d.events ?? []);
      })
      .catch(() => setError('Could not load the consent history.'));
  }, [contact.id]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Consent history — ${contact.name}`}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {error ? (
        <Banner tone="warning" title="Unavailable" description={error} />
      ) : events === null ? (
        <LoadingSkeleton lines={3} />
      ) : events.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          description="No request has gone out and no consent has been captured for this contact."
        />
      ) : (
        <ol className="consent__ledger">
          {events.map((e) => (
            <li key={e.id} className="consent__ledger-item">
              <div className="consent__ledger-head">
                <Badge tone={e.event === 'opted_in' ? 'success' : e.event === 'opted_out' ? 'danger' : 'neutral'}>
                  {EVENT_LABEL[e.event] ?? e.event}
                </Badge>
                <span className="consent__ledger-meta">
                  {new Date(e.at).toLocaleString('en-IN')} · {e.channel.replace(/_/g, ' ')} · {e.actor}
                </span>
              </div>
              {e.source ? <div className="consent__ledger-source">{e.source}</div> : null}
              {e.wording ? <p className="consent__ledger-wording">{e.wording}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
