import { Check, GripVertical, Merge, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Checkbox,
  DataTable,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Toggle,
  type Column,
} from '@crm/design-system';
import {
  ReferenceNote,
  SettingRow,
  SettingsHeader,
  SettingsSection,
  useConfirmOpener,
} from './settings-ui';
import {
  customFields,
  lifecycleStages,
  permissionMatrix,
  permissionRoles,
  sensitiveFields,
  sourceConfigs,
  tagConfigs,
  type CustomField,
  type SourceConfig,
  type TagConfig,
} from './settings-data';

const fieldTypeLabel: Record<CustomField['type'], string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Dropdown',
  'yes-no': 'Yes / No',
};

/* ---- CFG-CON-S01 Contact Fields ---------------------------------------- */
export function ContactFieldsScreen() {
  const openConfirm = useConfirmOpener();

  const columns: Column<CustomField>[] = [
    { key: 'name', header: 'Field name', render: (f) => <span className="crm-set-strong">{f.name}</span> },
    { key: 'type', header: 'Type', render: (f) => fieldTypeLabel[f.type] },
    { key: 'required', header: 'Required', render: (f) => (f.mandatory ? <Badge tone="warning">Required</Badge> : <span className="crm-set-muted">Optional</span>) },
    { key: 'usage', header: 'Used by', render: (f) => <span className="crm-set-muted">{f.usedByContacts} contacts</span> },
    { key: 'status', header: 'Status', render: (f) => (f.active ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (f) => (
        <span className="crm-set-rowactions">
          <IconButton label={`Edit ${f.name}`} icon={<Pencil />} size="sm" />
          <IconButton label={`Delete ${f.name}`} icon={<Trash2 />} size="sm" onClick={() => openConfirm('delete-field', f.name)} />
        </span>
      ),
    },
  ];

  return (
    <div>
      <SettingsHeader title="Contact Fields" description="Define the custom fields captured on every contact. Fields marked required must be filled before a contact can be saved." />

      <SettingsSection title="Custom fields" description="Standard identity fields are built-in; add your own below." action={<Button variant="primary" size="sm" iconLeft={<Plus />}>Add field</Button>}>
        <DataTable caption="Custom fields" columns={columns} rows={customFields} rowKey={(f) => f.id} />
      </SettingsSection>

      <SettingsSection title="New field" description="Create a field. Deactivating or deleting a field in use shows a dependency warning first.">
        <SettingRow label="Field name"><Input label="Field name" hideLabel placeholder="e.g. PAN number" /></SettingRow>
        <SettingRow label="Type"><Select label="Type" hideLabel options={Object.entries(fieldTypeLabel).map(([value, label]) => ({ value, label }))} /></SettingRow>
        <SettingRow label="Required" hint="Blocks save when empty"><Toggle label="Required field" hideLabel /></SettingRow>
      </SettingsSection>
    </div>
  );
}

/* ---- CFG-CON-S02 Tags --------------------------------------------------- */
export function TagsScreen() {
  const openConfirm = useConfirmOpener();

  const columns: Column<TagConfig>[] = [
    { key: 'name', header: 'Tag', render: (t) => (
      <span className="crm-set-swatch"><span className="crm-set-swatch__dot" style={{ background: t.color }} /> {t.name}</span>
    ) },
    { key: 'category', header: 'Category', render: (t) => <Badge tone="neutral" appearance="outline">{t.category}</Badge> },
    { key: 'usedBy', header: 'Used by', render: (t) => <span className="crm-set-muted">{t.usedBy} contacts</span> },
    { key: 'status', header: 'Status', render: (t) => (t.active ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>) },
    {
      key: 'actions', header: '', align: 'right',
      render: (t) => (
        <span className="crm-set-rowactions">
          <IconButton label={`Merge ${t.name}`} icon={<Merge />} size="sm" onClick={() => openConfirm('merge-tag', t.name)} />
          <IconButton label={`Edit ${t.name}`} icon={<Pencil />} size="sm" />
          <IconButton label={`Delete ${t.name}`} icon={<Trash2 />} size="sm" onClick={() => openConfirm('delete-tag', t.name)} />
        </span>
      ),
    },
  ];

  return (
    <div>
      <SettingsHeader title="Tags" description="Manage the shared tag vocabulary. Merging or deleting a tag in use warns about affected contacts first." />
      <SettingsSection title="Tag library" action={<Button variant="primary" size="sm" iconLeft={<Plus />}>Add tag</Button>}>
        <DataTable caption="Tags" columns={columns} rows={tagConfigs} rowKey={(t) => t.id} />
      </SettingsSection>
      <SettingsSection title="New tag">
        <SettingRow label="Name"><Input label="Name" hideLabel placeholder="e.g. vip" /></SettingRow>
        <SettingRow label="Colour"><Input label="Colour" hideLabel type="text" defaultValue="#1B7A6B" /></SettingRow>
        <SettingRow label="Category"><Select label="Category" hideLabel options={[{ value: 'behaviour', label: 'Behaviour' }, { value: 'campaign', label: 'Campaign' }, { value: 'tier', label: 'Tier' }, { value: 'source', label: 'Source' }]} /></SettingRow>
      </SettingsSection>
    </div>
  );
}

/* ---- CFG-CON-S03 Lifecycle & Sales Stages ------------------------------ */
export function LifecycleScreen() {
  const active = lifecycleStages.filter((s) => s.kind === 'active');
  const closure = lifecycleStages.filter((s) => s.kind === 'closure');

  return (
    <div>
      <SettingsHeader title="Lifecycle & Sales Stages" description="Configure the single Sales/Lifecycle stage set. Set the default stage for new contacts and the closure states." />

      <SettingsSection title="Active stages" description="Drag to reorder. The default stage is applied to newly created contacts." action={<Button variant="primary" size="sm" iconLeft={<Plus />}>Add stage</Button>}>
        <div className="crm-set-stagelist">
          {active.map((s) => (
            <div key={s.id} className="crm-set-stage">
              <GripVertical className="crm-set-stage__handle" aria-hidden="true" size={16} />
              <span className="crm-set-stage__name">{s.name}</span>
              {s.isDefaultNew ? <Badge tone="brand">Default for new</Badge> : null}
              <IconButton label={`Edit ${s.name}`} icon={<Pencil />} size="sm" />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Closure states">
        <div className="crm-set-stagelist">
          {closure.map((s) => (
            <div key={s.id} className="crm-set-stage">
              <span className="crm-set-stage__name">{s.name}</span>
              <Badge tone="neutral" appearance="outline">Terminal</Badge>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Defaults">
        <SettingRow label="Default stage for new contacts">
          <Select label="Default stage" hideLabel options={active.map((s) => ({ value: s.id, label: s.name }))} defaultValue="stg_new" />
        </SettingRow>
        <SettingRow label="Default closure deadline" hint="Days after which an open deal is flagged overdue">
          <Input label="Default closure deadline" hideLabel type="number" defaultValue="30" />
        </SettingRow>
      </SettingsSection>
    </div>
  );
}

/* ---- CFG-CON-S04 Classification & Product Masters ---------------------- */
export function ClassificationScreen() {
  return (
    <div>
      <SettingsHeader title="Classification & Product Masters" description="Configure how contacts are classified. Product taxonomy is shared across modules and referenced here, not duplicated." />

      <SettingsSection title="Business model">
        <SettingRow label="B2B contacts"><Toggle label="B2B" hideLabel defaultChecked /></SettingRow>
        <SettingRow label="B2C contacts"><Toggle label="B2C" hideLabel defaultChecked /></SettingRow>
        <SettingRow label="Customer types" hint="Comma-separated"><Input label="Customer types" hideLabel defaultValue="Retailer, Wholesaler, Individual" /></SettingRow>
        <SettingRow label="Business size"><Input label="Business size" hideLabel defaultValue="Small, Medium, Large" /></SettingRow>
      </SettingsSection>

      <SettingsSection title="Product masters" description="Managed centrally as shared masters.">
        <ReferenceNote>
          Product, purity, collection and category values are shared masters used across Catalogue &amp; Orders and Campaigns. Manage them in <a href="#">Settings → Shared masters</a> to avoid duplicate ownership.
        </ReferenceNote>
      </SettingsSection>

      <SettingsSection title="Sales tier rules" description="Rule-based tier over a defined period, with optional admin override.">
        <SettingRow label="Platinum when"><Input label="Platinum" hideLabel defaultValue="Spend ≥ ₹5,00,000 in 12 months" /></SettingRow>
        <SettingRow label="Gold when"><Input label="Gold" hideLabel defaultValue="Spend ≥ ₹1,00,000 in 12 months" /></SettingRow>
        <SettingRow label="Allow admin override"><Toggle label="Admin override" hideLabel defaultChecked /></SettingRow>
      </SettingsSection>
    </div>
  );
}

/* ---- CFG-CON-S05 Contact Sources --------------------------------------- */
export function SourcesScreen() {
  const openConfirm = useConfirmOpener();
  const columns: Column<SourceConfig>[] = [
    { key: 'name', header: 'Source', render: (s) => <span className="crm-set-strong">{s.name}</span> },
    { key: 'mapping', header: 'External mapping', render: (s) => <code className="crm-set-code">{s.externalMapping}</code> },
    { key: 'status', header: 'Active', render: (s) => <Toggle label={`${s.name} active`} hideLabel defaultChecked={s.active} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: (s) => (
        <span className="crm-set-rowactions">
          <IconButton label={`Edit ${s.name}`} icon={<Pencil />} size="sm" />
          <IconButton label={`Delete ${s.name}`} icon={<Trash2 />} size="sm" onClick={() => openConfirm('delete-source', s.name)} />
        </span>
      ),
    },
  ];

  return (
    <div>
      <SettingsHeader title="Contact Sources" description="Canonical acquisition sources. A contact’s original source is immutable and always traceable, even when new sources are added." />
      <SettingsSection title="Sources" action={<Button variant="primary" size="sm" iconLeft={<Plus />}>Add source</Button>}>
        <DataTable caption="Sources" columns={columns} rows={sourceConfigs} rowKey={(s) => s.id} />
      </SettingsSection>
      <SettingsSection title="Source history policy">
        <SettingRow label="History model">
          <Select label="History model" hideLabel options={[{ value: 'append', label: 'Append-only source history (recommended)' }, { value: 'latest', label: 'Track latest touch only' }]} defaultValue="append" />
        </SettingRow>
        <SettingRow label="Keep original source immutable"><Toggle label="Immutable original source" hideLabel defaultChecked disabled /></SettingRow>
      </SettingsSection>
    </div>
  );
}

/* ---- CFG-CON-S06 Assignment & Visibility ------------------------------- */
export function AssignmentScreen() {
  return (
    <div>
      <SettingsHeader title="Assignment & Visibility" description="Control how new contacts are assigned and who can see them. Precedence: a manual owner always wins over rules." />

      <ReferenceNote>
        Users, teams and branches are managed in <a href="#">Team &amp; Access</a>. This screen only references them for assignment and visibility rules.
      </ReferenceNote>

      <SettingsSection title="Default assignment rules" description="Evaluated in order; the first match assigns the owner.">
        <SettingRow label="1 · Delhi walk-ins"><Select label="Rule 1" hideLabel options={[{ value: 'meera', label: 'Assign to Meera Nair' }]} /></SettingRow>
        <SettingRow label="2 · Website leads"><Select label="Rule 2" hideLabel options={[{ value: 'roundrobin', label: 'Round-robin within Delhi Sales' }]} /></SettingRow>
        <SettingRow label="Fallback"><Select label="Fallback" hideLabel options={[{ value: 'branch', label: 'Branch manager' }, { value: 'unassigned', label: 'Leave unassigned' }]} /></SettingRow>
      </SettingsSection>

      <SettingsSection title="Visibility model">
        <SettingRow label="Who can see a contact">
          <Select label="Visibility" hideLabel options={[{ value: 'owner', label: 'Owner only' }, { value: 'team', label: 'Owner + team' }, { value: 'branch', label: 'Owner + branch' }, { value: 'workspace', label: 'Entire workspace' }]} defaultValue="branch" />
        </SettingRow>
        <SettingRow label="Removed / transferred employees" hint="What happens to their contacts">
          <Select label="Reassignment" hideLabel options={[{ value: 'manager', label: 'Reassign to branch manager' }, { value: 'pool', label: 'Move to unassigned pool' }]} defaultValue="manager" />
        </SettingRow>
      </SettingsSection>
    </div>
  );
}

/* ---- CFG-CON-S07 Consent & Data Rights --------------------------------- */
export function ConsentScreen() {
  return (
    <div>
      <SettingsHeader title="Consent & Data Rights" description="Configure how messaging consent is captured and how data-rights requests are handled. Imports never create marketing opt-in silently." />

      <SettingsSection title="Allowed consent evidence" description="Evidence accepted when recording opt-in.">
        <div className="crm-set-checklist">
          <Checkbox label="Inbound WhatsApp message" defaultChecked />
          <Checkbox label="Website form with consent checkbox" defaultChecked />
          <Checkbox label="Signed physical form (uploaded)" defaultChecked />
          <Checkbox label="Verbal (agent-attested)" />
        </div>
      </SettingsSection>

      <SettingsSection title="Bulk consent rules">
        <SettingRow label="Allow bulk opt-out" hint="With permission"><Toggle label="Bulk opt-out" hideLabel defaultChecked /></SettingRow>
        <SettingRow label="Bulk opt-in requires evidence"><Toggle label="Bulk opt-in evidence" hideLabel defaultChecked disabled /></SettingRow>
        <SettingRow label="Consent scope"><Select label="Consent scope" hideLabel options={[{ value: 'number', label: 'Per channel + WhatsApp number + purpose' }, { value: 'workspace', label: 'Workspace-wide' }]} defaultValue="number" /></SettingRow>
      </SettingsSection>

      <SettingsSection title="Data-rights workflow">
        <SettingRow label="Export request SLA"><Select label="Export SLA" hideLabel options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} defaultValue="30" /></SettingRow>
        <SettingRow label="Erasure is elevated & audited"><Toggle label="Elevated erasure" hideLabel defaultChecked disabled /></SettingRow>
        <SettingRow label="Marketing exclusion on opt-out"><Toggle label="Marketing exclusion" hideLabel defaultChecked /></SettingRow>
      </SettingsSection>
    </div>
  );
}

/* ---- CFG-CON-S08 Integrations & Sync ----------------------------------- */
export function IntegrationsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const googleConnected = searchParams.get('googleAuth') === 'connected';

  const openGoogle = () => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('modal', 'google-contacts'); return n; });

  return (
    <div>
      <SettingsHeader title="Integrations & Sync" description="Connect import sources and outbound sync. TalkTrack is the source of truth by default — import-only integrations cannot overwrite protected fields." />

      <SettingsSection title="Google Contacts" description="Import-only. Export naming is configurable; the canonical CRM name is unchanged.">
        <SettingRow label="Connection">
          {googleConnected ? <StatusBadge tone="success">Connected</StatusBadge> : <StatusBadge tone="danger">Disconnected</StatusBadge>}
          <Button variant="secondary" size="sm" onClick={openGoogle}>{googleConnected ? 'Manage' : 'Connect'}</Button>
        </SettingRow>
        <SettingRow label="Export naming template" hint="Used when contacts are pushed to Google"><Input label="Naming template" hideLabel defaultValue="{Name} — {Source}" /></SettingRow>
      </SettingsSection>

      <SettingsSection title="Google Sheets">
        <SettingRow label="Add / update rows on change"><Toggle label="Sheets sync" hideLabel /></SettingRow>
      </SettingsSection>

      <SettingsSection title="Sync direction & webhooks">
        <SettingRow label="Source of truth"><Select label="Source of truth" hideLabel options={[{ value: 'crm', label: 'TalkTrack (recommended)' }, { value: 'external', label: 'External system' }]} defaultValue="crm" /></SettingRow>
        <SettingRow label="Contact-created webhook"><Input label="Webhook URL" hideLabel placeholder="https://…" /></SettingRow>
        <SettingRow label="Connection health"><StatusBadge tone="success">Healthy</StatusBadge></SettingRow>
      </SettingsSection>

      <p className="crm-set-phasenote">More connectors appear here once enabled for your plan.</p>
    </div>
  );
}

/* ---- CFG-CON-S09 Permissions & Sensitive Fields ------------------------ */
export function PermissionsScreen() {
  return (
    <div>
      <SettingsHeader title="Permissions & Sensitive Fields" description="Grant contact actions per role and control who can view or edit sensitive fields. Capabilities a role can never use are hidden rather than shown disabled." />

      <ReferenceNote>
        Roles and user membership are managed in <a href="#">Team &amp; Access</a>. This screen configures what each role can do with contacts.
      </ReferenceNote>

      <SettingsSection title="Action permissions">
        <div className="crm-matrix">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                {permissionRoles.map((r) => <th key={r}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) => (
                <tr key={row.action}>
                  <td>{row.action}</td>
                  {permissionRoles.map((role) => {
                    const grant = row.grants[role];
                    return (
                      <td key={role}>
                        {grant === null ? (
                          <span className="crm-matrix__hidden">Hidden</span>
                        ) : (
                          <Checkbox label={`${row.action} for ${role}`} hideLabel defaultChecked={grant} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      <SettingsSection title="Sensitive field access" description="View and edit access to sensitive fields per role.">
        <div className="crm-matrix">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                {permissionRoles.map((r) => <th key={r}>{r} · view / edit</th>)}
              </tr>
            </thead>
            <tbody>
              {sensitiveFields.map((row) => (
                <tr key={row.field}>
                  <td>{row.field}</td>
                  {permissionRoles.map((role) => (
                    <td key={role}>
                      <span className="crm-set-viewedit">
                        <MatrixMark on={row.view[role]} />
                        <span aria-hidden="true">/</span>
                        <MatrixMark on={row.edit[role]} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </div>
  );
}

function MatrixMark({ on }: { on: boolean }) {
  return on ? (
    <Check size={15} className="crm-set-mark crm-set-mark--on" aria-label="allowed" />
  ) : (
    <Minus size={15} className="crm-set-mark crm-set-mark--off" aria-label="not allowed" />
  );
}
