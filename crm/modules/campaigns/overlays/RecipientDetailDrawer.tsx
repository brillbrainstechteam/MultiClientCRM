import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Drawer } from '@crm/design-system';
import { recipientStatusLabel, recipientStatusTone, formatDateTime } from '../campaigns-labels';
import type { RecipientRecord } from '../domain/types';

const timelineSteps: { key: keyof RecipientRecord; label: string }[] = [
  { key: 'sentAt', label: 'Sent' },
  { key: 'deliveredAt', label: 'Delivered' },
  { key: 'readAt', label: 'Read' },
  { key: 'repliedAt', label: 'Replied' },
];

/**
 * CAM-DR02 — Recipient Detail. One recipient's full outcome, with an Open
 * Chat handoff to Inbox (Campaigns consumes but does not own Inbox
 * conversations — CLAUDE.md §Module boundaries).
 */
export function RecipientDetailDrawer({
  open,
  recipient,
  onClose,
  returnTo,
}: {
  open: boolean;
  recipient: RecipientRecord | undefined;
  onClose: () => void;
  returnTo: string;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  if (!recipient) return null;

  return (
    <Drawer open={open} title={recipient.name} subtitle={recipient.mobile} onClose={onClose}>
      <div className="crm-camp-recipient-drawer">
        <Badge tone={recipientStatusTone[recipient.status]}>{recipientStatusLabel[recipient.status]}</Badge>

        {recipient.status === 'failed' ? (
          <div className="crm-camp-recipient-drawer__reason">
            <p className="crm-camp-recipient-drawer__reason-label">
              Failure reason {recipient.failureCategory ? `(${recipient.failureCategory})` : ''}
            </p>
            <p>{recipient.failureReason ?? 'No reason recorded.'}</p>
          </div>
        ) : null}

        {recipient.status === 'excluded' ? (
          <div className="crm-camp-recipient-drawer__reason">
            <p className="crm-camp-recipient-drawer__reason-label">Excluded because</p>
            <p>{recipient.excludedReason ?? 'No reason recorded.'}</p>
          </div>
        ) : null}

        <div className="crm-camp-recipient-drawer__timeline">
          <p className="crm-camp-recipient-drawer__reason-label">Timeline</p>
          <ul>
            {timelineSteps.map((step) => {
              const at = recipient[step.key] as string | undefined;
              return (
                <li key={step.key} className={at ? 'is-reached' : ''}>
                  <span>{step.label}</span>
                  <span>{at ? formatDateTime(at) : '—'}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <Button
          variant="secondary"
          iconLeft={<MessageCircle />}
          onClick={() => navigate(scopedHref('/inbox', { contactId: recipient.contactId, returnTo }))}
        >
          Open Chat
        </Button>
      </div>
    </Drawer>
  );
}
