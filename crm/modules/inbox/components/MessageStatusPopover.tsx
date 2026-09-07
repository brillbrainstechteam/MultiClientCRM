import { CheckCheck, Check, Clock, AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';
import { Popover, Button } from '@crm/design-system';
import type { InboxMessage, MessageStatus } from '../inbox-types';

// ---- S22: Message Status Detail -------------------------------------------

interface MessageStatusPopoverProps {
  open: boolean;
  message: InboxMessage | null;
  onClose: () => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function StatusRow({ label, time, reached }: { label: string; time: string | null; reached: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--crm-border)' }}>
      <div style={{ width: 22, textAlign: 'center' }}>
        {reached ? (
          <CheckCheck size={14} style={{ color: 'var(--crm-success)' }} />
        ) : (
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--crm-border)', display: 'inline-block' }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: reached ? 'var(--crm-text-primary)' : 'var(--crm-text-muted)' }}>{label}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', textAlign: 'right' }}>
        {time ? formatTime(time) : '—'}
      </div>
    </div>
  );
}

export function MessageStatusPopover({ open, message, onClose }: MessageStatusPopoverProps) {
  if (!message) return null;

  const { statusDetail: sd } = message;

  return (
    <Popover open={open} title="Message Status" onClose={onClose}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
          Delivery status for this message. Read receipts depend on the recipient's WhatsApp privacy settings.
        </div>

        {/* Status timeline */}
        <StatusRow label="Sent" time={sd.sentAt} reached={!!sd.sentAt} />
        <StatusRow label="Delivered" time={sd.deliveredAt} reached={!!sd.deliveredAt} />
        <StatusRow label="Read" time={sd.readAt} reached={!!sd.readAt} />

        {sd.failedAt && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--crm-danger-tint)', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={14} style={{ color: 'var(--crm-danger)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-danger)' }}>Delivery failed</div>
              {sd.failureReason && <div style={{ fontSize: 11, color: 'var(--crm-text-secondary)', marginTop: 2 }}>{sd.failureReason}</div>}
              {sd.failureCode && <div style={{ fontSize: 10, color: 'var(--crm-text-muted)', marginTop: 2 }}>Code: {sd.failureCode}</div>}
            </div>
          </div>
        )}
      </div>
    </Popover>
  );
}

// ---- S23: Message Failure Detail ------------------------------------------

interface MessageFailurePopoverProps {
  open: boolean;
  message: InboxMessage | null;
  onClose: () => void;
  onRetry: (messageId: string) => void;
}

const FAILURE_GUIDANCE: Record<string, { title: string; detail: string; action: string }> = {
  'number_not_on_whatsapp': {
    title: "Number not on WhatsApp",
    detail: "The recipient's number is not registered on WhatsApp. Verify the number is correct and the customer has an active WhatsApp account.",
    action: "Try a different number",
  },
  'opt_out': {
    title: "Customer opted out",
    detail: "The customer has blocked or opted out of WhatsApp messages from this number. You cannot send messages to this contact via WhatsApp.",
    action: "Use an alternative channel",
  },
  'message_expired': {
    title: "Message expired",
    detail: "The message could not be delivered within the allowed window. The customer's device may have been offline for an extended period.",
    action: "Resend the message",
  },
  'template_rejected': {
    title: "Template rejected",
    detail: "The template used in this message was rejected by WhatsApp. Review the template and resubmit for approval.",
    action: "Choose a different template",
  },
  'rate_limit': {
    title: "Rate limit exceeded",
    detail: "Too many messages were sent in a short period. WhatsApp has temporarily limited outbound messaging for this number.",
    action: "Retry after a few minutes",
  },
};

const DEFAULT_GUIDANCE = {
  title: "Message delivery failed",
  detail: "An unexpected error occurred while sending this message. Try resending or contact support if the issue persists.",
  action: "Retry sending",
};

export function MessageFailurePopover({ open, message, onClose, onRetry }: MessageFailurePopoverProps) {
  if (!message) return null;

  const code = message.statusDetail.failureCode ?? '';
  const guidance = FAILURE_GUIDANCE[code] ?? DEFAULT_GUIDANCE;

  return (
    <Popover
      open={open}
      title="Message Failed"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Dismiss</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onRetry(message.id);
              onClose();
            }}
          >
            <RotateCcw size={12} style={{ marginRight: 4 }} /> Retry
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Failure reason */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ color: 'var(--crm-danger)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--crm-danger)' }}>{guidance.title}</div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-secondary)', lineHeight: 1.4, marginTop: 4 }}>{guidance.detail}</div>
          </div>
        </div>

        {/* Error codes */}
        {(message.statusDetail.failureCode || message.statusDetail.failureReason) && (
          <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', background: 'var(--crm-bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
            {message.statusDetail.failureCode && <div>Code: {message.statusDetail.failureCode}</div>}
            {message.statusDetail.failureReason && <div>Reason: {message.statusDetail.failureReason}</div>}
            {message.statusDetail.failedAt && <div>Failed at: {formatTime(message.statusDetail.failedAt)}</div>}
          </div>
        )}

        {/* Suggested action */}
        <div style={{ fontSize: 12, color: 'var(--crm-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} style={{ color: 'var(--crm-text-muted)' }} />
          Recommended: {guidance.action}
        </div>

        {/* WhatsApp error reference */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ExternalLink size={11} style={{ color: 'var(--crm-text-muted)' }} />
          <span style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>
            WhatsApp error reference (opens in new tab)
          </span>
        </div>

        {/* Original message preview */}
        <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', background: 'var(--crm-bg-secondary)', padding: '8px 10px', borderRadius: 6, borderLeft: '3px solid var(--crm-danger)' }}>
          <div style={{ marginBottom: 2 }}>Original message:</div>
          <div style={{ color: 'var(--crm-text-secondary)' }}>{message.text || '(no text content)'}</div>
        </div>
      </div>
    </Popover>
  );
}

// ---- Tick icon helper used in MessageBubble --------------------------------

export function StatusTick({ status }: { status: MessageStatus }) {
  const style = { display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 };

  switch (status) {
    case 'sending':
      return <Clock size={11} style={{ ...style, color: 'var(--crm-text-muted)' }} />;
    case 'sent':
      return <Check size={11} style={{ ...style, color: 'var(--crm-text-muted)' }} />;
    case 'delivered':
      return <CheckCheck size={11} style={{ ...style, color: 'var(--crm-text-muted)' }} />;
    case 'read':
      return <CheckCheck size={11} style={{ ...style, color: 'var(--crm-text-brand)' }} />;
    case 'failed':
      return <AlertCircle size={11} style={{ ...style, color: 'var(--crm-danger)' }} />;
    default:
      return null;
  }
}
