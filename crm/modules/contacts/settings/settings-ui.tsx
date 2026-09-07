import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@crm/design-system';

/** Screen header inside the shared Settings shell. */
export function SettingsHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="crm-set-header">
      <h2 className="crm-set-title">{title}</h2>
      <p className="crm-set-desc">{description}</p>
    </div>
  );
}

/** A titled configuration card. `action` sits top-right (e.g. an Add button). */
export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="crm-set-section">
      <div className="crm-set-section__head">
        <div>
          <h3 className="crm-set-section__title">{title}</h3>
          {description ? <p className="crm-set-section__desc">{description}</p> : null}
        </div>
        {action ? <div className="crm-set-section__action">{action}</div> : null}
      </div>
      <div className="crm-set-section__body">{children}</div>
    </section>
  );
}

/** A labelled key/value/control row for configuration forms. */
export function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="crm-set-row">
      <div className="crm-set-row__label">
        <span>{label}</span>
        {hint ? <span className="crm-set-row__hint">{hint}</span> : null}
      </div>
      <div className="crm-set-row__control">{children}</div>
    </div>
  );
}

/** A cross-module reference banner (e.g. "managed in Team & Access"). */
export function ReferenceNote({ children }: { children: ReactNode }) {
  return <p className="crm-set-refnote">{children}</p>;
}

/**
 * Query-driven dependency warning for destructive configuration changes. Open
 * with `?confirm=<key>&label=<name>`; each screen supplies the copy for its key.
 * Reproducible by URL for capture; Cancel/Confirm both clear the params.
 */
export function DependencyDialog({
  copies,
}: {
  copies: Record<string, (label: string) => { title: string; message: ReactNode; confirm: string }>;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const key = searchParams.get('confirm');
  const label = searchParams.get('label') ?? '';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('confirm');
      next.delete('label');
      return next;
    });

  if (!key || !copies[key]) return null;
  const copy = copies[key](label);

  return (
    <ConfirmDialog
      open
      title={copy.title}
      message={copy.message}
      confirmLabel={copy.confirm}
      tone="danger"
      onConfirm={close}
      onCancel={close}
    />
  );
}

/** Helper to build a `?confirm=` opener bound to the current search params. */
export function useConfirmOpener() {
  const [, setSearchParams] = useSearchParams();
  return (key: string, label: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('confirm', key);
      next.set('label', label);
      return next;
    });
}
