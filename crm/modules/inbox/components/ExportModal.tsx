import { useState } from 'react';
import { Download, FileText, Table2, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '@crm/design-system';

interface ExportModalProps {
  open: boolean;
  canExport: boolean;
  onClose: () => void;
}

type ExportFormat = 'csv' | 'xlsx';
type ExportScope = 'conversations' | 'messages' | 'agent-performance';

export function ExportModal({ open, canExport, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<ExportScope>('conversations');
  const [confirmed, setConfirmed] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  function handleExport() {
    if (!confirmed) { setConfirmed(true); return; }
    // Prototype: simulate download
    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      setConfirmed(false);
      onClose();
    }, 1500);
  }

  const scopeOptions: { id: ExportScope; label: string; description: string }[] = [
    { id: 'conversations', label: 'Conversations', description: 'One row per conversation with metadata, assignee, labels, status, timestamps.' },
    { id: 'messages', label: 'Message content', description: 'Individual messages. Note: contains customer data — separate from aggregate analytics export.' },
    { id: 'agent-performance', label: 'Agent performance', description: 'Aggregated KPIs per agent for the selected date range.' },
  ];

  if (!canExport) {
    return (
      <Modal open={open} title="Export Data" onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--crm-text-primary)', marginBottom: 6 }}>
            Export requires Manager or Owner role
          </div>
          <div style={{ fontSize: 13, color: 'var(--crm-text-muted)' }}>
            Contact your workspace owner to request export access.
          </div>
          <Button variant="secondary" size="sm" style={{ marginTop: 16 }} onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} title="Export Data" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {downloaded ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={36} style={{ color: 'var(--crm-success)', display: 'block', margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--crm-text-primary)' }}>Export started</div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>Your file will download shortly.</div>
          </div>
        ) : (
          <>
            {/* Scope selection */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>What to export</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {scopeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setScope(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 7, cursor: 'pointer',
                      border: `1px solid ${scope === opt.id ? 'var(--crm-text-brand)' : 'var(--crm-border)'}`,
                      background: scope === opt.id ? 'var(--crm-green-tint)' : 'transparent',
                      textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${scope === opt.id ? 'var(--crm-text-brand)' : 'var(--crm-border)'}`, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {scope === opt.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--crm-text-brand)' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', lineHeight: 1.4 }}>{opt.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Format</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['csv', 'xlsx'] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${format === f ? 'var(--crm-text-brand)' : 'var(--crm-border)'}`,
                      background: format === f ? 'var(--crm-green-tint)' : 'transparent',
                      color: format === f ? 'var(--crm-text-brand)' : 'var(--crm-text-secondary)',
                      fontWeight: format === f ? 600 : 400, fontSize: 13,
                    }}
                  >
                    {f === 'csv' ? <FileText size={13} /> : <Table2 size={13} />}
                    .{f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit confirmation */}
            {confirmed && (
              <div style={{ padding: '10px 12px', background: '#fffbf0', border: '1px solid var(--crm-warning)', borderRadius: 8, fontSize: 12, color: 'var(--crm-text-secondary)' }}>
                This export will be logged in the audit trail. Click "Download" again to confirm.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleExport}>
                <Download size={13} style={{ marginRight: 4 }} />
                {confirmed ? 'Download' : 'Prepare export'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
