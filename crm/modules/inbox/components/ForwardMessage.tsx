import { useState, useMemo } from 'react';
import { Search, Forward } from 'lucide-react';
import { Modal, Button, Avatar } from '@crm/design-system';
import { contacts } from '@crm/mock-data';
import { allConversations } from '../inbox-mock-data';
import type { InboxMessage } from '../inbox-types';

interface ForwardMessageProps {
  open: boolean;
  message: InboxMessage | null;
  currentConvId: string;
  onClose: () => void;
  onForward: (targetConvId: string, note: string) => void;
}

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

export function ForwardMessage({ open, message, currentConvId, onClose, onForward }: ForwardMessageProps) {
  const [query, setQuery] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const candidates = useMemo(() => {
    const q = query.toLowerCase();
    return allConversations
      .filter((c) => c.id !== currentConvId && c.status !== 'resolved')
      .map((c) => ({
        conv: c,
        contactName: c.contactId ? (contacts.find((ct) => ct.id === c.contactId)?.name ?? c.rawMobile ?? 'Unknown') : (c.rawMobile ?? 'Unknown'),
      }))
      .filter(({ conv, contactName }) =>
        !q ||
        contactName.toLowerCase().includes(q) ||
        conv.id.includes(q),
      );
  }, [query, currentConvId]);

  function handleForward() {
    if (!selectedConvId) return;
    onForward(selectedConvId, note);
    setSelectedConvId(null);
    setNote('');
    setQuery('');
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Forward Message"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleForward} disabled={!selectedConvId}>
            <Forward size={13} style={{ marginRight: 4 }} /> Forward
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Message preview */}
        {message && (
          <div style={{
            background: 'var(--crm-bg-secondary)', border: '1px solid var(--crm-border)',
            borderRadius: 8, padding: 10, fontSize: 12, color: 'var(--crm-text-secondary)',
            borderLeft: '3px solid var(--crm-text-brand)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--crm-text-muted)', marginBottom: 4 }}>
              Forwarding message:
            </div>
            {message.text}
          </div>
        )}

        {/* Destination search */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-secondary)', display: 'block', marginBottom: 6 }}>
            Forward to conversation
          </label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--crm-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search conversations…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', paddingLeft: 30, paddingRight: 10,
                height: 32, border: '1px solid var(--crm-border)', borderRadius: 6,
                fontSize: 12, background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
              }}
            />
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {candidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--crm-text-muted)', fontSize: 12 }}>
                No matching conversations.
              </div>
            ) : (
              candidates.map(({ conv, contactName }) => {
                const isSelected = selectedConvId === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(isSelected ? null : conv.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      borderRadius: 6, cursor: 'pointer', border: '1px solid transparent',
                      background: isSelected ? 'var(--crm-bg-brand-tint, #f0f7ff)' : 'transparent',
                      borderColor: isSelected ? 'var(--crm-text-brand)' : 'transparent',
                      textAlign: 'left',
                    }}
                  >
                    <Avatar initials={nameInitials(contactName)} name={contactName} size="sm" />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{contactName}</div>
                      <div style={{ fontSize: 10, color: 'var(--crm-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                        {conv.preview.text}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Optional note */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-secondary)', display: 'block', marginBottom: 6 }}>
            Add a note (optional)
          </label>
          <textarea
            placeholder="Context note for the receiving agent…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 10px',
              border: '1px solid var(--crm-border)', borderRadius: 6, resize: 'vertical',
              fontSize: 12, background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
            }}
          />
        </div>

        {selectedConvId && (
          <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', background: 'var(--crm-bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
            This will create an internal note in the destination conversation with the forwarded message.
            The original customer will not see this.
          </div>
        )}
      </div>
    </Modal>
  );
}
