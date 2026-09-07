import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Badge,
  Banner,
  Button,
  Checkbox,
  ErrorState,
  Input,
  PermissionRestricted,
  Select,
  Tabs,
  Toast,
  type TabItem,
} from '@crm/design-system';
import { findCatalogue, updateCatalogue } from '../data';
import { jewelleryAttributePresets } from '../domain/attribute-presets';
import { unitLabel } from '../domain/units';
import type { AttributeDataType, CatalogueAttribute, HierarchyLevel, Unit } from '../domain/types';
import { can } from '../permissions';

const tabs: TabItem[] = [
  { id: 'hierarchy', label: 'Hierarchy' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'units', label: 'Units' },
];

const dataTypeOptions: { value: AttributeDataType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'long-text', label: 'Long text' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'single-select', label: 'Single select' },
  { value: 'multi-select', label: 'Multi select' },
  { value: 'date', label: 'Date' },
  { value: 'currency', label: 'Currency' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'weight', label: 'Weight' },
  { value: 'url', label: 'URL' },
];

const allUnits: Unit[] = ['PCS', 'GM', 'KG', 'PAIR', 'SET', 'BOX', 'METER', 'CUSTOM'];

let localSeq = 0;

/** ECO-S06 — Hierarchy & Attribute Setup. Local working copy; Save writes back to the catalogue fixture. */
export default function CatalogueSchemaScreen() {
  const { catalogueId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const catalogue = catalogueId ? findCatalogue(catalogueId) : undefined;

  const [levels, setLevels] = useState<HierarchyLevel[]>(() => (catalogue ? [...catalogue.hierarchySchema] : []));
  const [attributes, setAttributes] = useState<CatalogueAttribute[]>(() => (catalogue ? [...catalogue.attributeSchema] : []));
  const [units, setUnits] = useState<Unit[]>(() => (catalogue ? [...catalogue.unitSchema] : ['PCS']));
  const [newLevelLabel, setNewLevelLabel] = useState('');
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState<AttributeDataType>('text');
  const [presetKey, setPresetKey] = useState(jewelleryAttributePresets[0]?.key ?? '');
  const [toast, setToast] = useState<string | null>(null);

  if (!catalogue) {
    return (
      <ErrorState
        title="Catalogue not found"
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>Back to Catalogues</Button>}
      />
    );
  }

  if (!can(role, 'catalogue.configureSchema')) {
    return (
      <PermissionRestricted
        title="You do not have access to this action"
        description="Configuring catalogue hierarchy, attributes and units is restricted to workspace owners and managers."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/explorer`))}>Back to catalogue</Button>}
      />
    );
  }

  const activeTab = searchParams.get('tab') ?? 'hierarchy';
  const setTab = (id: string) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('tab', id); return next; });
  const isNew = searchParams.get('new') === 'true';

  function addLevel() {
    if (!newLevelLabel.trim()) return;
    localSeq += 1;
    const key = newLevelLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || `level-${localSeq}`;
    setLevels((prev) => [...prev, { key, label: newLevelLabel.trim(), order: prev.length + 1, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true }]);
    setNewLevelLabel('');
  }

  function removeLevel(key: string) {
    setLevels((prev) => prev.filter((l) => l.key !== key).map((l, index) => ({ ...l, order: index + 1 })));
  }

  function moveLevel(key: string, direction: -1 | 1) {
    setLevels((prev) => {
      const index = prev.findIndex((l) => l.key === key);
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((l, i) => ({ ...l, order: i + 1 }));
    });
  }

  function toggleLevelFlag(key: string, flag: keyof HierarchyLevel) {
    setLevels((prev) => prev.map((l) => (l.key === key ? { ...l, [flag]: !l[flag] } : l)));
  }

  function addPresetAttribute() {
    const preset = jewelleryAttributePresets.find((p) => p.key === presetKey);
    if (!preset || attributes.some((a) => a.key === preset.key)) return;
    localSeq += 1;
    setAttributes((prev) => [...prev, { id: `attr_local_${localSeq}`, ...preset }]);
  }

  function addCustomAttribute() {
    if (!newAttrName.trim()) return;
    localSeq += 1;
    const key = newAttrName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setAttributes((prev) => [
      ...prev,
      {
        id: `attr_local_${localSeq}`,
        key,
        name: newAttrName.trim(),
        dataType: newAttrType,
        required: false,
        filterable: false,
        searchable: false,
        customerVisible: true,
        shareableOnWhatsapp: true,
        inventoryRelated: false,
        sourceOwnership: 'crm',
      },
    ]);
    setNewAttrName('');
  }

  function removeAttribute(id: string) {
    setAttributes((prev) => prev.filter((a) => a.id !== id));
  }

  function toggleAttrFlag(id: string, flag: 'required' | 'filterable' | 'searchable' | 'customerVisible' | 'shareableOnWhatsapp' | 'inventoryRelated') {
    setAttributes((prev) => prev.map((a) => (a.id === id ? { ...a, [flag]: !a[flag] } : a)));
  }

  function toggleUnit(unit: Unit) {
    setUnits((prev) => (prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]));
  }

  const safeCatalogueId = catalogue.id;

  function save() {
    updateCatalogue(safeCatalogueId, { hierarchySchema: levels, attributeSchema: attributes, unitSchema: units, status: 'active' });
    setToast('Schema saved.');
  }

  function saveAndContinue() {
    updateCatalogue(safeCatalogueId, { hierarchySchema: levels, attributeSchema: attributes, unitSchema: units, status: 'active' });
    navigate(scopedHref(`/catalogue-orders/catalogues/${safeCatalogueId}/explorer`));
  }

  return (
    <div className="crm-eco-schema">
      <PageHeader
        breadcrumbs={[
          { label: 'Catalogues', to: scopedHref('/catalogue-orders/catalogues') },
          { label: catalogue.name, to: scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/explorer`) },
          { label: 'Hierarchy & attributes' },
        ]}
        title="Hierarchy & Attribute Setup"
        description="Hierarchy controls navigation and grouping. Attributes describe the item. They stay separate on purpose — never a fixed Collection → Product → Variant shape."
        actions={
          <>
            <Button variant="secondary" onClick={save}>Save</Button>
            <Button variant="primary" onClick={saveAndContinue}>Save &amp; open catalogue</Button>
          </>
        }
      />

      {isNew ? (
        <Banner tone="info" title="New catalogue — define its schema before importing or adding items" description="At least one hierarchy level and one unit are required. Add jewellery presets or define your own attributes — nothing here is jewellery-specific unless you choose it." />
      ) : null}

      <Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Schema sections" />

      {activeTab === 'hierarchy' ? (
        <div className="crm-eco-schema__panel">
          {levels.length === 0 ? <p className="crm-eco-schema__hint">No hierarchy levels yet — add at least one below.</p> : null}
          <table className="crm-eco-schema__table">
            <thead>
              <tr>
                <th>Order</th><th>Level</th><th>Required</th><th>Filterable</th><th>In Explorer</th><th>Customer-visible</th><th></th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level, index) => (
                <tr key={level.key}>
                  <td className="crm-eco-schema__order-cell">
                    <Button variant="ghost" size="sm" onClick={() => moveLevel(level.key, -1)} disabled={index === 0} aria-label={`Move ${level.label} up`}><ArrowUp size={14} /></Button>
                    {level.order}
                    <Button variant="ghost" size="sm" onClick={() => moveLevel(level.key, 1)} disabled={index === levels.length - 1} aria-label={`Move ${level.label} down`}><ArrowDown size={14} /></Button>
                  </td>
                  <td>{level.label} <span className="crm-eco-schema__key">({level.key})</span></td>
                  <td><Checkbox label={`${level.label} required`} hideLabel checked={level.required} onChange={() => toggleLevelFlag(level.key, 'required')} /></td>
                  <td><Checkbox label={`${level.label} filterable`} hideLabel checked={level.filterable} onChange={() => toggleLevelFlag(level.key, 'filterable')} /></td>
                  <td><Checkbox label={`${level.label} visible in explorer`} hideLabel checked={level.visibleInExplorer} onChange={() => toggleLevelFlag(level.key, 'visibleInExplorer')} /></td>
                  <td><Checkbox label={`${level.label} customer-visible`} hideLabel checked={level.visibleToCustomer} onChange={() => toggleLevelFlag(level.key, 'visibleToCustomer')} /></td>
                  <td><Button variant="ghost" size="sm" onClick={() => removeLevel(level.key)} aria-label={`Remove ${level.label}`}><Trash2 size={14} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="crm-eco-schema__add-row">
            <Input label="New level name" hideLabel placeholder="e.g. Occasion, Room, Brand…" value={newLevelLabel} onChange={(e) => setNewLevelLabel(e.target.value)} />
            <Button variant="secondary" iconLeft={<Plus />} onClick={addLevel}>Add level</Button>
          </div>
        </div>
      ) : null}

      {activeTab === 'attributes' ? (
        <div className="crm-eco-schema__panel">
          <table className="crm-eco-schema__table">
            <thead>
              <tr><th>Attribute</th><th>Type</th><th>Required</th><th>Filterable</th><th>Searchable</th><th>Customer-visible</th><th>WhatsApp</th><th>Inventory-related</th><th></th></tr>
            </thead>
            <tbody>
              {attributes.map((attribute) => (
                <tr key={attribute.id}>
                  <td>{attribute.name} {attribute.isPreset ? <Badge tone="brand" appearance="outline">Preset</Badge> : null}</td>
                  <td>{dataTypeOptions.find((d) => d.value === attribute.dataType)?.label ?? attribute.dataType}</td>
                  <td><Checkbox label="Required" hideLabel checked={attribute.required} onChange={() => toggleAttrFlag(attribute.id, 'required')} /></td>
                  <td><Checkbox label="Filterable" hideLabel checked={attribute.filterable} onChange={() => toggleAttrFlag(attribute.id, 'filterable')} /></td>
                  <td><Checkbox label="Searchable" hideLabel checked={attribute.searchable} onChange={() => toggleAttrFlag(attribute.id, 'searchable')} /></td>
                  <td><Checkbox label="Customer-visible" hideLabel checked={attribute.customerVisible} onChange={() => toggleAttrFlag(attribute.id, 'customerVisible')} /></td>
                  <td><Checkbox label="Shareable on WhatsApp" hideLabel checked={attribute.shareableOnWhatsapp} onChange={() => toggleAttrFlag(attribute.id, 'shareableOnWhatsapp')} /></td>
                  <td><Checkbox label="Inventory-related" hideLabel checked={attribute.inventoryRelated} onChange={() => toggleAttrFlag(attribute.id, 'inventoryRelated')} /></td>
                  <td><Button variant="ghost" size="sm" onClick={() => removeAttribute(attribute.id)} aria-label={`Remove ${attribute.name}`}><Trash2 size={14} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="crm-eco-schema__add-row">
            <Select
              label="Jewellery preset"
              hideLabel
              options={jewelleryAttributePresets.filter((p) => !attributes.some((a) => a.key === p.key)).map((p) => ({ value: p.key, label: p.name }))}
              value={presetKey}
              onChange={(e) => setPresetKey(e.target.value)}
            />
            <Button variant="secondary" iconLeft={<Plus />} onClick={addPresetAttribute}>Add preset</Button>
          </div>
          <div className="crm-eco-schema__add-row">
            <Input label="Custom attribute name" hideLabel placeholder="e.g. Material, Fabric, Warranty…" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} />
            <Select label="Data type" hideLabel options={dataTypeOptions} value={newAttrType} onChange={(e) => setNewAttrType(e.target.value as AttributeDataType)} />
            <Button variant="secondary" iconLeft={<Plus />} onClick={addCustomAttribute}>Add custom attribute</Button>
          </div>
        </div>
      ) : null}

      {activeTab === 'units' ? (
        <div className="crm-eco-schema__panel">
          <p className="crm-eco-schema__hint">Choose every unit this catalogue's items and inventory may use. Jewellery lines typically need both PCS and GM.</p>
          <div className="crm-eco-schema__units">
            {allUnits.map((unit) => (
              <Checkbox key={unit} label={unitLabel[unit]} checked={units.includes(unit)} onChange={() => toggleUnit(unit)} />
            ))}
          </div>
        </div>
      ) : null}

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
