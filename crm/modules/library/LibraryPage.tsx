import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, Plus, Mic, Image as ImageIcon, Video, FileText, Link2,
  ShoppingBag, MessageSquare, Sparkles, AlertTriangle, Archive,
} from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Button, Input, Modal, Select, Textarea, type BadgeTone } from '@crm/design-system';
import './LibraryPage.css';

/**
 * Communication Library (PRD §17).
 *
 * One place for everything an agent might send. The part that matters is the
 * destination badges on each item: §17 ends "only show formats supported by
 * the destination", and the reason is that WhatsApp genuinely cannot send a
 * voice note as a template or a product message into a group. Saying so on the
 * card means the agent learns it once, here, rather than at the moment they
 * try to use it.
 */

interface Item {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  fileUrl: string | null;
  linkUrl: string | null;
  audience: string;
  tags: string[];
  isOwnerContent: boolean;
  scope: string;
  active: boolean;
  usageCount: number;
  destinations: string[];
  complete: boolean;
  incompleteReason: string | null;
}

const KIND_META: Record<string, { label: string; icon: typeof Mic }> = {
  text: { label: 'Message', icon: MessageSquare },
  image: { label: 'Creative', icon: ImageIcon },
  video: { label: 'Video', icon: Video },
  audio: { label: 'Voice note', icon: Mic },
  document: { label: 'Document', icon: FileText },
  link: { label: 'Link', icon: Link2 },
  catalogue: { label: 'Products', icon: ShoppingBag },
  template: { label: 'Template', icon: FileText },
};

const AUDIENCES = [
  { value: 'general', label: 'General' },
  { value: 'new_lead', label: 'New leads' },
  { value: 'low_interest', label: 'Low or no interest' },
  { value: 'journey', label: 'Through the journey' },
  { value: 'relationship', label: 'Relationship' },
];

const DESTINATION_LABEL: Record<string, string> = {
  one_to_one_live: 'Live chat',
  one_to_one_template: 'Template',
  campaign: 'Campaign',
  managed_group: 'Group',
  external_group_manual: 'Manual',
};

