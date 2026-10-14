import { useState, useMemo, useEffect, useCallback } from 'react';
import { Zap, Plus, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Popover, SearchField } from '@crm/design-system';
import { renderQuickReply, type QuickReplyContext } from '@/lib/crm/quick-replies';
import './QuickRepliesPopover.css';

/**
 * Pick a saved reply and drop it into the composer.
 *
 * These are the CRM's own canned replies, not anything Meta stores — see
 * lib/crm/quick-replies.ts for why the two senses of "quick reply" are not the
 * same thing. They go out as free-form session text, so they only work while the
 * 24-hour window is open; the template picker is the route when it is not.
 *
 * The list used to come from a fixture array, so nothing an operator added ever
 * appeared. It now reads the workspace's real replies, sorted most-used first.
 */

interface QuickReplyDTO {
  id: string;
  shortcut: string;
  title: string;
  body: string;
  category: string;
  scope: string;
  usageCount: number;
}

interface QuickRepliesPopoverProps {
  open: boolean;
  onClose: () => void;
  /** Values used to fill {{name}}, {{company}} and friends before inserting. */
  context?: QuickReplyContext;
  contactName?: string;
  onInsert: (text: string) => void;
}

export function QuickRepliesPopover({
  open, onClose, context, contactName, onInsert,
}: QuickRepliesPopoverProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [replies, setReplies] = useState<QuickReplyDTO[] | null>(null);

  const load = useCallback(() => {
    fetch('/api/crm/quick-replies', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { quickReplies?: QuickReplyDTO[] }) => setReplies(d.quickReplies ?? []))
      .catch(() => setReplies([]));
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => { if (!open) { setQuery(''); setCategory('all'); } }, [open]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set((replies ?? []).map((r) => r.category)))],
    [replies],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return (replies ?? []).filter((r) => {
      const matchesQuery = !q
        || r.shortcut.includes(q)
        || r.title.toLowerCase().includes(q)
        || r.body.toLowerCase().includes(q);
      return matchesQuery && (category === 'all' || r.category === category);
    });
  }, [replies, query, category]);

  const handleInsert = (reply: QuickReplyDTO) => {
    onInsert(renderQuickReply(reply.body, { name: contactName, ...context }));
    // Usage drives the ordering; a failure here must not block the insert.
    void fetch(`/api/crm/quick-replies/${reply.id}`, { method: 'POST', credentials: 'same-origin' })
      .catch(() => {});
    setQuery('');
    onClose();
  };

  return (
    <Popover open={open} title="Quick replies" onClose={onClose}>
      <div className="crm-qr">
        <SearchField
          label="Search quick replies"
          hideLabel
          autoFocus
          placeholder="Search, or type a /shortcut"
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/^\/+/, ''))}
        />

        {categories.length > 1 ? (
          <div className="crm-qr__cats">
            {categories.map((cat) => (
              <button
                key={cat}
                className={category === cat ? 'crm-qr__cat crm-qr__cat--on' : 'crm-qr__cat'}
                onClick={() => setCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        ) : null}

        {replies === null ? (
          <p className="crm-qr__empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="crm-qr__empty">
            <Zap aria-hidden="true" />
            {replies.length === 0 ? (
              <>
                <span>No quick replies yet.</span>
                <span className="crm-qr__empty-sub">
                  Save the answers your team types every day — store timings, rate
                  enquiries, catalogue links — and insert them with one click.
                </span>
              </>
            ) : (
              <span>Nothing matches that search.</span>
            )}
          </div>
        ) : (
          <ul className="crm-qr__list">
            {filtered.map((r) => (
              <li key={r.id}>
                <button className="crm-qr__item" onClick={() => handleInsert(r)}>
                  <span className="crm-qr__item-head">
                    <span className="crm-qr__shortcut">/{r.shortcut}</span>
                    <span className="crm-qr__title">{r.title}</span>
                    {r.scope === 'personal' ? <span className="crm-qr__tag">Personal</span> : null}
                  </span>
                  <span className="crm-qr__body">{r.body}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="crm-qr__foot">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Plus />}
            onClick={() => { onClose(); navigate('/settings/quick-replies?new=1'); }}
          >
            New
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Settings2 />}
            onClick={() => { onClose(); navigate('/settings/quick-replies'); }}
          >
            Manage
          </Button>
        </div>
      </div>
    </Popover>
  );
}
