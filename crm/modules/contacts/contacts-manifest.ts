/**
 * Canonical Contacts screen manifest (adapter route contract + DOCX §6).
 *
 * Every CON-S / CFG-CON-S id maps to exactly one entry. Batch 0 registers all
 * of them as routes; `batch` records which batch fills in the real screen so
 * placeholders can say "arrives in Batch N". Secondary-nav order and the import
 * wizard step order are also derived from here — one source of truth.
 */

export type ContactSurface = 'page' | 'drawer' | 'modal' | 'wizard-step' | 'settings';

export interface ContactScreen {
  id: string;
  /** Route path relative to the module root, or the query-state for overlays. */
  path: string;
  title: string;
  surface: ContactSurface;
  purpose: string;
  /** Batch that implements the real content (0 = foundation only). */
  batch: number;
}

/** Full pages under /contacts. */
export const contactPages: ContactScreen[] = [
  {
    id: 'CON-S01',
    path: '/contacts',
    title: 'Contacts Overview',
    surface: 'page',
    purpose:
      'Operational snapshot: totals, attention cards (unassigned, due follow-ups, incomplete, duplicates), customer mix and quick actions.',
    batch: 1,
  },
  {
    id: 'CON-S02',
    path: '/contacts/all',
    title: 'All Contacts',
    surface: 'page',
    purpose:
      'Default operational repository: multi-field search, filter chips, configurable table, selection and contextual bulk toolbar.',
    batch: 1,
  },
  {
    id: 'CON-S03',
    path: '/contacts/customer/:contactId',
    title: 'Customer 360',
    surface: 'page',
    purpose:
      'Identity header plus Profile, Sales, Classification, Consent & Privacy, Source, Communication, Timeline, Audit and Related Records.',
    batch: 1,
  },
  {
    id: 'CON-S04',
    path: '/contacts/segments',
    title: 'Segments',
    surface: 'page',
    purpose: 'Segment list with type, match count, owner, usage and actions.',
    batch: 2,
  },
  {
    id: 'CON-S05',
    path: '/contacts/segments/:segmentId',
    title: 'Segment Detail',
    surface: 'page',
    purpose: 'Segment identity, conditions, match count, contact table and usage references.',
    batch: 2,
  },
  {
    id: 'CON-S06',
    path: '/contacts/segments/new',
    title: 'Segment Builder',
    surface: 'page',
    purpose: 'Dynamic vs Snapshot, AND/OR condition groups, live match count and sample.',
    batch: 2,
  },
  {
    id: 'CON-S07',
    path: '/contacts/imports',
    title: 'Imports & Sync Hub',
    surface: 'page',
    purpose: 'Import methods, connected sources, import history and template download.',
    batch: 3,
  },
  {
    id: 'CON-S08',
    path: '/contacts/imports/jobs/:jobId',
    title: 'Import Job Detail',
    surface: 'page',
    purpose: 'Source metadata, progress, added/updated/skipped/rejected counts and reports.',
    batch: 3,
  },
  {
    id: 'CON-S09',
    path: '/contacts/data-quality',
    title: 'Data Quality',
    surface: 'page',
    purpose:
      'Incomplete profiles, invalid phone/format, duplicates, missing ownership and consent issues with safe bulk correction.',
    batch: 4,
  },
  {
    id: 'CON-S10',
    path: '/contacts/reports',
    title: 'Contact Reports',
    surface: 'page',
    purpose: 'Growth, mix, sales-tier distribution, unassigned/overdue trends and conversion.',
    batch: 4,
  },
  {
    id: 'CON-S11',
    path: '/contacts/data-quality/duplicates/:clusterId',
    title: 'Duplicate Merge Review',
    surface: 'page',
    purpose: 'Side-by-side records, match reason, field-by-field winner and merge outcome.',
    batch: 4,
  },
];

/** Secondary Add/Edit route (S06 edit form shares the builder page component). */
export const segmentEditScreen: ContactScreen = {
  id: 'CON-S06',
  path: '/contacts/segments/:segmentId/edit',
  title: 'Segment Builder — Edit',
  surface: 'page',
  purpose: 'Edit an existing segment definition.',
  batch: 2,
};

