import { useState } from 'react';
import { Info, MapPin, Tag as TagIcon, TriangleAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Drawer,
  Input,
  Select,
  Textarea,
  Toast,
} from '@crm/design-system';
import { findContact, findSegment, findUser, users } from '@crm/mock-data';
import { bulkContacts } from '@crm/app/crm-data';
import { ConsentBadge, StageBadge } from '../components';
import { consentOptions, distinctSources } from '../contact-selectors';
import { useZones } from '../zones/zone-store';
import { assignZone, summarizeAssignments } from '../zones/zone-assignment';
import { setContactZones, type ContactZoneAssignment } from '../zones/contact-zone-store';

/**
 * Operational overlays for Contacts (CON-S12–S18), mounted once in the layout
 * and driven entirely by query state so every overlay is reproducible by URL:
 *
 *   ?drawer=assign&contactId=…            (single, from Customer 360)
 *   ?drawer=assign&count=8                (bulk, from All Contacts)
 *   ?modal=confirm&action=delete-segment&segmentId=…
 *   &flash=<message>                      (success toast, shown after apply)
 */
export function OperationalOverlays() {
  const [searchParams, setSearchParams] = useSearchParams();

  const drawer = searchParams.get('drawer');
  const modal = searchParams.get('modal');
  const flash = searchParams.get('flash');
  const contactId = searchParams.get('contactId');
  const count = searchParams.get('count');
  const selectedIds = searchParams.get('selectedIds');
  const targetIds = selectedIds ? selectedIds.split(',').filter(Boolean) : contactId ? [contactId] : [];

  const contact = contactId ? findContact(contactId) : undefined;
  const targetLabel = contact ? contact.name : `${count ?? 'the selected'} contacts`;
  const affected = contact ? 1 : Number(count ?? 0);

  const closeAll = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'modal', 'action', 'segmentId', 'selectedIds', 'flash']) next.delete(key);
      // `contactId`/`count` describe the page context — leave them.
      return next;
    });

  const apply = (message: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'modal', 'action', 'segmentId', 'selectedIds']) next.delete(key);
      next.set('flash', message);
      return next;
    });

  const dismissFlash = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('flash');
      return next;
    });

  return (
    <>
      {drawer === 'advanced-filter' ? <AdvancedFilterDrawer onClose={closeAll} /> : null}
      {drawer === 'assign' ? (
        <AssignDrawer targetLabel={targetLabel} affected={affected} contactOwnerId={contact?.ownerId} onClose={closeAll} onApply={apply} targetIds={targetIds} />
      ) : null}
      {drawer === 'assign-zone' ? (
        <AssignZoneDrawer
          selectedIds={searchParams.get('selectedIds')}
          contactId={contactId}
          onClose={closeAll}
          onApply={apply}
        />
      ) : null}
      {drawer === 'tags' ? (
        <TagsDrawer targetLabel={targetLabel} onClose={closeAll} onApply={apply} targetIds={targetIds} />
      ) : null}
      {drawer === 'stage-followup' ? (
        <StageFollowupDrawer targetLabel={targetLabel} contactId={contactId} onClose={closeAll} onApply={apply} targetIds={targetIds} />
      ) : null}
      {drawer === 'export' ? (
        <ExportDrawer count={count} onClose={closeAll} onApply={apply} />
      ) : null}
      {drawer === 'consent' ? (
        <ConsentDrawer targetLabel={targetLabel} contactId={contactId} onClose={closeAll} onApply={apply} targetIds={targetIds} />
      ) : null}
      {modal === 'confirm' ? (
        <ConfirmOverlay onCancel={closeAll} onApply={apply} targetLabel={targetLabel} targetIds={targetIds} />
      ) : null}
      {flash ? <Toast tone="success" message={flash} onDismiss={dismissFlash} /> : null}
    </>
  );
}

