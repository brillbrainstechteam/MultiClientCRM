import type { ConditionOperator, SegmentCondition } from '@crm/mock-data';

/** Field label overrides so raw keys never surface in the builder UI. */
const fieldLabel: Record<string, string> = {
  salesTier: 'Sales tier',
  branchId: 'Branch',
  consent: 'Consent',
  stage: 'Lifecycle stage',
  tag: 'Tag',
  lastActivityAt: 'Last activity',
  source: 'Source',
  city: 'City',
};

const operatorLabel: Record<ConditionOperator, string> = {
  is: 'is',
  'is-not': 'is not',
  contains: 'contains',
  'does-not-contain': 'does not contain',
  'starts-with': 'starts with',
  'is-empty': 'is empty',
  'has-any-value': 'has any value',
  'greater-than': 'greater than',
  'less-than': 'less than',
  'in-last-days': 'in the last (days)',
};

export interface SegmentConditionRowProps {
  condition: SegmentCondition;
  /** `and`/`or` shown before all but the first condition in a group. */
  joiner?: 'and' | 'or';
  /** Read-only display (detail view) vs editable affordance (builder). */
  readOnly?: boolean;
}

/**
 * One field/operator/value line of a segment definition (CON-S05 read-only,
 * CON-S06 builder). Batch 0 ships the presentation; interactive editing is
 * wired in Batch 2.
 */
export function SegmentConditionRow({
  condition,
  joiner,
  readOnly = true,
}: SegmentConditionRowProps) {
  const valuelessOperator =
    condition.operator === 'is-empty' || condition.operator === 'has-any-value';

  return (
    <div className="crm-condition-row" data-readonly={readOnly}>
      {joiner ? <span className={`crm-condition-row__joiner crm-condition-row__joiner--${joiner}`}>{joiner.toUpperCase()}</span> : <span className="crm-condition-row__joiner-spacer" />}
      <span className="crm-condition-row__field">{fieldLabel[condition.field] ?? condition.field}</span>
      <span className="crm-condition-row__operator">{operatorLabel[condition.operator]}</span>
      {!valuelessOperator ? (
        <span className="crm-condition-row__value">{condition.value}</span>
      ) : null}
    </div>
  );
}
