import { Activity, ArrowLeft, History, PlayCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Input } from '@crm/design-system';
import { AutomationStatusBadge, TestedBadge } from '../components';
import type { AutomationFlow, ValidationIssue } from '../domain/types';

export function BuilderTopBar({
  flow,
  issues,
  canEdit,
  canPublish,
  canTest,
  canViewAudit,
  activePanel,
  onRename,
  onSetPanel,
  onOpenPublish,
}: {
  flow: AutomationFlow;
  issues: ValidationIssue[];
  canEdit: boolean;
  canPublish: boolean;
  canTest: boolean;
  canViewAudit: boolean;
  activePanel: string | null;
  onRename: (name: string) => void;
  onSetPanel: (panel: 'validation' | 'test' | 'versions' | 'activity' | null) => void;
  onOpenPublish: () => void;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="crm-aut-topbar">
      <div className="crm-aut-topbar__left">
        <Button variant="ghost" size="sm" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/automation'))}>
          Library
        </Button>
        <Input
          label="Flow name"
          hideLabel
          className="crm-aut-topbar__name"
          value={flow.name}
          disabled={!canEdit}
          onChange={(e) => onRename(e.target.value)}
        />
        <AutomationStatusBadge status={flow.status} />
        <TestedBadge testedAt={flow.testedAt} changedSinceTest={flow.changedSinceTest} />
        {flow.requiresApproval ? <Badge tone="info">Approval: {flow.approvalStage ?? 'pending'}</Badge> : null}
      </div>

      <div className="crm-aut-topbar__right">
        <Button
          variant={activePanel === 'validation' ? 'secondary' : 'ghost'}
          size="sm"
          iconLeft={<ShieldCheck />}
          onClick={() => onSetPanel(activePanel === 'validation' ? null : 'validation')}
        >
          Validate{errorCount + warningCount > 0 ? ` (${errorCount + warningCount})` : ''}
        </Button>
        <Button
          variant={activePanel === 'test' ? 'secondary' : 'ghost'}
          size="sm"
          iconLeft={<PlayCircle />}
          onClick={() => onSetPanel(activePanel === 'test' ? null : 'test')}
          disabled={!canTest}
          title={canTest ? undefined : 'Your role cannot test flows.'}
        >
          Test
        </Button>
        <Button variant={activePanel === 'versions' ? 'secondary' : 'ghost'} size="sm" iconLeft={<History />} onClick={() => onSetPanel(activePanel === 'versions' ? null : 'versions')}>
          Versions
        </Button>
        <Button
          variant={activePanel === 'activity' ? 'secondary' : 'ghost'}
          size="sm"
          iconLeft={<Activity />}
          onClick={() => onSetPanel(activePanel === 'activity' ? null : 'activity')}
          disabled={!canViewAudit}
          title={canViewAudit ? undefined : 'Your role cannot view flow activity.'}
        >
          Activity
        </Button>
        <Button variant="primary" size="sm" onClick={onOpenPublish} disabled={!canPublish} title={canPublish ? undefined : 'Your role cannot publish flows.'}>
          {flow.status === 'live' ? 'Update Live Flow' : 'Go Live'}
        </Button>
      </div>
    </div>
  );
}
