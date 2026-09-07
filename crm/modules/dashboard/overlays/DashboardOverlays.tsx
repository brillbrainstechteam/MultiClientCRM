import { useAlertStatus } from '../alert-status-context';
import { AiInsightDrawer } from './AiInsightDrawer';
import { AiSummaryDrawer } from './AiSummaryDrawer';
import { AlertDetailDrawer } from './AlertDetailDrawer';
import { ExportModal } from './ExportModal';
import { FiltersPopover } from './FiltersPopover';
import { GuidedTour } from './GuidedTour';
import { NumberComparisonDrawer } from './NumberComparisonDrawer';
import { QuickActionsPopover } from './QuickActionsPopover';
import { ReassignWorkModal } from './ReassignWorkModal';
import { RecentActivityDrawer } from './RecentActivityDrawer';
import { SavedViewsPopover } from './SavedViewsPopover';
import { SetupChecklistDrawer } from './SetupChecklistDrawer';
import { WhatsAppHealthDrawer } from './WhatsAppHealthDrawer';

/**
 * Mounts every Dashboard contextual overlay (DASH-S03–S08, S10–S16 — S09
 * Customise is an in-page edit mode of DASH-S01 itself, not an overlay) so
 * they can open over `/dashboard` or `/dashboard/alerts` via query state, the
 * same pattern Contacts uses for its own drawers/modals.
 */
export function DashboardOverlays() {
  const { overrides, acknowledge, dismiss, resolve } = useAlertStatus();

  return (
    <>
      <AlertDetailDrawer
        statusOverride={overrides}
        onAcknowledge={acknowledge}
        onDismiss={dismiss}
        onResolve={resolve}
      />
      <SetupChecklistDrawer />
      <WhatsAppHealthDrawer />
      <NumberComparisonDrawer />
      <FiltersPopover />
      <SavedViewsPopover />
      <QuickActionsPopover />
      <RecentActivityDrawer />
      <AiSummaryDrawer />
      <AiInsightDrawer />
      <ExportModal />
      <ReassignWorkModal />
      <GuidedTour />
    </>
  );
}
