import { Badge } from '@crm/design-system';
import { testedLabel, testedTone } from '../automation-labels';

/**
 * Trust-signal badge — always derived from `testedAt`/`changedSinceTest`,
 * never manually toggled (CODE_FIRST_ADAPTER.md §6).
 */
export function TestedBadge({ testedAt, changedSinceTest }: { testedAt: string | null; changedSinceTest: boolean }) {
  return <Badge tone={testedTone(testedAt, changedSinceTest)}>{testedLabel(testedAt, changedSinceTest)}</Badge>;
}
