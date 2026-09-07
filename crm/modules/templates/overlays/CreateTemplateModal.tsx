import { useState } from 'react';
import { Copy, FilePlus2, Library, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Modal, SearchField } from '@crm/design-system';
import { templates } from '../data/mockTemplates';
import { TemplateStatusBadge } from '../components';

/**
 * TPL-S03 — Create Template. Choose a start method. Cancel returns to the
 * source without changes (spec §Create start method).
 */
export function CreateTemplateModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [mode, setMode] = useState<'choose' | 'clone'>('choose');
  const [query, setQuery] = useState('');

  const open = searchParams.get('modal') === 'create';

  const close = () => {
    setMode('choose');
    setQuery('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      return next;
    });
  };

  if (!open) return null;

  const cloneCandidates = templates
    .filter((t) => t.crmState !== 'deleted')
    .filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 20);

  return (
    <Modal open title={mode === 'clone' ? 'Clone an existing template' : 'Create Template'} onClose={close}>
      {mode === 'choose' ? (
        <div className="crm-tpl-create__options">
          <button
            className="crm-tpl-create__option"
            onClick={() => {
              close();
              navigate(scopedHref('/templates/new', { source: 'scratch', step: 'basics' }));
            }}
          >
            <FilePlus2 aria-hidden="true" />
            <div>
              <p className="crm-tpl-create__option-title">Create from scratch</p>
              <p className="crm-tpl-create__option-desc">Start with an empty template and build it in the composer.</p>
            </div>
          </button>

          <button className="crm-tpl-create__option" onClick={() => setMode('clone')}>
            <Copy aria-hidden="true" />
            <div>
              <p className="crm-tpl-create__option-title">Clone existing</p>
              <p className="crm-tpl-create__option-desc">Duplicate a template you already have and adjust it.</p>
            </div>
          </button>

          <button
            className="crm-tpl-create__option"
            onClick={() => {
              close();
              navigate(scopedHref('/templates/library'));
            }}
          >
            <Library aria-hidden="true" />
            <div>
              <p className="crm-tpl-create__option-title">Ready-made template</p>
              <p className="crm-tpl-create__option-desc">Browse the library for a proven starting point.</p>
            </div>
          </button>

          <button className="crm-tpl-create__option crm-tpl-create__option--disabled" disabled>
            <Sparkles aria-hidden="true" />
            <div>
              <p className="crm-tpl-create__option-title">Generate with AI <Badge tone="neutral">Coming soon</Badge></p>
              <p className="crm-tpl-create__option-desc">AI-assisted drafting is planned for a future release.</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="crm-tpl-create__clone">
          <SearchField
            label="Search templates to clone"
            placeholder="Search by template name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="crm-tpl-create__clone-list">
            {cloneCandidates.map((t) => (
              <li key={t.id}>
                <button
                  className="crm-tpl-create__clone-row"
                  onClick={() => {
                    close();
                    navigate(scopedHref('/templates/new', { source: 'clone', cloneFrom: t.id, step: 'basics' }));
                  }}
                >
                  <div>
                    <p className="crm-tpl-create__clone-name">{t.name}</p>
                    <p className="crm-tpl-create__clone-snippet">{t.components.body}</p>
                  </div>
                  <TemplateStatusBadge template={t} />
                </button>
              </li>
            ))}
            {cloneCandidates.length === 0 ? <p className="crm-tpl-create__clone-empty">No templates match "{query}".</p> : null}
          </ul>
        </div>
      )}
    </Modal>
  );
}
