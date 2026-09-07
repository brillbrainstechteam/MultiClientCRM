import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { branches } from '@crm/mock-data';
import {
  Banner,
  Button,
  Checkbox,
  ErrorState,
  Input,
  PermissionRestricted,
  Select,
  Textarea,
  Toast,
} from '@crm/design-system';
import { connectors } from '../data';
import { createCatalogue, findCatalogue, updateCatalogue } from '../data/catalogues';
import type { BusinessMode, SourceMode } from '../domain/types';
import { can } from '../permissions';

const businessModeOptions: { value: BusinessMode; label: string }[] = [
  { value: 'b2b', label: 'B2B — saved selections → order requests' },
  { value: 'b2c', label: 'B2C — cart → checkout' },
  { value: 'hybrid', label: 'Hybrid — both selections and carts' },
];

const sourceModeOptions: { value: SourceMode; label: string }[] = [
  { value: 'integrated', label: 'Integrated — connected ERP / storefront' },
  { value: 'uploaded', label: 'Uploaded — spreadsheet import' },
  { value: 'crm-managed', label: 'CRM-managed — maintained directly in this workspace' },
];

/** ECO-S05 — Create/Edit Catalogue. */
export default function CatalogueFormScreen() {
  const { catalogueId } = useParams();
  const isEdit = Boolean(catalogueId);
  const existing = catalogueId ? findCatalogue(catalogueId) : undefined;
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role } = useWorkspace();

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [businessMode, setBusinessMode] = useState<BusinessMode>(existing?.businessMode ?? 'b2c');
  const [sourceMode, setSourceMode] = useState<SourceMode>(existing?.sourceMode ?? 'crm-managed');
  const [connectorId, setConnectorId] = useState<string>(existing?.connectorId ?? connectors[0]?.id ?? '');
  const [branchIds, setBranchIds] = useState<string[]>(existing?.branchIds ?? [branches[0]?.id].filter(Boolean) as string[]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const requiredCapability = isEdit ? 'catalogue.configureSchema' : 'catalogue.create';
  const allowed = can(role, requiredCapability);

  const selectedConnector = useMemo(() => connectors.find((c) => c.id === connectorId), [connectorId]);

  if (isEdit && !existing) {
    return (
      <ErrorState
        title="Catalogue not found"
        description="This catalogue may have been removed, or the link is out of date."
        actions={
          <Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>
            Back to Catalogues
          </Button>
        }
      />
    );
  }

  if (!allowed) {
    return (
      <PermissionRestricted
        title="You do not have access to this action"
        description="Creating or reconfiguring catalogues is restricted to workspace owners and managers."
        actions={
          <Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>
            Back to Catalogues
          </Button>
        }
      />
    );
  }

  function toggleBranch(id: string) {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  function handleSubmit() {
    if (!name.trim()) {
      setNameError('Catalogue name is required.');
      return;
    }
    if (isEdit && existing) {
      updateCatalogue(existing.id, {
        name,
        description,
        businessMode,
        sourceMode,
        connectorId: sourceMode === 'integrated' ? connectorId || null : null,
        branchIds,
      });
      setToast('Catalogue details saved.');
      navigate(scopedHref(`/catalogue-orders/catalogues/${existing.id}/explorer`));
      return;
    }
    const created = createCatalogue({
      tenantId: 'workspace_northline',
      name,
      description,
      businessMode,
      sourceMode,
      connectorId: sourceMode === 'integrated' ? connectorId || null : null,
      branchIds,
    });
    navigate(scopedHref(`/catalogue-orders/catalogues/${created.id}/schema`, { new: 'true' }));
  }

  return (
    <div className="crm-eco-catform">
      <PageHeader
        breadcrumbs={[
          { label: 'Catalogues', to: scopedHref('/catalogue-orders/catalogues') },
          { label: isEdit ? 'Edit catalogue' : 'Create catalogue' },
        ]}
        title={isEdit ? `Edit ${existing?.name}` : 'Create catalogue'}
        description="Every catalogue in this workspace — jewellery, décor, apparel or anything else — starts from the same source and business-mode choices."
      />

      <div className="crm-eco-catform__grid">
        <section className="crm-eco-catform__card">
          <h2 className="crm-eco-catform__section-title">Basics</h2>
          <Input label="Catalogue name" required value={name} onChange={(e) => { setName(e.target.value); setNameError(null); }} error={nameError ?? undefined} placeholder="e.g. Aurum Jewellers — Festive & Wedding" />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} hint="Shown to your team on the Catalogue List — not sent to customers." />
          <Select
            label="Business mode"
            options={businessModeOptions}
            value={businessMode}
            onChange={(e) => setBusinessMode(e.target.value as BusinessMode)}
          />
          <p className="crm-field__hint">Decides whether items flow through Saved Selections (B2B) or Cart/Checkout (B2C).</p>
        </section>

        <section className="crm-eco-catform__card">
          <h2 className="crm-eco-catform__section-title">Source</h2>
          <Select
            label="Source mode"
            options={sourceModeOptions}
            value={sourceMode}
            onChange={(e) => setSourceMode(e.target.value as SourceMode)}
          />

          {sourceMode === 'integrated' ? (
            <>
              <Select
                label="Connector"
                options={connectors.map((c) => ({ value: c.id, label: c.name }))}
                value={connectorId}
                onChange={(e) => setConnectorId(e.target.value)}
              />
              {selectedConnector ? (
                <Banner
                  tone="info"
                  title={`${selectedConnector.name} capabilities`}
                  description={`Products: ${selectedConnector.capabilities['products.write'] ? 'read/write' : 'read-only'} · Inventory: ${selectedConnector.capabilities['inventory.write'] ? 'read/write' : 'read-only'} · Orders: ${selectedConnector.capabilities['orders.create'] ? 'can create' : 'read-only'}. Field ownership and writeable fields are configured after creation in Source Mapping.`}
                />
              ) : null}
            </>
          ) : sourceMode === 'uploaded' ? (
            <Banner tone="info" title="You'll upload a spreadsheet next" description="After saving, use Catalogue Import to bring in items — hierarchy, attributes and inventory are mapped column by column." />
          ) : (
            <Banner tone="info" title="Every field will be CRM-owned" description="No external system to reconcile — your team maintains items, media and inventory directly in this catalogue." />
          )}

          <div className="crm-eco-catform__field">
            <span className="crm-field__label">Branches</span>
            <div className="crm-eco-catform__branches">
              {branches.map((branch) => (
                <Checkbox
                  key={branch.id}
                  label={`${branch.name} (${branch.city})`}
                  checked={branchIds.includes(branch.id)}
                  onChange={() => toggleBranch(branch.id)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="crm-eco-catform__actions">
        <Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={branchIds.length === 0}>
          {isEdit ? 'Save changes' : 'Create catalogue and continue'}
        </Button>
      </div>

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
