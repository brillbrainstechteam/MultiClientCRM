import { PageHeader } from '@crm/components';
import { Badge } from '@crm/design-system';

/** Batch-not-yet-built holding screen for a Templates route. */
export function TemplatesScreenPlaceholder({
  title,
  purpose,
  batch,
}: {
  title: string;
  purpose: string;
  batch: number | 'deferred';
}) {
  return (
    <div className="crm-templates-screen">
      <PageHeader
        title={title}
        description={purpose}
        breadcrumbs={[{ label: 'Templates', to: '/templates' }, { label: title }]}
        actions={
          <Badge tone={batch === 'deferred' ? 'neutral' : 'warning'}>
            {batch === 'deferred' ? 'Deferred (Phase 2/3)' : `Arrives in Batch ${batch}`}
          </Badge>
        }
      />
    </div>
  );
}
