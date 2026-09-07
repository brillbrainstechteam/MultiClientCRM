import type { CatalogueAttribute } from './types';

/**
 * Jewellery attribute preset library (Requirement §F3). These are optional
 * suggestions offered on Hierarchy & Attribute Setup (ECO-S06) — a catalogue
 * is never forced to use them, and every field stays editable after being
 * added. Non-jewellery catalogues ignore this list entirely and define their
 * own attributes from scratch, which is how the module avoids hard-coding
 * jewellery globally (SKILL.md §3.1).
 */
export const jewelleryAttributePresets: Omit<CatalogueAttribute, 'id'>[] = [
  { key: 'metal', name: 'Metal', dataType: 'single-select', options: ['Gold', 'Silver', 'Platinum'], required: true, filterable: true, searchable: true, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
  { key: 'purity', name: 'Purity / Karat', dataType: 'single-select', options: ['24K', '22K', '18K', '92.5 Sterling'], required: true, filterable: true, searchable: true, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
  { key: 'grossWeightGm', name: 'Gross Weight', dataType: 'weight', unit: 'GM', required: true, filterable: true, searchable: false, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: true, sourceOwnership: 'source', isPreset: true },
  { key: 'netWeightGm', name: 'Net Weight', dataType: 'weight', unit: 'GM', required: false, filterable: false, searchable: false, customerVisible: true, shareableOnWhatsapp: false, inventoryRelated: true, sourceOwnership: 'source', isPreset: true },
  { key: 'stoneWeightCt', name: 'Stone Weight', dataType: 'decimal', unit: 'CUSTOM', required: false, filterable: false, searchable: false, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
  { key: 'stoneType', name: 'Diamond / Stone Type', dataType: 'single-select', options: ['Diamond', 'Ruby', 'Emerald', 'None'], required: false, filterable: true, searchable: true, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
  { key: 'clarity', name: 'Clarity', dataType: 'text', required: false, filterable: false, searchable: false, customerVisible: true, shareableOnWhatsapp: false, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
  { key: 'makingChargeBasis', name: 'Making Charge Basis', dataType: 'single-select', options: ['Per gram', 'Flat', 'Percentage'], required: false, filterable: false, searchable: false, customerVisible: false, shareableOnWhatsapp: false, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
  { key: 'size', name: 'Size', dataType: 'text', required: false, filterable: true, searchable: false, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
  { key: 'designNumber', name: 'Design Number', dataType: 'text', required: true, filterable: false, searchable: true, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
  { key: 'readyStock', name: 'Ready Stock / Made-to-Order', dataType: 'boolean', required: false, filterable: true, searchable: false, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: true, sourceOwnership: 'source', isPreset: true },
  { key: 'occasion', name: 'Occasion', dataType: 'multi-select', options: ['Wedding', 'Festive', 'Daily wear', 'Gifting'], required: false, filterable: true, searchable: true, customerVisible: true, shareableOnWhatsapp: true, inventoryRelated: false, sourceOwnership: 'crm', isPreset: true },
  { key: 'certificate', name: 'Certificate', dataType: 'url', required: false, filterable: false, searchable: false, customerVisible: true, shareableOnWhatsapp: false, inventoryRelated: false, sourceOwnership: 'source', isPreset: true },
];
