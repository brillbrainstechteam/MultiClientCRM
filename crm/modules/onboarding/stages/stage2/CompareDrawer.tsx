import { Badge, Modal } from '@crm/design-system';
import type { ConnectionStrategy } from '@crm/mock-data';
import type { StrategyOption } from './strategy-eligibility';

export interface CompareDrawerProps {
  open: boolean;
  options: StrategyOption[];
  recommended: ConnectionStrategy | null;
  onClose: () => void;
}

/** C06 — Compare Options. One large modal comparing every strategy side by side. */
export function CompareDrawer({ open, options, recommended, onClose }: CompareDrawerProps) {
  return (
    <Modal open={open} title="Compare connection options" onClose={onClose}>
      <div className="crm-compare__scroll">
        <table className="crm-compare__table">
          <thead>
            <tr>
              <th scope="col">Option</th>
              {options.map((option) => (
                <th key={option.id} scope="col">
                  {option.title}
                  {option.id === recommended ? (
                    <span className="crm-compare__recommended">
                      <Badge tone="success">Recommended</Badge>
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Benefit</th>
              {options.map((option) => (
                <td key={option.id}>{option.benefit}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Operating change</th>
              {options.map((option) => (
                <td key={option.id}>{option.operatingChange}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Eligibility</th>
              {options.map((option) => (
                <td key={option.id}>
                  <Badge tone={option.eligible ? 'success' : 'neutral'}>
                    {option.eligible ? 'Eligible' : 'Not eligible'}
                  </Badge>
                  <span className="crm-compare__note">{option.eligibilityNote}</span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">History</th>
              {options.map((option) => (
                <td key={option.id}>{option.historyExpectation}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Transition / downtime</th>
              {options.map((option) => (
                <td key={option.id}>{option.transitionNote ?? 'No downtime expected.'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
