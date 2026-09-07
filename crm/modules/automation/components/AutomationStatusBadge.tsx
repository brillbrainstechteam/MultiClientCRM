import { StatusBadge } from '@crm/design-system';
import type { FlowStatus } from '../domain/types';
import { statusLabel, statusTone } from '../automation-labels';

export function AutomationStatusBadge({ status }: { status: FlowStatus }) {
  return <StatusBadge tone={statusTone[status]}>{statusLabel[status]}</StatusBadge>;
}
