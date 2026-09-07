import { useState } from 'react';
import { ChevronDown, UserPlus, ExternalLink, ShoppingBag } from 'lucide-react';
import { Avatar, Button } from '@crm/design-system';
import { contacts, findUser } from '@crm/mock-data';

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}
import type { InboxConversation } from '../inbox-types';
import { allConversations } from '../inbox-mock-data';

interface CustomerContextShellProps {
  conversation: InboxConversation;
  onSaveCustomer: () => void;
  onViewFullProfile: (contactId: string) => void;
  onViewOrders?: (contactId: string) => void;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="crm-ctx-section">
      <div className="crm-ctx-section__header" onClick={() => setOpen((o) => !o)}>
        <span className="crm-ctx-section__title">{title}</span>
        <ChevronDown
          size={14}
          className={`crm-ctx-section__chevron${open ? ' crm-ctx-section__chevron--open' : ''}`}
        />
      </div>
      {open && <div className="crm-ctx-section__body">{children}</div>}
    </div>
  );
}

function ContextField({ label, value, isLink }: { label: string; value: string | null; isLink?: boolean }) {
  if (!value) return null;
  return (
    <div className="crm-ctx-field">
      <span className="crm-ctx-field__label">{label}</span>
      <span className={`crm-ctx-field__value${isLink ? ' crm-ctx-field__value--link' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export function CustomerContextShell({
  conversation: c,
  onSaveCustomer,
  onViewFullProfile,
  onViewOrders,
}: CustomerContextShellProps) {
  const contact = c.contactId ? contacts.find((ct) => ct.id === c.contactId) : null;
  const contactOwner = contact?.ownerId ? findUser(contact.ownerId) : null;
  const conversationAssignee = c.assigneeId ? findUser(c.assigneeId) : null;

  // Previous conversations from same contact (excluding current)
  const prevConvs = contact
    ? allConversations.filter((cv) => cv.contactId === contact.id && cv.id !== c.id).slice(0, 3)
    : [];

  return (
    <div className="crm-ctx">
      <div className="crm-ctx__header">
        <span className="crm-ctx__header-title">Customer Context</span>
      </div>

      <div className="crm-ctx__body">
        {/* Unknown customer */}
        {!contact && (
          <>
            <div className="crm-ctx-unknown">
              <div className="crm-ctx-unknown__icon">
                <UserPlus size={20} />
              </div>
              <div>
                <div className="crm-ctx-unknown__title">Unknown customer</div>
                <div className="crm-ctx-unknown__sub">
                  {c.rawMobile ?? 'No phone number'} — no Contact record found.
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={onSaveCustomer}>
                Save as Contact
              </Button>
            </div>

            <CollapsibleSection title="Conversation" defaultOpen>
              <ContextField label="Number" value={c.rawMobile} />
              <ContextField label="Assignee" value={conversationAssignee?.name ?? 'Unassigned'} />
              <ContextField label="Status" value={c.status.charAt(0).toUpperCase() + c.status.slice(1)} />
            </CollapsibleSection>
          </>
        )}

        {/* Known contact */}
        {contact && (
          <>
            <div className="crm-ctx-profile">
              <Avatar initials={nameInitials(contact.name)} name={contact.name} size="md" />
              <div className="crm-ctx-profile__info">
                <div className="crm-ctx-profile__name">{contact.name}</div>
                {contact.company && (
                  <div className="crm-ctx-profile__sub">{contact.company}</div>
                )}
                <div className="crm-ctx-profile__sub">
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: stageBg(contact.stage),
                      color: stageColor(contact.stage),
                    }}
                  >
                    {contact.stage.charAt(0).toUpperCase() + contact.stage.slice(1)}
                  </span>
                  {' '}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: 'var(--crm-gold-tint)',
                      color: 'var(--crm-gold-dark)',
                    }}
                  >
                    {contact.salesTier.charAt(0).toUpperCase() + contact.salesTier.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact tags */}
            {contact.tags.length > 0 && (
              <div className="crm-ctx-profile__tags">
                {contact.tags.map((tag) => (
                  <span key={tag} className="crm-ctx-profile__tag">{tag}</span>
                ))}
              </div>
            )}

            <CollapsibleSection title="Contact Details" defaultOpen>
              <ContextField label="Mobile" value={contact.mobile} />
              <ContextField label="Email" value={contact.email} isLink />
              <ContextField label="City" value={contact.city} />
              <ContextField label="Company" value={contact.company} />
              <ContextField label="Source" value={contact.source} />
              <ContextField label="Consent" value={contact.consent} />
            </CollapsibleSection>

            <CollapsibleSection title="Ownership" defaultOpen={false}>
              <div className="crm-ctx-field">
                <span className="crm-ctx-field__label">Contact owner</span>
                <span className="crm-ctx-field__value">{contactOwner?.name ?? 'Unassigned'}</span>
              </div>
              <div className="crm-ctx-field">
                <span className="crm-ctx-field__label">Conv. assignee</span>
                <span className="crm-ctx-field__value">{conversationAssignee?.name ?? 'Unassigned'}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--crm-text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                Contact owner ≠ conversation assignee
              </div>
            </CollapsibleSection>

            {prevConvs.length > 0 && (
              <CollapsibleSection title="Previous Conversations" defaultOpen={false}>
                {prevConvs.map((pc) => (
                  <div key={pc.id} className="crm-ctx-prev-conv">
                    <div className="crm-ctx-prev-conv__meta">
                      <div className="crm-ctx-prev-conv__preview">{pc.preview.text}</div>
                      <div className="crm-ctx-prev-conv__date">
                        {pc.lastMessageAt.slice(0, 10)} · {pc.status}
                      </div>
                    </div>
                    <ExternalLink size={11} style={{ color: 'var(--crm-text-muted)', flexShrink: 0 }} />
                  </div>
                ))}
              </CollapsibleSection>
            )}

            <CollapsibleSection title="Orders & Payments" defaultOpen={false}>
              <div style={{ fontSize: 12, color: 'var(--crm-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShoppingBag size={13} />
                Order history from Catalogue &amp; Orders
              </div>
              {onViewOrders && contact && (
                <button
                  style={{ fontSize: 12, color: 'var(--crm-text-brand)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}
                  onClick={() => onViewOrders(contact.id)}
                >
                  View orders →
                </button>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>

      {contact && (
        <div className="crm-ctx__view-full">
          <button
            className="crm-ctx__view-full-btn"
            onClick={() => onViewFullProfile(contact.id)}
          >
            <ExternalLink size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            View full Customer 360
          </button>
        </div>
      )}
    </div>
  );
}

function stageBg(stage: string): string {
  const map: Record<string, string> = {
    new: 'var(--crm-info-50)',
    engaged: 'var(--crm-green-tint)',
    qualified: 'var(--crm-gold-tint)',
    customer: 'var(--crm-navy-2)',
    dormant: 'var(--crm-surface-band)',
  };
  return map[stage] ?? 'var(--crm-surface-band)';
}

function stageColor(stage: string): string {
  const map: Record<string, string> = {
    new: 'var(--crm-info-600)',
    engaged: 'var(--crm-green-dark)',
    qualified: 'var(--crm-gold-dark)',
    customer: 'var(--crm-on-dark)',
    dormant: 'var(--crm-text-muted)',
  };
  return map[stage] ?? 'var(--crm-text-secondary)';
}
