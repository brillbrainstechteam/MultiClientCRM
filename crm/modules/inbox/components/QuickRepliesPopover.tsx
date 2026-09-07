import { useState, useMemo } from 'react';
import { Search, Zap } from 'lucide-react';
import { Popover } from '@crm/design-system';
import { quickReplies } from '../inbox-mock-data';

interface QuickRepliesPopoverProps {
  open: boolean;
  onClose: () => void;
  contactName?: string;
  onInsert: (text: string) => void;
}

export function QuickRepliesPopover({ open, onClose, contactName, onInsert }: QuickRepliesPopoverProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(quickReplies.map((r) => r.category)))],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return quickReplies.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q);
      const matchesCategory = category === 'all' || r.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  function resolveContent(content: string): string {
    // Replace {{1}} with contactName for templates that use it as customer_name
    return content.replace(/\{\{1\}\}/g, contactName ?? '{{customer_name}}');
  }

  function handleInsert(content: string) {
    onInsert(resolveContent(content));
    setQuery('');
    onClose();
  }

  return (
    <Popover open={open} title="Quick Replies" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--crm-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search or type / to filter…"
            value={query}
            onChange={(e) => {
              let v = e.target.value;
              // Strip leading slash for shortcut UX
              if (v.startsWith('/')) v = v.slice(1);
              setQuery(v);
            }}
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box', paddingLeft: 28, paddingRight: 10,
              height: 32, border: '1px solid var(--crm-border)', borderRadius: 6,
              fontSize: 12, background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
            }}
          />
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
                border: '1px solid var(--crm-border)',
                background: category === cat ? 'var(--crm-text-brand)' : 'transparent',
                color: category === cat ? 'var(--crm-on-dark)' : 'var(--crm-text-secondary)',
                fontWeight: category === cat ? 600 : 400,
              }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--crm-text-muted)', fontSize: 12 }}>
            <Zap size={20} style={{ display: 'block', margin: '0 auto 6px', opacity: 0.4 }} />
            No quick replies found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 260, overflowY: 'auto' }}>
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => handleInsert(r.content)}
                style={{
                  textAlign: 'left', padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  border: 'none', background: 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--crm-bg-tertiary)'; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--crm-text-primary)', marginBottom: 2 }}>
                  {r.name}
                  {r.hasVariables && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--crm-text-muted)', fontWeight: 400 }}>
                      has variables
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--crm-text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                  {r.content}
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ fontSize: 10, color: 'var(--crm-text-muted)', paddingTop: 4, borderTop: '1px solid var(--crm-border)' }}>
          Click to insert into composer. Variables will be pre-filled where possible.
        </div>
      </div>
    </Popover>
  );
}
