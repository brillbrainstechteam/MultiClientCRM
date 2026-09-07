import { PageHeader } from '@crm/components';
import { Badge, EmptyState } from '@crm/design-system';
import type { TeamAccessScreen } from './team-access-manifest';

/**
 * Batch-0 holding screen for a Team & Access route not yet implemented by the
 * current batch. Replaced route-by-route as each batch lands (contacts-manifest
 * precedent) — never the final screen.
 */
export function TeamAccessScreenPlaceholder({ screen }: { screen: TeamAccessScreen }) {
  return (
    <div className="crm-team-screen">
      <PageHeader
        title={screen.title}
        description={screen.purpose}
        breadcrumbs={[{ label: 'Team & Access', to: '/team-access' }, { label: screen.title }]}
        actions={
          <div className="crm-team-screen__ids">
            <Badge tone="brand" appearance="outline">
              {screen.id}
            </Badge>
            <Badge tone="warning">Arrives in Batch {screen.batch}</Badge>
          </div>
        }
      />
      <EmptyState
        title="Screen content arrives in a later batch"
        description="Foundation (domain model, fixtures, resolvers and routing) is in place; this screen's real content is built in its own batch."
      />
    </div>
  );
}
