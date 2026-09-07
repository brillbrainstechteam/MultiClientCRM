import { Badge } from '@crm/design-system';

interface PreviewCapability {
  title: string;
  description: string;
}

const phase2Capabilities: PreviewCapability[] = [
  { title: 'Conversation Agent', description: 'Full customer-facing conversational replies, once the safety foundation above is proven out.' },
  { title: 'Lead Qualification runtime', description: 'Automatic scoring and qualification of leads during a live conversation.' },
  { title: 'Sales Assistance', description: 'Real-time objection handling and product recommendations during a live conversation.' },
  { title: 'Support Agent runtime', description: 'Full customer-facing support automation beyond FAQ matching.' },
  { title: 'Calling Assistance', description: 'Call-prep briefs and call summaries sourced from Calling.' },
  { title: 'Content Drafting', description: 'Draft template and campaign copy for human review in Templates.' },
  { title: 'Flow Generation / Review', description: 'Suggest or review Automation flows from observed conversation patterns.' },
];

/**
 * Deferred-capability previews (BATCHES.md Batch 6 — represented as non-functional
 * previews, never part of first-build completion criteria). Deliberately not
 * clickable: this module's job is the trust/control layer, not Phase-2 runtime.
 */
export function Phase2Previews() {
  return (
    <div className="crm-aia__section">
      <div>
        <h3 className="crm-aia__section-title">Coming later</h3>
        <p className="crm-aia__section-hint">
          These build on the safety, knowledge and testing foundation above. Not available to configure yet.
        </p>
      </div>
      <div className="crm-aia__preview-grid">
        {phase2Capabilities.map((capability) => (
          <div key={capability.title} className="crm-aia__preview-card">
            <div className="crm-aia__badge-row">
              <span className="crm-aia__preview-title">{capability.title}</span>
              <Badge tone="neutral" appearance="outline">Coming soon</Badge>
            </div>
            <span>{capability.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
