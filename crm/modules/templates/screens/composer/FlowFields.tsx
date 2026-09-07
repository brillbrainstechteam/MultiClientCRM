import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button, Textarea } from '@crm/design-system';
import type { FormatAvailability } from '../../domain/capabilityResolver';
import type { TemplateComponents } from '../../domain/types';

const mockFlows = [
  { id: 'flow_csat_v2', name: 'CSAT Survey v2' },
  { id: 'flow_lead_capture', name: 'Lead Capture' },
  { id: 'flow_appointment_booking', name: 'Appointment Booking' },
];

/** TPL-S05F — Flow Composer: select an existing Flow, no embedded builder. */
export function FlowFields({
  components,
  setComponents,
  capability,
}: {
  components: TemplateComponents;
  setComponents: (updater: (c: TemplateComponents) => TemplateComponents) => void;
  capability: FormatAvailability;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const flow = components.flow ?? { connected: false };

  if (!capability.available) {
    return (
      <div className="crm-composer-fields">
        <div className="crm-composer-fields__dependency">
          <p>{capability.reason}</p>
          {capability.ctaLabel && capability.ctaTo ? (
            <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref(capability.ctaTo as string, { returnTo: '/templates/new' }))}>
              {capability.ctaLabel}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="crm-composer-fields">
      <section id="composer-section-body" className="crm-composer-fields__section">
        <h3>Body</h3>
        <Textarea
          label="Body"
          hideLabel
          rows={3}
          value={components.body}
          onChange={(e) => setComponents((c) => ({ ...c, body: e.target.value }))}
          placeholder="Hi {{1}}, tell us how we did…"
        />
      </section>

      <section id="composer-section-flow" className="crm-composer-fields__section">
        <div className="crm-composer-fields__section-head">
          <h3>Flow</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref('/automation', { returnTo: '/templates/new' }))}>
            Manage Flows
          </Button>
        </div>
        {mockFlows.map((option) => (
          <button
            key={option.id}
            type="button"
            className="crm-composer-fields__card"
            style={{ cursor: 'pointer', textAlign: 'left', borderColor: flow.flowId === option.id ? 'var(--crm-brand-600)' : undefined }}
            onClick={() =>
              setComponents((c) => ({
                ...c,
                flow: { connected: true, flowId: option.id, flowName: option.name },
                buttons: c.buttons.length ? c.buttons : [{ id: `btn_${Date.now()}`, type: 'flow', label: 'Start' }],
              }))
            }
          >
            <strong>{option.name}</strong>
            {flow.flowId === option.id ? <span>Selected</span> : null}
          </button>
        ))}
      </section>
    </div>
  );
}