/* ---- CON-S12 Advanced Filter ------------------------------------------- */
function AdvancedFilterDrawer({ onClose }: { onClose: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const [stage, setStage] = useState(searchParams.get('stage') ?? '');
  const [consent, setConsent] = useState(searchParams.get('consent') ?? '');
  const [source, setSource] = useState(searchParams.get('source') ?? '');

  const summary = [
    stage ? `Stage is ${stage}` : null,
    consent ? `Consent is ${consent}` : null,
    source ? `Source is ${source}` : null,
  ].filter(Boolean);

  const apply = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, val] of [['stage', stage], ['consent', consent], ['source', source]] as const) {
        if (val) next.set(key, val);
        else next.delete(key);
      }
      next.delete('drawer');
      return next;
    });
  };

  const clearAll = () => {
    setStage('');
    setConsent('');
    setSource('');
  };

  return (
    <Drawer
      open
      title="Advanced filter"
      subtitle="Combine conditions to narrow the list. Conditions apply together (AND)."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={clearAll}>
            Clear all
          </Button>
          <Button variant="secondary" iconLeft={<TagIcon />} className="crm-save-as-segment" onClick={() => navigate(scopedHref('/contacts/segments/new'))}>
            Save as segment
          </Button>
          <Button variant="primary" onClick={apply}>
            Apply filter
          </Button>
        </>
      }
    >
      <div className="crm-ov-form">
        <Select label="Lifecycle stage" options={[{ value: '', label: 'Any' }, { value: 'new', label: 'New' }, { value: 'engaged', label: 'Engaged' }, { value: 'qualified', label: 'Qualified' }, { value: 'customer', label: 'Customer' }, { value: 'dormant', label: 'Dormant' }]} value={stage} onChange={(e) => setStage(e.target.value)} />
        <Select label="Consent" options={[{ value: '', label: 'Any' }, ...consentOptions]} value={consent} onChange={(e) => setConsent(e.target.value)} />
        <Select label="Source" options={[{ value: '', label: 'Any' }, ...distinctSources().map((s) => ({ value: s, label: s }))]} value={source} onChange={(e) => setSource(e.target.value)} />
      </div>

      <div className="crm-ov-summary">
        <span className="crm-ov-summary__label">Applied conditions</span>
        {summary.length ? (
          <ul>
            {summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="crm-ov-muted">No conditions yet — the list will show all contacts in scope.</p>
        )}
      </div>
    </Drawer>
  );
}

