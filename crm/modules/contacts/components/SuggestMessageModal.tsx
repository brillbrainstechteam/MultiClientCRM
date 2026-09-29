import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Button, Modal } from '@crm/design-system';
import type { StarterTemplate } from '@crm/modules/templates/data/starter-library';
import './SuggestMessageModal.css';

/**
 * Shows the ready template that fits a journey touchpoint so a person can read
 * it, copy it and send it themselves. Nothing is ever sent from here — the
 * WhatsApp link only opens the chat with the text prefilled, and the rep still
 * presses send.
 */
export function SuggestMessageModal({
  open,
  stepLabel,
  template,
  contactName,
  contactMobile,
  onClose,
}: {
  open: boolean;
  stepLabel: string;
  template: StarterTemplate | null;
  contactName: string;
  contactMobile: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!open || !template) return null;

  const body = template.body;
  const digits = (contactMobile ?? '').replace(/\D/g, '');
  const waHref = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(body)}` : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open
      title={`Suggested message · ${stepLabel}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" iconLeft={<Copy />} onClick={copy}>{copied ? 'Copied' : 'Copy text'}</Button>
          {waHref ? (
            <a className="sm-wa" href={waHref} target="_blank" rel="noopener noreferrer">
              Open WhatsApp <ExternalLink size={14} />
            </a>
          ) : null}
        </>
      }
    >
      <div className="sm">
        <p className="sm-meta">
          <strong>{template.name}</strong> · {template.category}
        </p>
        <p className="sm-when">{template.whenToUse}</p>
        <pre className="sm-body">{body}</pre>
        <p className="sm-note">
          Review and personalise before sending to {contactName}. TalkTrack never sends this for you —
          opening WhatsApp just prefills the chat.
        </p>
      </div>
    </Modal>
  );
}
