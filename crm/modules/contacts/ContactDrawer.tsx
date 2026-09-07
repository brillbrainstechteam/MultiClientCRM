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

  const [name, setName] = useState(existing?.name ?? '');
  const [company, setCompany] = useState(existing?.company ?? '');
  const [mobile, setMobile] = useState(existing ? existing.mobile.replace('+91', '') : '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [tags, setTags] = useState(existing?.tags.join(', ') ?? '');
  const [ownerId, setOwnerId] = useState(existing?.ownerId ?? users[0].id);
  const [stage, setStage] = useState<string>(existing?.stage ?? 'new');
  const [source, setSource] = useState(existing?.source ?? 'WhatsApp enquiry');

  const setState = (value: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null) next.delete('state');
      else next.set('state', value);
      return next;
    });

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
          <Button variant="primary" onClick={() => setState('save-success')}>
            {mode === 'edit' ? 'Save changes' : 'Add contact'}
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

      <div className="crm-contact-form">
        <Input
          label="Full name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rahul Shah"
          error={missingRequired && !name ? 'Enter a name or a company.' : undefined}
        />
        <Input
          label="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="WhatsApp mobile"
          required
          leadingAddon="+91"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="98110 20001"
          error={invalidMobile ? 'Enter a valid 10-digit mobile number.' : undefined}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Optional"
        />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input
          label="Tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          hint="Comma-separated"
        />
        <Select
          label="Owner"
          options={ownerOptions}
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
        />
        <Select
          label="Lifecycle stage"
          options={stageOptions}
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        />
        <Select
          label="Source / first interaction"
          options={sourceOptions}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={mode === 'edit'}
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