/** Import wizard steps (one shell; CON-S20–S27). */
export const importWizardSteps: ContactScreen[] = [
  {
    id: 'CON-S20',
    path: '/contacts/imports/new/method',
    title: 'Import — Method',
    surface: 'wizard-step',
    purpose: 'Choose CSV/Excel, Intelligent, Google, Mobile or VCF.',
    batch: 3,
  },
  {
    id: 'CON-S21',
    path: '/contacts/imports/new/source',
    title: 'Import — Source / Upload',
    surface: 'wizard-step',
    purpose: 'Upload/select the source and validate type/size/auth.',
    batch: 3,
  },
  {
    id: 'CON-S22',
    path: '/contacts/imports/new/mapping',
    title: 'Import — Field Mapping',
    surface: 'wizard-step',
    purpose: 'Map source columns to CRM fields with mandatory indicators.',
    batch: 3,
  },
  {
    id: 'CON-S23',
    path: '/contacts/imports/new/validation',
    title: 'Import — Validation & Duplicates',
    surface: 'wizard-step',
    purpose: 'Invalid values, duplicate rules, phone standardization and sync authority.',
    batch: 3,
  },
  {
    id: 'CON-S24',
    path: '/contacts/imports/new/extraction',
    title: 'Import — Intelligent Extraction Review',
    surface: 'wizard-step',
    purpose: 'Source preview vs extracted rows with confidence and required fields.',
    batch: 3,
  },
  {
    id: 'CON-S25',
    path: '/contacts/imports/new/preview',
    title: 'Import — Preview',
    surface: 'wizard-step',
    purpose: 'New/Update/Skip/Reject counts and settings summary before commit.',
    batch: 3,
  },
  {
    id: 'CON-S26',
    path: '/contacts/imports/new/processing',
    title: 'Import — Processing',
    surface: 'wizard-step',
    purpose: 'Progress, processed count, job ID and safe-navigation note.',
    batch: 3,
  },
  {
    id: 'CON-S27',
    path: '/contacts/imports/new/results',
    title: 'Import — Results',
    surface: 'wizard-step',
    purpose: 'Added/updated/skipped/rejected, partial-success warning and links.',
    batch: 3,
  },
];

/**
 * Overlays hosted on contextual pages as query-state (not routes). Registered
 * here for the audit and so Batch 1+ opens them by the exact documented key.
 */
export const contactOverlays: { id: string; queryState: string; title: string; batch: number }[] = [
  { id: 'CON-S12', queryState: '?drawer=advanced-filter', title: 'Advanced Filter', batch: 2 },
  { id: 'CON-S13', queryState: '?drawer=assign', title: 'Assign / Reassign', batch: 2 },
  { id: 'CON-S14', queryState: '?drawer=tags', title: 'Tags', batch: 2 },
  { id: 'CON-S15', queryState: '?drawer=stage-followup', title: 'Stage & Follow-up', batch: 2 },
  { id: 'CON-S16', queryState: '?drawer=export', title: 'Export', batch: 2 },
  { id: 'CON-S17', queryState: '?drawer=consent', title: 'Consent / Block / Data Rights', batch: 2 },
  { id: 'CON-S18', queryState: '?modal=confirm&action=...', title: 'Confirmation', batch: 2 },
  { id: 'CON-S19', queryState: '?drawer=contact&mode=add|edit', title: 'Add / Edit Contact', batch: 1 },
  { id: 'CON-S28', queryState: '?modal=google-contacts', title: 'Google Contacts Connection', batch: 3 },
];

/** Contact configuration screens under /settings/contacts (CFG-CON-S01–S09). */
export const contactSettingsScreens: ContactScreen[] = [
  {
    id: 'CFG-CON-S01',
    path: '/settings/contacts/fields',
    title: 'Contact Fields',
    surface: 'settings',
    purpose: 'Custom field definitions, mandatory/optional, edit/deactivate with dependency warnings.',
    batch: 5,
  },
  {
    id: 'CFG-CON-S02',
    path: '/settings/contacts/tags',
    title: 'Tags',
    surface: 'settings',
    purpose: 'Tag name, colour, category, merge, deactivate and delete with usage warnings.',
    batch: 5,
  },
  {
    id: 'CFG-CON-S03',
    path: '/settings/contacts/lifecycle',
    title: 'Lifecycle & Sales Stages',
    surface: 'settings',
    purpose: 'Configurable stages, default new-contact stage and closure states.',
    batch: 5,
  },
  {
    id: 'CFG-CON-S04',
    path: '/settings/contacts/classification',
    title: 'Classification & Product Masters',
    surface: 'settings',
    purpose: 'B2B/B2C, customer type and shared product taxonomy references.',
    batch: 5,
  },
  {
    id: 'CFG-CON-S05',
    path: '/settings/contacts/sources',
    title: 'Contact Sources',
    surface: 'settings',
    purpose: 'Canonical source values, active/inactive and source-history policy.',
    batch: 5,
  },
  {
    id: 'CFG-CON-S06',
    path: '/settings/contacts/assignment',
    title: 'Assignment & Visibility',
    surface: 'settings',
    purpose: 'Default owner/team/branch rules, precedence and visibility model.',
    batch: 5,
  },
  {
    id: 'CFG-CON-S07',
    path: '/settings/contacts/consent',
    title: 'Consent & Data Rights',
    surface: 'settings',
    purpose: 'Evidence/source rules, bulk consent, opt-out and delete/export workflow.',
    batch: 5,
  },
  {
    id: 'CFG-CON-S08',
    path: '/settings/contacts/integrations',
    title: 'Integrations & Sync',
    surface: 'settings',
    purpose: 'Google Contacts OAuth, Sheets, webhooks, sync direction and connection health.',
    batch: 5,
  },
  {
    id: 'CFG-CON-S09',
    path: '/settings/contacts/permissions',
    title: 'Permissions & Sensitive Fields',
    surface: 'settings',
    purpose: 'Role/action permissions and sensitive-field view/edit access.',
    batch: 5,
  },
];

/** Every screen that owns a real route (for the Batch 0 route audit). */
export const allContactRoutes: ContactScreen[] = [
  ...contactPages,
  segmentEditScreen,
  ...importWizardSteps,
  ...contactSettingsScreens,
];
