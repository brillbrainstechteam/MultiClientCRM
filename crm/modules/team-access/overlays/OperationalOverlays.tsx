import { AuditEventDrawer } from './AuditEventDrawer';
import { AuditExportModal } from './AuditExportModal';
import { AvailabilityDrawer } from './AvailabilityDrawer';
import { ExitWizard } from './ExitWizard';
import { InviteEditMemberDrawer } from './InviteEditMemberDrawer';
import { NumberAccessDrawer } from './NumberAccessDrawer';
import { PerformanceDetailDrawer } from './PerformanceDetailDrawer';
import { TransferOverlay } from './TransferOverlay';

/**
 * Mounts every query-state-driven overlay for Team & Access so any of them can
 * open over any page in the module (contacts precedent). Each overlay reads
 * its own trigger key and renders `null` when not addressed by the URL.
 * Populated batch by batch as each overlay is built.
 */
export function OperationalOverlays() {
  return (
    <>
      <InviteEditMemberDrawer />
      <NumberAccessDrawer />
      <AvailabilityDrawer />
      <TransferOverlay />
      <ExitWizard />
      <PerformanceDetailDrawer />
      <AuditEventDrawer />
      <AuditExportModal />
    </>
  );
}
