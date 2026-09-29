import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@crm/design-system';
import './ShowroomGallery.css';

interface GalleryImage {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  caption: string | null;
  createdAt: string;
  url: string;
}

interface StorageStatus { driver: string; ready: boolean; detail: string }

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Showroom photos for a contact — what their store or counter actually looks
 * like, so a rep walks into a call already knowing the client.
 */
export function ShowroomGallery({ contactId, contactName }: { contactId: string; contactName: string }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/images`, { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not load photos.');
      setImages(data.images ?? []);
      setStorage(data.storage ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load photos.');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => { void load(); }, [load]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const fileBase64 = await readAsBase64(file);
        const res = await fetch(`/api/crm/contacts/${contactId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ fileBase64, mimeType: file.type, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Could not upload ${file.name}.`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const remove = async (image: GalleryImage) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/crm/files/${image.id}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not delete.');
      setImages((prev) => prev.filter((i) => i.id !== image.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  };

  const blocked = storage && !storage.ready;

  return (
    <div className="sg">
      <div className="sg-head">
        <div>
          <h3 className="sg-title">Showroom photos</h3>
          <p className="sg-sub">
            {images.length ? `${images.length} photo${images.length === 1 ? '' : 's'} of ${contactName}'s showroom` : `Store fronts, counters and displays for ${contactName}`}
          </p>
        </div>
        <Button variant="secondary" iconLeft={<ImagePlus />} disabled={busy || !!blocked} onClick={() => fileInput.current?.click()}>
          {busy ? 'Uploading…' : 'Add photos'}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          multiple
          hidden
          onChange={(e) => void upload(e.target.files)}
        />
      </div>

      {blocked ? <p className="sg-notice">Photo storage is not configured on this server. {storage?.detail}</p> : null}
      {error ? <p className="sg-error">{error}</p> : null}

      {loading ? (
        <p className="sg-sub">Loading photos…</p>
      ) : images.length === 0 ? (
        <p className="sg-empty">No photos yet. Add showroom pictures so the team can see the store before a call or visit.</p>
      ) : (
        <ul className="sg-grid">
          {images.map((image) => (
            <li key={image.id} className="sg-item">
              <a href={image.url} target="_blank" rel="noopener noreferrer">
                <img src={image.url} alt={image.caption ?? image.fileName} loading="lazy" />
              </a>
              <div className="sg-meta">
                <span title={image.fileName}>{image.fileName}</span>
                <span>{kb(image.size)}</span>
              </div>
              <button className="sg-del" disabled={busy} onClick={() => void remove(image)} title="Delete photo" aria-label={`Delete ${image.fileName}`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
