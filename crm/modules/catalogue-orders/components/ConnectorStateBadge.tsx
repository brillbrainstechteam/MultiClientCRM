import { StatusBadge } from '@crm/design-system';
import type { ConnectorState } from '../domain/types';
import { connectorStateLabel, connectorStateTone } from '../catalogue-orders-labels';

export function ConnectorStateBadge({ state }: { state: ConnectorState }) {
  return <StatusBadge tone={connectorStateTone[state]}>{connectorStateLabel[state]}</StatusBadge>;
}
