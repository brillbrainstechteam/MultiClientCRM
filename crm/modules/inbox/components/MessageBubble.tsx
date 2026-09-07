import { useState } from 'react';
import { CheckCheck, Check, AlertCircle, Bot, Lock, Reply, Forward } from 'lucide-react';
import { Avatar } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import type { InboxMessage } from '../inbox-types';

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

interface MessageBubbleProps {
  message: InboxMessage;
  /** Customer display name — used for the inbound avatar initials. */
  inboundName?: string;
  onShowStatus?: (messageId: string) => void;
  onShowFailure?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  onReply?: (message: InboxMessage) => void;
  onForward?: (message: InboxMessage) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatMentions(text: string, mentionedUserIds: string[]): React.ReactNode {
  if (mentionedUserIds.length === 0) return text;
  let result = text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  mentionedUserIds.forEach((uid) => {
    const user = findUser(uid);
    if (!user) return;
    const handle = `@${user.id}`;
    const displayHandle = `@${user.name.split(' ')[0]}`;
    const idx = result.indexOf(handle, lastIndex);
    if (idx === -1) return;
    parts.push(result.slice(lastIndex, idx));
    parts.push(
      <span key={uid} className="crm-msg-note__mention">
        {displayHandle}
      </span>,
    );
    lastIndex = idx + handle.length;
  });
  parts.push(result.slice(lastIndex));
  return parts;
}

function MessageStatus({ status, onClick }: { status: InboxMessage['status']; onClick?: () => void }) {
  if (status === 'sending') return <span className="crm-msg-status">···</span>;
  if (status === 'sent') return <span className="crm-msg-status" title="Sent"><Check size={11} /></span>;
  if (status === 'delivered') return (
    <span className="crm-msg-status" title="Delivered"><CheckCheck size={11} /></span>
  );
  if (status === 'read') return (
    <span className="crm-msg-status crm-msg-status--read" title="Read">
      <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <CheckCheck size={11} />
      </button>
    </span>
  );
  return null;
}

export function MessageBubble({ message: m, inboundName, onShowStatus, onShowFailure, onRetry, onReply, onForward }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  // System / event messages
  if (m.kind === 'system') {
    return (
      <div className="crm-msg-system">
        <div className="crm-msg-system__pill">
          <Lock size={9} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {m.text}
        </div>
      </div>
    );
  }

  // Internal notes
  if (m.isNote) {
    const author = m.sentById ? findUser(m.sentById) : null;
    return (
      <div className="crm-msg-note">
        <div className="crm-msg-note__body">
          <div className="crm-msg-note__label">
            <Lock size={10} />
            Internal note — {author?.name ?? 'Team'}
            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--crm-gold-dark)', opacity: 0.8 }}>
              {formatTime(m.at)}
            </span>
          </div>
          <div className="crm-msg-note__text">
            {formatMentions(m.text, m.mentionedUserIds)}
          </div>
        </div>
      </div>
    );
  }

  // Failed messages
  if (m.status === 'failed') {
    return (
      <div className="crm-msg-bubble crm-msg-bubble--outbound crm-msg-bubble--failed">
        <div className="crm-msg-bubble__content">
          <div className="crm-msg-bubble__bubble">
            <AlertCircle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            {m.text}
          </div>
          <div className="crm-msg-bubble__fail-row">
            <AlertCircle size={11} />
            Not delivered
            <button
              className="crm-msg-bubble__retry-btn"
              onClick={() => onShowFailure?.(m.id)}
            >
              Details
            </button>
            <button
              className="crm-msg-bubble__retry-btn"
              onClick={() => onRetry?.(m.id)}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Automated / bot messages
  if (m.isAutomated || m.kind === 'bot') {
    const isBotKind = m.kind === 'bot';
    return (
      <div className={`crm-msg-bubble crm-msg-bubble--outbound crm-msg-bubble--${isBotKind ? 'bot' : 'automated'}`}>
        <div className="crm-msg-bubble__avatar">
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--crm-navy-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={13} color="white" />
          </span>
        </div>
        <div className="crm-msg-bubble__content">
          <div className="crm-msg-bubble__bubble" style={{ whiteSpace: 'pre-wrap' }}>
            {m.text}
          </div>
          <div className="crm-msg-bubble__meta">
            <span>{isBotKind ? 'Bot' : 'Automated'}</span>
            <span>{formatTime(m.at)}</span>
            <MessageStatus status={m.status} onClick={() => onShowStatus?.(m.id)} />
          </div>
        </div>
      </div>
    );
  }

  // Regular inbound / outbound messages
  const isOutbound = m.direction === 'outbound';
  const sender = m.sentById ? findUser(m.sentById) : null;

  return (
    <div
      className={`crm-msg-bubble crm-msg-bubble--${isOutbound ? 'outbound' : 'inbound'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      {!isOutbound && (
        <div className="crm-msg-bubble__avatar">
          <Avatar
            initials={inboundName ? nameInitials(inboundName) : 'CU'}
            name={inboundName ?? 'Customer'}
            size="sm"
          />
        </div>
      )}
      {isOutbound && sender && (
        <div className="crm-msg-bubble__avatar">
          <Avatar initials={nameInitials(sender.name)} name={sender.name} size="sm" />
        </div>
      )}

      <div className="crm-msg-bubble__content">
        <div className="crm-msg-bubble__bubble" style={{ whiteSpace: 'pre-wrap' }}>
          {m.text}
        </div>
        <div className="crm-msg-bubble__meta">
          {isOutbound && sender && <span>{sender.name.split(' ')[0]}</span>}
          <span>{formatTime(m.at)}</span>
          {isOutbound && (
            <MessageStatus status={m.status} onClick={() => onShowStatus?.(m.id)} />
          )}
        </div>
      </div>

      {/* Hover actions */}
      {hovered && (onReply || onForward) && (
        <div className="crm-msg-bubble__actions" style={{ [isOutbound ? 'right' : 'left']: '100%' }}>
          {onReply && (
            <button
              className="crm-msg-bubble__action-btn"
              title="Reply"
              onClick={() => onReply(m)}
            >
              <Reply size={12} />
            </button>
          )}
          {onForward && (
            <button
              className="crm-msg-bubble__action-btn"
              title="Forward"
              onClick={() => onForward(m)}
            >
              <Forward size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="crm-msg-day-sep">
      <div className="crm-msg-day-sep__line" />
      <span className="crm-msg-day-sep__label">{label}</span>
      <div className="crm-msg-day-sep__line" />
    </div>
  );
}
