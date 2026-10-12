import { useEffect, useState } from 'react';
import { FileEdit, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button, EmptyState } from '@crm/design-system';

interface Draft { id: string; name: string; updatedAt: string }

/** Saved template drafts (doc §3.2). Resume one in the composer, or delete it. */
export default function DraftsScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const flash = searchParams.get('flash');

  const load = () => {
    setLoading(true);
    fetch('/api/crm/templates/drafts', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { drafts: [] }))
      .then((d) => setDrafts(Array.isArray(d.drafts) ? d.drafts : []))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const resume = (id: string) => navigate(scopedHref('/templates/new', { source: 'draft', draftId: id, step: 'basics' }));

  const remove = async (id: string) => {
    setDrafts((xs) => xs.filter((d) => d.id !== id));
    await fetch(`/api/crm/templates/drafts?id=${id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
  };

  const clearFlash = () => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('flash'); return n; });

  return (
    <div className="crm-tpl-drafts">
      <PageHeader title="Drafts" description="Templates you saved to finish later. Resume one to keep editing, or submit it for approval." />

      {flash ? (
        <div role="status" onAnimationEnd={clearFlash} style={{ background: 'var(--crm-surface-sunken)', border: '1px solid var(--crm-border-subtle)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13.5, fontWeight: 600 }}>{flash}</div>
      ) : null}

      {loading ? (
        <p style={{ color: 'var(--crm-text-muted)' }}>Loading drafts…</p>
      ) : drafts.length === 0 ? (
        <EmptyState
          title="No saved drafts"
          description="When you click “Save Draft” in the composer, the template lands here so you can finish it later."
          actions={<Button variant="primary" onClick={() => navigate(scopedHref('/templates/new', { step: 'basics' }))}>Create a template</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {drafts.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--crm-border-subtle)', borderRadius: 10, background: 'var(--crm-surface-raised)' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{d.name || 'Untitled template'}</span>
                <span style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>Updated {new Date(d.updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <Button variant="secondary" size="sm" iconLeft={<FileEdit size={15} />} onClick={() => resume(d.id)}>Resume</Button>
              <Button variant="ghost" size="sm" iconLeft={<Trash2 size={15} />} onClick={() => remove(d.id)}>Delete</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
