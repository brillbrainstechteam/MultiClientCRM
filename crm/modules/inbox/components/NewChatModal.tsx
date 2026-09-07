import { useState, useMemo } from 'react';
import { Search, MessageSquare, ShieldAlert } from 'lucide-react';
import { Modal, Avatar, Button } from '@crm/design-system';
import { contacts, findWhatsAppNumber } from '@crm/mock-data';
import { allConversations } from '../inbox-mock-data';
import type { Contact } from '@crm/mock-data';

interface NewChatModalProps {
  open: boolean;
  currentNumberId: string;
  onClose: () => void;
  onOpenConversation: (convId: string) => void;
  onOpenTemplateForContact: (contact: Contact) => void;
  onCreateContact: () => void;
}

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

function hasActiveWindow(contactId: string): boolean {
  const conv = allConversations.find((c) => c.contactId === contactId && c.status !== 'resolved');
  if (!conv) return false;
  if (conv.responseWindow.status === 'expired') return false;
  return true;
}

function existingConvId(contactId: string): string | null {
  const conv = allConversations.find((c) => c.contactId === contactId && c.status !== 'resolved');
  return conv?.id ?? null;
}

export function NewChatModal({ open, currentNumberId, onClose, onOpenConversation, onOpenTemplateForContact, onCreateContact }: NewChatModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts.slice(0, 12);
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.company ?? '').toLowerCase().includes(q),
    ).slice(0, 12);
  }, [query]);

  function handleSelect(contact: Contact) {
    const convId = existingConvId(contact.id);
    if (convId) {
      onOpenConversation(convId);
      onClose();
    } else if (hasActiveWindow(contact.id)) {
      onOpenTemplateForContact(contact);
      onClose();
    } else {
      // No active window → must use template
      onOpenTemplateForContact(contact);
      onClose();
    }
  }

  const numberName = findWhatsAppNumber(currentNumberId)?.displayName ?? currentNumberId;

  return (
    <Modal open={open} title="Start New Chat" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Number context */}
        <div style={{ fontSize: 12, color: 'var(--crm-text-muted)', padding: '6px 10px', background: 'var(--crm-bg-secondary)', borderRadius: 6 }}>
          Sending from: <strong style={{ color: 'var(--crm-text-primary)' }}>{numberName}</strong>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--crm-text-muted)' }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, number, or company…"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 32px',
              border: '1px solid var(--crm-border)', borderRadius: 6, fontSize: 13,
              background: 'var(--crm-bg-primary)', color: 'var(--crm-text-primary)',
            }}
          />
        </div>

        {/* Contact list */}
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--crm-text-muted)', fontSize: 13 }}>
              No contacts found.
            </div>
          ) : (
            filtered.map((contact) => {
              const convId = existingConvId(contact.id);
              const active = hasActiveWindow(contact.id);
              return (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 7, border: '1px solid transparent', cursor: 'pointer',
                    background: 'transparent', textAlign: 'left', width: '100%',
                    transition: 'background 0.1s',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--crm-bg-secondary)'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <Avatar initials={nameInitials(contact.name)} name={contact.name} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{contact.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>
                      {contact.mobile}{contact.company ? ` · ${contact.company}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {convId ? (
                      <span style={{ fontSize: 10, color: 'var(--crm-text-brand)', fontWeight: 600, background: 'var(--crm-green-tint)', padding: '2px 7px', borderRadius: 999 }}>
                        <MessageSquare size={9} style={{ marginRight: 2, display: 'inline' }} />
                        Open
                      </span>
                    ) : active ? (
                      <span style={{ fontSize: 10, color: 'var(--crm-text-brand)', fontWeight: 600 }}>Active window</span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--crm-warning)', fontWeight: 600 }}>Template only</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Create contact option */}
        <div style={{ borderTop: '1px solid var(--crm-border)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>
            Contact not found?
          </div>
          <Button variant="secondary" size="sm" onClick={() => { onCreateContact(); onClose(); }}>
            Save as new contact
          </Button>
        </div>

        {/* Policy note */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '8px 10px', background: 'var(--crm-bg-secondary)', borderRadius: 6 }}>
          <ShieldAlert size={13} style={{ color: 'var(--crm-text-muted)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--crm-text-muted)', lineHeight: 1.4 }}>
            WhatsApp policy: You can send free-form messages only within an active 24-hour response window. Outside this window, only approved templates can be sent.
          </span>
        </div>
      </div>
    </Modal>
  );
}
