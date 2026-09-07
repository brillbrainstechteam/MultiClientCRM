import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from '@crm/design-system';
import { branches, findBranch, teams, users } from '@crm/mock-data';
import { StepFooter } from '../../components/StepFooter';
import { StepHeader } from '../../components/StepHeader';

export interface TeamAssignmentStepProps {
  branchId: string | null;
  onBack: () => void;
  onContinue: (teamId: string, managerUserId: string) => void;
}

/**
 * C16 — Who Handles This Number? Kept minimal (SKILL.md "Team & Inbox
 * Setup") — the full permission matrix stays in Team & Access.
 */
export function TeamAssignmentStep({ branchId, onBack, onContinue }: TeamAssignmentStepProps) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [managerUserId, setManagerUserId] = useState(users.find((u) => u.role === 'manager')?.id ?? users[0].id);
  const navigate = useNavigate();
  const branch = branchId ? findBranch(branchId) : branches[0];

  return (
    <div>
      <StepHeader
        eyebrow="Stage 4 · Activate & Assign"
        title="Who handles this number?"
        description="Decide who owns replies and who can see this Inbox — you can change this any time in Team & Access."
      />

      <div className="crm-form-grid">
        <Select
          label="Manager / owner"
          options={users.filter((u) => u.role !== 'agent').map((u) => ({ value: u.id, label: `${u.name} — ${u.roleLabel}` }))}
          value={managerUserId}
          onChange={(event) => setManagerUserId(event.target.value)}
        />
        <Select
          label="Who can see this Inbox?"
          options={teams.map((team) => ({ value: team.id, label: team.name }))}
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
        />
      </div>

      <div className="crm-form-section">
        <span className="crm-form-section__title">Primary business / location</span>
        <p className="crm-form-section__hint">{branch ? `${branch.name} — ${branch.city}` : 'Main Business'}</p>
      </div>

      <div className="crm-form-section">
        <button
          type="button"
          className="crm-link-button"
          onClick={() => navigate('/team-access?returnTo=' + encodeURIComponent('/setup/connect?stage=activate&step=team'))}
        >
          Manage advanced permissions later in Team & Access
        </button>
      </div>

      <StepFooter onBack={onBack} onContinue={() => onContinue(teamId, managerUserId)} continueLabel="Finish setup" />
    </div>
  );
}
