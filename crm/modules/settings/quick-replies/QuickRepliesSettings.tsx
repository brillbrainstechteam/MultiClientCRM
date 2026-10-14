import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Pencil, Zap, Info } from 'lucide-react';
import {
  Badge, Banner, Button, Input, Select, Textarea, Toast, EmptyState,
  LoadingSkeleton, SearchField,
} from '@crm/design-system';
import { PageHeader } from '@crm/components';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  normaliseShortcut, renderQuickReply, validateQuickReply,
  PLACEHOLDERS, WHATSAPP_TEXT_LIMIT, BODY_SOFT_LIMIT, SHORTCUT_MAX,
} from '@/lib/crm/quick-replies';
import './QuickRepliesSettings.css';

/**
 * Manage the workspace's canned replies.
 *
 * The thing worth being explicit about on this screen is *when* a quick reply
 * can be used: it is free-form session text, so it only sends inside the
 * 24-hour customer service window. Outside that window only an approved
 * template will deliver, which is a different object entirely. Operators
 * conflate the two constantly, so the page says so rather than letting them
 * find out when a send fails.
 */

interface QuickReplyDTO {
  id: string;
  shortcut: string;
  title: string;
  body: string;
  category: string;
  language: string;
  scope: string;
  ownerId: string | null;
  usageCount: number;
  lastUsedAt: string | null;
}

const EMPTY = {
  id: '', shortcut: '', title: '', body: '',
  category: 'General', language: 'en', scope: 'workspace',
};

