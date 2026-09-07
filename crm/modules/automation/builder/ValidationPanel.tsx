import { AlertTriangle, CheckCircle2, ExternalLink, OctagonAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button, IconButton } from '@crm/design-system';
import type { ValidationIssue } from '../domain/types';

export function ValidationPanel({
  issues,
  activeIssueId,
  onSelectIssue,
  onClose,
}: {
  issues: ValidationIssue[];
  activeIssueId: string | null;
  onSelectIssue: (issue: ValidationIssue) => void;
  onClose: () => void;
}) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="crm-aut-nodeconfig">
      <header className="crm-aut-nodeconfig__header">
        <div className="crm-aut-nodeconfig__heading">
          <p className="crm-aut-nodeconfig__type">Validation</p>
          <p className="crm-aut-trigger__title">{errors.length} error{errors.length === 1 ? '' : 's'} · {warnings.length} warning{warnings.length === 1 ? '' : 's'}</p>
        </div>
        <IconButton label="Close panel" icon={<X />} size="sm" onClick={onClose} />
      </header>

      <div className="crm-aut-nodeconfig__body">
        {issues.length === 0 ? (
          <div className="crm-aut-validation__clean">
            <CheckCircle2 size={20} />
            <p>No issues found. This flow is ready for Go Live.</p>
          </div>
        ) : (
          <>
            {errors.length > 0 ? (
              <section className="crm-aut-validation__group">
                <h4 className="crm-aut-validation__group-title crm-aut-validation__group-title--error">Errors — block Go Live</h4>
                {errors.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} active={issue.id === activeIssueId} onClick={() => onSelectIssue(issue)} />
                ))}
              </section>
            ) : null}
            {warnings.length > 0 ? (
              <section className="crm-aut-validation__group">
                <h4 className="crm-aut-validation__group-title crm-aut-validation__group-title--warning">Warnings</h4>
                {warnings.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} active={issue.id === activeIssueId} onClick={() => onSelectIssue(issue)} />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function IssueRow({ issue, active, onClick }: { issue: ValidationIssue; active: boolean; onClick: () => void }) {
  const Icon = issue.severity === 'error' ? OctagonAlert : AlertTriangle;
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  return (
    <div className={`crm-aut-validation__issue${active ? ' is-active' : ''}`}>
      <button className="crm-aut-validation__issue-trigger" onClick={onClick}>
        <Icon size={16} className={`crm-aut-validation__issue-icon crm-aut-validation__issue-icon--${issue.severity}`} aria-hidden="true" />
        <span>
          <p className="crm-aut-validation__issue-title">{issue.title}</p>
          <p className="crm-aut-validation__issue-reason">{issue.reason}</p>
          {issue.suggestedFix ? <p className="crm-aut-validation__issue-fix">Fix: {issue.suggestedFix}</p> : null}
        </span>
      </button>
      {issue.conflictFlowId ? (
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ExternalLink size={14} />}
          onClick={() => navigate(scopedHref(`/automation/${issue.conflictFlowId}`))}
        >
          Inspect conflicting flow
        </Button>
      ) : null}
    </div>
  );
}
