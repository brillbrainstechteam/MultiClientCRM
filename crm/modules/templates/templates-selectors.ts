import { templates } from './data/mockTemplates';
import { isActive, type CrmTemplateState, type MetaTemplateStatus, type Template } from './domain/types';

/**
 * Pure, deterministic read models over the template fixtures (mirrors
 * Contacts' `contact-selectors.ts` pattern) — screens filter through these
 * instead of inline logic so Repository counts/filters stay consistent.
 */

export type LifecycleView =
  | 'all'
  | 'active'
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'disabled'
  | 'in-appeal'
  | 'archived'
  | 'deleted';

export interface RepositoryScope {
  wabaId?: string | null;
  branchId?: string | null;
}

export interface RepositoryFilters {
  q?: string | null;
  view?: LifecycleView | null;
  category?: string | null;
  useCase?: string | null;
  language?: string | null;
  creatorId?: string | null;
  format?: string | null;
  folder?: string | null;
}

function inScope(template: Template, scope: RepositoryScope): boolean {
  const wabaOk = !scope.wabaId || template.wabaId === scope.wabaId;
  const branchOk = !scope.branchId || template.branchId === scope.branchId;
  return wabaOk && branchOk;
}

const viewPredicates: Record<LifecycleView, (t: Template) => boolean> = {
  all: (t) => t.crmState !== 'deleted',
  active: (t) => isActive(t),
  draft: (t) => t.crmState === 'draft',
  pending: (t) => t.metaStatus === 'pending' && t.crmState === 'normal',
  approved: (t) => t.metaStatus === 'approved' && t.crmState === 'normal',
  rejected: (t) => t.metaStatus === 'rejected' && t.crmState === 'normal',
  disabled: (t) => t.metaStatus === 'disabled' && t.crmState === 'normal',
  'in-appeal': (t) => t.metaStatus === 'in_appeal' && t.crmState === 'normal',
  archived: (t) => t.crmState === 'archived',
  deleted: (t) => t.crmState === 'deleted',
};

export function filterTemplates(scope: RepositoryScope, filters: RepositoryFilters): Template[] {
  const view = filters.view ?? 'all';
  const predicate = viewPredicates[view] ?? viewPredicates.all;
  const q = filters.q?.trim().toLowerCase() ?? '';

  return templates.filter((template) => {
    if (!inScope(template, scope)) return false;
    if (!predicate(template)) return false;
    if (filters.category && template.metaCategory !== filters.category) return false;
    if (filters.useCase && template.useCase !== filters.useCase) return false;
    if (filters.language && template.locale !== filters.language) return false;
    if (filters.creatorId && template.creatorId !== filters.creatorId) return false;
    if (filters.format && template.format !== filters.format) return false;
    if (filters.folder && template.folder !== filters.folder) return false;
    if (q) {
      const haystack = [template.name, template.components.body, template.useCase, template.tags.join(' ')]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export interface LifecycleCounts {
  all: number;
  active: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  disabled: number;
  inAppeal: number;
  archived: number;
  deleted: number;
}

export function lifecycleCounts(scope: RepositoryScope): LifecycleCounts {
  const scoped = templates.filter((template) => inScope(template, scope));
  return {
    all: scoped.filter(viewPredicates.all).length,
    active: scoped.filter(viewPredicates.active).length,
    draft: scoped.filter(viewPredicates.draft).length,
    pending: scoped.filter(viewPredicates.pending).length,
    approved: scoped.filter(viewPredicates.approved).length,
    rejected: scoped.filter(viewPredicates.rejected).length,
    disabled: scoped.filter(viewPredicates.disabled).length,
    inAppeal: scoped.filter(viewPredicates['in-appeal']).length,
    archived: scoped.filter(viewPredicates.archived).length,
    deleted: scoped.filter(viewPredicates.deleted).length,
  };
}

export function distinctLanguages(scope: RepositoryScope): { locale: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const template of templates.filter((t) => inScope(t, scope))) {
    seen.set(template.locale, template.localeLabel);
  }
  return [...seen.entries()].map(([locale, label]) => ({ locale, label })).sort((a, b) => a.label.localeCompare(b.label));
}

export function distinctFolders(scope: RepositoryScope): string[] {
  return [...new Set(templates.filter((t) => inScope(t, scope) && t.folder).map((t) => t.folder as string))].sort();
}

export function approvalQueue(
  scope: RepositoryScope,
  stage: 'awaiting-review' | 'changes-requested' | 'approved-internally' | 'submitted-meta',
): Template[] {
  return templates.filter((template) => inScope(template, scope) && template.internalApproval?.stage === stage);
}

export function metaStatusOf(template: Template): MetaTemplateStatus {
  return template.metaStatus;
}

export function crmStateOf(template: Template): CrmTemplateState {
  return template.crmState;
}
