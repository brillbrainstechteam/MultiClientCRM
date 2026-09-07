import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, WidgetShell } from '@crm/design-system';
import type { AiInsightItem } from '@crm/mock-data';

export interface AiSummaryWidgetProps {
  insights: AiInsightItem[];
}

/**
 * DASH-S01 §7 row 11 — AI business summary. Every insight always exposes
 * evidence and a route to the underlying records (§8 DASH-S12/S13 rule);
 * this widget only teases the change statement, the drawer shows evidence.
 */
export function AiSummaryWidget({ insights }: AiSummaryWidgetProps) {
  const scopedHref = useScopedHref();

  return (
    <WidgetShell
      title="AI business summary"
      icon={<Sparkles />}
      footerTo={scopedHref('/dashboard', { drawer: 'ai-summary' })}
      footerLabel="Open full summary"
      state={insights.length === 0 ? 'empty' : undefined}
      stateTitle="No notable changes to report"
    >
      <ul className="crm-ai-summary__list">
        {insights.slice(0, 3).map((insight) => (
          <li key={insight.id}>
            <Link
              to={scopedHref('/dashboard', { drawer: 'ai-insight', insightId: insight.id })}
              className="crm-ai-summary__row"
            >
              <span className="crm-ai-summary__head">
                <span className="crm-ai-summary__title">{insight.title}</span>
                <Badge tone="brand" appearance="outline">
                  {insight.confidence} confidence
                </Badge>
              </span>
              <span className="crm-ai-summary__statement">{insight.changeStatement}</span>
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
