import { useState, useMemo } from 'react';
import { Search, ChevronRight, CheckCircle2, Clock, XCircle, LayoutTemplate } from 'lucide-react';
import { Drawer, Button, Badge } from '@crm/design-system';
import type { InboxTemplate } from '../inbox-types';
import { inboxTemplates } from '../inbox-mock-data';

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  currentNumberId: string;
  onSend: (template: InboxTemplate, variables: Record<string, string>) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utility',
  authentication: 'Authentication',
};

const STATUS_ICON: Record<string, JSX.Element> = {
  approved: <CheckCircle2 size={12} style={{ color: 'var(--crm-success)' }} />,
  pending: <Clock size={12} style={{ color: 'var(--crm-warning)' }} />,
  rejected: <XCircle size={12} style={{ color: 'var(--crm-danger)' }} />,
};

function resolvePreview(text: string, values: Record<string, string>, variables: string[]): string {
  let result = text;
  variables.forEach((varName, i) => {
    const val = values[varName] || `[${varName}]`;
    result = result.replaceAll(`{{${i + 1}}}`, val);
  });
  return result;
}

export function TemplatePicker({ open, onClose, currentNumberId, onSend }: TemplatePickerProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const eligible = useMemo(() => {
    return inboxTemplates.filter(
      (t) =>
        t.status !== 'rejected' &&
        (t.numberIds.length === 0 || t.numberIds.includes(currentNumberId)),
    );
  }, [currentNumberId]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return eligible.filter((t) => {
      const matchesQuery =
        !q ||
        t.displayName.toLowerCase().includes(q) ||
        t.bodyText.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [eligible, query, categoryFilter]);

  const selected = selectedId ? eligible.find((t) => t.id === selectedId) : null;

  function selectTemplate(t: InboxTemplate) {
    setSelectedId(t.id);
    // Pre-fill variable values with empty strings
    const vals: Record<string, string> = {};
    t.variables.forEach((v) => { vals[v] = variableValues[v] ?? ''; });
    setVariableValues(vals);
  }

  function handleSend() {
    if (!selected) return;
    onSend(selected, variableValues);
    // Reset state
    setSelectedId(null);
    setVariableValues({});
    setQuery('');
    onClose();
  }

  const missingVars = selected
    ? selected.variables.filter((v) => !variableValues[v]?.trim())
    : [];

  const categories = ['all', ...Array.from(new Set(eligible.map((t) => t.category)))];

  return (
    <Drawer
      open={open}
      title="Choose Template"
      onClose={onClose}
      footer={
        selected ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="secondary" onClick={() => setSelectedId(null)} size="sm">
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={missingVars.length > 0}
            >
              Send Template
            </Button>
            {missingVars.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--crm-danger)' }}>
                Fill all variables first
              </span>
            )}
          </div>
        ) : null
      }
    >
      {!selected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--crm-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search templates…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', paddingLeft: 32, paddingRight: 12,
                height: 34, border: '1px solid var(--crm-border)', borderRadius: 6,
                fontSize: 13, background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
              }}
            />
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  border: '1px solid var(--crm-border)',
                  background: categoryFilter === cat ? 'var(--crm-text-brand)' : 'var(--crm-bg-secondary)',
                  color: categoryFilter === cat ? 'var(--crm-on-dark)' : 'var(--crm-text-secondary)',
                }}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', textAlign: 'right' }}>
            <a
              href="/templates?sourceModule=inbox&returnTo=/inbox"
              style={{ color: 'var(--crm-text-brand)', textDecoration: 'none' }}
              onClick={(e) => { e.preventDefault(); window.location.href = '/templates?sourceModule=inbox&returnTo=/inbox'; }}
            >
              Manage templates →
            </a>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--crm-text-muted)', fontSize: 13 }}>
              <LayoutTemplate size={32} style={{ marginBottom: 8, opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
              No templates match your search.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  style={{
                    textAlign: 'left', border: '1px solid var(--crm-border)', borderRadius: 8,
                    padding: '10px 12px', cursor: 'pointer', background: 'var(--crm-bg-secondary)',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--crm-text-brand)'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--crm-border)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--crm-text-primary)' }}>
                      {t.displayName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {STATUS_ICON[t.status]}
                      {t.status === 'pending' && (
                        <Badge tone="warning">Pending</Badge>
                      )}
                      <Badge tone="neutral">{CATEGORY_LABELS[t.category]}</Badge>
                      <ChevronRight size={12} style={{ color: 'var(--crm-text-muted)' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--crm-text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.bodyText}
                  </div>
                  {t.variables.length > 0 && (
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--crm-text-muted)' }}>
                      {t.variables.length} variable{t.variables.length !== 1 ? 's' : ''} required
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Template detail + variable editor
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', marginBottom: 4 }}>
              {CATEGORY_LABELS[selected.category]} · {selected.language.toUpperCase()}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--crm-text-primary)' }}>
              {selected.displayName}
            </div>
          </div>

          {/* Preview */}
          <div style={{
            background: 'var(--crm-bg-brand-tint, #f0f7ff)', border: '1px solid var(--crm-border)',
            borderRadius: 8, padding: 14,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: 'var(--crm-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
              Preview
            </div>
            {selected.headerType !== 'none' && selected.headerText && (
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--crm-text-primary)', marginBottom: 6 }}>
                {selected.headerText}
              </div>
            )}
            <div style={{ fontSize: 13, color: 'var(--crm-text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {resolvePreview(selected.bodyText, variableValues, selected.variables)}
            </div>
            {selected.footer && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--crm-text-muted)' }}>
                {selected.footer}
              </div>
            )}
            {selected.buttons.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selected.buttons.map((btn, i) => (
                  <div key={i} style={{
                    padding: '4px 12px', borderRadius: 999, border: '1px solid var(--crm-text-brand)',
                    fontSize: 12, color: 'var(--crm-text-brand)', fontWeight: 500,
                  }}>
                    {btn.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variable inputs */}
          {selected.variables.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-secondary)', marginBottom: 10 }}>
                Fill in variables
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.variables.map((varName, i) => (
                  <div key={varName}>
                    <label style={{ fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 3 }}>
                      {`{{${i + 1}}}`} — {varName.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="text"
                      placeholder={`Enter ${varName.replace(/_/g, ' ')}…`}
                      value={variableValues[varName] ?? ''}
                      onChange={(e) =>
                        setVariableValues((prev) => ({ ...prev, [varName]: e.target.value }))
                      }
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                        border: `1px solid ${variableValues[varName]?.trim() ? 'var(--crm-border)' : 'var(--crm-danger)'}`,
                        borderRadius: 6, fontSize: 13,
                        background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
