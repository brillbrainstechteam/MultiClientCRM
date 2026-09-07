import { ALL_SCOPE, useWorkspace } from '@crm/app/workspace-context';
import { Select, StatusBadge } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import type { WhatsAppConnectionStatus } from '@crm/mock-data';

const connectionTone: Record<WhatsAppConnectionStatus, BadgeTone> = {
  connected: 'success',
  degraded: 'warning',
  disconnected: 'danger',
};

const connectionLabel: Record<WhatsAppConnectionStatus, string> = {
  connected: 'Connected',
  degraded: 'Degraded',
  disconnected: 'Disconnected',
};

/**
 * Branch + WhatsApp-number scope selector shared by every module.
 *
 * Selections are written to the URL (`?branchId=`, `?whatsappNumberId=`) so a
 * scoped screen can be reopened or captured exactly.
 */
export function ScopeBar() {
  const {
    availableBranches,
    availableWhatsAppNumbers,
    branchId,
    whatsappNumber,
    whatsappNumberId,
    setScope,
  } = useWorkspace();

  const branchOptions = [
    { value: ALL_SCOPE, label: 'All branches' },
    ...availableBranches.map((branch) => ({ value: branch.id, label: branch.name })),
  ];

  const numberOptions = [
    { value: ALL_SCOPE, label: 'All numbers' },
    ...availableWhatsAppNumbers.map((number) => ({
      value: number.id,
      label: `${number.displayName} · ${number.displayNumber}`,
    })),
  ];

  return (
    <div className="crm-scopebar">
      <Select
        label="Branch"
        size="sm"
        hideLabel
        options={branchOptions}
        value={branchId}
        onChange={(event) => setScope({ branchId: event.target.value })}
      />

      <Select
        label="WhatsApp number"
        size="sm"
        hideLabel
        options={numberOptions}
        value={whatsappNumberId}
        disabled={availableWhatsAppNumbers.length === 0}
        onChange={(event) => setScope({ whatsappNumberId: event.target.value })}
      />

      {whatsappNumber ? (
        <div className="crm-scopebar__status">
          <StatusBadge tone={connectionTone[whatsappNumber.connectionStatus]}>
            {connectionLabel[whatsappNumber.connectionStatus]}
          </StatusBadge>
          <span className="crm-scopebar__meta">
            Quality {whatsappNumber.qualityRating} · Limit {whatsappNumber.messagingLimit}
          </span>
        </div>
      ) : (
        <span className="crm-scopebar__meta">
          {availableWhatsAppNumbers.length === 0
            ? 'No WhatsApp numbers are in your access scope.'
            : `${availableWhatsAppNumbers.length} numbers in scope`}
        </span>
      )}
    </div>
  );
}
