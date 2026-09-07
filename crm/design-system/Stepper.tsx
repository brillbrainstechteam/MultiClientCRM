import { Check } from 'lucide-react';

export interface StepperItem {
  id: string;
  label: string;
}

export interface StepperProps {
  items: StepperItem[];
  currentId: string;
}

/** Horizontal progress stepper for the wizard shell. */
export function Stepper({ items, currentId }: StepperProps) {
  const currentIndex = items.findIndex((item) => item.id === currentId);

  return (
    <ol className="crm-stepper">
      {items.map((item, index) => {
        const status = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        return (
          <li key={item.id} className={`crm-stepper__item crm-stepper__item--${status}`}>
            <span className="crm-stepper__marker" aria-hidden="true">
              {status === 'done' ? <Check /> : index + 1}
            </span>
            <span className="crm-stepper__label">{item.label}</span>
            {index < items.length - 1 ? <span className="crm-stepper__bar" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
