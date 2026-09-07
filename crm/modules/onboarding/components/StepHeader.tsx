
export interface StepHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/** Consistent small-caps eyebrow + title + description block for every step. */
export function StepHeader({ eyebrow, title, description }: StepHeaderProps) {
  return (
    <div className="crm-step-header">
      <span className="crm-step-header__eyebrow">{eyebrow}</span>
      <h1 className="crm-step-header__title">{title}</h1>
      {description ? <p className="crm-step-header__description">{description}</p> : null}
    </div>
  );
}
