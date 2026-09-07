/**
 * Canonical Campaigns screen manifest (SKILL.md core inventory +
 * CODE_FIRST_ADAPTER.md route contract). Most CAM- ids are query-state
 * variants of a handful of real routes rather than one route each — this
 * table is the audit source of truth for Batch 8's source-coverage audit and
 * for the Figma capture manifest, not a 1:1 react-router route table.
 */

export type CampaignSurface = 'page' | 'modal' | 'drawer' | 'wizard-step';

export interface CampaignScreen {
  id: string;
  route: string;
  title: string;
  surface: CampaignSurface;
  purpose: string;
  /** Batch that implements the real content. 'deferred' = Phase 2, not core. */
  batch: number | 'deferred';
}

export const campaignScreens: CampaignScreen[] = [
  { id: 'CAM-S01', route: '/campaigns', title: 'Campaigns Overview & List', surface: 'page', purpose: 'Find/manage campaigns.', batch: 1 },
  { id: 'CAM-S02', route: '/campaigns/:campaignId', title: 'Campaign Detail', surface: 'page', purpose: 'Complete lifecycle source of truth.', batch: 1 },
  { id: 'CAM-S03', route: '/campaigns/new?draftId=…&step=setup', title: 'Builder — Setup', surface: 'wizard-step', purpose: 'Name, type, sender.', batch: 2 },
  { id: 'CAM-S04', route: '/campaigns/new?draftId=…&step=template', title: 'Builder — Template', surface: 'wizard-step', purpose: 'Choose approved template.', batch: 2 },
  { id: 'CAM-S05', route: '/campaigns/new?draftId=…&step=audience', title: 'Builder — Audience', surface: 'wizard-step', purpose: 'Include/exclude sources, authoritative breakdown.', batch: 3 },
  { id: 'CAM-S06', route: '/campaigns/new?draftId=…&step=personalisation', title: 'Builder — Personalisation', surface: 'wizard-step', purpose: 'Variable mapping/fallbacks.', batch: 4 },
  { id: 'CAM-S07', route: '/campaigns/new?draftId=…&step=review', title: 'Builder — Review & Launch', surface: 'wizard-step', purpose: 'Final checklist, send/schedule.', batch: 4 },
  { id: 'CAM-S08', route: '/campaigns/compare', title: 'Compare Campaigns', surface: 'page', purpose: 'Side-by-side comparison.', batch: 6 },

  { id: 'CAM-W01', route: '…&uploadStep=file', title: 'Upload File', surface: 'wizard-step', purpose: 'Excel/CSV upload.', batch: 3 },
  { id: 'CAM-W02', route: '…&uploadStep=mapping', title: 'Field Mapping', surface: 'wizard-step', purpose: 'Map uploaded columns.', batch: 3 },
  { id: 'CAM-W03', route: '…&uploadStep=validation', title: 'Validation', surface: 'wizard-step', purpose: 'Row-level validation results.', batch: 3 },
  { id: 'CAM-W04', route: '…&uploadStep=results', title: 'Results', surface: 'wizard-step', purpose: 'Use once / Save to Contacts.', batch: 3 },

  { id: 'CAM-DR01', route: '/campaigns?drawer=filters', title: 'Campaign Filter Drawer', surface: 'drawer', purpose: 'Advanced list filters.', batch: 1 },
  { id: 'CAM-DR02', route: '/campaigns/:id?tab=recipients&drawer=recipient&recipientId=…', title: 'Recipient Detail', surface: 'drawer', purpose: 'One recipient outcome.', batch: 5 },
  { id: 'CAM-DR03', route: '/campaigns/:id?state=scheduled&drawer=reschedule', title: 'Reschedule', surface: 'drawer', purpose: 'Change schedule date/time.', batch: 5 },
  { id: 'CAM-DR04', route: '…&step=personalisation&drawer=sample-preview&contactId=…', title: 'Sample Personalisation Preview', surface: 'drawer', purpose: 'Preview resolved message for one recipient.', batch: 4 },

  { id: 'CAM-M01', route: '…&step=review&modal=send', title: 'Send Now Confirmation', surface: 'modal', purpose: 'Final send confirmation.', batch: 4 },
  { id: 'CAM-M02', route: '…&step=review&modal=schedule', title: 'Schedule Confirmation', surface: 'modal', purpose: 'Final schedule confirmation.', batch: 4 },
  { id: 'CAM-M03', route: '/campaigns/:id?state=scheduled&modal=cancel', title: 'Cancel Scheduled Campaign', surface: 'modal', purpose: 'Cancel before send.', batch: 5 },
  { id: 'CAM-M04', route: '/campaigns/:id?state=live&modal=pause', title: 'Pause / Resume Confirmation', surface: 'modal', purpose: 'Pause/resume a live campaign.', batch: 5 },
  { id: 'CAM-M05', route: '/campaigns/:id?modal=archive', title: 'Archive Confirmation', surface: 'modal', purpose: 'Hide from operational views.', batch: 6 },
  { id: 'CAM-M06', route: '/campaigns/:id?tab=recipients&modal=export', title: 'Export Options', surface: 'modal', purpose: 'Export recipient/result data.', batch: 5 },
  { id: 'CAM-M07', route: '/campaigns/:id?tab=recipients&modal=create-segment&result=…', title: 'Create Result Segment', surface: 'modal', purpose: 'Segment recipients by result.', batch: 6 },
  { id: 'CAM-M08', route: '/campaigns/:id?tab=recipients&modal=retry-failed', title: 'Retry Failed Recipients', surface: 'modal', purpose: 'Re-evaluate and retry failures.', batch: 6 },

  // Phase 2 — deliberately deferred (SOURCE_COVERAGE_AUDIT.md).
  { id: 'CAM-S09', route: '/campaigns/new?draftId=…&step=recurrence&type=recurring', title: 'Recurrence Setup', surface: 'wizard-step', purpose: 'Recurring send placeholder.', batch: 'deferred' },
  { id: 'CAM-S10', route: '/campaigns/new?draftId=…&step=trigger&type=trigger', title: 'Trigger Rule Setup', surface: 'wizard-step', purpose: 'Trigger-based placeholder.', batch: 'deferred' },
  { id: 'CAM-S11', route: '/campaigns/new?draftId=…&step=api&type=api', title: 'API Campaign Setup', surface: 'wizard-step', purpose: 'API-triggered placeholder.', batch: 'deferred' },
];

export function findCampaignScreen(id: string): CampaignScreen | undefined {
  return campaignScreens.find((screen) => screen.id === id);
}

export const coreCampaignScreens = campaignScreens.filter((screen) => screen.batch !== 'deferred');
export const deferredCampaignScreens = campaignScreens.filter((screen) => screen.batch === 'deferred');
