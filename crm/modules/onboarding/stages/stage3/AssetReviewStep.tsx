import { useWorkspace } from '@crm/app/workspace-context';
import { Button } from '@crm/design-system';
import { findBranch, findTeam, findUser, type ConnectionStrategy, type OnboardingNumberRecord } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface AssetReviewStepProps {
  record?: OnboardingNumberRecord;
  strategy: ConnectionStrategy;
  onBack: () => void;
  onWrongSelection: () => void;
  onContinue: () => void;
}

const strategyLabel: Record<ConnectionStrategy, string> = {
  coexistence: 'Keep Business App + CRM (Coexistence)',
  migrate_business_app: 'Move Business App number to Platform',
  migrate_provider: 'Migrate existing API / provider number',
  new_number: 'Connect a new number',
};

/** C12 — Review Connected Assets. Technical IDs stay in Advanced Details. */
export function AssetReviewStep({ record, strategy, onBack, onWrongSelection, onContinue }: AssetReviewStepProps) {
  const { workspace } = useWorkspace();
  const branch = record?.branchId ? findBranch(record.branchId) : undefined;
  const team = record?.teamId ? findTeam(record.teamId) : undefined;
  const manager = record?.managerUserId ? findUser(record.managerUserId) : undefined;
  const phone = record?.phone || '+91 9XXXX XXXXX (assigned by Meta)';
  const displayName = record?.displayName ?? `${workspace.name} — new number`;

  return (
    <div>
      <StepHeader
        eyebrow="Stage 3 · Connect with Meta"
        title="Review what Meta connected"
        description="Confirm this is the right business, number and strategy before we continue setting things up."
      />

      <dl className="crm-review-grid">
        <div>
          <dt>Business</dt>
          <dd>{workspace.legalName}</dd>
        </div>
        <div>
          <dt>WhatsApp account context</dt>
          <dd>{record?.wabaId ?? 'Assigned during signup'}</dd>
        </div>
        <div>
          <dt>Phone number</dt>
          <dd>{phone}</dd>
        </div>
        <div>
          <dt>Display name</dt>
          <dd>{displayName}</dd>
        </div>
        <div>
          <dt>Strategy</dt>
          <dd>{strategyLabel[strategy]}</dd>
        </div>
        <div>
          <dt>Business / location</dt>
          <dd>{branch?.name ?? 'Main Business'}</dd>
        </div>
        <div>
          <dt>Team mapping</dt>
          <dd>{team ? `${team.name}${manager ? ` · Manager: ${manager.name}` : ''}` : 'Not yet assigned'}</dd>
        </div>
      </dl>

      <details className="crm-review-advanced">
        <summary>Advanced Details (technical IDs)</summary>
        <dl className="crm-review-grid crm-review-grid--mono">
          <div>
            <dt>WABA ID</dt>
            <dd>{record?.wabaId ?? 'waba_pending_assignment'}</dd>
          </div>
          <div>
            <dt>Phone number ID</dt>
            <dd>{record ? `phn_${record.id}` : 'phn_pending_assignment'}</dd>
          </div>
          <div>
            <dt>System user</dt>
            <dd>sysuser_crm_northline</dd>
          </div>
        </dl>
      </details>

      <StepFooter
        onBack={onBack}
        secondary={
          <Button variant="ghost" onClick={onWrongSelection}>
            This isn't right
          </Button>
        }
        onContinue={onContinue}
      />
    </div>
  );
}
