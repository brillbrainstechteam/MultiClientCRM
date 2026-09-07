import { Input, Select, Textarea } from '@crm/design-system';
import { useCaseTemplates } from '../domain/fixtures';
import { useCaseLabel } from '../ai-agents-labels';
import type { AgentUseCase } from '../domain/types';

export interface PurposeValue {
  name: string;
  useCase: AgentUseCase;
  objective: string;
  /** Newline-separated for editing; split into an array on save. */
  responsibilities: string;
  instructions: string;
  tone: string;
  /** Comma-separated for editing; split into an array on save. */
  supportedLanguages: string;
}

export function toResponsibilities(raw: string): string[] {
  return raw.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function toLanguages(raw: string): string[] {
  return raw.split(',').map((lang) => lang.trim()).filter(Boolean);
}

export interface PurposeFieldsFormProps {
  value: PurposeValue;
  onChange: (next: PurposeValue) => void;
  /** Only offered on first creation — later edits keep the use case fixed. */
  showTemplatePicker?: boolean;
}

/** AIA-S02 Purpose step/tab — role, objective, instructions, tone, languages in one place (no separate Brand Voice screen). */
export function PurposeFieldsForm({ value, onChange, showTemplatePicker }: PurposeFieldsFormProps) {
  const set = <K extends keyof PurposeValue>(key: K, val: PurposeValue[K]) => onChange({ ...value, [key]: val });

  return (
    <div className="crm-aia__section">
      {showTemplatePicker ? (
        <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
          <h3 className="crm-aia__section-title">Starting point</h3>
          <p className="crm-aia__section-hint">Role templates are starting points only — edit anything below.</p>
          <div className="crm-aia__template-grid">
            {useCaseTemplates.map((template) => (
              <button
                key={template.useCase}
                type="button"
                className={`crm-aia__template-card${value.useCase === template.useCase ? ' crm-aia__template-card--active' : ''}`}
                onClick={() =>
                  onChange({
                    ...value,
                    useCase: template.useCase,
                    objective: value.objective || template.suggestedObjective,
                    responsibilities: value.responsibilities || template.suggestedResponsibilities.join('\n'),
                  })
                }
              >
                <span className="crm-aia__template-card-title">{template.label}</span>
                <span className="crm-aia__template-card-desc">{template.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="crm-aia__form-grid">
        <Input label="Agent name" required value={value.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sales Advisor" />
        <Select
          label="Use case"
          options={Object.entries(useCaseLabel).map(([v, label]) => ({ value: v, label }))}
          value={value.useCase}
          onChange={(e) => set('useCase', e.target.value as AgentUseCase)}
        />
        <div className="crm-aia__form-grid--full">
          <Input label="Objective" required value={value.objective} onChange={(e) => set('objective', e.target.value)} placeholder="What should this agent achieve?" />
        </div>
        <div className="crm-aia__form-grid--full">
          <Textarea
            label="Responsibilities"
            required
            hint="One responsibility per line."
            rows={3}
            value={value.responsibilities}
            onChange={(e) => set('responsibilities', e.target.value)}
          />
        </div>
        <div className="crm-aia__form-grid--full">
          <Textarea
            label="Instructions / business rules"
            required
            hint="Business rules and how the agent should behave — plain language, no prompt-engineering jargon needed."
            rows={4}
            value={value.instructions}
            onChange={(e) => set('instructions', e.target.value)}
          />
        </div>
        <Input label="Tone / communication style" required value={value.tone} onChange={(e) => set('tone', e.target.value)} placeholder="e.g. Friendly and concise" />
        <Input
          label="Supported languages"
          required
          hint="Comma-separated, e.g. English, Hindi"
          value={value.supportedLanguages}
          onChange={(e) => set('supportedLanguages', e.target.value)}
        />
      </div>
    </div>
  );
}
