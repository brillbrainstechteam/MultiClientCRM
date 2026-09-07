import { Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, Badge, WidgetShell } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';
import { connectionLabel, connectionTone, qualityLabel, qualityTone } from '../dashboard-presentation';
import { branchName } from '@crm/mock-data';
import type { NumberHealthRow } from '../dashboard-selectors';

export interface NumberHealthTableProps {
  rows: NumberHealthRow[];
  contextLabel?: string;
}

/**
 * Compact WhatsApp number-health section — one row per connected number so they
 * can be compared at a glance (not one large card each). Clicking a row opens
 * that number's health detail; "Compare" opens the side-by-side comparison.
 */
export function NumberHealthTable({ rows, contextLabel }: NumberHealthTableProps) {
  const navigate = useNavigate();
  const dashHref = useDashboardHref();

  return (
    <WidgetShell
      title="WhatsApp number health"
      icon={<Radio />}
      contextLabel={contextLabel}
      state={rows.length === 0 ? 'empty' : undefined}
      stateTitle="No WhatsApp numbers in scope"
      actions={
        rows.length > 1 ? (
          <button
            type="button"
            className="crm-numhealth__compare"
            onClick={() => navigate(dashHref('/dashboard?drawer=number-comparison'))}
          >
            Compare
          </button>
        ) : undefined
      }
    >
      <div className="crm-numhealth__scroll">
        <table className="crm-numhealth">
          <thead>
            <tr>
              <th scope="col">Branch</th>
              <th scope="col">Number</th>
              <th scope="col">Status</th>
              <th scope="col">Quality</th>
              <th scope="col" className="crm-num">Awaiting</th>
              <th scope="col" className="crm-num">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ number, awaitingReply, overdueFollowups }) => (
              <tr
                key={number.id}
                className="crm-numhealth__row"
                tabIndex={0}
                onClick={() => navigate(dashHref(`/dashboard?drawer=wa-health&whatsappNumberId=${number.id}`))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(dashHref(`/dashboard?drawer=wa-health&whatsappNumberId=${number.id}`));
                }}
              >
                <td>{branchName(number.branchId)}</td>
                <td className="crm-numhealth__id">
                  <span className="crm-numhealth__name">{number.displayName}</span>
                  <span className="crm-numhealth__digits">{number.department} · {number.displayNumber}</span>
                </td>
                <td>
                  <StatusBadge tone={connectionTone[number.connectionStatus]}>
                    {connectionLabel[number.connectionStatus]}
                  </StatusBadge>
                </td>
                <td>
                  <Badge tone={qualityTone[number.qualityRating]} appearance="outline">
                    {qualityLabel[number.qualityRating]}
                  </Badge>
                </td>
                <td className="crm-num">{awaitingReply}</td>
                <td className="crm-num">{overdueFollowups}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetShell>
  );
}
