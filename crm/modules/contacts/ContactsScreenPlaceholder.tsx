import { useParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { Badge } from '@crm/design-system';
import {
  activityForContact,
  findContact,
  findDuplicateCluster,
  findImportJob,
  findSegment,
} from '@crm/mock-data';
import { PlaceholderComposition } from './PlaceholderComposition';
import type { ContactScreen } from './contacts-manifest';

/**
 * Batch 0 holding screen for a Contacts route. It renders the standard header,
 * states which batch fills in the real content, and — where the route carries a
 * record id — composes the Contacts-specific primitives with real mock data to
 * prove later screens can be built from them. It is NOT the final screen.
 */
export function ContactsScreenPlaceholder({ screen }: { screen: ContactScreen }) {
  const params = useParams();

  const contact = params.contactId ? findContact(params.contactId) : undefined;
  const segment = params.segmentId ? findSegment(params.segmentId) : undefined;
  const job = params.jobId ? findImportJob(params.jobId) : undefined;
  const cluster = params.clusterId ? findDuplicateCluster(params.clusterId) : undefined;

  const title =
    contact?.name ??
    segment?.name ??
    (job ? `Import · ${job.fileName ?? job.method}` : undefined) ??
    (cluster ? `Duplicate cluster · ${cluster.id}` : undefined) ??
    screen.title;

  return (
    <div className="crm-contacts-screen">
      <PageHeader
        title={title}
        description={screen.purpose}
        breadcrumbs={[
          { label: 'Contacts', to: '/contacts' },
          { label: screen.title },
        ]}
        actions={
          <div className="crm-contacts-screen__ids">
            <Badge tone="brand" appearance="outline">
              {screen.id}
            </Badge>
            <Badge tone={screen.batch === 0 ? 'success' : 'warning'}>
              {screen.batch === 0 ? 'Foundation' : `Arrives in Batch ${screen.batch}`}
            </Badge>
          </div>
        }
      />

      <PlaceholderComposition
        contact={contact}
        segment={segment}
        job={job}
        cluster={cluster}
        timeline={contact ? activityForContact(contact.id) : []}
        surface={screen.surface}
      />
    </div>
  );
}
