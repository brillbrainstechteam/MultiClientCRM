import { AlertTriangle, CheckCircle2, CircleDashed } from 'lucide-react';
import { Badge } from '@crm/design-system';
import { lifecycleLabel, lifecycleTone } from '../ai-agents-labels';
import type { AgentLifecycleStatus } from '../domain/types';

export function LifecycleBadge({ status }: { status: AgentLifecycleStatus }) {
  return <Badge tone={lifecycleTone[status]}>{lifecycleLabel[status]}</Badge>;
}

/** Tested / Changed since test / Not yet tested — spec keeps this separate from lifecycle status. */
export function TestStateBadge({ testedAt, changedSinceTest }: { testedAt: string | null; changedSinceTest: boolean }) {
  if (changedSinceTest) return <Badge tone="warning" icon={<AlertTriangle />}>Changed since test</Badge>;
  if (testedAt) return <Badge tone="success" icon={<CheckCircle2 />}>Tested</Badge>;
  return <Badge tone="neutral" icon={<CircleDashed />}>Not yet tested</Badge>;
}

export function ReadinessPip({ ready, label }: { ready: boolean; label: string }) {
  return (
    <Badge tone={ready ? 'success' : 'neutral'} appearance="outline">
      {label}
    </Badge>
  );
}