const AUDIENCE_TONE: Record<string, BadgeTone> = {
  new_lead: 'info', low_interest: 'warning', journey: 'brand',
  relationship: 'gold', general: 'neutral',
};

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState('');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (audience) params.set('audience', audience);
    if (q.trim()) params.set('q', q.trim());
    params.set('includeInactive', 'true');
    fetch(`/api/crm/library?${params}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { items?: Item[]; canManage?: boolean; error?: string }) => {
        if (d.error) setError(d.error);
        else { setItems(d.items ?? []); setCanManage(!!d.canManage); setError(null); }
      })
      .catch(() => setError('Could not load the library.'))
      .finally(() => setLoading(false));
  }, [audience, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const retire = async (item: Item) => {
    await fetch(`/api/crm/library?id=${item.id}`, { method: 'DELETE', credentials: 'same-origin' });
    load();
  };

  return (
    <div className="lb">
      <PageHeader
        title="Communication library"
        description="Messages, creatives, voice notes, videos, catalogues and templates your team can send."
        actions={<Button variant="primary" iconLeft={<Plus />} onClick={() => setAdding(true)}>Add content</Button>}
      />

      <div className="lb__filters">
        <Input label="Search" hideLabel value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search the library" />
        <Select label="For" hideLabel value={audience} onChange={(e) => setAudience(e.target.value)}
          options={[{ value: '', label: 'Everyone' }, ...AUDIENCES]} />
      </div>

      {error && <p className="lb__error">{error}</p>}
      {loading && <p className="lb__muted">Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="lb__empty">
          <BookOpen size={40} aria-hidden="true" />
          <h2>{q || audience ? 'Nothing matches' : 'The library is empty'}</h2>
          <p>
            {q || audience
              ? 'Try a different search or audience.'
              : 'Add the messages, creatives and voice notes your team sends most, and they will be one click away in the inbox.'}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="lb__grid">
          {items.map((i) => {
            const meta = KIND_META[i.kind] ?? KIND_META.text;
            const Icon = meta.icon;
            return (
              <li key={i.id} className={`lb__card${i.active ? '' : ' lb__card--off'}`}>
                <div className="lb__top">
                  <span className="lb__kind"><Icon size={13} /> {meta.label}</span>
                  {i.isOwnerContent && <Badge tone="gold"><Sparkles size={10} /> Owner</Badge>}
                  {!i.active && <Badge tone="neutral"><Archive size={10} /> Retired</Badge>}
                </div>

                <strong className="lb__title">{i.title}</strong>
                {i.body && <p className="lb__body">{i.body}</p>}
                {i.linkUrl && <a className="lb__link" href={i.linkUrl} target="_blank" rel="noreferrer">{i.linkUrl}</a>}

                {!i.complete && (
                  <p className="lb__incomplete">
                    <AlertTriangle size={12} aria-hidden="true" />
                    {i.incompleteReason} Until then it is hidden from the composer.
                  </p>
                )}

                {/* Where it can actually go. The absences are the useful part:
                    a voice note with no Campaign badge has already told the
                    agent what they would otherwise learn from an error. */}
                <div className="lb__dests">
                  {i.destinations.map((d) => (
                    <span key={d} className="lb__dest">{DESTINATION_LABEL[d] ?? d}</span>
                  ))}
                </div>

                <div className="lb__foot">
                  <Badge tone={AUDIENCE_TONE[i.audience] ?? 'neutral'}>
                    {AUDIENCES.find((a) => a.value === i.audience)?.label ?? i.audience}
                  </Badge>
                  {i.usageCount > 0 && <span className="lb__used">Used {i.usageCount}×</span>}
                  {i.active && (canManage || i.scope === 'personal') && (
                    <button className="lb__retire" onClick={() => void retire(i)}>Retire</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <AddItem canManage={canManage} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />
      )}
    </div>
  );
}

function AddItem({ canManage, onClose, onSaved }: {
  canManage: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [kind, setKind] = useState('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [audience, setAudience] = useState('general');
  const [tags, setTags] = useState('');
  const [isOwnerContent, setOwner] = useState(false);
  const [scope, setScope] = useState(canManage ? 'workspace' : 'personal');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const needsFile = ['image', 'video', 'audio', 'document'].includes(kind);
  const needsLink = kind === 'link';
  const needsBody = kind === 'text';

  const save = async () => {
    if (!title.trim()) { setErr('Give it a name your team will recognise.'); return; }
    setBusy(true); setErr('');
    try {
      let fileId: string | undefined;
      if (needsFile) {
        if (!file) { setErr('Choose the file to upload.'); setBusy(false); return; }
        // The uploads in this product take base64 JSON rather than multipart,
        // so the library follows the same contract.
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
          reader.onerror = () => reject(new Error('Could not read that file.'));
          reader.readAsDataURL(file);
        });
        const up = await fetch('/api/crm/library/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ fileBase64, mimeType: file.type, fileName: file.name, kind }),
        });
        const ud = await up.json().catch(() => ({}));
        if (!up.ok) { setErr((ud as { error?: string }).error ?? 'The file could not be uploaded.'); return; }
        fileId = (ud as { id?: string }).id;
        if (!fileId) { setErr('The upload did not return a file.'); return; }
      }

      const res = await fetch('/api/crm/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          kind, title, body: needsBody || body ? body : undefined,
          linkUrl: needsLink ? linkUrl : undefined,
          fileId, audience, isOwnerContent, scope,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr((d as { error?: string }).error ?? 'Could not save.'); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  // Said before the agent commits to a kind, rather than after they try to use
  // the item somewhere it cannot go.
  const limitNote = kind === 'audio'
    ? 'Voice notes can be sent in a live chat or a group, but WhatsApp cannot carry one in a template or a campaign.'
    : kind === 'catalogue'
      ? 'Product messages work in a live chat. WhatsApp does not allow them in groups or campaigns.'
      : kind === 'template'
        ? 'An approved template is the only thing that can be sent outside the 24-hour window.'
        : null;

  return (
    <Modal open onClose={onClose} title="Add to the library"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Add to library'}
          </Button>
        </>
      }>
      <div className="lb__form">
        <Select label="What is it" value={kind} onChange={(e) => setKind(e.target.value)}
          options={Object.entries(KIND_META).map(([value, m]) => ({ value, label: m.label }))} />

        {limitNote && <p className="lb__note">{limitNote}</p>}

        <Input label="Name" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Diwali bangle collection — intro" hint="What your team will search for." />

        {needsBody && (
          <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={4}
            placeholder="Namaste {{name}}, our new Diwali collection is ready…"
            hint="Use {{name}} and {{company}} — they are filled in before sending." />
        )}
        {!needsBody && !needsLink && (
          <Textarea label="Caption (optional)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
        )}
        {needsLink && (
          <Input label="Link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…" />
        )}
        {needsFile && (
          <label className="lb__file">
            <span>File</span>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <em>{file.name}</em>}
          </label>
        )}

        <Select label="Who is it for" value={audience} onChange={(e) => setAudience(e.target.value)} options={AUDIENCES} />
        <Input label="Tags (optional)" value={tags} onChange={(e) => setTags(e.target.value)}
          placeholder="diwali, bangles, hindi" hint="Comma separated." />

        <label className="lb__check">
          <input type="checkbox" checked={isOwnerContent} onChange={(e) => setOwner(e.target.checked)} />
          <span>Recorded by the owner — carries more weight with customers</span>
        </label>

        <Select label="Who can use it" value={scope} onChange={(e) => setScope(e.target.value)}
          options={[
            { value: 'workspace', label: 'Everyone on the team', disabled: !canManage },
            { value: 'personal', label: 'Only me' },
          ]}
          hint={canManage ? undefined : 'Only a manager or admin can add to the shared library.'} />

        {err && <p className="lb__error">{err}</p>}
      </div>
    </Modal>
  );
}
