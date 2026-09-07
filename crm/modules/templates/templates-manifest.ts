/**
 * Canonical Templates screen manifest (SKILL.md core inventory +
 * CODE_FIRST_ADAPTER.md route contract). Unlike Contacts, most TPL-S ids are
 * overlay/wizard-state variants of a handful of real routes rather than one
 * route each — this table is the audit source of truth (used by Batch 7's
 * SOURCE_COVERAGE_AUDIT.md and by the Figma capture manifest), not a 1:1
 * react-router route table.
 */

export type TemplateSurface = 'page' | 'modal' | 'drawer' | 'wizard-step' | 'toolbar';

export interface TemplateScreen {
  id: string;
  route: string;
  title: string;
  surface: TemplateSurface;
  purpose: string;
  /** Batch that implements the real content. 'deferred' = Phase 2/3, not core. */
  batch: number | 'deferred';
}

export const templateScreens: TemplateScreen[] = [
  { id: 'TPL-S01', route: '/templates', title: 'Templates Repository', surface: 'page', purpose: 'Find/manage templates.', batch: 1 },
  { id: 'TPL-S02', route: '/templates/:templateId', title: 'Template Detail', surface: 'page', purpose: 'Complete template source of truth.', batch: 1 },
  { id: 'TPL-S03', route: '/templates?modal=create', title: 'Create Template', surface: 'modal', purpose: 'Choose start method.', batch: 2 },
  { id: 'TPL-S04', route: '/templates/new?step=basics', title: 'Template Basics', surface: 'wizard-step', purpose: 'Identity/use case/category/language/format.', batch: 2 },
  { id: 'TPL-S05A', route: '/templates/new?step=compose&format=standard', title: 'Standard Composer', surface: 'wizard-step', purpose: 'Standard authoring.', batch: 2 },
  { id: 'TPL-S05B', route: '/templates/new?step=compose&format=carousel', title: 'Carousel Composer', surface: 'wizard-step', purpose: 'Carousel cards.', batch: 3 },
  { id: 'TPL-S05C', route: '/templates/new?step=compose&format=catalogue', title: 'Catalogue/Product Composer', surface: 'wizard-step', purpose: 'Commerce asset reference.', batch: 3 },
  { id: 'TPL-S05D', route: '/templates/new?step=compose&format=authentication', title: 'Authentication Composer', surface: 'wizard-step', purpose: 'OTP/auth guided UI.', batch: 3 },
  { id: 'TPL-S05E', route: '/templates/new?step=compose&format=offer', title: 'Offer/Coupon Composer', surface: 'wizard-step', purpose: 'Limited-time offer/coupon.', batch: 3 },
  { id: 'TPL-S05F', route: '/templates/new?step=compose&format=flow', title: 'Flow Composer', surface: 'wizard-step', purpose: 'Select existing Flow.', batch: 3 },
  { id: 'TPL-S05G', route: '/templates/new?step=compose&format=payment', title: 'Payment Composer', surface: 'wizard-step', purpose: 'Payment/checkout gated UI.', batch: 3 },
  { id: 'TPL-S06', route: '/templates/new?step=preview', title: 'Preview & Validation', surface: 'wizard-step', purpose: 'Preview + validation.', batch: 2 },
  { id: 'TPL-S07', route: '/templates/new?step=review', title: 'Review & Submit', surface: 'wizard-step', purpose: 'Internal approval or Meta submission.', batch: 2 },
  { id: 'TPL-S08', route: '/templates/new?step=review&modal=submission-outcome', title: 'Submission Outcome', surface: 'modal', purpose: 'Success/failure.', batch: 2 },
  { id: 'TPL-S09', route: '/templates/:templateId?drawer=rejection', title: 'Rejection & Resolution', surface: 'drawer', purpose: 'Understand/fix/appeal.', batch: 2 },
  { id: 'TPL-S10', route: '/templates/library', title: 'Ready-Made Library', surface: 'page', purpose: 'Browse reusable starting points.', batch: 5 },
  { id: 'TPL-S11', route: '/templates/library?drawer=preview', title: 'Library Template Preview', surface: 'drawer', purpose: 'Inspect library template.', batch: 5 },
  { id: 'TPL-S12', route: '/templates/:templateId?tab=languages', title: 'Language Versions', surface: 'page', purpose: 'Manage language family.', batch: 5 },
  { id: 'TPL-S13', route: '/templates/approvals', title: 'Internal Approval Queue', surface: 'page', purpose: 'Review queue.', batch: 5 },
  { id: 'TPL-S14', route: '/templates/approvals?drawer=review', title: 'Internal Template Review', surface: 'drawer', purpose: 'Approve/request changes/reject.', batch: 5 },
  { id: 'TPL-S15', route: '/templates?mode=bulk', title: 'Bulk Actions', surface: 'toolbar', purpose: 'Multi-template operations.', batch: 5 },

  // Phase 2/3 — deliberately deferred (SOURCE_COVERAGE_AUDIT.md §B).
  { id: 'TPL-S16', route: '/templates/new?step=basics&source=ai', title: 'AI Template Assistant', surface: 'wizard-step', purpose: 'AI generation/improvement.', batch: 'deferred' },
  { id: 'TPL-S17', route: '/templates/new?step=preview&warning=similar', title: 'Similar Template Warning', surface: 'wizard-step', purpose: 'Content-similarity caution.', batch: 'deferred' },
  { id: 'TPL-S18', route: '/templates/:templateId?tab=history', title: 'Version History', surface: 'page', purpose: 'Revision history.', batch: 'deferred' },
  { id: 'TPL-S19', route: '/templates/:templateId?tab=history&compare=true', title: 'Version Comparison', surface: 'page', purpose: 'Compare revisions.', batch: 'deferred' },
  { id: 'TPL-S20', route: '/templates/:templateId?tab=performance', title: 'Template Analytics', surface: 'page', purpose: 'Performance drill-down.', batch: 'deferred' },
  { id: 'TPL-S21', route: '/templates?modal=compare', title: 'Template Comparison', surface: 'modal', purpose: 'Compare templates/A-B.', batch: 'deferred' },
  { id: 'TPL-S22', route: '/templates/library?modal=bulk-import', title: 'Bulk Import', surface: 'modal', purpose: 'Import many templates at once.', batch: 'deferred' },
  { id: 'TPL-S23', route: '/templates/settings/organization', title: 'Organisation Manager', surface: 'page', purpose: 'Tag/folder taxonomy administration.', batch: 'deferred' },
];

/** Shared Approved Template Picker capture host — not a normal navigation page. */
export const templatePickerScreen: TemplateScreen = {
  id: 'TPL-PICKER',
  route: '/templates/picker?source=inbox|campaigns|journey',
  title: 'Shared Approved Template Picker',
  surface: 'modal',
  purpose: 'Reusable picker for Inbox/Campaigns/Journeys to select an approved template.',
  batch: 6,
};

export function findTemplateScreen(id: string): TemplateScreen | undefined {
  return templateScreens.find((screen) => screen.id === id);
}

export const coreTemplateScreens = templateScreens.filter((screen) => screen.batch !== 'deferred');
export const deferredTemplateScreens = templateScreens.filter((screen) => screen.batch === 'deferred');
