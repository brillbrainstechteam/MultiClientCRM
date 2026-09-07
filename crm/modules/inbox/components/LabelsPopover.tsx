import { useState } from 'react';
import { Tag, Sparkles, Check, X } from 'lucide-react';
import { Popover, Button } from '@crm/design-system';
import { conversationLabels, findLabel } from '../inbox-mock-data';

interface SmartSuggestion {
  labelId: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface LabelsPopoverProps {
  open: boolean;
  currentLabelIds: string[];
  conversationId: string;
  onClose: () => void;
  onApply: (labelIds: string[]) => void;
}

// Mock smart label suggestions keyed by conversation
const SMART_SUGGESTIONS: Record<string, SmartSuggestion[]> = {
  conv_rahul_active: [
    { labelId: 'lbl_vip', confidence: 'high', reason: 'Large order quantity and repeated contact patterns indicate high-value customer.' },
    { labelId: 'lbl_payment', confidence: 'medium', reason: 'Customer mentioned payment terms in the conversation.' },
  ],
  conv_arjun_expiring: [
    { labelId: 'lbl_hot_lead', confidence: 'high', reason: 'Customer expressed strong purchase intent with specific product enquiries.' },
  ],
  conv_ai_task: [
    { labelId: 'lbl_vip', confidence: 'high', reason: 'VIP contact history and high-value order history.' },
    { labelId: 'lbl_follow_up', confidence: 'medium', reason: 'Demo scheduling discussed — follow-up is required.' },
  ],
};

const CONFIDENCE_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: 'var(--crm-success)', bg: '#f0faf0', label: 'High confidence' },
  medium: { color: 'var(--crm-warning)', bg: '#fffbf0', label: 'Medium confidence' },
  low: { color: 'var(--crm-text-muted)', bg: 'var(--crm-bg-secondary)', label: 'Low confidence' },
};

export function LabelsPopover({ open, currentLabelIds, conversationId, onClose, onApply }: LabelsPopoverProps) {
  const [draft, setDraft] = useState<string[]>(currentLabelIds);
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());

  const suggestions = (SMART_SUGGESTIONS[conversationId] ?? []).filter(
    (s) => !rejectedSuggestions.has(s.labelId) && !draft.includes(s.labelId),
  );

  function toggleLabel(id: string) {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    );
  }

  function acceptSuggestion(labelId: string) {
    setDraft((prev) => (prev.includes(labelId) ? prev : [...prev, labelId]));
  }

  function rejectSuggestion(labelId: string) {
    setRejectedSuggestions((prev) => new Set([...prev, labelId]));
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  const hasChanges = JSON.stringify([...draft].sort()) !== JSON.stringify([...currentLabelIds].sort());

  return (
    <Popover
      open={open}
      title="Labels"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleApply} disabled={!hasChanges}>
            Apply
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Applied labels */}
        {draft.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Applied labels
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {draft.map((id) => {
                const label = findLabel(id);
                if (!label) return null;
                return (
                  <span
                    key={id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px', borderRadius: 999,
                      background: `${label.color}18`, color: label.color,
                      border: `1px solid ${label.color}40`, fontSize: 12, fontWeight: 500,
                    }}
                  >
                    {label.name}
                    <button
                      onClick={() => toggleLabel(id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* AI suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <Sparkles size={12} style={{ color: 'var(--crm-text-brand)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-brand)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Smart suggestions
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map((s) => {
                const label = findLabel(s.labelId);
                if (!label) return null;
                const style = CONFIDENCE_STYLE[s.confidence];
                return (
                  <div
                    key={s.labelId}
                    style={{
                      border: '1px solid var(--crm-border)', borderRadius: 8, padding: '8px 10px',
                      background: style.bg,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 999,
                        background: `${label.color}18`, color: label.color,
                        border: `1px solid ${label.color}40`, fontSize: 12, fontWeight: 500,
                      }}>
                        <Tag size={10} />
                        {label.name}
                      </span>
                      <span style={{ fontSize: 10, color: style.color, fontWeight: 600 }}>{style.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--crm-text-secondary)', lineHeight: 1.4, marginBottom: 8 }}>
                      {s.reason}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="secondary" size="sm" onClick={() => rejectSuggestion(s.labelId)}>
                        <X size={11} style={{ marginRight: 3 }} /> Dismiss
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => acceptSuggestion(s.labelId)}>
                        <Check size={11} style={{ marginRight: 3 }} /> Accept
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Label picker */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Add labels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {conversationLabels.map((label) => {
              const isApplied = draft.includes(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => toggleLabel(label.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 6, cursor: 'pointer', border: 'none',
                    background: isApplied ? `${label.color}12` : 'transparent', textAlign: 'left',
                    width: '100%', transition: 'background 0.1s',
                  }}
                  onMouseOver={(e) => {
                    if (!isApplied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--crm-bg-secondary)';
                  }}
                  onMouseOut={(e) => {
                    if (!isApplied) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: label.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--crm-text-primary)', fontWeight: isApplied ? 600 : 400 }}>
                    {label.name}
                  </span>
                  {label.scope === 'team' && (
                    <span style={{ fontSize: 10, color: 'var(--crm-text-muted)' }}>Team</span>
                  )}
                  {isApplied && <Check size={13} style={{ color: label.color, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', paddingTop: 4, borderTop: '1px solid var(--crm-border)' }}>
          Labels are conversation-scoped tags. Contact tags are managed in Customer Context.
        </div>
      </div>
    </Popover>
  );
}
