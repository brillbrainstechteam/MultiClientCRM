import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { IconButton } from './IconButton';

export interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Called on backdrop click, Escape, or the close button. */
  onClose: () => void;
  /** `standard` for edits, `wide` for import/merge style content. */
  width?: 'standard' | 'wide';
  /** Footer actions (typically Cancel + primary). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Single right-side drawer base for the whole app. Overlays preserve context
 * (the page stays mounted behind it) and always expose a clear close path.
 */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  width = 'standard',
  footer,
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="crm-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="crm-drawer__backdrop" aria-label="Close" onClick={onClose} />
      <div className={`crm-drawer__panel crm-drawer__panel--${width}`}>
        <header className="crm-drawer__header">
          <div className="crm-drawer__heading">
            <h2 className="crm-drawer__title">{title}</h2>
            {subtitle ? <p className="crm-drawer__subtitle">{subtitle}</p> : null}
          </div>
          <IconButton label="Close" icon={<X />} onClick={onClose} />
        </header>
        <div className="crm-drawer__body">{children}</div>
        {footer ? <footer className="crm-drawer__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
