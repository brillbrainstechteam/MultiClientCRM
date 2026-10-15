import { useState } from 'react';
import { ChevronDown, UserPlus, ExternalLink, ShoppingBag, ShieldCheck, ShieldAlert, ShieldQuestion, Megaphone } from 'lucide-react';
import { Avatar, Button } from '@crm/design-system';
import { contacts, findUser } from '@crm/mock-data';
import { EnquiriesPanel } from '@crm/modules/contacts/components/EnquiriesPanel';

const SEGMENT_LABEL: Record<string, string> = {
  chain_stores: 'Chain of stores', corporate: 'Corporate', boutique: 'Boutique store',
  exports: 'Exports', standalone: 'Standalone store', small_store: 'Small store',
};

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
import type { InboxConversation } from '../inbox-types';
import { allConversations } from '../inbox-mock-data';

interface CustomerContextShellProps {
  conversation: InboxConversation;
  onSaveCustomer: () => void;
  onViewFullProfile: (contactId: string) => void;
  onViewOrders?: (contactId: string) => void;
  /** Opens the shared assign popover so ownership is actionable from here. */
  onAssignConversation?: () => void;
  /** The drawer already renders a title — don't repeat it inside the panel. */
  hideHeader?: boolean;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  action,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="crm-ctx-section">
      <div className="crm-ctx-section__header" onClick={() => setOpen((o) => !o)}>
        <span className="crm-ctx-section__title">{title}</span>
        {open && action ? (
          <span className="crm-ctx-section__action" onClick={(e) => e.stopPropagation()}>{action}</span>
        ) : null}
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

/** Consent drives campaign eligibility, so it reads as a status, not a word. */
function ConsentRow({ consent }: { consent: string | null }) {
  const v = (consent ?? '').toLowerCase();
  const tone = v === 'opted_in' || v === 'opt_in' || v === 'granted' ? 'ok'
    : v === 'opted_out' || v === 'opt_out' || v === 'revoked' ? 'bad'
    : 'warn';
  const label = v === 'opted_in' || v === 'opt_in' || v === 'granted' ? 'Opted in'
    : v === 'opted_out' || v === 'opt_out' || v === 'revoked' ? 'Opted out'
    : consent ? titleCase(consent.replace(/_/g, ' ')) : 'Not collected';
  const Icon = tone === 'ok' ? ShieldCheck : tone === 'bad' ? ShieldAlert : ShieldQuestion;
  return (
    <div className="crm-ctx-field">
      <span className="crm-ctx-field__label">Consent</span>
      <span className="crm-ctx-field__value">
        <span className={`crm-ctx-chip crm-ctx-chip--${tone}`}>
          <Icon size={11} />
          {label}
        </span>
      </span>
    </div>
  );
}

export function CustomerContextShell({
  conversation: c,
  onSaveCustomer,
  onViewFullProfile,
  onViewOrders,
  onAssignConversation,
  hideHeader = false,
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
      {!hideHeader && (
        <div className="crm-ctx__header">
          <span className="crm-ctx__header-title">Customer details</span>
        </div>
      )}

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
              <Button variant="primary" size="sm" onClick={onSaveCustomer}>
                Save as contact
              </Button>
            </div>

            <CollapsibleSection
              title="Conversation"
              defaultOpen
              action={onAssignConversation ? (
                <Button variant="ghost" size="sm" onClick={onAssignConversation}>Assign</Button>
              ) : undefined}
            >
              <ContextField label="Number" value={c.rawMobile} />
              <ContextField label="Assignee" value={conversationAssignee?.name ?? 'Unassigned'} />
              <ContextField label="Status" value={titleCase(c.status)} />
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
              </div>
            </div>

            <div className="crm-ctx-profile__chips">
              <span className={`crm-ctx-chip crm-ctx-chip--stage-${contact.stage}`}>
                {titleCase(contact.stage)}
              </span>
              <span className="crm-ctx-chip crm-ctx-chip--tier">
                {titleCase(contact.salesTier)}
              </span>
              {contact.tags.map((tag) => (
                <span key={tag} className="crm-ctx-chip crm-ctx-chip--tag">{tag}</span>
              ))}
            </div>

            <CollapsibleSection title="Contact details" defaultOpen>
              <ContextField label="Mobile" value={contact.mobile} />
              <ContextField label="Email" value={contact.email} isLink />
              <ContextField label="City" value={contact.city} />
              {contact.businessSegment ? <ContextField label="Segment" value={SEGMENT_LABEL[contact.businessSegment] ?? contact.businessSegment} /> : null}
              {contact.grade ? <ContextField label="Grade" value={contact.grade} /> : null}
              {contact.preferredLanguage ? <ContextField label="Language" value={contact.preferredLanguage} /> : null}
              {contact.nextFollowUpAt ? <ContextField label="Next follow-up" value={new Date(contact.nextFollowUpAt).toLocaleDateString('en-IN')} /> : null}
              <ContextField label="Source" value={contact.source} />
              {/* For a retailer running ads, which ad won this customer is the
                  single most useful thing on this panel — it is what ties the
                  spend to the person now typing. */}
              {contact.adHeadline || contact.adSourceId ? (
                <div className="crm-ctx-field">
                  <span className="crm-ctx-field__label">From ad</span>
                  <span className="crm-ctx-field__value">
                    <span className="crm-ctx-chip crm-ctx-chip--ad">
                      <Megaphone size={11} />
                      {contact.adHeadline || `Ad ${contact.adSourceId}`}
                    </span>
                    {contact.adReferralAt ? (
                      <span className="crm-ctx-field__sub">
                        {new Date(contact.adReferralAt).toLocaleDateString('en-IN')}
                      </span>
                    ) : null}
                  </span>
                </div>
              ) : null}
              <ConsentRow consent={contact.consent} />
            </CollapsibleSection>

            <CollapsibleSection title="Enquiries" defaultOpen>
              <EnquiriesPanel contactId={contact.id} conversationId={c.id} compact />
            </CollapsibleSection>

            <CollapsibleSection
              title="Ownership"
              defaultOpen={false}
              action={onAssignConversation ? (
                <Button variant="ghost" size="sm" onClick={onAssignConversation}>Assign</Button>
              ) : undefined}
            >
              <div className="crm-ctx-field">
                <span className="crm-ctx-field__label">Contact owner</span>
                <span className="crm-ctx-field__value">{contactOwner?.name ?? 'Unassigned'}</span>
              </div>
              <div className="crm-ctx-field">
                <span className="crm-ctx-field__label">This chat</span>
                <span className="crm-ctx-field__value">{conversationAssignee?.name ?? 'Unassigned'}</span>
              </div>
              <p className="crm-ctx-note">
                The contact owner holds the relationship long term. This chat&apos;s assignee
                answers only this conversation — &ldquo;Assign&rdquo; changes that, not the owner.
              </p>
            </CollapsibleSection>

            {prevConvs.length > 0 && (
              <CollapsibleSection title="Previous conversations" defaultOpen={false}>
                {prevConvs.map((pc) => (
                  <div key={pc.id} className="crm-ctx-prev-conv">
                    <div className="crm-ctx-prev-conv__meta">
                      <div className="crm-ctx-prev-conv__preview">{pc.preview.text}</div>
                      <div className="crm-ctx-prev-conv__date">
                        {pc.lastMessageAt.slice(0, 10)} · {pc.status}
                      </div>
                    </div>
                    <ExternalLink size={11} className="crm-ctx-prev-conv__icon" />
                  </div>
                ))}
              </CollapsibleSection>
            )}

            <CollapsibleSection
              title="Orders & payments"
              defaultOpen={false}
              action={onViewOrders ? (
                <Button variant="ghost" size="sm" onClick={() => onViewOrders(contact.id)}>View orders</Button>
              ) : undefined}
            >
              <p className="crm-ctx-note crm-ctx-note--icon">
                <ShoppingBag size={13} />
                Order history lives in Catalogue &amp; Orders.
              </p>
            </CollapsibleSection>
          </>
        )}
      </div>

      {contact && (
        <div className="crm-ctx__footer">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            iconLeft={<ExternalLink />}
            onClick={() => onViewFullProfile(contact.id)}
          >
            View full Customer 360
          </Button>
        </div>
      )}
    </div>
  );
}
