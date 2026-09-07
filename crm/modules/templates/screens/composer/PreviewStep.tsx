import { AlertTriangle, CircleCheck, TriangleAlert } from 'lucide-react';
import { WhatsAppTemplatePreview } from '../../components';
import { validateTemplate, type ValidationResult } from '../../domain/validation';
import type { ComposerDraft } from './composer-state';

export function PreviewStep({
  draft,
  existingNames,
  onFocusIssue,
}: {
  draft: ComposerDraft;
  existingNames: string[];
  onFocusIssue: (sectionId: string) => void;
}) {
  const result: ValidationResult = validateTemplate(
    { name: draft.name, format: draft.format, metaCategory: draft.metaCategory, components: draft.components },
    existingNames,
  );

  return (
    <div className="crm-preview-step">
      <div className="crm-preview-step__validation">
        {result.errors.length === 0 && result.warnings.length === 0 ? (
          <div className="crm-preview-step__clean">
            <CircleCheck aria-hidden="true" />
            <p>No issues found. This template is ready for review.</p>
          </div>
        ) : (
          <>
            {result.errors.length > 0 ? (
              <section>
                <h3><AlertTriangle aria-hidden="true" /> Blocking errors ({result.errors.length})</h3>
                <ul>
                  {result.errors.map((issue) => (
                    <li key={issue.id}>
                      <button onClick={() => onFocusIssue(issue.sectionId)}>{issue.message}</button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {result.warnings.length > 0 ? (
              <section>
                <h3><TriangleAlert aria-hidden="true" /> Warnings ({result.warnings.length})</h3>
                <ul>
                  {result.warnings.map((issue) => (
                    <li key={issue.id}>
                      <button onClick={() => onFocusIssue(issue.sectionId)}>{issue.message}</button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>

      <div className="crm-preview-step__preview">
        <WhatsAppTemplatePreview components={draft.components} format={draft.format} />
      </div>
    </div>
  );
}

export function computeValidation(draft: ComposerDraft, existingNames: string[]): ValidationResult {
  return validateTemplate(
    { name: draft.name, format: draft.format, metaCategory: draft.metaCategory, components: draft.components },
    existingNames,
  );
}
