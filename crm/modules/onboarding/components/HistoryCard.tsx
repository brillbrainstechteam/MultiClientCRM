import { useNavigate } from 'react-router-dom';
import { Badge, Button } from '@crm/design-system';
import type { HistoryChoice } from '@crm/mock-data';
import { ChoiceCard } from './ChoiceCard';

export interface HistoryCardProps {
  numberId?: string;
  historyChoice: HistoryChoice;
  expanded: boolean;
  onToggle: () => void;
}

const options: { id: NonNullable<HistoryChoice>; title: string; description: string }[] = [
  { id: 'imported', title: 'Import supported history', description: 'Bring over conversations from a supported prior source.' },
  { id: 'reference', title: 'Upload chat export as reference', description: 'Visually distinct from live Meta messages — for context only.' },
  { id: 'manual', title: 'Add a manual history summary', description: 'Quick notes on past orders, quotes and follow-ups.' },
];

/** C17 — History (optional card). Never in the critical setup path. */
export function HistoryCard({ numberId, historyChoice, expanded, onToggle }: HistoryCardProps) {
  const navigate = useNavigate();
  const historyHref = numberId ? `/settings/history?numberId=${numberId}` : '/settings/history';

  return (
    <section className="crm-optional-card">
      <header className="crm-optional-card__head">
        <div>
          <h3>Bring in your history</h3>
          <p>Optional — never blocks going live.</p>
        </div>
        {historyChoice ? (
          <Badge tone={historyChoice === 'skipped' ? 'neutral' : 'success'}>
            {historyChoice === 'skipped' ? 'Skipped' : 'Added'}
          </Badge>
        ) : (
          <Button variant="secondary" size="sm" onClick={onToggle}>
            {expanded ? 'Hide options' : 'Add history'}
          </Button>
        )}
      </header>

      {expanded ? (
        <div className="crm-optional-card__body">
          {options.map((option) => (
            <ChoiceCard key={option.id} title={option.title} description={option.description} onSelect={() => navigate(historyHref)} />
          ))}
          <button type="button" className="crm-link-button" onClick={onToggle}>
            Do this later
          </button>
        </div>
      ) : null}
    </section>
  );
}
