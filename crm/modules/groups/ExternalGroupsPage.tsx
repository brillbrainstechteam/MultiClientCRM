import { useCallback, useEffect, useState } from 'react';
import { Users, Plus, Info, MessageSquarePlus, Archive } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Button, Input, Modal, Select, Textarea } from '@crm/design-system';
import './ExternalGroupsPage.css';

/**
 * External WhatsApp groups (PRD §9.2, GRP-06).
 *
 * Existing WhatsApp Business App groups are not synchronised through
 * Coexistence and their history cannot be imported — Meta does not expose it.
 * Rather than drop a real B2B workflow or fake it, this registers that the
 * group exists, who is on it from our side, and what people report happening.
 *
 * The screen says plainly, more than once, that messages are not synchronised.
 * An operator who believes they are seeing a group's traffic here would draw
 * wrong conclusions from an empty list.
 */

interface Group {
  id: string;
  contactId: string | null;
  name: string;
  zoneId: string | null;
  primaryUserId: string | null;
  backupUserIds: string[];
  managerUserId: string | null;
  inviteLink: string | null;
  notes: string | null;
  status: string;
  lastManualUpdateAt: string | null;
}

interface LogEntry { id: string; kind: string; text: string | null; by: string | null; at: string }
interface Member { id: string; name: string }

const LOG_KINDS = [
  { value: 'update', label: 'Group update' },
  { value: 'note', label: 'Note' },
  { value: 'order_discussion', label: 'Order discussion' },
  { value: 'outcome', label: 'Outcome' },
];

export default function ExternalGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [openGroup, setOpenGroup] = useState<Group | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/groups/external', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { groups?: Group[]; error?: string }) => {
        if (d.error) setError(d.error);
        else { setGroups(d.groups ?? []); setError(null); }
      })
      .catch(() => setError('Could not load groups.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    fetch('/api/crm/team/assignable', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setMembers(((d.allMembers ?? d.members ?? []) as Member[])))
      .catch(() => setMembers([]));
  }, [load]);

  const nameOf = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? '—' : '—');

  return (
    <div className="xg">
      <PageHeader
        title="Customer WhatsApp groups"
        description="Groups that live in WhatsApp, registered here so the CRM knows who owns them."
        actions={<Button variant="primary" iconLeft={<Plus />} onClick={() => setAdding(true)}>Register a group</Button>}
      />

      {/* Stated up front, because an empty activity list would otherwise read
          as "this group is quiet" rather than "we cannot see this group". */}
      <div className="xg__banner">
        <Info size={16} aria-hidden="true" />
        <div>
          <strong>These groups keep working in WhatsApp</strong>
          <p>
            WhatsApp does not share existing group chats with any CRM, so their messages
            are never synchronised here. What you see below is what your team records.
          </p>
        </div>
      </div>

      {error && <p className="xg__error">{error}</p>}
      {loading && <p className="xg__muted">Loading…</p>}

      {!loading && groups.length === 0 && (
        <div className="xg__empty">
          <Users size={40} aria-hidden="true" />
          <h2>No groups registered</h2>
          <p>
            If your salespeople run customer groups on WhatsApp, register them here so the
            business knows who is in them and what was agreed.
          </p>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <ul className="xg__list">
          {groups.map((g) => (
            <li key={g.id} className={`xg__card${g.status === 'inactive' ? ' xg__card--off' : ''}`}>
              <div className="xg__head">
                <strong>{g.name}</strong>
                <Badge tone="neutral">Managed in WhatsApp</Badge>
                {g.status === 'inactive' && <Badge tone="neutral"><Archive size={11} /> Inactive</Badge>}
              </div>
              <dl className="xg__meta">
                <div><dt>Primary</dt><dd>{nameOf(g.primaryUserId)}</dd></div>
                <div><dt>Backups</dt><dd>{g.backupUserIds.length ? g.backupUserIds.map(nameOf).join(', ') : '—'}</dd></div>
                <div><dt>Manager</dt><dd>{nameOf(g.managerUserId)}</dd></div>
                <div>
                  <dt>Last update</dt>
                  <dd>{g.lastManualUpdateAt
                    ? new Date(g.lastManualUpdateAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Never'}</dd>
                </div>
              </dl>
              {g.notes && <p className="xg__notes">{g.notes}</p>}
              <div className="xg__actions">
                <Button variant="secondary" size="sm" iconLeft={<MessageSquarePlus />} onClick={() => setOpenGroup(g)}>
                  Activity
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <GroupForm
          members={members}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
      )}
      {openGroup && (
        <GroupActivity group={openGroup} onClose={() => { setOpenGroup(null); load(); }} />
      )}
    </div>
  );
}

function GroupForm({ members, onClose, onSaved }: { members: Member[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [primaryUserId, setPrimary] = useState('');
  const [managerUserId, setManager] = useState('');
  const [notes, setNotes] = useState('');
  const [inviteLink, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim()) { setErr('Give the group a name.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/crm/groups/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, primaryUserId: primaryUserId || null, managerUserId: managerUserId || null, notes, inviteLink }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr((d as { error?: string }).error ?? 'Could not save.'); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  const options = [{ value: '', label: '—' }, ...members.map((m) => ({ value: m.id, label: m.name }))];

  return (
    <Modal
      open onClose={onClose} title="Register a WhatsApp group"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Register group'}
          </Button>
        </>
      }
    >
      <div className="xg__form">
        <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Antraa Jewellery — North" hint="As it is named in WhatsApp." />
        <Select label="Primary salesperson" value={primaryUserId} onChange={(e) => setPrimary(e.target.value)} options={options} />
        <Select label="Manager" value={managerUserId} onChange={(e) => setManager(e.target.value)} options={options} />
        <Input label="Invite link (optional)" value={inviteLink} onChange={(e) => setInvite(e.target.value)}
          placeholder="https://chat.whatsapp.com/…"
          hint="Typed in by hand — WhatsApp does not give it to us." />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        {err && <p className="xg__error">{err}</p>}
      </div>
    </Modal>
  );
}

function GroupActivity({ group, onClose }: { group: Group; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [kind, setKind] = useState('update');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/crm/groups/external/log?groupId=${group.id}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { logs?: LogEntry[] }) => setLogs(d.logs ?? []))
      .catch(() => setLogs([]));
  }, [group.id]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await fetch('/api/crm/groups/external/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ groupId: group.id, kind, text }),
      });
      setText('');
      load();
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={group.name}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="xg__activity">
        <p className="xg__muted">
          Recorded by your team. WhatsApp messages from this group are not synchronised.
        </p>

        <div className="xg__add">
          <Select label="What happened" value={kind} onChange={(e) => setKind(e.target.value)} options={LOG_KINDS} />
          <Textarea label="Details" value={text} onChange={(e) => setText(e.target.value)} rows={2}
            placeholder="Customer asked for the new bangle collection pricing" />
          <Button variant="primary" size="sm" onClick={() => void add()} disabled={busy || !text.trim()}>
            {busy ? 'Saving…' : 'Record'}
          </Button>
        </div>

        {logs.length === 0 ? (
          <p className="xg__muted">Nothing recorded yet.</p>
        ) : (
          <ul className="xg__logs">
            {logs.map((l) => (
              <li key={l.id}>
                <span className="xg__logkind">{LOG_KINDS.find((k) => k.value === l.kind)?.label ?? l.kind}</span>
                <p>{l.text}</p>
                <span className="xg__logby">
                  {l.by ?? 'Someone'} · {new Date(l.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
