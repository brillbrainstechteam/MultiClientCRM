import { AlertTriangle, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';
import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  /** `lg` widens the panel for content-heavy modals (e.g. a hosted wizard step). Defaults to the original fixed 460px. */
  size?: 'md' | 'lg';
}

/** Centered modal base. ConfirmDialog builds on it for irreversible actions. */
export function Modal({ open, title, onClose, footer, children, size = 'md' }: ModalProps) {
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
    <div className="crm-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button className="crm-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className={`crm-modal__panel${size === 'lg' ? ' crm-modal__panel--lg' : ''}`}>
        <header className="crm-modal__header">
          <h2 className="crm-modal__title">{title}</h2>
          <IconButton label="Close" icon={<X />} onClick={onClose} />
        </header>
        <div className="crm-modal__body">{children}</div>
        {footer ? <footer className="crm-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive/irreversible actions. */
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

/** High-risk / irreversible confirmation (CON-S18 pattern). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="crm-confirm">
        {tone === 'danger' ? (
          <span className="crm-confirm__icon" aria-hidden="true">
            <AlertTriangle />
          </span>
        ) : null}
        <div className="crm-confirm__message">{message}</div>
      </div>
    </Modal>
  );
}
