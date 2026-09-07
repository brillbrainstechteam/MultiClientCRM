import { Info } from 'lucide-react';
import {
  ConsentBadge,
  ContactIdentity,
  DuplicateComparisonRow,
  ImportRow,
  SalesTierBadge,
  SegmentConditionRow,
  SourceBadge,
  StageBadge,
  TimelineItem,
} from './components';
import type {
  ActivityItem,
  Contact,
  DuplicateCluster,
  ImportJob,
  Segment,
} from '@crm/mock-data';
import { findContact } from '@crm/mock-data';
import type { ContactSurface } from './contacts-manifest';

interface PlaceholderCompositionProps {
  contact?: Contact;
  segment?: Segment;
  job?: ImportJob;
  cluster?: DuplicateCluster;
  timeline: ActivityItem[];
  surface: ContactSurface;
}

/**
 * Renders whichever Contacts primitive is relevant to the resolved record. This
 * is purely a Batch 0 proof-of-composition; Batch 1+ replaces it with the real
 * screen bodies.
 */
export function PlaceholderComposition({
  contact,
  segment,
  job,
  cluster,
  timeline,
  surface,
}: PlaceholderCompositionProps) {
  if (contact) {
    return (
      <div className="crm-contacts-screen__preview">
        <div className="crm-contacts-screen__identity">
          <ContactIdentity contact={contact} variant="header" />
          <div className="crm-contacts-screen__chips">
            <StageBadge stage={contact.stage} />
            <ConsentBadge consent={contact.consent} />
            <SalesTierBadge tier={contact.salesTier} />
            <SourceBadge source={contact.source} />
          </div>
        </div>
        {timeline.length > 0 ? (
          <section className="crm-contacts-screen__section">
            <h2 className="crm-contacts-screen__section-title">Activity timeline</h2>
            <ul className="crm-contacts-screen__timeline">
              {timeline.map((item, index) => (
                <TimelineItem key={item.id} item={item} isLast={index === timeline.length - 1} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  if (segment) {
    return (
      <div className="crm-contacts-screen__preview">
        <div className="crm-contacts-screen__chips">
          <StageBadge stage="qualified" />
          <span className="crm-contacts-screen__count">{segment.count} matching contacts</span>
        </div>
        <section className="crm-contacts-screen__section">
          <h2 className="crm-contacts-screen__section-title">Condition groups ({segment.type})</h2>
          <div className="crm-contacts-screen__groups">
            {segment.conditionGroups?.map((group, groupIndex) => (
              <div key={group.id} className="crm-contacts-screen__group">
                {groupIndex > 0 ? (
                  <span className="crm-contacts-screen__group-joiner">
                    {(segment.groupJoiner ?? 'and').toUpperCase()}
                  </span>
                ) : null}
                {group.conditions.map((condition, conditionIndex) => (
                  <SegmentConditionRow
                    key={condition.id}
                    condition={condition}
                    joiner={conditionIndex === 0 ? undefined : group.joiner}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (job) {
    return (
      <div className="crm-contacts-screen__preview">
        <ImportRow job={job} />
      </div>
    );
  }

  if (cluster) {
    const [a, b] = cluster.contactIds.map((id) => findContact(id));
    return (
      <div className="crm-contacts-screen__preview">
        <div className="crm-contacts-screen__chips">
          <span className="crm-contacts-screen__count">Match: {cluster.matchReason}</span>
        </div>
        {a && b ? (
          <section className="crm-contacts-screen__section">
            <div className="crm-contacts-screen__dupe-heads">
              <ContactIdentity contact={a} />
              <ContactIdentity contact={b} />
            </div>
            <DuplicateComparisonRow field="Owner" values={[a.ownerId, b.ownerId]} winnerIndex={null} conflict />
            <DuplicateComparisonRow field="City" values={[a.city, b.city]} winnerIndex={0} />
            <DuplicateComparisonRow
              field="Company"
              values={[a.company ?? '', b.company ?? '']}
              winnerIndex={null}
              conflict
            />
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="crm-contacts-screen__note">
      <Info aria-hidden="true" />
      <p>
        This {surface} route is registered and renders inside the CRM shell. Its content is built in
        a later batch.
      </p>
    </div>
  );
}
