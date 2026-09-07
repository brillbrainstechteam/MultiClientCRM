import { branches, contacts, type Contact } from '@crm/mock-data';
import type { ConditionOperator, SegmentCondition, SegmentConditionGroup } from '@crm/mock-data';
import { distinctSources } from './contact-selectors';

/**
 * Field + operator metadata and a deterministic evaluator for the Segment
 * Builder (CON-S06). The same evaluator drives the live match count, so the
 * number a user sees always matches what the definition would select.
 */

export type FieldType = 'enum' | 'text' | 'tag' | 'date';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  operators: ConditionOperator[];
  options?: { value: string; label: string }[];
  get: (contact: Contact) => string | string[];
}

const enumOperators: ConditionOperator[] = ['is', 'is-not', 'has-any-value', 'is-empty'];
const textOperators: ConditionOperator[] = [
  'is',
  'is-not',
  'contains',
  'does-not-contain',
  'starts-with',
  'is-empty',
  'has-any-value',
];
const tagOperators: ConditionOperator[] = ['contains', 'does-not-contain', 'is-empty', 'has-any-value'];
const dateOperators: ConditionOperator[] = ['in-last-days'];

export const fieldDefs: FieldDef[] = [
  {
    key: 'stage',
    label: 'Lifecycle stage',
    type: 'enum',
    operators: enumOperators,
    options: [
      { value: 'new', label: 'New' },
      { value: 'engaged', label: 'Engaged' },
      { value: 'qualified', label: 'Qualified' },
      { value: 'customer', label: 'Customer' },
      { value: 'dormant', label: 'Dormant' },
    ],
    get: (c) => c.stage,
  },
  {
    key: 'consent',
    label: 'Consent',
    type: 'enum',
    operators: enumOperators,
    options: [
      { value: 'opted-in', label: 'Opted in' },
      { value: 'opted-out', label: 'Opted out' },
      { value: 'pending', label: 'Consent pending' },
    ],
    get: (c) => c.consent,
  },
  {
    key: 'salesTier',
    label: 'Sales tier',
    type: 'enum',
    operators: enumOperators,
    options: [
      { value: 'platinum', label: 'Platinum' },
      { value: 'gold', label: 'Gold' },
      { value: 'silver', label: 'Silver' },
      { value: 'standard', label: 'Standard' },
    ],
    get: (c) => c.salesTier,
  },
  {
    key: 'source',
    label: 'Source',
    type: 'enum',
    operators: enumOperators,
    options: distinctSources().map((s) => ({ value: s, label: s })),
    get: (c) => c.source,
  },
  {
    key: 'branchId',
    label: 'Branch',
    type: 'enum',
    operators: enumOperators,
    options: branches.map((b) => ({ value: b.id, label: b.name })),
    get: (c) => c.branchId,
  },
  {
    key: 'city',
    label: 'City',
    type: 'text',
    operators: textOperators,
    get: (c) => c.city,
  },
  {
    key: 'tag',
    label: 'Tag',
    type: 'tag',
    operators: tagOperators,
    get: (c) => c.tags,
  },
  {
    key: 'lastActivityAt',
    label: 'Last activity',
    type: 'date',
    operators: dateOperators,
    get: (c) => c.lastActivityAt,
  },
];

export function fieldDef(key: string): FieldDef | undefined {
  return fieldDefs.find((f) => f.key === key);
}

const REFERENCE_NOW = new Date('2026-08-10T00:00:00+05:30').getTime();

function matchesCondition(contact: Contact, condition: SegmentCondition): boolean {
  const def = fieldDef(condition.field);
  if (!def) return true;
  const raw = def.get(contact);
  const value = condition.value.trim();

  if (Array.isArray(raw)) {
    switch (condition.operator) {
      case 'contains':
        return raw.some((v) => v.toLowerCase() === value.toLowerCase());
      case 'does-not-contain':
        return !raw.some((v) => v.toLowerCase() === value.toLowerCase());
      case 'is-empty':
        return raw.length === 0;
      case 'has-any-value':
        return raw.length > 0;
      default:
        return true;
    }
  }

  if (def.type === 'date') {
    if (condition.operator === 'in-last-days') {
      const days = Number(value);
      if (!Number.isFinite(days)) return true;
      const at = new Date(raw).getTime();
      return REFERENCE_NOW - at <= days * 24 * 60 * 60 * 1000;
    }
    return true;
  }

  const field = raw.toLowerCase();
  const needle = value.toLowerCase();
  switch (condition.operator) {
    case 'is':
      return field === needle;
    case 'is-not':
      return field !== needle;
    case 'contains':
      return field.includes(needle);
    case 'does-not-contain':
      return !field.includes(needle);
    case 'starts-with':
      return field.startsWith(needle);
    case 'is-empty':
      return field.length === 0;
    case 'has-any-value':
      return field.length > 0;
    default:
      return true;
  }
}

function matchesGroup(contact: Contact, group: SegmentConditionGroup): boolean {
  const active = group.conditions.filter((c) => c.field);
  if (active.length === 0) return true;
  return group.joiner === 'or'
    ? active.some((c) => matchesCondition(contact, c))
    : active.every((c) => matchesCondition(contact, c));
}

export interface SegmentDefinition {
  groups: SegmentConditionGroup[];
  groupJoiner: 'and' | 'or';
  scope: { branchId?: string | null; whatsappNumberId?: string | null };
}

/** Contacts matching a definition, honouring scope + group logic. */
export function evaluateSegment(def: SegmentDefinition): Contact[] {
  const groups = def.groups.filter((g) => g.conditions.some((c) => c.field));
  return contacts.filter((contact) => {
    if (def.scope.branchId && contact.branchId !== def.scope.branchId) return false;
    if (def.scope.whatsappNumberId && contact.primaryWhatsAppNumberId !== def.scope.whatsappNumberId)
      return false;
    if (groups.length === 0) return true;
    return def.groupJoiner === 'or'
      ? groups.some((g) => matchesGroup(contact, g))
      : groups.every((g) => matchesGroup(contact, g));
  });
}

export const operatorLabels: Record<ConditionOperator, string> = {
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

/** Operators that take no value input. */
export function isValuelessOperator(operator: ConditionOperator): boolean {
  return operator === 'is-empty' || operator === 'has-any-value';
}
