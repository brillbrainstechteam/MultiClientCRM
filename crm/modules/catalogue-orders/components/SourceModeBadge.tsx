import { Link2, Sheet, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from '@crm/design-system';
import type { SourceMode } from '../domain/types';
import { sourceModeLabel } from '../catalogue-orders-labels';

const icon: Record<SourceMode, ReactNode> = {
  integrated: <Link2 size={12} />,
  uploaded: <Sheet size={12} />,
  'crm-managed': <Wrench size={12} />,
};

const tone: Record<SourceMode, BadgeTone> = {
  integrated: 'brand',
  uploaded: 'info',
  'crm-managed': 'neutral',
};

/** Requirement §D — every catalogue/item shows its source mode at a glance. */
export function SourceModeBadge({ mode }: { mode: SourceMode }) {
  return (
    <Badge tone={tone[mode]} icon={icon[mode]}>
      {sourceModeLabel[mode]}
    </Badge>
  );
}
