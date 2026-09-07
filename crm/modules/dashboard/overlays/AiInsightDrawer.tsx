import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Drawer } from '@crm/design-system';
import { aiInsights } from '@crm/mock-data';

/**
 * DASH-S13 — AI Insight Detail. Always exposes evidence and a route to
 * underlying records — AI is a navigation layer, never the source of truth
 * (DASHBOARD_GENERATION_SPEC.md §8).
 */
export function AiInsightDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const open = searchParams.get('drawer') === 'ai-insight';
  const insightId = searchParams.get('insightId');
  const insight = insightId ? aiInsights.find((item) => item.id === insightId) : undefined;

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'insightId']) next.delete(key);
      return next;
    });

  if (!open || !insight) return null;

  return (
    <Drawer
      open={open}
      onClose={close}
      title={insight.title}
      subtitle={insight.affectedArea}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
          <Button variant="primary" onClick={() => navigate(scopedHref(insight.actionTo))}>
            {insight.actionLabel}
          </Button>
        </>
      }
    >
      <div className="crm-ai-insight-detail">
        <Badge tone="brand" appearance="outline">
          {insight.confidence} confidence
        </Badge>

        <section>
          <h3 className="crm-ai-insight-detail__section-title">What changed</h3>
          <p>{insight.changeStatement}</p>
        </section>

        <section>
          <h3 className="crm-ai-insight-detail__section-title">Possible drivers</h3>
          <ul className="crm-ai-insight-detail__list">
            {insight.possibleDrivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="crm-ai-insight-detail__section-title">Evidence</h3>
          <dl className="crm-ai-insight-detail__evidence">
            {insight.evidence.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="crm-ai-insight-detail__section-title">Recommendation</h3>
          <p>{insight.recommendation}</p>
        </section>
      </div>
    </Drawer>
  );
}
