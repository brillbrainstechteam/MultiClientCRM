import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Drawer, Toast } from '@crm/design-system';
import { findTemplate } from '../data/mockTemplates';

/**
 * TPL-S09 — Rejection & Resolution. Opened from Template Detail / Repository
 * as `?drawer=rejection&templateId=…` (mounted once in TemplatesLayout so it
 * reads its target from query state, not a nested route param).
 */
export function RejectionDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [appealed, setAppealed] = useState(false);

  const open = searchParams.get('drawer') === 'rejection';
  const templateId = searchParams.get('templateId');
  const template = templateId ? findTemplate(templateId) : undefined;

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.delete('templateId');
      return next;
    });

  if (!open || !template) return null;

  const latestRejection = [...template.submissionHistory].reverse().find((s) => s.status === 'rejected');

  return (
    <>
      <Drawer
        open
        title="Rejection & Resolution"
        subtitle={template.name}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Close</Button>
            <Button
              variant="secondary"
              onClick={() => {
                close();
                navigate(scopedHref('/templates/new', { source: 'clone', cloneFrom: template.id, step: 'basics' }));
              }}
            >
              Clone & Fix
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                close();
                navigate(scopedHref('/templates/new', { source: 'edit', templateId: template.id, step: 'compose', format: template.format }));
              }}
            >
              Fix Template
            </Button>
          </>
        }
      >
        {latestRejection ? (
          <div className="crm-tpl-rejection">
            <div className="crm-tpl-rejection__reason">
              <Badge tone="danger">{latestRejection.rejectionReason ?? 'Rejected'}</Badge>
            </div>
            {latestRejection.rejectionExplanation ? (
              <div className="crm-tpl-rejection__block">
                <h3>What happened</h3>
                <p>{latestRejection.rejectionExplanation}</p>
              </div>
            ) : null}
            {latestRejection.recommendedCorrection ? (
              <div className="crm-tpl-rejection__block">
                <h3>Recommended correction</h3>
                <p>{latestRejection.recommendedCorrection}</p>
              </div>
            ) : null}

            <div className="crm-tpl-rejection__block">
              <h3>Submission history</h3>
              <ul className="crm-tpl-rejection__history">
                {template.submissionHistory.map((submission, index) => (
                  <li key={index}>
                    <span>{new Date(submission.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{submission.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="crm-tpl-rejection__actions">
              {latestRejection.appealSupported && template.metaStatus !== 'in_appeal' ? (
                <Button variant="secondary" onClick={() => setAppealed(true)}>Appeal decision</Button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="crm-tpl-rejection__none">No rejection is currently recorded for this template.</p>
        )}
      </Drawer>
      {appealed ? (
        <Toast tone="info" message="Appeal submitted — this template moves to In Appeal while Meta re-reviews it." onDismiss={() => setAppealed(false)} />
      ) : null}
    </>
  );
}
