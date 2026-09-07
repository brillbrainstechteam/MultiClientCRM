import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, WidgetShell } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';
import type { BranchHealth, BranchPerformanceRow } from '../dashboard-selectors';

const healthTone: Record<BranchHealth, BadgeTone> = {
  healthy: 'success',
  attention: 'warning',
  critical: 'danger',
};
const healthLabel: Record<BranchHealth, string> = {
  healthy: 'Healthy',
  attention: 'Needs attention',
  critical: 'Critical',
};

export interface BranchPerformanceTableProps {
  rows: BranchPerformanceRow[];
  contextLabel?: string;
  state?: 'loading' | 'error';
}

/**
 * Branch comparison table. Answers "which branch needs action?" at a glance and
 * updates whenever the branch/number/date filter changes.
 */
export function BranchPerformanceTable({ rows, contextLabel, state }: BranchPerformanceTableProps) {
  const navigate = useNavigate();
  const dashHref = useDashboardHref();

  return (
    <WidgetShell
      title="Branch performance"
      icon={<Building2 />}
      contextLabel={contextLabel}
      state={state === 'loading' ? 'loading' : state === 'error' ? 'error' : rows.length === 0 ? 'empty' : undefined}
      stateTitle={rows.length === 0 ? 'No branches in scope' : undefined}
    >
      <div className="crm-branch-table__scroll">
        <table className="crm-branch-table">
          <thead>
            <tr>
              <th scope="col">Branch</th>
              <th scope="col" className="crm-num">New</th>
              <th scope="col" className="crm-num">Pending</th>
              <th scope="col" className="crm-num">Overdue</th>
              <th scope="col" className="crm-num">Converted</th>
              <th scope="col" className="crm-num">Conv. rate</th>
              <th scope="col">Health</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.branchId}
                className="crm-branch-table__row"
                onClick={() => navigate(dashHref(`/dashboard?branchId=${row.branchId}`))}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(dashHref(`/dashboard?branchId=${row.branchId}`));
                }}
              >
                <td className="crm-branch-table__name">{row.branchName}</td>
                <td className="crm-num">{row.newEnquiries}</td>
                <td className="crm-num">{row.pendingReplies}</td>
                <td className="crm-num">{row.overdueFollowups}</td>
                <td className="crm-num">{row.converted}</td>
                <td className="crm-num crm-branch-table__rate">{row.conversionRate}%</td>
                <td>
                  <StatusBadge tone={healthTone[row.health]}>{healthLabel[row.health]}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetShell>
  );
}
