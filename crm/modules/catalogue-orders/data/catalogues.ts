import type { Catalogue, CatalogueAttribute, HierarchyLevel } from '../domain/types';
import { jewelleryAttributePresets } from '../domain/attribute-presets';

function preset(key: string, overrides: Partial<CatalogueAttribute> = {}): CatalogueAttribute {
  const base = jewelleryAttributePresets.find((attribute) => attribute.key === key);
  if (!base) throw new Error(`Unknown jewellery attribute preset: ${key}`);
  return { id: `attr_${key}`, ...base, ...overrides };
}

/* ---------------------------------------------------------------------- */
/* Hierarchy schemas — deliberately different shapes per SKILL.md §3.1.    */
/* ---------------------------------------------------------------------- */

const festiveHierarchy: HierarchyLevel[] = [
  { key: 'collection', label: 'Collection', order: 1, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'metal', label: 'Metal', order: 2, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'purity', label: 'Purity', order: 3, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'productType', label: 'Product Type', order: 4, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'design', label: 'Design', order: 5, required: true, filterable: false, visibleInExplorer: true, visibleToCustomer: true },
];

/** Alternate jewellery hierarchy (Requirement §E3 "Business B") — same domain, different navigation shape. */
const lightweightHierarchy: HierarchyLevel[] = [
  { key: 'metal', label: 'Metal', order: 1, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'productType', label: 'Product Type', order: 2, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'weightRange', label: 'Weight Range', order: 3, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: false },
  { key: 'design', label: 'Design', order: 4, required: true, filterable: false, visibleInExplorer: true, visibleToCustomer: true },
];

