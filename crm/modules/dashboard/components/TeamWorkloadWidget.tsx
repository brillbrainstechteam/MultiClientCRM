import { UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Avatar, StatusBadge, WidgetShell } from '@crm/design-system';
import { findUser, type TeamWorkloadRow } from '@crm/mock-data';
import { workloadStatusLabel, workloadStatusTone } from '../dashboard-presentation';
import { unassignedWorkCount } from '@crm/mock-data';

export interface TeamWorkloadWidgetProps {
  rows: TeamWorkloadRow[];
  canReassign: boolean;
}

/** DASH-S01 §7 row 8 (team half) — workload, overdue and unassigned-owned counts. */
export function TeamWorkloadWidget({ rows, canReassign }: TeamWorkloadWidgetProps) {
  const scopedHref = useScopedHref();

  return (
    <WidgetShell
      title="Team workload"
      icon={<UsersRound />}
      footerTo={scopedHref('/team-access', { tab: 'workload' })}
      footerLabel="Open Team & Access"
      state={rows.length === 0 ? 'empty' : undefined}
      stateTitle="No team members in scope"
    >
      {unassignedWorkCount > 0 ? (
        <div className="crm-team-workload__unassigned">
          <span>
            <strong>{unassignedWorkCount}</strong> items are unassigned across the team.
          </span>
          {canReassign ? (
            <Link to={scopedHref('/dashboard', { modal: 'reassign-work' })} className="crm-team-workload__reassign">
              Reassign
            </Link>
          ) : null}
        </div>
      ) : null}
      <ul className="crm-team-workload__list">
        {rows.map((row) => {
          const user = findUser(row.userId);
          if (!user) return null;
          return (
            <li key={row.userId} className="crm-team-workload__row">
              <span className="crm-team-workload__identity">
                <Avatar initials={user.initials} name={user.name} size="sm" availability={user.availability} />
                <span className="crm-team-workload__name">{user.name}</span>
              </span>
              <span className="crm-team-workload__counts">
                <span title="Open">{row.openCount} open</span>
                <span title="Overdue">{row.overdueCount} overdue</span>
              </span>
              <StatusBadge tone={workloadStatusTone[row.status]}>{workloadStatusLabel[row.status]}</StatusBadge>
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
