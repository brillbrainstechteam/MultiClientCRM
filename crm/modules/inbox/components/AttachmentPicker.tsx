import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ExternalLink, Upload, X } from 'lucide-react';
import { Drawer, Button, Tabs } from '@crm/design-system';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { items as catalogueItems } from '@crm/modules/catalogue-orders/data';
import { PriceDisplay } from '@crm/modules/catalogue-orders/components';

interface AttachmentFile {
  name: string;
  size: string;
  type: 'image' | 'video' | 'document';
  previewUrl?: string;
}

interface AttachmentPickerProps {
  open: boolean;
  onClose: () => void;
  onSend: (file: AttachmentFile) => void;
  /** Scopes the "browse full picker" deep link (SKILL.md §3.8/§10 — reuse the one Catalogue Picker, never a local mock). */
  contactId?: string | null;
  conversationId?: string | null;
}

/** Real, active, customer-visible items only — never a locally invented product list (SKILL.md §3.8). */
const SHAREABLE_ITEMS = catalogueItems.filter((item) => item.status === 'active' && item.customerVisible);

const TABS = [
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'document', label: 'Document' },
  { id: 'catalogue', label: 'Catalogue' },
];

function UploadZone({
  accept,
  hint,
  fileType,
  onFileSelected,
}: {
  accept: string;
  hint: string;
  fileType: 'image' | 'video' | 'document';
  onFileSelected: (f: AttachmentFile) => void;
}) {
  const [preview, setPreview] = useState<AttachmentFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const mockFile: AttachmentFile = {
      name: file.name,
      size: `${(file.size / 1024).toFixed(0)} KB`,
      type: fileType,
      previewUrl: fileType === 'image' ? URL.createObjectURL(file) : undefined,
    };
    setPreview(mockFile);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      {!preview ? (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--crm-border)', borderRadius: 10, padding: 32,
            textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
          }}
          onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--crm-text-brand)'; }}
          onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--crm-border)'; }}
        >
          <Upload size={28} style={{ color: 'var(--crm-text-muted)', display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13, color: 'var(--crm-text-secondary)', marginBottom: 4 }}>
            Click to browse or drag & drop
          </div>
          <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>{hint}</div>
          <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleChange} />
        </div>
      ) : (
        <div style={{ border: '1px solid var(--crm-border)', borderRadius: 8, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--crm-text-primary)' }}>{preview.name}</div>
              <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>{preview.size}</div>
            </div>
            <button
              onClick={() => setPreview(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
          {preview.previewUrl && (
            <img
              src={preview.previewUrl}
              alt="preview"
              style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, objectFit: 'cover', display: 'block' }}
            />
          )}
          <div style={{ marginTop: 12 }}>
            <Button variant="primary" size="sm" onClick={() => onFileSelected(preview)}>
              Send {fileType === 'image' ? 'Image' : fileType === 'video' ? 'Video' : 'Document'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogueTab({
  onSend,
  contactId,
  conversationId,
}: {
  onSend: (file: AttachmentFile) => void;
  contactId?: string | null;
  conversationId?: string | null;
}) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const filtered = SHAREABLE_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(search.toLowerCase()),
  );

  function openFullPicker() {
    const extra: Record<string, string> = { source: 'inbox', mode: 'multi' };
    if (contactId) extra.contactId = contactId;
    if (conversationId) extra.conversationId = conversationId;
    navigate(scopedHref('/catalogue-orders/picker', extra));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
      <input
        type="text"
        placeholder="Search catalogue items…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '6px 10px',
          border: '1px solid var(--crm-border)', borderRadius: 6,
          fontSize: 12, background: 'var(--crm-bg-secondary)', color: 'var(--crm-text-primary)',
        }}
      />
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--crm-text-muted)', fontSize: 12 }}>
          No catalogue items found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
          {filtered.slice(0, 20).map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', border: '1px solid var(--crm-border)', borderRadius: 8,
                background: 'var(--crm-bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--crm-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShoppingBag size={16} style={{ color: 'var(--crm-text-muted)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>
                    {item.sku} · <PriceDisplay price={item.price} />
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSend({ name: `Catalogue: ${item.title} — ${item.whatsappCaption}`, size: '', type: 'document' })}
              >
                Share
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button variant="ghost" size="sm" iconLeft={<ExternalLink size={14} />} onClick={openFullPicker}>
        Browse full Catalogue Picker (filters, hierarchy, multiple items)
      </Button>
      <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', marginTop: 4 }}>
        Catalogue managed in Catalogue &amp; Orders. Shared as a WhatsApp catalogue message.
      </div>
    </div>
  );
}

export function AttachmentPicker({ open, onClose, onSend, contactId, conversationId }: AttachmentPickerProps) {
  const [activeTab, setActiveTab] = useState('image');

  function handleSend(f: AttachmentFile) {
    onSend(f);
    onClose();
  }

  return (
    <Drawer open={open} title="Send Attachment" onClose={onClose}>
      <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} ariaLabel="Attachment type" />

      {activeTab === 'image' && (
        <UploadZone
          accept="image/*"
          hint="JPEG, PNG, WebP — max 5 MB"
          fileType="image"
          onFileSelected={handleSend}
        />
      )}
      {activeTab === 'video' && (
        <UploadZone
          accept="video/mp4,video/3gp"
          hint="MP4 or 3GP — max 16 MB"
          fileType="video"
          onFileSelected={handleSend}
        />
      )}
      {activeTab === 'document' && (
        <UploadZone
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          hint="PDF, Office formats — max 100 MB"
          fileType="document"
          onFileSelected={handleSend}
        />
      )}
      {activeTab === 'catalogue' && <CatalogueTab onSend={handleSend} contactId={contactId} conversationId={conversationId} />}
    </Drawer>
  );
}
