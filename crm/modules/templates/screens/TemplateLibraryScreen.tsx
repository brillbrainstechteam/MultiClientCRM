import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Drawer, EmptyState, SearchField, Tabs, type TabItem } from '@crm/design-system';
import { WhatsAppTemplatePreview } from '../components';
import { libraryItems, findLibraryItem } from '../data/mockLibrary';
import type { LibraryCategory } from '../domain/types';
import { metaCategoryLabel, useCaseLabel, formatLabel } from '../templates-labels';

const categoryTabs: TabItem[] = [
  { id: 'all', label: 'All' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
  { id: 'service', label: 'Service' },
  { id: 'support', label: 'Support' },
  { id: 'orders-payments', label: 'Orders / Payments' },
];

/** TPL-S10/S11 — Ready-Made Library and Library Template Preview drawer. */
export default function TemplateLibraryScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const category = (searchParams.get('category') as LibraryCategory | null) ?? 'all';
  const q = searchParams.get('q') ?? '';
  const previewId = searchParams.get('drawer') === 'preview' ? searchParams.get('libraryId') : null;
  const previewItem = previewId ? findLibraryItem(previewId) : undefined;

  const setParam = (key: string, value: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      return next;
    });

  const items = useMemo(() => {
    return libraryItems.filter((item) => {
      if (category !== 'all' && item.libraryCategory !== category) return false;
      if (q && !`${item.title} ${item.previewSnippet}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [category, q]);

  const openPreview = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'preview');
      next.set('libraryId', id);
      return next;
    });

  const closePreview = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.delete('libraryId');
      return next;
    });

  const useTemplate = (id: string) => {
    closePreview();
    navigate(scopedHref('/templates/new', { source: 'library', libraryId: id, step: 'basics' }));
  };

  return (
    <div className="crm-tpl-library">
      <PageHeader
        title="Ready-Made Library"
        description="Proven starting points you can use as-is or customize. Library items are not automatically approved tenant templates."
        toolbar={<Tabs tabs={categoryTabs} activeId={category} onChange={(id) => setParam('category', id === 'all' ? null : id)} ariaLabel="Library categories" />}
      />

      <SearchField label="Search library" placeholder="Search by need, scenario or keyword…" width="360px" value={q} onChange={(e) => setParam('q', e.target.value)} />

      {items.length === 0 ? (
        <EmptyState title="No matches" description="Try a different category or search term." />
      ) : (
        <div className="crm-tpl-library__grid">
          {items.map((item) => (
            <button key={item.id} className="crm-tpl-library__card" onClick={() => openPreview(item.id)}>
              <div className="crm-tpl-library__card-head">
                <Badge tone={item.source === 'meta-provided' ? 'info' : 'brand'} appearance="outline">
                  {item.source === 'meta-provided' ? 'Meta-provided' : 'CRM Ready-Made'}
                </Badge>
                <span className="crm-tpl-library__card-format">{formatLabel[item.format]}</span>
              </div>
              <p className="crm-tpl-library__card-title">{item.title}</p>
              <p className="crm-tpl-library__card-snippet">{item.previewSnippet}</p>
              <p className="crm-tpl-library__card-meta">
                {useCaseLabel[item.useCase]} · {metaCategoryLabel[item.category]} · {item.languages.join(', ')}
              </p>
            </button>
          ))}
        </div>
      )}

      <Drawer
        open={Boolean(previewItem)}
        title={previewItem?.title ?? ''}
        onClose={closePreview}
        footer={
          previewItem ? (
            <>
              <Button variant="secondary" onClick={closePreview}>Close</Button>
              <Button variant="primary" onClick={() => useTemplate(previewItem.id)}>Use This Template</Button>
            </>
          ) : undefined
        }
      >
        {previewItem ? (
          <div className="crm-tpl-library__preview">
            <WhatsAppTemplatePreview components={previewItem.components} format={previewItem.format} />
            <dl className="crm-tpl-library__preview-meta">
              <div><dt>Use case</dt><dd>{useCaseLabel[previewItem.useCase]}</dd></div>
              <div><dt>Meta category</dt><dd>{metaCategoryLabel[previewItem.category]}</dd></div>
              <div><dt>Languages</dt><dd>{previewItem.languages.join(', ')}</dd></div>
              <div><dt>Format</dt><dd>{formatLabel[previewItem.format]}</dd></div>
              <div><dt>Variables</dt><dd>{previewItem.components.variables.map((v) => `{{${v.index}}} ${v.description}`).join('; ') || 'None'}</dd></div>
              <div><dt>Buttons</dt><dd>{previewItem.components.buttons.map((b) => b.label).join(', ') || 'None'}</dd></div>
            </dl>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