/* ---- CON-S13 Assign / Reassign ----------------------------------------- */
function AssignDrawer({
  targetLabel,
  affected,
  contactOwnerId,
  onClose,
  onApply,
  targetIds,
}: {
  targetLabel: string;
  affected: number;
  contactOwnerId?: string;
  onClose: () => void;
  onApply: (message: string) => void;
  targetIds: string[];
}) {
  const currentOwner = contactOwnerId ? users.find((u) => u.id === contactOwnerId) : undefined;
  const [ownerId, setOwnerId] = useState(users[0].id);
  const [reason, setReason] = useState('');

  return (
    <Drawer
      open
      title="Assign / reassign"
      subtitle={`Reassign ${targetLabel}.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={async () => { if (targetIds.length) { try { await bulkContacts(targetIds, { op: 'assign', ownerId }); } catch { return; } } onApply(`Reassigned ${targetLabel} to ${users.find((u) => u.id === ownerId)?.name}`); }}>
            Confirm assignment
          </Button>
        </>
      }
    >
      <div className="crm-ov-form">
        {currentOwner ? (
          <div className="crm-ov-field-static">
            <span className="crm-ov-field-static__label">Current owner</span>
            <span>{currentOwner.name} — {currentOwner.roleLabel}</span>
          </div>
        ) : null}
        <Select label="New owner" options={users.map((u) => ({ value: u.id, label: `${u.name} — ${u.roleLabel}` }))} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
        <Textarea label="Reason" hint="Optional — recorded in the audit trail" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="crm-ov-banner crm-ov-banner--info">
        <Info aria-hidden="true" />
        <span>
          {affected > 1 ? `${affected} contacts will be reassigned. ` : ''}
          Reassignment changes who can see and act on {affected > 1 ? 'these contacts' : 'this contact'}.
        </span>
      </div>
    </Drawer>
  );
}

/* ---- Bulk Zone Assignment (§5/§6) -------------------------------------- */
function AssignZoneDrawer({
  selectedIds,
  contactId,
  onClose,
  onApply,
}: {
  selectedIds: string | null;
  contactId: string | null;
  onClose: () => void;
  onApply: (message: string) => void;
}) {
  const zones = useZones();
  const activeZones = zones.filter((z) => z.active);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [zoneId, setZoneId] = useState(activeZones[0]?.id ?? '');

  // Resolve the selected contacts (bulk) or a single contact.
  const ids = selectedIds
    ? selectedIds.split(',').filter(Boolean)
    : contactId
      ? [contactId]
      : [];
  const contacts = ids.map((id) => findContact(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const n = contacts.length;

  const autoSummary = summarizeAssignments(contacts.map((c) => ({ city: c.city })));
  const chosenZone = activeZones.find((z) => z.id === zoneId);
  const manualOwnerId = chosenZone ? chosenZone.primaryOwnerId ?? chosenZone.memberUserIds[0] ?? null : null;
  const manualOwner = manualOwnerId ? findUser(manualOwnerId) : undefined;

  const exceptionTotal =
    autoSummary.exceptions.locationRequired +
    autoSummary.exceptions.unmappedZone +
    autoSummary.exceptions.ownerNotAssigned;

  const canApply = mode === 'auto' ? autoSummary.assigned > 0 : Boolean(chosenZone && manualOwnerId);

  const handleApply = () => {
    const entries: Array<[string, ContactZoneAssignment]> = [];
    if (mode === 'auto') {
      for (const c of contacts) {
        const r = assignZone({ city: c.city });
        if (r.status === 'assigned' && r.zoneId && r.zoneName) {
          entries.push([c.id, { zoneId: r.zoneId, zoneName: r.zoneName, ownerId: r.ownerId, mode: 'auto' }]);
        }
      }
    } else if (chosenZone) {
      for (const c of contacts) {
        entries.push([
          c.id,
          { zoneId: chosenZone.id, zoneName: chosenZone.name, ownerId: manualOwnerId, mode: 'manual' },
        ]);
      }
    }
    setContactZones(entries);
    onApply(
      mode === 'auto'
        ? `Routed ${entries.length} of ${n} contacts to zones by location`
        : `Assigned ${entries.length} contacts to ${chosenZone?.name}`,
    );
  };

  return (
    <Drawer
      open
      title="Assign zone"
      subtitle={`Divide ${n} contact${n !== 1 ? 's' : ''} among team members by geography. Zone mapping is optional.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" iconLeft={<MapPin />} disabled={!canApply} onClick={handleApply}>
            Assign zone &amp; owner
          </Button>
        </>
      }
    >
      <div className="crm-ov-segment">
        {(['auto', 'manual'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={mode === m ? 'crm-ov-segment__btn crm-ov-segment__btn--active' : 'crm-ov-segment__btn'}
            onClick={() => setMode(m)}
          >
            {m === 'auto' ? 'Auto by location' : 'Set one zone'}
          </button>
        ))}
      </div>

      {mode === 'auto' ? (
        <>
          <p className="crm-ov-muted">
            Each contact is routed by City → State → Zone → Owner. City rules take priority over state rules.
          </p>
          <div className="crm-zone-split">
            <span className="crm-ov-summary__label">Division by zone</span>
            {autoSummary.byZone.length === 0 ? (
              <p className="crm-ov-muted">No contacts could be matched to a zone.</p>
            ) : (
              autoSummary.byZone.map((z) => (
                <div key={z.zoneId} className="crm-zone-split__row">
                  <span>{z.zoneName}</span>
                  <strong>{z.count}</strong>
                </div>
              ))
            )}
          </div>
          <div className="crm-zone-split">
            <span className="crm-ov-summary__label">By team member</span>
            {autoSummary.byOwner.map((o) => (
              <div key={o.ownerId} className="crm-zone-split__row">
                <span>{findUser(o.ownerId)?.name ?? o.ownerId}</span>
                <strong>{o.count}</strong>
              </div>
            ))}
          </div>
          {exceptionTotal > 0 ? (
            <div className="crm-ov-banner crm-ov-banner--warn">
              <TriangleAlert aria-hidden="true" />
              <span>
                {exceptionTotal} contact{exceptionTotal !== 1 ? 's' : ''} can’t be routed automatically
                {autoSummary.exceptions.locationRequired > 0 ? ` · ${autoSummary.exceptions.locationRequired} need a city/state` : ''}
                {autoSummary.exceptions.unmappedZone > 0 ? ` · ${autoSummary.exceptions.unmappedZone} unmapped` : ''}
                {autoSummary.exceptions.ownerNotAssigned > 0 ? ` · ${autoSummary.exceptions.ownerNotAssigned} zone has no owner` : ''}
                . They’ll be left for review.
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="crm-ov-form">
            <Select
              label="Zone"
              options={activeZones.map((z) => ({ value: z.id, label: z.name }))}
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            />
          </div>
          <div className="crm-zone-split">
            <div className="crm-zone-split__row">
              <span>Contacts</span>
              <strong>{n}</strong>
            </div>
            <div className="crm-zone-split__row">
              <span>Assigned owner</span>
              <strong>
                {manualOwner ? (
                  <>
                    {manualOwner.name} <Badge tone="info">primary</Badge>
                  </>
                ) : (
                  'No owner in this zone'
                )}
              </strong>
            </div>
          </div>
          {!manualOwnerId ? (
            <div className="crm-ov-banner crm-ov-banner--warn">
              <TriangleAlert aria-hidden="true" />
              <span>This zone has no team member mapped. Add one in Zone &amp; Assignment settings first.</span>
            </div>
          ) : null}
        </>
      )}

      <div className="crm-ov-banner crm-ov-banner--info">
        <Info aria-hidden="true" />
        <span>Manual assignments are kept and won’t be overwritten by future auto-routing.</span>
      </div>
    </Drawer>
  );
}

/* ---- CON-S14 Tags ------------------------------------------------------- */
const TAG_MASTER = ['bulk-buyer', 'festive-2026', 'premium', 'repeat', 'inbound', 'export', 'high-value', 'lapsed'];

function TagsDrawer({ targetLabel, onClose, onApply, targetIds }: { targetLabel: string; onClose: () => void; onApply: (m: string) => void; targetIds: string[] }) {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const visible = TAG_MASTER.filter((t) => t.includes(search.toLowerCase()));
  const toggle = (tag: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  return (
    <Drawer
      open
      title="Tags"
      subtitle={`${mode === 'add' ? 'Add tags to' : 'Remove tags from'} ${targetLabel}.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={() => navigate(scopedHref('/settings/contacts/tags'))}>
            Manage tags
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={selected.size === 0} onClick={async () => { if (targetIds.length) { try { await bulkContacts(targetIds, { op: 'tags', tags: [...selected], tagMode: mode }); } catch { return; } } onApply(`${mode === 'add' ? 'Added' : 'Removed'} ${selected.size} tag(s) for ${targetLabel}`); }}>
            Apply
          </Button>
        </>
      }
    >
      <div className="crm-ov-segment">
        {(['add', 'remove'] as const).map((m) => (
          <button key={m} type="button" className={mode === m ? 'crm-ov-segment__btn crm-ov-segment__btn--active' : 'crm-ov-segment__btn'} onClick={() => setMode(m)}>
            {m === 'add' ? 'Add tags' : 'Remove tags'}
          </button>
        ))}
      </div>
      <Input label="Search tags" hideLabel value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tags…" />
      <div className="crm-ov-taglist">
        {visible.map((tag) => (
          <Checkbox key={tag} label={tag} checked={selected.has(tag)} onChange={() => toggle(tag)} />
        ))}
        {visible.length === 0 ? <p className="crm-ov-muted">No tags match “{search}”.</p> : null}
      </div>
    </Drawer>
  );
}

/* ---- CON-S15 Stage & Follow-up ----------------------------------------- */
function StageFollowupDrawer({
  targetLabel,
  contactId,
  onClose,
  onApply,
  targetIds,
}: {
  targetLabel: string;
  contactId: string | null;
  onClose: () => void;
  onApply: (m: string) => void;
  targetIds: string[];
}) {
  const contact = contactId ? findContact(contactId) : undefined;
  const [stage, setStage] = useState<string>(contact?.stage ?? 'qualified');
  const [closure, setClosure] = useState('open');
  const [dealValue, setDealValue] = useState('');
  const [followUp, setFollowUp] = useState('');

  const overdue = followUp !== '' && new Date(followUp).getTime() < Date.now();

  return (
    <Drawer
      open
      title="Stage & follow-up"
      subtitle={`Update stage and next action for ${targetLabel}.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={async () => { if (targetIds.length) { try { await bulkContacts(targetIds, { op: 'stage', stage }); } catch { return; } } onApply(`Stage updated for ${targetLabel}`); }}>
            Save
          </Button>
        </>
      }
    >
      <div className="crm-ov-form">
        {contact ? (
          <div className="crm-ov-field-static">
            <span className="crm-ov-field-static__label">Current stage</span>
            <StageBadge stage={contact.stage} />
          </div>
        ) : null}
        <Select label="New stage" options={[{ value: 'new', label: 'New' }, { value: 'engaged', label: 'Engaged' }, { value: 'qualified', label: 'Qualified' }, { value: 'customer', label: 'Customer' }, { value: 'dormant', label: 'Dormant' }]} value={stage} onChange={(e) => setStage(e.target.value)} />
        <Select label="Closure status" options={[{ value: 'open', label: 'Open' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' }]} value={closure} onChange={(e) => setClosure(e.target.value)} />
        <Input label="Estimated deal value" leadingAddon="₹" value={dealValue} onChange={(e) => setDealValue(e.target.value)} placeholder="0" />
        <Input label="Next follow-up" type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
      </div>
      {overdue ? (
        <div className="crm-ov-banner crm-ov-banner--warn">
          <TriangleAlert aria-hidden="true" />
          <span>The follow-up date is in the past. It will be flagged as overdue.</span>
        </div>
      ) : null}
    </Drawer>
  );
}

/* ---- CON-S16 Export ----------------------------------------------------- */
const EXPORT_FIELDS = [
  { key: 'name', label: 'Name', sensitive: false },
  { key: 'mobile', label: 'WhatsApp mobile', sensitive: true },
  { key: 'email', label: 'Email', sensitive: true },
  { key: 'company', label: 'Company', sensitive: false },
  { key: 'stage', label: 'Stage', sensitive: false },
  { key: 'owner', label: 'Owner', sensitive: false },
];

function ExportDrawer({ count, onClose, onApply }: { count: string | null; onClose: () => void; onApply: (m: string) => void }) {
  const [scope, setScope] = useState(count ? 'selected' : 'filtered');
  const [format, setFormat] = useState('csv');
  const [fields, setFields] = useState<Set<string>>(new Set(['name', 'mobile', 'stage', 'owner']));
  const estimated = scope === 'selected' ? Number(count ?? 0) : scope === 'filtered' ? 12 : 12;
  const sensitiveSelected = [...fields].some((f) => EXPORT_FIELDS.find((x) => x.key === f)?.sensitive);

  const toggle = (key: string) =>
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Drawer
      open
      title="Export contacts"
      subtitle="Choose scope, format and fields."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onApply(`Export ready · ${estimated} contacts as ${format.toUpperCase()}`)}>
            Export
          </Button>
        </>
      }
    >
      <div className="crm-ov-form">
        <Select label="Scope" options={[{ value: 'selected', label: `Selected contacts${count ? ` (${count})` : ''}`, disabled: !count }, { value: 'filtered', label: 'Current filtered list' }, { value: 'all', label: 'Entire allowed database' }]} value={scope} onChange={(e) => setScope(e.target.value)} />
        <Select label="Format" options={[{ value: 'csv', label: 'CSV' }, { value: 'excel', label: 'Excel' }, { value: 'vcf', label: 'VCF' }]} value={format} onChange={(e) => setFormat(e.target.value)} />
      </div>

      <div className="crm-ov-fields">
        <span className="crm-ov-summary__label">Fields</span>
        {EXPORT_FIELDS.map((f) => (
          <Checkbox key={f.key} label={f.sensitive ? `${f.label} (sensitive)` : f.label} checked={fields.has(f.key)} onChange={() => toggle(f.key)} />
        ))}
      </div>

      {sensitiveSelected ? (
        <div className="crm-ov-banner crm-ov-banner--warn">
          <TriangleAlert aria-hidden="true" />
          <span>Sensitive fields are included. The export will be logged and may be masked by policy.</span>
        </div>
      ) : null}

      <p className="crm-ov-muted">Estimated {estimated} records.</p>
    </Drawer>
  );
}

/* ---- CON-S17 Consent / Block / Data Rights ----------------------------- */
function ConsentDrawer({
  targetLabel,
  contactId,
  onClose,
  onApply,
  targetIds,
}: {
  targetLabel: string;
  contactId: string | null;
  onClose: () => void;
  onApply: (m: string) => void;
  targetIds: string[];
}) {
  const [, setSearchParams] = useSearchParams();
  const contact = contactId ? findContact(contactId) : undefined;
  const [consent, setConsent] = useState<string>(contact?.consent ?? 'pending');

  const openErasure = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.set('modal', 'confirm');
      next.set('action', 'data-erasure');
      return next;
    });

  return (
    <Drawer
      open
      title="Consent & data rights"
      subtitle={`Manage messaging consent and data rights for ${targetLabel}.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={async () => { if (targetIds.length) { try { await bulkContacts(targetIds, { op: 'consent', consent }); } catch { return; } } onApply(`Consent updated for ${targetLabel}`); }}>
            Save consent
          </Button>
        </>
      }
    >
      {contact ? (
        <div className="crm-ov-field-static">
          <span className="crm-ov-field-static__label">Current consent</span>
          <ConsentBadge consent={contact.consent} />
        </div>
      ) : null}

      <div className="crm-ov-form">
        <Select label="Consent state" options={[{ value: 'opted-in', label: 'Opted in' }, { value: 'opted-out', label: 'Opted out' }, { value: 'pending', label: 'Pending' }]} value={consent} onChange={(e) => setConsent(e.target.value)} />
        <Input label="Opt-out reason" placeholder="Optional" />
      </div>

      {contact?.consent !== 'opted-in' ? (
        <div className="crm-ov-banner crm-ov-banner--warn">
          <TriangleAlert aria-hidden="true" />
          <span>This contact is not opted in and will be excluded from campaigns.</span>
        </div>
      ) : null}

      <div className="crm-ov-datarights">
        <span className="crm-ov-summary__label">Data rights</span>
        <div className="crm-ov-datarights__actions">
          <Button variant="secondary" size="sm" onClick={() => onApply(`Personal-data export prepared for ${targetLabel}`)}>
            Export personal data
          </Button>
          <Button variant="danger" size="sm" onClick={openErasure}>
            Erase personal data
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

/* ---- CON-S18 Confirmation ---------------------------------------------- */
const confirmCopy: Record<string, { title: string; message: string; confirm: string; tone: 'danger' | 'default'; done: string }> = {
  'delete-segment': { title: 'Delete segment?', message: 'This segment will be removed. Campaigns referencing it will lose this audience.', confirm: 'Delete segment', tone: 'danger', done: 'Segment deleted' },
  archive: { title: 'Archive contact?', message: 'Archiving hides the contact from operational lists. This is reversible.', confirm: 'Archive', tone: 'default', done: 'Contact archived' },
  delete: { title: 'Delete contact?', message: 'This permanently deletes the contact record and cannot be undone.', confirm: 'Delete', tone: 'danger', done: 'Contact deleted' },
  'bulk-delete': { title: 'Delete selected contacts?', message: 'This permanently deletes every selected contact and cannot be undone.', confirm: 'Delete all', tone: 'danger', done: 'Contacts deleted' },
  'data-erasure': { title: 'Erase personal data?', message: 'This runs an elevated data-rights erasure. It is irreversible and audited.', confirm: 'Erase data', tone: 'danger', done: 'Erasure requested' },
  merge: { title: 'Merge contacts?', message: 'The selected records will be merged into one canonical contact.', confirm: 'Merge', tone: 'default', done: 'Contacts merged' },
};

function ConfirmOverlay({
  onCancel,
  onApply,
  targetLabel,
  targetIds,
}: {
  onCancel: () => void;
  onApply: (m: string) => void;
  targetLabel: string;
  targetIds: string[];
}) {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action') ?? '';
  const segmentId = searchParams.get('segmentId');
  const copy = confirmCopy[action] ?? {
    title: 'Confirm action?',
    message: 'Please confirm you want to proceed.',
    confirm: 'Confirm',
    tone: 'default' as const,
    done: 'Done',
  };

  const segment = segmentId ? findSegment(segmentId) : undefined;
  const message = segment ? `“${segment.name}” — ${copy.message}` : action === 'delete-segment' ? copy.message : `${targetLabel} — ${copy.message}`;

  return (
    <ConfirmDialog
      open
      title={copy.title}
      message={message}
      confirmLabel={copy.confirm}
      tone={copy.tone}
      onConfirm={async () => { if ((action === 'bulk-delete' || action === 'delete-contact') && targetIds.length) { try { await bulkContacts(targetIds, { op: 'delete' }); } catch { return; } } onApply(copy.done); }}
      onCancel={onCancel}
    />
  );
}