/** Non-jewellery hierarchy — proves the model is not jewellery-specific. */
const decorHierarchy: HierarchyLevel[] = [
  { key: 'room', label: 'Room', order: 1, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'category', label: 'Category', order: 2, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'collection', label: 'Collection', order: 3, required: false, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'product', label: 'Product', order: 4, required: true, filterable: false, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'finish', label: 'Finish', order: 5, required: false, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
];

const apparelHierarchy: HierarchyLevel[] = [
  { key: 'brand', label: 'Brand', order: 1, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'category', label: 'Category', order: 2, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'collection', label: 'Collection', order: 3, required: false, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'style', label: 'Style', order: 4, required: true, filterable: false, visibleInExplorer: true, visibleToCustomer: true },
  { key: 'colour', label: 'Colour', order: 5, required: true, filterable: true, visibleInExplorer: true, visibleToCustomer: true },
];

/* ---------------------------------------------------------------------- */
/* Attribute schemas                                                       */
/* ---------------------------------------------------------------------- */

const festiveAttributes: CatalogueAttribute[] = [
  preset('grossWeightGm'),
  preset('netWeightGm'),
  preset('stoneWeightCt'),
  preset('stoneType'),
  preset('makingChargeBasis'),
  preset('readyStock'),
  preset('occasion'),
  preset('certificate'),
];

const lightweightAttributes: CatalogueAttribute[] = [
  preset('grossWeightGm'),
  preset('purity'),
  preset('designNumber'),
  preset('readyStock'),
];

const decorAttributes: CatalogueAttribute[] = [
  { id: 'attr_material', key: 'material', name: 'Material', dataType: 'single-select', options: ['Ceramic', 'Canvas', 'Stoneware', 'Brass', 'Wood'], required: true, filterable: true, searchable: true, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'crm' },
  { id: 'attr_dimensions', key: 'dimensions', name: 'Dimensions', dataType: 'text', required: false, filterable: false, searchable: false, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'crm' },
  { id: 'attr_careInstructions', key: 'careInstructions', name: 'Care Instructions', dataType: 'long-text', required: false, filterable: false, searchable: false, customerVisible: true, shareableOnWhatsapp: false, inventoryRelated: false, sourceOwnership: 'crm' },
];

const apparelAttributes: CatalogueAttribute[] = [
  { id: 'attr_fabric', key: 'fabric', name: 'Fabric', dataType: 'single-select', options: ['Cotton', 'Silk', 'Georgette', 'Linen'], required: true, filterable: true, searchable: true, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'source' },
  { id: 'attr_size', key: 'size', name: 'Size', dataType: 'single-select', options: ['S', 'M', 'L', 'XL', 'Free Size'], required: true, filterable: true, searchable: false, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: true, sourceOwnership: 'source' },
  { id: 'attr_washCare', key: 'washCare', name: 'Wash Care', dataType: 'text', required: false, filterable: false, searchable: false, customerVisible: true, shareableOnWhatsapp: false, inventoryRelated: false, sourceOwnership: 'source' },
];

export const catalogues: Catalogue[] = [
  {
    id: 'cat_aurum_festive',
    tenantId: 'workspace_northline',
    name: 'Aurum Jewellers — Festive & Wedding',
    description: 'ERP-integrated jewellery catalogue synced from Acme Infinity, enriched with CRM media and WhatsApp captions.',
    businessMode: 'b2b',
    sourceMode: 'integrated',
    connectorId: 'connector_acme_infinity',
    sourceStatus: 'connected',
    hierarchySchema: festiveHierarchy,
    attributeSchema: festiveAttributes,
    unitSchema: ['PCS', 'GM'],
    branchIds: ['branch_delhi', 'branch_mumbai'],
    sourceMapping: {
      collection: 'ERP.CollectionName',
      metal: 'ERP.MetalType',
      purity: 'ERP.Purity',
      productType: 'ERP.ItemCategory',
      design: 'ERP.DesignCode',
      grossWeightGm: 'ERP.GrossWt',
      sku: 'ERP.SKU',
    },
    lastSync: '2026-08-11T07:30:00+05:30',
    status: 'active',
    itemCount: 6,
    createdAt: '2025-09-02T10:00:00+05:30',
    updatedAt: '2026-08-11T07:30:00+05:30',
  },
  {
    id: 'cat_aurum_lightweight',
    tenantId: 'workspace_northline',
    name: 'Aurum Jewellers — Lightweight (Spreadsheet)',
    description: 'Uploaded from the branch showroom spreadsheet — no live ERP connection for this line yet.',
    businessMode: 'b2b',
    sourceMode: 'uploaded',
    connectorId: null,
    sourceStatus: 'stale',
    hierarchySchema: lightweightHierarchy,
    attributeSchema: lightweightAttributes,
    unitSchema: ['PCS', 'GM'],
    branchIds: ['branch_delhi'],
    sourceMapping: {
      metal: 'Metal',
      productType: 'Category',
      weightRange: 'Weight Band',
      design: 'Design No',
      grossWeightGm: 'Gross Wt (gm)',
      sku: 'SKU',
    },
    lastSync: '2026-08-02T11:15:00+05:30',
    status: 'active',
    itemCount: 3,
    createdAt: '2026-06-10T09:30:00+05:30',
    updatedAt: '2026-08-02T11:15:00+05:30',
  },
  {
    id: 'cat_home_decor',
    tenantId: 'workspace_northline',
    name: 'Studio Weave — Home Décor',
    description: 'CRM-managed catalogue for the Home Décor line — no external source, catalogue team maintains it directly.',
    businessMode: 'b2c',
    sourceMode: 'crm-managed',
    connectorId: null,
    sourceStatus: 'connected',
    hierarchySchema: decorHierarchy,
    attributeSchema: decorAttributes,
    unitSchema: ['PCS'],
    branchIds: ['branch_mumbai', 'branch_bengaluru'],
    sourceMapping: {},
    lastSync: null,
    status: 'active',
    itemCount: 4,
    createdAt: '2026-03-18T12:00:00+05:30',
    updatedAt: '2026-08-10T15:20:00+05:30',
  },
  {
    id: 'cat_northline_apparel',
    tenantId: 'workspace_northline',
    name: 'Northline Studio — Apparel',
    description: 'Shopify-connected storefront catalogue. Product, price and inventory are Shopify-owned; CRM enriches WhatsApp captions and collections.',
    businessMode: 'b2c',
    sourceMode: 'integrated',
    connectorId: 'connector_shopify_northline',
    sourceStatus: 'connected',
    hierarchySchema: apparelHierarchy,
    attributeSchema: apparelAttributes,
    unitSchema: ['PCS'],
    branchIds: ['branch_delhi', 'branch_mumbai', 'branch_bengaluru'],
    sourceMapping: {
      brand: 'Shopify.Vendor',
      category: 'Shopify.ProductType',
      collection: 'Shopify.CollectionTitle',
      style: 'Shopify.Title',
      colour: 'Shopify.Option1',
      sku: 'Shopify.SKU',
    },
    lastSync: '2026-08-11T09:05:00+05:30',
    status: 'active',
    itemCount: 3,
    createdAt: '2025-12-01T10:00:00+05:30',
    updatedAt: '2026-08-11T09:05:00+05:30',
  },
];

export function findCatalogue(id: string): Catalogue | undefined {
  return catalogues.find((catalogue) => catalogue.id === id);
}

let catalogueSeq = 0;

export type NewCatalogueInput = Pick<
  Catalogue,
  'tenantId' | 'name' | 'description' | 'businessMode' | 'sourceMode' | 'connectorId' | 'branchIds'
>;

/**
 * Prototype has no backend, but Create Catalogue → Schema Setup → Explorer
 * needs to feel like one real flow rather than a dead end (SKILL.md §6 "no
 * fake APIs ... unless required to demonstrate a flow" — creation is exactly
 * that flow). Mutates the in-memory fixture array for the session; resets on
 * reload like every other unsaved prototype state.
 */
export function createCatalogue(input: NewCatalogueInput): Catalogue {
  catalogueSeq += 1;
  const now = new Date().toISOString();
  const catalogue: Catalogue = {
    id: `cat_draft_${catalogueSeq}`,
    ...input,
    sourceStatus: input.sourceMode === 'integrated' ? 'mapping-required' : 'connected',
    hierarchySchema: [],
    attributeSchema: [],
    unitSchema: ['PCS'],
    sourceMapping: {},
    lastSync: null,
    status: 'draft',
    itemCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  catalogues.push(catalogue);
  return catalogue;
}

export function updateCatalogue(id: string, patch: Partial<Catalogue>): Catalogue | undefined {
  const index = catalogues.findIndex((catalogue) => catalogue.id === id);
  if (index === -1) return undefined;
  catalogues[index] = { ...catalogues[index], ...patch, updatedAt: new Date().toISOString() };
  return catalogues[index];
}
