import {
  ArrowLeft,
  CalendarClock,
  MessageCircle,
  PhoneCall,
  Radio,
  SquarePen,
  Tag as TagIcon,
  UserCog,
} from 'lucide-react';
import { EyeOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Avatar, Button, ErrorState, Tabs, type TabItem } from '@crm/design-system';
import {
  activityForContact,
  findCompany,
  findContact,
  findUser,
  findWhatsAppNumber,
} from '@crm/mock-data';
import {
  ConsentBadge,
  contentStateView,
  LeadStatusBadge,
  LifecycleBadge,
  SalesTierBadge,
  SourceBadge,
  TimelineItem,
} from '../components';
import { consentLabel, salesTierLabel, leadStatusLabel, lifecycleLabel } from '../contact-labels';
import { can, canViewField, dealValueFor } from '../permissions';
import { KundliPanel } from '../components/KundliPanel';
import { ProspectJourney } from '../components/ProspectJourney';
import { ConsentActions } from '../components/ConsentActions';
import { ShowroomGallery } from '../components/ShowroomGallery';
import { EnquiriesPanel } from '../components/EnquiriesPanel';

const SEGMENT_LABEL: Record<string, string> = {
  chain_stores: 'Chain of stores', corporate: 'Corporate', boutique: 'Boutique store',
  exports: 'Exports', standalone: 'Single standalone store', small_store: 'Single small store',
};
const fmtDay = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—');
const yn = (v?: boolean) => (v ? 'Yes' : 'No');

// Consolidated from 14 narrow tabs: Profile now holds all business/store/
// jewellery details + photos; Sales folds in Enquiries; Activity folds in
// Communication, Timeline, Audit and the cross-module links.
const tabs: TabItem[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'kundli', label: 'Pre-call brief' },
  { id: 'journey', label: 'Journey' },
  { id: 'sales', label: 'Sales & enquiries' },
  { id: 'activity', label: 'Activity' },
  { id: 'consent', label: 'Consent' },
];

/**
 * CON-S03 — Customer 360. Identity header, quick actions and the full section
 * set. Cross-module actions link to placeholder destinations; Contacts-owned
 * overlays (Assign, Follow-up, Consent) are wired in Batch 2.
 */
