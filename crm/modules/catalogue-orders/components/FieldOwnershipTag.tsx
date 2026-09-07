import { Lock, Pencil } from 'lucide-react';
import { Badge } from '@crm/design-system';
import type { FieldOwnership } from '../domain/types';

/**
 * Requirement §D4 — every field-level source-ownership indicator in the
 * module renders through this one component so "CRM-owned/editable",
 * "external-owned/read-only" and "stale" read identically everywhere.
 */
export function FieldOwnershipTag({ ownership }: { ownership: FieldOwnership | undefined }) {
  if (!ownership) return null;
  if (ownership.stale) {
    return (
      <Badge tone="warning" appearance="outline" icon={<Lock size={12} />}>
        Source — stale
      </Badge>
    );
  }
  if (ownership.owner === 'crm') {
    return (
      <Badge tone="brand" appearance="outline" icon={<Pencil size={12} />}>
        CRM-owned
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" appearance="outline" icon={<Lock size={12} />}>
      {ownership.connectorWriteable ? 'Source-owned — writeable' : 'Source-owned — read only'}
    </Badge>
  );
}
