import { MessageCircle, Phone } from 'lucide-react';
import { Badge, StatusBadge } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import {
  connectionStatusLabel,
  connectionStatusTone,
  dispositionLabel,
  dispositionTone,
  listStatusLabel,
  listStatusTone,
  taskStatusLabel,
  taskStatusTone,
} from '../calling-labels';
import type {
  BusinessDisposition,
  CallChannel,
  CallListStatus,
  CallTaskStatus,
  ConnectionStatus,
  QueuePriority,
} from '../domain';

const priorityGroupTone: Record<QueuePriority['group'], BadgeTone> = {
  1: 'danger',
  2: 'warning',
  3: 'gold',
  4: 'info',
  5: 'neutral',
};

/** Transparent priority reason — never a bare score (SKILL.md "Queue priority"). */
export function PriorityBadge({ priority }: { priority: QueuePriority }) {
  return <Badge tone={priorityGroupTone[priority.group]}>{priority.label}</Badge>;
}

export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  return <StatusBadge tone={connectionStatusTone[status]}>{connectionStatusLabel[status]}</StatusBadge>;
}

export function DispositionBadge({ disposition }: { disposition: BusinessDisposition }) {
  return <Badge tone={dispositionTone[disposition]}>{dispositionLabel[disposition]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: CallTaskStatus }) {
  return <StatusBadge tone={taskStatusTone[status]}>{taskStatusLabel[status]}</StatusBadge>;
}

export function ListStatusBadge({ status }: { status: CallListStatus }) {
  return <StatusBadge tone={listStatusTone[status]}>{listStatusLabel[status]}</StatusBadge>;
}

/** WhatsApp call vs general/tele call (§ call-type bifurcation). */
export function CallChannelBadge({ channel }: { channel: CallChannel }) {
  return channel === 'whatsapp' ? (
    <Badge tone="success">
      <MessageCircle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
      WhatsApp call
    </Badge>
  ) : (
    <Badge tone="info">
      <Phone size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
      Phone call
    </Badge>
  );
}
