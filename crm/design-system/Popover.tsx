import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { IconButton } from './IconButton';

export interface PopoverProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Lightweight anchored panel for short-lived choices (filters, saved views,
 * quick actions) — lighter-weight than Drawer/Modal (CLAUDE.md §4). Renders
 * near the page header; a full backdrop keeps focus contained and closes on
 * outside click or Escape.
 */
export function Popover({ open, title, onClose, footer, children }: PopoverProps) {
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
    <div className="crm-popover-layer">
      <button className="crm-popover__backdrop" aria-label="Close" onClick={onClose} />
      <div className="crm-popover" role="dialog" aria-modal="true" aria-label={title}>
        <header className="crm-popover__header">
          <h2 className="crm-popover__title">{title}</h2>
          <IconButton label="Close" icon={<X />} size="sm" onClick={onClose} />
        </header>
        <div className="crm-popover__body">{children}</div>
        {footer ? <footer className="crm-popover__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
