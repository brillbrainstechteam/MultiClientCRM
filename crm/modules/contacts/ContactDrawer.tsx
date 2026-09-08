import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import {
  Badge,
  Button,
  Drawer,
  Input,
  Select,
  Toast,
} from '@crm/design-system';
import { findContact, users, type Contact } from '@crm/mock-data';
import { duplicateClusters } from '@crm/mock-data';
import { createContact, updateContact } from '@crm/app/crm-data';
import { ConsentBadge, StageBadge } from './components';
import { distinctSources } from './contact-selectors';

/**
 * CON-S19 — Add / Edit Contact drawer. Mounted once in the Contacts layout and
 * driven entirely by query state so every variant is reproducible by URL:
 *
 *   ?drawer=contact&mode=add
 *   ?drawer=contact&mode=edit&contactId=contact_rahul_shah
 *   &state=invalid-mobile | missing-required | duplicate | save-error | save-success
 */
export function ContactDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();

  const open = searchParams.get('drawer') === 'contact';
  const mode = searchParams.get('mode') === 'edit' ? 'edit' : 'add';
  const contactId = searchParams.get('contactId');
  const state = searchParams.get('state');

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'mode', 'contactId', 'state']) next.delete(key);
      return next;
    });

  if (!open) return null;

  const existing = contactId ? findContact(contactId) : undefined;

  return (
    <ContactForm
      // Reset field state whenever the drawer target changes.
      key={`${mode}:${contactId ?? 'new'}`}
      mode={mode}
      existing={existing}
      state={state}
      onClose={close}
      setSearchParams={setSearchParams}
    />
  );
}

const stageOptions = [
  { value: 'new', label: 'New' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'customer', label: 'Customer' },
  { value: 'dormant', label: 'Dormant' },
];

