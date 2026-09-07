import { CircleCheck, CircleDashed, MinusCircle, TriangleAlert } from 'lucide-react';
import { Badge, Button } from '@crm/design-system';
import type { ReadinessDimension, ReadinessIssue, ReadinessState } from '@crm/mock-data';
import { useNavigate } from 'react-router-dom';

export interface ReadinessDimensionRowProps {
  dimension: ReadinessDimension;
  label: string;
  description: string;
  state: ReadinessState;
  issue?: ReadinessIssue;
}

const stateMeta: Record<ReadinessState, { icon: typeof CircleCheck; tone: 'success' | 'warning' | 'neutral'; label: string }> = {
  ready: { icon: CircleCheck, tone: 'success', label: 'Ready' },
  needs_attention: { icon: TriangleAlert, tone: 'warning', label: 'Needs attention' },
  optional: { icon: MinusCircle, tone: 'neutral', label: 'Optional' },
  not_applicable: { icon: CircleDashed, tone: 'neutral', label: 'Not yet applicable' },
};

/** One row of the C19 Readiness & Go Live dimension list — never one binary "Ready". */
export function ReadinessDimensionRow({ dimension, label, description, state, issue }: ReadinessDimensionRowProps) {
  const navigate = useNavigate();
  const meta = stateMeta[state];
  const Icon = meta.icon;
  void dimension;

  return (
    <div className={`crm-readiness-row crm-readiness-row--${meta.tone}`}>
      <Icon aria-hidden="true" className="crm-readiness-row__icon" />
      <div className="crm-readiness-row__text">
        <div className="crm-readiness-row__head">
          <span className="crm-readiness-row__label">{label}</span>
          <Badge tone={meta.tone === 'neutral' ? 'neutral' : meta.tone}>{meta.label}</Badge>
        </div>
        <p className="crm-readiness-row__description">{issue?.reason ?? description}</p>
      </div>
      {issue ? (
        <Button variant="secondary" size="sm" onClick={() => navigate(issue.fixTo)}>
          {issue.fixLabel}
        </Button>
      ) : null}
    </div>
  );
}