export default function QuickRepliesSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, currentUser } = useWorkspace();
  const canShare = ['owner', 'admin', 'manager'].includes(role);

  const [rows, setRows] = useState<QuickReplyDTO[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/crm/quick-replies', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { quickReplies?: QuickReplyDTO[]; categories?: string[] }) => {
        setRows(d.quickReplies ?? []);
        setCategories(d.categories ?? []);
      })
      .catch(() => setRows([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ?new=1 opens the form straight away (the inbox popover links here).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing({ ...EMPTY });
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.delete('new');
        return p;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (rows ?? []).filter((r) => !q
      || r.shortcut.includes(q)
      || r.title.toLowerCase().includes(q)
      || r.body.toLowerCase().includes(q));
  }, [rows, query]);

  const issues = editing ? validateQuickReply(editing) : [];
  const shortcutPreview = editing ? normaliseShortcut(editing.shortcut || editing.title) : '';

  const save = async () => {
    if (!editing || issues.length) return;
    setBusy(true);
    try {
      const isNew = !editing.id;
      const res = await fetch(
        isNew ? '/api/crm/quick-replies' : `/api/crm/quick-replies/${editing.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ ...editing, shortcut: shortcutPreview }),
        },
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setToast({ tone: 'error', text: (d as { error?: string }).error ?? 'Could not save.' }); return; }
      setToast({ tone: 'success', text: isNew ? `/${shortcutPreview} saved.` : 'Quick reply updated.' });
      setEditing(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: QuickReplyDTO) => {
    const res = await fetch(`/api/crm/quick-replies/${r.id}`, { method: 'DELETE', credentials: 'same-origin' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setToast({ tone: 'error', text: (d as { error?: string }).error ?? 'Could not delete.' }); return; }
    setToast({ tone: 'success', text: `/${r.shortcut} deleted.` });
    load();
  };

  const mayEdit = (r: QuickReplyDTO) =>
    r.scope === 'personal' ? r.ownerId === currentUser.id : canShare;

  return (
    <div className="crm-qrs">
      <PageHeader
        title="Quick replies"
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Quick replies' }]}
        actions={
          <Button variant="primary" iconLeft={<Plus />} onClick={() => setEditing({ ...EMPTY })}>
            New quick reply
          </Button>
        }
      />

      <Banner
        tone="info"
        title="Quick replies are not message templates"
        description={
          'A quick reply is free-form text your team inserts while a chat is open, so it only '
          + 'sends inside the 24-hour customer service window. To start a conversation, or to '
          + 'reply after the window closes, WhatsApp requires an approved template instead.'
        }
      />

      <div className="crm-qrs__toolbar">
        <SearchField
          label="Search quick replies"
          hideLabel
          placeholder="Search by shortcut, name or text"
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/^\/+/, ''))}
        />
        {rows ? <span className="crm-qrs__count">{rows.length} saved</span> : null}
      </div>

      {editing ? (
        <section className="crm-qrs__editor">
          <h2 className="crm-qrs__editor-title">
            {editing.id ? 'Edit quick reply' : 'New quick reply'}
          </h2>

          <div className="crm-qrs__grid">
            <Input
              label="Name"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Store timings"
              hint="What the team sees in the list."
            />
            <Input
              label="Shortcut"
              value={editing.shortcut}
              onChange={(e) => setEditing({ ...editing, shortcut: e.target.value })}
              placeholder="timings"
              leadingAddon="/"
              hint={
                shortcutPreview
                  ? `Agents type /${shortcutPreview} — up to ${SHORTCUT_MAX} characters.`
                  : `Leave blank to generate one from the name.`
              }
            />
            <Select
              label="Category"
              value={editing.category}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Who can use it"
              value={editing.scope}
              onChange={(e) => setEditing({ ...editing, scope: e.target.value })}
              options={[
                { value: 'workspace', label: 'Everyone on the team', disabled: !canShare },
                { value: 'personal', label: 'Only me' },
              ]}
              hint={canShare ? undefined : 'Only a manager or admin can share with the team.'}
            />
          </div>

          <Textarea
            label="Reply text"
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            rows={4}
            placeholder="Hi {{name}}, our showroom is open 11am to 8pm, Monday to Saturday."
            hint={`${editing.body.length} / ${WHATSAPP_TEXT_LIMIT} characters.${
              editing.body.length > BODY_SOFT_LIMIT ? ' Long replies read as a wall of text on a phone.' : ''
            }`}
          />

          <div className="crm-qrs__placeholders">
            <span className="crm-qrs__placeholders-label">
              <Info aria-hidden="true" /> Insert:
            </span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.token}
                type="button"
                className="crm-qrs__chip"
                title={`Filled from ${p.from}`}
                onClick={() => setEditing({ ...editing, body: `${editing.body}${p.token}` })}
              >
                {p.token}
              </button>
            ))}
          </div>

          {editing.body ? (
            <div className="crm-qrs__preview">
              <span className="crm-qrs__preview-label">Preview</span>
              <p className="crm-qrs__bubble">
                {renderQuickReply(editing.body, {
                  name: 'Rajesh', company: 'Shree Jewellers', city: 'Jaipur',
                  agent: currentUser.name, business: 'your business',
                })}
              </p>
            </div>
          ) : null}

          {issues.length ? (
            <ul className="crm-qrs__issues">
              {issues.map((i) => <li key={i.field + i.message}>{i.message}</li>)}
            </ul>
          ) : null}

          <div className="crm-qrs__editor-foot">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()} disabled={busy || issues.length > 0}>
              {busy ? 'Saving…' : editing.id ? 'Save changes' : 'Create quick reply'}
            </Button>
          </div>
        </section>
      ) : null}

      {rows === null ? (
        <LoadingSkeleton lines={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? 'No quick replies yet' : 'Nothing matches that search'}
          description={
            rows.length === 0
              ? 'Save the answers your team types every day — store timings, rate enquiries, catalogue links — so nobody retypes them.'
              : 'Try a different word, or clear the search.'
          }
          actions={
            rows.length === 0
              ? <Button variant="primary" iconLeft={<Plus />} onClick={() => setEditing({ ...EMPTY })}>New quick reply</Button>
              : undefined
          }
        />
      ) : (
        <ul className="crm-qrs__list">
          {filtered.map((r) => (
            <li key={r.id} className="crm-qrs__row">
              <div className="crm-qrs__row-main">
                <div className="crm-qrs__row-head">
                  <code className="crm-qrs__shortcut">/{r.shortcut}</code>
                  <span className="crm-qrs__name">{r.title}</span>
                  <Badge tone="neutral">{r.category}</Badge>
                  {r.scope === 'personal' ? <Badge tone="info">Only me</Badge> : null}
                </div>
                <p className="crm-qrs__text">{r.body}</p>
                <span className="crm-qrs__meta">
                  <Zap aria-hidden="true" />
                  {r.usageCount === 0 ? 'Never used' : `Used ${r.usageCount} time${r.usageCount === 1 ? '' : 's'}`}
                  {r.lastUsedAt ? ` · last ${new Date(r.lastUsedAt).toLocaleDateString('en-IN')}` : ''}
                </span>
              </div>
              {mayEdit(r) ? (
                <div className="crm-qrs__row-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Pencil />}
                    onClick={() => setEditing({
                      id: r.id, shortcut: r.shortcut, title: r.title, body: r.body,
                      category: r.category, language: r.language, scope: r.scope,
                    })}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" iconLeft={<Trash2 />} onClick={() => void remove(r)}>
                    Delete
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {toast ? <Toast tone={toast.tone} message={toast.text} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
