import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button } from '@crm/design-system';
import { nodeLabel } from '../automation-labels';
import type { FlowNode, StarterCategory } from '../domain/types';
import { createFlowFromStarter, starterTemplates, type StarterFlowTemplate } from '../data';

const categoryOptions: { value: StarterCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All starters' },
  { value: 'lead-capture', label: 'Lead Capture' },
  { value: 'catalogue-quotation', label: 'Catalogue / Quotation' },
  { value: 'appointment-registration', label: 'Appointment / Event' },
  { value: 'order-payment', label: 'Order & Payment' },
  { value: 'dispatch-delivery', label: 'Dispatch / Delivery' },
  { value: 'feedback-escalation', label: 'Feedback / Escalation' },
  { value: 'minimal', label: 'Minimal' },
];

function previewSteps(template: StarterFlowTemplate): string[] {
  const byId = new Map<string, FlowNode>(template.nodes.map((n) => [n.id, n]));
  const steps: string[] = [];
  let current: FlowNode | undefined = byId.get(template.startNodeId);
  let guard = 0;
  while (current && guard < 5) {
    steps.push(nodeLabel[current.type]);
    guard += 1;
    if (current.type === 'simple_branch') {
      const nextId = current.config.branches[0]?.next ?? current.config.fallback.next;
      current = nextId ? byId.get(nextId) : undefined;
    } else if ('next' in current && current.next) {
      current = byId.get(current.next);
    } else {
      current = undefined;
    }
  }
  return steps;
}

/**
 * AUT-S02 — Starter Flow Gallery. New Flow always opens here first — never a
 * blank canvas (AUTOMATION_GENERATION_SPEC.md §4).
 */
export default function StarterGalleryScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { currentUser } = useWorkspace();

  const category = (searchParams.get('category') as StarterCategory | null) ?? 'all';
  const templates = category === 'all' ? starterTemplates : starterTemplates.filter((t) => t.category === category);

  const setCategory = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'all') next.delete('category');
      else next.set('category', value);
      return next;
    });
  };

  const useTemplate = (templateId: string) => {
    const flow = createFlowFromStarter(templateId, currentUser.id);
    navigate(scopedHref(`/automation/${flow.id}`));
  };

  return (
    <div className="crm-aut-gallery">
      <PageHeader
        title="Start a new flow"
        description="Choose a proven starting point — every starter is fully editable once cloned into your workspace."
        breadcrumbs={[{ label: 'Automation', to: '/automation' }, { label: 'New Flow' }]}
        actions={
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/automation'))}>
            Back to Library
          </Button>
        }
      />

      <div className="crm-aut-gallery__filters" role="group" aria-label="Starter category">
        {categoryOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`crm-aut-gallery__filter-pill${category === option.value ? ' is-active' : ''}`}
            aria-pressed={category === option.value}
            onClick={() => setCategory(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="crm-aut-gallery__grid">
        {templates.map((template) => (
          <article key={template.id} className="crm-aut-gallery__card">
            <div className="crm-aut-gallery__card-head">
              <h3 className="crm-aut-gallery__card-title">{template.title}</h3>
              {template.category === 'minimal' ? <Badge tone="info">Expert option</Badge> : null}
            </div>
            <p className="crm-aut-gallery__card-goal">{template.businessGoal}</p>
            <p className="crm-aut-gallery__card-desc">{template.description}</p>

            <div className="crm-aut-gallery__preview">
              {previewSteps(template).map((step, index, arr) => (
                <span key={`${template.id}-${index}`} className="crm-aut-gallery__preview-step">
                  {step}
                  {index < arr.length - 1 ? <ArrowRight aria-hidden="true" className="crm-aut-gallery__preview-arrow" /> : null}
                </span>
              ))}
            </div>

            {template.capabilitiesNeeded.length > 0 ? (
              <div className="crm-aut-gallery__capabilities">
                {template.capabilitiesNeeded.map((cap) => (
                  <Badge key={cap} tone="neutral" appearance="outline">
                    {cap}
                  </Badge>
                ))}
              </div>
            ) : null}

            <Button variant="primary" fullWidth onClick={() => useTemplate(template.id)}>
              Use This Flow
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
