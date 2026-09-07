import type { BadgeTone } from '@crm/design-system';
import { StatusBadge } from '@crm/design-system';
import { isActive, type Template } from '../domain/types';
import { crmStateLabel, metaStatusLabel } from '../templates-labels';

const metaStatusTone: Record<Template['metaStatus'], BadgeTone> = {
  approved: 'success',
  pending: 'info',
  rejected: 'danger',
  in_appeal: 'warning',
  disabled: 'neutral',
  paused: 'neutral',
  unknown: 'neutral',
};

/**
 * Repository/detail lifecycle badge. Shows the CRM state first when it takes
 * priority (draft/archived/deleted are CRM-side, independent of Meta status);
 * otherwise shows Meta status. "Active" is a derived label, never a stored value.
 */
export function TemplateStatusBadge({ template }: { template: Template }) {
  if (template.crmState === 'deleted') {
    return <StatusBadge tone="danger">Deleted</StatusBadge>;
  }
  if (template.crmState === 'archived') {
    return <StatusBadge tone="neutral">Archived</StatusBadge>;
  }
  if (template.crmState === 'draft') {
    return <StatusBadge tone="neutral">Draft</StatusBadge>;
  }
  if (isActive(template)) {
    return <StatusBadge tone="success">Active</StatusBadge>;
  }
  return <StatusBadge tone={metaStatusTone[template.metaStatus]}>{metaStatusLabel[template.metaStatus]}</StatusBadge>;
}

export function CrmStateBadge({ state }: { state: Template['crmState'] }) {
  const tone: BadgeTone = state === 'draft' ? 'neutral' : state === 'archived' ? 'neutral' : state === 'deleted' ? 'danger' : 'brand';
  return <StatusBadge tone={tone}>{crmStateLabel[state]}</StatusBadge>;
}
