import { CheckCircle2, Circle } from 'lucide-react';
import type { ReadinessResult } from '../domain/readiness';

export interface ReadinessChecklistProps {
  readiness: ReadinessResult;
  onNavigate: (to: 'purpose' | 'knowledge' | 'safety' | 'test') => void;
}

const rows: { key: keyof ReadinessResult; label: string; to: 'purpose' | 'knowledge' | 'safety' | 'test' }[] = [
  { key: 'purposeComplete', label: 'Purpose complete', to: 'purpose' },
  { key: 'knowledgeReady', label: 'Knowledge ready', to: 'knowledge' },
  { key: 'safetyConfigured', label: 'Safety configured', to: 'safety' },
  { key: 'handoverConfigured', label: 'Handover configured', to: 'safety' },
  { key: 'dataAccessReviewed', label: 'Data access reviewed', to: 'safety' },
  { key: 'requiredTestsPassed', label: 'Required tests passed', to: 'test' },
];

/** Shared readiness checklist — used on the Activate modal and the Setup Purpose/Activate summary. */
export function ReadinessChecklist({ readiness, onNavigate }: ReadinessChecklistProps) {
  return (
    <ul className="crm-aia__checklist">
      {rows.map((row) => {
        const done = Boolean(readiness[row.key]);
        return (
          <li key={row.key} className="crm-aia__checklist-item">
            <span className={`crm-aia__checklist-icon crm-aia__checklist-icon--${done ? 'done' : 'pending'}`} aria-hidden="true">
              {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            </span>
            <span className="crm-aia__checklist-label">{row.label}</span>
            {!done ? (
              <button type="button" className="crm-aia__checklist-link" onClick={() => onNavigate(row.to)}>
                Fix
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