// Req 34: the operating prospect pipeline (kept separate from lifecycle).
const leadStatusOptions = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'connected', label: 'Connected' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'enquiry_generated', label: 'Enquiry Generated' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'dormant', label: 'Dormant' },
];
const businessValueOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function ContactForm({
  mode,
  existing,
  state,
  onClose,
  setSearchParams,
}: {
  mode: 'add' | 'edit';
  existing: Contact | undefined;
  state: string | null;
  onClose: () => void;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const [customerType, setCustomerType] = useState<'b2b' | 'b2c'>(existing?.customerType ?? 'b2b');
  const [name, setName] = useState(existing?.name ?? '');
  const [company, setCompany] = useState(existing?.company ?? '');
  const [contactPerson, setContactPerson] = useState(existing?.contactPerson ?? '');
  const [mobile, setMobile] = useState(existing ? existing.mobile.replace('+91', '') : '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [stateName, setStateName] = useState(existing?.state ?? '');
  const [pincode, setPincode] = useState(existing?.pincode ?? '');
  const [gstin, setGstin] = useState(existing?.gstin ?? '');
  const [tags, setTags] = useState(existing?.tags.join(', ') ?? '');
  const [productInterests, setProductInterests] = useState(existing?.productInterests?.join(', ') ?? '');
  const [ownerId, setOwnerId] = useState(existing?.ownerId ?? users[0].id);
  const [leadStatus, setLeadStatus] = useState<string>(existing?.leadStatus ?? 'new');
  const [businessValue, setBusinessValue] = useState<string>(existing?.businessValue ?? 'medium');
  const [source, setSource] = useState(existing?.source ?? 'WhatsApp enquiry');

  const [submitting, setSubmitting] = useState(false);

  const setState = (value: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null) next.delete('state');
      else next.set('state', value);
      return next;
    });

  /** Persist to the API (create or update), then surface success/error. */
  const handleSave = async () => {
    // Per-type mandatory fields (Contacts req 7,8): B2B needs business name +
    // contact person + mobile; B2C needs name + mobile.
    const missing = !mobile.trim() ||
      (customerType === 'b2b' ? (!company.trim() || !contactPerson.trim()) : !name.trim());
    if (missing) { setState('missing-required'); return; }
    const trimmed = mobile.trim();
    const fullMobile = trimmed.startsWith('+') ? trimmed : `+91${trimmed.replace(/\D/g, '')}`;
    const csv = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);
    const payload: Partial<Contact> = {
      customerType,
      name: (name.trim() || contactPerson.trim() || company.trim()),
      company: company.trim() || null,
      contactPerson: contactPerson.trim() || null,
      mobile: fullMobile,
      email: email.trim() || null,
      city: city.trim(),
      state: stateName.trim() || null,
      pincode: pincode.trim() || null,
      gstin: gstin.trim() || null,
      tags: csv(tags),
      productInterests: csv(productInterests),
      ownerId,
      leadStatus,
      businessValue,
      source,
    };
    setSubmitting(true);
    try {
      if (mode === 'edit' && existing) await updateContact(existing.id, payload);
      else await createContact(payload);
      setState('save-success');
    } catch {
      setState('save-error');
    } finally {
      setSubmitting(false);
    }
  };

  const invalidMobile = state === 'invalid-mobile';
  const missingRequired = state === 'missing-required';
  const isDuplicate = state === 'duplicate';
  const saveError = state === 'save-error';
  const saveSuccess = state === 'save-success';

  // Representative duplicate target (exact-mobile match).
  const duplicateContact = existing ?? findContact('contact_priya_menon');
  const duplicateCluster = duplicateClusters.find((c) =>
    duplicateContact ? c.contactIds.includes(duplicateContact.id) : false,
  );

  const title = mode === 'edit' ? 'Edit contact' : 'Add contact';
  const subtitle =
    mode === 'edit'
      ? 'Update this contact’s details. Changes are recorded in the audit trail.'
      : 'Create a new contact. A valid WhatsApp mobile and a name or company are required.';

  const ownerOptions = users.map((u) => ({ value: u.id, label: `${u.name} — ${u.roleLabel}` }));
  const sourceOptions = distinctSources().map((s) => ({ value: s, label: s }));

  if (saveSuccess) {
    return (
      <>
        <Drawer open title={title} subtitle={subtitle} onClose={onClose} footer={null}>
          <SuccessBody name={name || existing?.name || 'Contact'} mode={mode} />
        </Drawer>
        <Toast
          tone="success"
          message={`${name || existing?.name || 'Contact'} ${mode === 'edit' ? 'updated' : 'added'} successfully`}
          onDismiss={() => setState(null)}
        />
      </>
    );
  }

  return (
    <Drawer
      open
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add contact'}
          </Button>
        </>
      }
    >
      {saveError ? (
        <div className="crm-field" style={{ marginBottom: 'var(--crm-space-4)' }}>
          <div className="crm-drawer-banner crm-drawer-banner--error">
            Could not save the contact. Your entries are kept — try again.
          </div>
        </div>
      ) : null}

      {isDuplicate && duplicateContact ? (
        <div className="crm-dup-panel">
          <div className="crm-dup-panel__head">
            <Badge tone="warning">Possible duplicate</Badge>
            <span>A contact with this mobile already exists.</span>
          </div>
          <div className="crm-dup-panel__contact">
            <div>
              <p className="crm-dup-panel__name">{duplicateContact.name}</p>
              <p className="crm-dup-panel__meta">
                {duplicateContact.mobile}
                {duplicateContact.company ? ` · ${duplicateContact.company}` : ''}
              </p>
            </div>
            <div className="crm-dup-panel__chips">
              <StageBadge stage={duplicateContact.stage} />
              <ConsentBadge consent={duplicateContact.consent} />
            </div>
          </div>
          <div className="crm-dup-panel__actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                navigate(scopedHref(`/contacts/customer/${duplicateContact.id}`));
              }}
            >
              Open existing
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setState(null)}>
              Update existing
            </Button>
            {duplicateCluster ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(scopedHref(`/contacts/data-quality/duplicates/${duplicateCluster.id}`));
                }}
              >
                Review possible duplicate
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Customer type — drives which fields are mandatory (req 7,8). */}
      <div className="crm-ov-segment" role="group" aria-label="Customer type" style={{ marginBottom: 'var(--crm-space-4)' }}>
        {(['b2b', 'b2c'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={customerType === t ? 'crm-ov-segment__btn crm-ov-segment__btn--active' : 'crm-ov-segment__btn'}
            onClick={() => setCustomerType(t)}
          >
            {t === 'b2b' ? 'Business (B2B)' : 'Individual (B2C)'}
          </button>
        ))}
      </div>

      <div className="crm-contact-form">
        {customerType === 'b2b' ? (
          <>
            <Input
              label="Business name" required value={company}
              onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Shah Textiles"
              error={missingRequired && !company ? 'Business name is required.' : undefined}
            />
            <Input
              label="Contact person" required value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)} placeholder="e.g. Rahul Shah"
              error={missingRequired && !contactPerson ? 'Contact person is required.' : undefined}
            />
          </>
        ) : (
          <Input
            label="Full name" required value={name}
            onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Menon"
            error={missingRequired && !name ? 'Name is required.' : undefined}
          />
        )}
        <Input
          label="WhatsApp mobile" required leadingAddon="+91" value={mobile}
          onChange={(e) => setMobile(e.target.value)} placeholder="98110 20001"
          error={invalidMobile ? 'Enter a valid 10-digit mobile number.' : (missingRequired && !mobile ? 'Mobile is required.' : undefined)}
        />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional" />
        <Input label="State" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="Optional" />
        <Input label="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Optional" />
        {customerType === 'b2b' ? (
          <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="Optional — added on conversion" />
        ) : null}
        <Input label="Product interests" value={productInterests} onChange={(e) => setProductInterests(e.target.value)} hint="Comma-separated" />
        <Input label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} hint="Comma-separated" />
        <Select label="Owner" options={ownerOptions} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
        <Select label="Lead status" options={leadStatusOptions} value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)} />
        <Select label="Business value" options={businessValueOptions} value={businessValue} onChange={(e) => setBusinessValue(e.target.value)} />
        <Select
          label="Source / first interaction" options={sourceOptions} value={source}
          onChange={(e) => setSource(e.target.value)} disabled={mode === 'edit'}
        />
      </div>
    </Drawer>
  );
}

function SuccessBody({ name, mode }: { name: string; mode: 'add' | 'edit' }) {
  return (
    <div className="crm-contact-success">
      <p>
        <strong>{name}</strong> was {mode === 'edit' ? 'updated' : 'added'}. You can keep editing or
        close this drawer.
      </p>
    </div>
  );
}
