'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, MessageSquareDashed, Search, Send } from 'lucide-react';
import { Button } from '@/lib/ui/Button';

interface Msg { id: string; direction: string; text: string | null; status: string | null; at: string }
interface Contact { id: string; name: string | null; email: string | null; company: string | null; city: string | null; notes: string | null; tags: string[] }
interface Convo { id: string; contactPhone: string; contactName: string | null; lastMessageAt: string; contact: Contact | null; messages: Msg[] }

type Queue = 'all' | 'needs-reply';

function initials(name: string) {
  return name.split(/[\s+]/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '#';
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtRel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
/** 24-hour customer-service window from the last inbound message. */
function windowState(msgs: Msg[]): { open: boolean; label: string } {
  const lastIn = [...msgs].reverse().find((m) => m.direction === 'inbound');
  if (!lastIn) return { open: false, label: 'No inbound yet' };
  const left = 24 * 3600000 - (Date.now() - new Date(lastIn.at).getTime());
  if (left <= 0) return { open: false, label: '24h window closed' };
  const h = Math.floor(left / 3600000);
  const mm = Math.floor((left % 3600000) / 60000);
  return { open: true, label: h > 0 ? `${h}h ${mm}m left in window` : `${mm}m left in window` };
}

export function InboxClient({ business, hasTestEnv }: { business: string; hasTestEnv: boolean }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [number, setNumber] = useState<string | null>(null);
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queue>('all');
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [status, setStatus] = useState('');
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const load = useCallback(async () => {
    const res = await fetch('/api/wa/conversations');
    if (!res.ok) return;
    const data = await res.json();
    setConnected(data.connected);
    setNumber(data.number);
    setConvos(data.conversations);
    if (!activeIdRef.current && data.conversations[0]) setActiveId(data.conversations[0].id);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const needsReply = (c: Convo) => c.messages[c.messages.length - 1]?.direction === 'inbound';
  const filtered = useMemo(() => {
    let list = convos;
    if (queue === 'needs-reply') list = list.filter(needsReply);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.contactName || '').toLowerCase().includes(q) || c.contactPhone.includes(q));
    }
    return list;
  }, [convos, queue, search]);

  const active = convos.find((c) => c.id === activeId) ?? null;
  const win = active ? windowState(active.messages) : null;

  // Editable Customer-360 fields (synced when the active conversation changes).
  const [cName, setCName] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cCity, setCCity] = useState('');
  const [cTags, setCTags] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [savingC, setSavingC] = useState(false);
  useEffect(() => {
    const ct = convos.find((c) => c.id === activeId)?.contact ?? null;
    setCName(ct?.name ?? '');
    setCCompany(ct?.company ?? '');
    setCCity(ct?.city ?? '');
    setCTags((ct?.tags ?? []).join(', '));
    setCNotes(ct?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function saveContact() {
    const id = active?.contact?.id;
    if (!id) return;
    setSavingC(true);
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cName, company: cCompany, city: cCity, notes: cNotes,
        tags: cTags.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    });
    setSavingC(false);
    if (res.ok) load();
  }

  async function connectTest() {
    setStatus('Connecting test number…');
    const res = await fetch('/api/dev/connect-test', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(data.error ?? 'Failed.'); return; }
    setStatus(''); load();
  }
  async function send(to: string, text: string) {
    if (!to || !text.trim()) return;
    setStatus('Sending…');
    const res = await fetch('/api/wa/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text: text.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(data.error ?? 'Send failed.'); return; }
    setStatus(''); setReply('');
    if (data.conversationId) setActiveId(data.conversationId);
    load();
  }

  if (connected === false) {
    return (
      <main className="ttx-empty">
        <h1>Inbox</h1>
        <p>No WhatsApp number is connected for {business} yet.</p>
        {hasTestEnv
          ? <Button variant="primary" onClick={connectTest}>Use test number (developer)</Button>
          : <p className="ttx-empty__hint">Set WHATSAPP_TEST_PHONE_NUMBER_ID + WHATSAPP_TEST_TOKEN in .env.</p>}
        {status ? <p className="ttx-empty__hint">{status}</p> : null}
      </main>
    );
  }

  const allCount = convos.length;
  const needsCount = convos.filter(needsReply).length;

  return (
    <div className="ttx">
      {/* LEFT: queues + list */}
      <aside className="ttx-list">
        <div className="ttx-list__head">
          <span className="ttx-brand"><span className="ttx-brand__logo">TT</span>Inbox</span>
          {number ? <span className="ttx-list__num">{number}</span> : null}
        </div>

        <div className="ttx-queues">
          <button className={`ttx-queue${queue === 'all' ? ' ttx-queue--active' : ''}`} onClick={() => setQueue('all')}>
            All chats {allCount > 0 && <span className="ttx-queue__count">{allCount}</span>}
          </button>
          <button className={`ttx-queue${queue === 'needs-reply' ? ' ttx-queue--active' : ''}`} onClick={() => setQueue('needs-reply')}>
            Needs reply {needsCount > 0 && <span className="ttx-queue__count ttx-queue__count--alert">{needsCount}</span>}
          </button>
        </div>

        <div className="ttx-search">
          <Search size={14} />
          <input placeholder="Search name or number" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="ttx-compose">
          <input className="ttx-input" placeholder="New chat to (e.g. 9198…)" value={toNumber} onChange={(e) => setToNumber(e.target.value)} />
          <Button size="sm" variant="secondary" onClick={() => { send(toNumber, 'Hello from TalkTrackCRM 👋'); setToNumber(''); }}>Start</Button>
        </div>

        <div className="ttx-convos">
          {filtered.length === 0 ? (
            <div className="ttx-convos__empty">
              <MessageSquareDashed size={34} />
              <span>{queue === 'needs-reply' ? 'Nothing awaiting a reply' : 'No conversations yet'}</span>
            </div>
          ) : filtered.map((c) => {
            const last = c.messages[c.messages.length - 1];
            const unresolved = needsReply(c);
            return (
              <button key={c.id} className={`ttx-convo${c.id === activeId ? ' ttx-convo--active' : ''}`} onClick={() => setActiveId(c.id)}>
                <span className="ttx-avatar">{initials(c.contactName || c.contactPhone)}</span>
                <span className="ttx-convo__body">
                  <span className="ttx-convo__top">
                    <span className="ttx-convo__name">{c.contactName || c.contactPhone}</span>
                    <span className="ttx-convo__time">{fmtRel(c.lastMessageAt)}</span>
                  </span>
                  <span className="ttx-convo__preview">
                    {last?.direction === 'outbound' ? 'You: ' : ''}{last?.text ?? ''}
                  </span>
                  {unresolved && <span className="ttx-convo__badge">Needs reply</span>}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* CENTER: thread */}
      <section className="ttx-thread">
        {active ? (
          <>
            <header className="ttx-thread__head">
              <span className="ttx-avatar">{initials(active.contactName || active.contactPhone)}</span>
              <span className="ttx-thread__id">
                <span className="ttx-thread__name">{active.contactName || active.contactPhone}</span>
                <span className="ttx-thread__sub">+{active.contactPhone}</span>
              </span>
              {win && (
                <span className={`ttx-window${win.open ? '' : ' ttx-window--closed'}`}>
                  <Clock size={12} /> {win.label}
                </span>
              )}
            </header>

            <div className="ttx-messages">
              {active.messages.map((m) => (
                <div key={m.id} className={`ttx-msg ttx-msg--${m.direction}`}>
                  <span className="ttx-msg__text">{m.text}</span>
                  <span className="ttx-msg__meta">{fmtTime(m.at)}{m.direction === 'outbound' && m.status ? ` · ${m.status}` : ''}</span>
                </div>
              ))}
            </div>

            {win && !win.open ? (
              <div className="ttx-reply ttx-reply--locked">
                <Clock size={14} /> The 24-hour reply window is closed — a template message is required to re-open it.
              </div>
            ) : (
              <div className="ttx-reply">
                <input className="ttx-input" placeholder="Type a reply…" value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(active.contactPhone, reply); }} />
                <Button variant="primary" iconLeft={<Send size={15} />} onClick={() => send(active.contactPhone, reply)}>Send</Button>
              </div>
            )}
            {status ? <p className="ttx-status">{status}</p> : null}
          </>
        ) : (
          <div className="ttx-placeholder">
            <MessageSquareDashed size={44} />
            <span>Select a conversation</span>
          </div>
        )}
      </section>

      {/* RIGHT: Customer 360 (real contact record) */}
      <aside className="ttx-ctx">
        {active ? (
          <>
            <div className="ttx-ctx__head">Customer 360</div>
            <div className="ttx-ctx__profile">
              <span className="ttx-avatar ttx-avatar--lg">{initials(cName || active.contactPhone)}</span>
              <span className="ttx-ctx__name">{cName || 'Unknown contact'}</span>
              <span className="ttx-ctx__num">+{active.contactPhone}</span>
              {active.contact ? (
                <a className="ttx-ctx__link" href={`/contacts/${active.contact.id}`}>View full profile →</a>
              ) : null}
            </div>

            <div className="ttx-ctx__section">
              <span className="ttx-ctx__label">Details</span>
              <label className="ttx-ctx__field"><span>Name</span><input className="ttx-input ttx-input--sm" value={cName} onChange={(e) => setCName(e.target.value)} /></label>
              <label className="ttx-ctx__field"><span>Company</span><input className="ttx-input ttx-input--sm" value={cCompany} onChange={(e) => setCCompany(e.target.value)} /></label>
              <label className="ttx-ctx__field"><span>City</span><input className="ttx-input ttx-input--sm" value={cCity} onChange={(e) => setCCity(e.target.value)} /></label>
              <label className="ttx-ctx__field"><span>Tags</span><input className="ttx-input ttx-input--sm" value={cTags} onChange={(e) => setCTags(e.target.value)} placeholder="comma, separated" /></label>
            </div>

            <div className="ttx-ctx__section">
              <span className="ttx-ctx__label">Notes</span>
              <textarea className="ttx-ctx__notes" rows={4} value={cNotes} onChange={(e) => setCNotes(e.target.value)} placeholder="Internal notes about this customer…" />
              <Button size="sm" variant="primary" disabled={savingC || !active.contact} onClick={saveContact}>
                {savingC ? 'Saving…' : 'Save contact'}
              </Button>
            </div>

            <div className="ttx-ctx__section">
              <span className="ttx-ctx__label">Conversation</span>
              <div className="ttx-ctx__row"><span>Messages</span><strong>{active.messages.length}</strong></div>
              <div className="ttx-ctx__row"><span>Window</span><strong>{win?.open ? 'Open' : 'Closed'}</strong></div>
            </div>
          </>
        ) : (
          <div className="ttx-ctx__idle">Customer details appear here.</div>
        )}
      </aside>
    </div>
  );
}