export default function Customer360Screen() {
  const { contactId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role } = useWorkspace();

  const contact = contactId ? findContact(contactId) : undefined;

  if (!contact) {
    return (
      <ErrorState
        title="Contact not found"
        description="This contact may have been merged or removed, or the link is out of date."
        actions={
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/contacts/all'))}>
            Back to All Contacts
          </Button>
        }
      />
    );
  }

  const owner = findUser(contact.ownerId);
  const company = contact.company
    ? findCompany(`company_${contact.company.toLowerCase().replace(/[^a-z]+/g, '_')}`)
    : undefined;
  const whatsappNumber = findWhatsAppNumber(contact.primaryWhatsAppNumberId);
  const timeline = activityForContact(contact.id);

  const activeTab = searchParams.get('tab') ?? 'profile';
  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  const openEdit = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'contact');
      next.set('mode', 'edit');
      next.set('contactId', contact.id);
      return next;
    });

  /** Open an operational overlay (Assign/Tags/Follow-up/Consent) for this contact. */
  const openOverlay = (params: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('contactId', contact.id);
      for (const [key, value] of Object.entries(params)) next.set(key, value);
      return next;
    });

  const returnTo = `/contacts/customer/${contact.id}`;
  const state = searchParams.get('state');
  const stateView = contentStateView(state, {
    onRetry: () => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('state'); return n; }),
  });
  // Owner/manager may reassign and manage consent; agent cannot (hidden).
  const canManage = can(role, 'assign');

  return (
    <div className="crm-c360">
      <PageHeader
        breadcrumbs={[
          { label: 'Contacts', to: scopedHref('/contacts') },
          { label: 'All Contacts', to: scopedHref('/contacts/all') },
          { label: contact.name },
        ]}
        title={contact.name}
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={<MessageCircle />}
              onClick={() => navigate(scopedHref('/inbox', { contactId: contact.id, returnTo }))}
            >
              Send WhatsApp
            </Button>
            <Button
              variant="secondary"
              iconLeft={<PhoneCall />}
              onClick={() => navigate(scopedHref('/calling', { contactId: contact.id, returnTo }))}
            >
              Call
            </Button>
            <Button variant="primary" iconLeft={<SquarePen />} onClick={openEdit}>
              Edit
            </Button>
            {canManage ? (
              <Button variant="ghost" iconLeft={<UserCog />} onClick={() => openOverlay({ drawer: 'assign' })}>
                Assign
              </Button>
            ) : null}
            <Button variant="ghost" iconLeft={<TagIcon />} onClick={() => openOverlay({ drawer: 'tags' })}>
              Tags
            </Button>
            <Button variant="ghost" iconLeft={<CalendarClock />} onClick={() => openOverlay({ drawer: 'stage-followup' })}>
              Follow-up
            </Button>
            {canManage ? (
              <Button variant="ghost" iconLeft={<Radio />} onClick={() => openOverlay({ drawer: 'consent' })}>
                Consent
              </Button>
            ) : null}
          </>
        }
      />

      <section className="crm-c360__identity">
        <Avatar initials={initials(contact.name)} name={contact.name} size="lg" />
        <div className="crm-c360__identity-text">
          <div className="crm-c360__identity-line">
            <span className="crm-c360__name">{contact.name}</span>
            {contact.company ? <span className="crm-c360__company">{contact.company}</span> : null}
          </div>
          <div className="crm-c360__identity-meta">
            <span>{contact.mobile}</span>
            {contact.email ? <span>· {contact.email}</span> : null}
            <span>· {contact.city}</span>
          </div>
          <div className="crm-c360__chips">
            <LeadStatusBadge status={contact.leadStatus} />
            <LifecycleBadge stage={contact.lifecycleStage} state={contact.lifecycleState} />
            <ConsentBadge consent={contact.consent} />
            <SalesTierBadge tier={contact.salesTier} />
            <SourceBadge source={contact.source} />
          </div>
        </div>
        <div className="crm-c360__owner">
          <span className="crm-c360__owner-label">Owner</span>
          {owner ? (
            <span className="crm-c360__owner-name">
              <Avatar initials={owner.initials} name={owner.name} size="sm" availability={owner.availability} />
              {owner.name}
            </span>
          ) : (
            <span className="crm-c360__owner-name">Unassigned</span>
          )}
        </div>
      </section>

      {stateView ? <div className="crm-c360__state">{stateView}</div> : (
      <>
      <Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Customer sections" />

      <section className="crm-c360__panel">
        {activeTab === 'profile' ? (
          <>
            <p className="crm-c360__scope-note">Business &amp; contact</p>
            <FieldGrid
              fields={[
                ['Full name', contact.name],
                ['Company', contact.company ?? notSet()],
                ['Contact person', contact.contactPerson ?? notSet()],
                ['WhatsApp mobile', contact.mobile],
                ['Email', contact.email ?? notSet()],
                ['City', contact.city],
                ['State', contact.state ?? notSet()],
                ['Pincode', contact.pincode ?? notSet()],
                ['GSTIN', contact.gstin ?? notSet()],
                ['PAN', contact.pan ?? notSet()],
                ['Website', contact.website ?? notSet()],
                ['Customer type', contact.company ? 'B2B' : 'B2C'],
                ['Branch', branchName(contact.branchId)],
                ['Type of lead', contact.typeOfLead ?? notSet()],
                ['Reference', contact.reference ?? notSet()],
                ['Original source', contact.source],
              ]}
            />

            <p className="crm-c360__scope-note">Jewellery &amp; account</p>
            <FieldGrid
              fields={[
                ['Segment', SEGMENT_LABEL[contact.businessSegment ?? ''] ?? notSet()],
                ['Grade (ABCD)', contact.grade ?? notSet()],
                ['Preferred language', contact.preferredLanguage ?? notSet()],
                ['Product interests', contact.productInterests && contact.productInterests.length ? contact.productInterests.join(', ') : notSet()],
                ['Interested in', contact.interestedIn ?? notSet()],
                ['Tags', contact.tags.length ? contact.tags.join(', ') : notSet()],
                ['Client code', contact.clientCode ?? notSet()],
                ['Key account manager', contact.kamUserId ? (findUser(contact.kamUserId)?.name ?? contact.kamUserId) : notSet()],
                ['Marketing owner', contact.marketingOwnerId ? (findUser(contact.marketingOwnerId)?.name ?? contact.marketingOwnerId) : notSet()],
                ['Sales owner', contact.salesOwnerId ? (findUser(contact.salesOwnerId)?.name ?? contact.salesOwnerId) : notSet()],
                ['Birthday', contact.dateOfBirth ? fmtDay(contact.dateOfBirth) : notSet()],
                ['Company anniversary', contact.companyAnniversary ? fmtDay(contact.companyAnniversary) : notSet()],
              ]}
            />

            <p className="crm-c360__scope-note">Showroom photos</p>
            <ShowroomGallery contactId={contact.id} contactName={contact.name} />
          </>
        ) : null}

        {activeTab === 'kundli' ? (
          <KundliPanel contactId={contact.id} />
        ) : null}

        {activeTab === 'journey' ? (
          <ProspectJourney contact={contact} />
        ) : null}

        {activeTab === 'sales' ? (
          <>
            <FieldGrid
              fields={[
                ['Lead status', leadStatusLabel[contact.leadStatus ?? 'new'] ?? (contact.leadStatus ?? 'New')],
                ['Lifecycle', lifecycleLabel[contact.lifecycleStage ?? 'prospect'] ?? 'Prospect'],
                ['Activated on', contact.activatedAt ? new Date(contact.activatedAt).toLocaleDateString('en-IN') : notSet()],
                ['Business value', contact.businessValue ? contact.businessValue[0].toUpperCase() + contact.businessValue.slice(1) : notSet()],
                ['Sales tier', salesTierLabel[contact.salesTier]],
                ['Owner', owner?.name ?? 'Unassigned'],
                ['Estimated deal value', canViewField(role, 'dealValue') ? dealValueFor(contact) : <MaskedValue />],
                ['Next follow-up', contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).toLocaleDateString('en-IN') : <span className="crm-fieldgrid__empty">Set via Follow-up</span>],
              ]}
            />
            <p className="crm-c360__scope-note">Enquiries</p>
            <EnquiriesPanel contactId={contact.id} />
          </>
        ) : null}

        {activeTab === 'activity' ? (
          <>
            <FieldGrid
              fields={[
                ['Primary WhatsApp number', whatsappNumber ? `${whatsappNumber.displayName} · ${whatsappNumber.displayNumber}` : notSet()],
                ['First interaction', formatDate(contact.createdAt)],
                ['Last activity', formatDateTime(contact.lastActivityAt)],
                ['Record ID', contact.id],
              ]}
            />
            <p className="crm-c360__scope-note">Timeline</p>
            {timeline.length ? (
              <ul className="crm-c360__timeline">
                {timeline.map((item, index) => (
                  <TimelineItem key={item.id} item={item} isLast={index === timeline.length - 1} />
                ))}
              </ul>
            ) : (
              <p className="crm-c360__empty">No recorded activity yet.</p>
            )}
            <p className="crm-c360__scope-note">Open in</p>
            <div className="crm-c360__related">
              <RelatedCard label="Conversations" value="Inbox" to={scopedHref('/inbox', { contactId: contact.id, returnTo })} />
              <RelatedCard label="Calls & visits" value="Calling" to={scopedHref('/calling', { contactId: contact.id, returnTo })} />
              <RelatedCard label="Orders" value="Catalogue & Orders" to={scopedHref('/catalogue-orders', { contactId: contact.id, returnTo })} />
            </div>
          </>
        ) : null}

        {activeTab === 'consent' ? (
          <>
            <FieldGrid
              fields={[
                ['Consent state', consentLabel[contact.consent]],
                ['Recorded via', whatsappNumber?.displayName ?? notSet()],
                ['Consent date', formatDate(contact.createdAt)],
                ['Campaign eligibility', contact.consent === 'opted-in' ? 'Eligible' : 'Excluded'],
              ]}
            />
            <p className="crm-c360__scope-note">
              Consent is recorded per WhatsApp number. Opt-in on {whatsappNumber?.displayName ?? 'this number'} does
              not imply consent on any other connected number.
            </p>
            <ConsentActions contactId={contact.id} contactName={contact.name} consent={contact.consent} />
          </>
        ) : null}
      </section>
      </>
      )}
    </div>
  );
}

/** Sensitive value the acting role may not see. Renders no real data. */
function MaskedValue() {
  return (
    <span className="crm-c360__masked">
      <EyeOff aria-hidden="true" /> Hidden for your role
    </span>
  );
}

function FieldGrid({ fields }: { fields: [string, ReactNode][] }) {
  return (
    <dl className="crm-fieldgrid">
      {fields.map(([label, value]) => (
        <div key={label} className="crm-fieldgrid__item">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RelatedCard({ label, value, to }: { label: string; value: string; to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      className="crm-c360__related-card"
      onClick={to ? () => navigate(to) : undefined}
      disabled={!to}
    >
      <span className="crm-c360__related-label">{label}</span>
      <span className="crm-c360__related-value">{value}</span>
    </button>
  );
}

function notSet(text = 'Not added'): ReactNode {
  return <span className="crm-fieldgrid__empty">{text}</span>;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function branchName(branchId: string): string {
  return branchId.replace('branch_', '').replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
