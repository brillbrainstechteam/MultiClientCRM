import { Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Drawer } from '@crm/design-system';
import { aiInsights } from '@crm/mock-data';

/** DASH-S12 — AI Management Summary: every insight, each opening DASH-S13. */
export function AiSummaryDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get('drawer') === 'ai-summary';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      return next;
    });

  const openInsight = (insightId: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'ai-insight');
      next.set('insightId', insightId);
      return next;
    });

  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={close}
      title="AI business summary"
      subtitle="What changed, what needs attention, and recommended next actions"
    >
      <ul className="crm-ai-summary__list">
        {aiInsights.map((insight) => (
          <li key={insight.id}>
            <button type="button" className="crm-ai-summary__row" onClick={() => openInsight(insight.id)}>
              <span className="crm-ai-summary__head">
                <span className="crm-ai-summary__title">
                  <Sparkles className="crm-ai-summary__row-icon" aria-hidden="true" />
                  {insight.title}
                </span>
                <Badge tone="brand" appearance="outline">
                  {insight.confidence} confidence
                </Badge>
              </span>
              <span className="crm-ai-summary__statement">{insight.changeStatement}</span>
              <span className="crm-ai-summary__statement">Recommendation: {insight.recommendation}</span>
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
