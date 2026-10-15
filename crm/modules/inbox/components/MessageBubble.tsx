import { useState } from 'react';
import { CheckCheck, Check, AlertCircle, Bot, Lock, Reply, Forward, Smartphone, ImageOff, Megaphone, Sparkles, History, FileText, Download, MapPin, Play } from 'lucide-react';
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

/**
 * The attachment itself.
 *
 * Images render inline because that is how they are used — a customer sends a
 * photo of a design and the agent needs to see it without a round trip.
 * Everything else gets a labelled row that opens or downloads, since a video or
 * a PDF inline would push the conversation off the screen.
 */
function Attachment({ m }: { m: InboxMessage }) {
  if (!m.attachmentUrl) return null;

  if (m.kind === 'image') {
    return (
      <a className="crm-msg-media" href={m.attachmentUrl} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.attachmentUrl} alt={m.attachmentName ?? 'Shared photo'} loading="lazy" />
      </a>
    );
  }

  const Icon = m.kind === 'video' ? Play : m.kind === 'audio' ? Play : FileText;
  const label = m.kind === 'video' ? 'Video'
    : m.kind === 'audio' ? 'Voice message'
    : m.attachmentName || 'Document';

  return (
    <a className="crm-msg-file" href={m.attachmentUrl} target="_blank" rel="noreferrer">
      <Icon size={15} aria-hidden="true" />
      <span className="crm-msg-file__name">{label}</span>
      <Download size={13} aria-hidden="true" className="crm-msg-file__dl" />
    </a>
  );
}

/** A shared location, opened in a map rather than printed as coordinates. */
function LocationLink({ m }: { m: InboxMessage }) {
  if (m.latitude == null || m.longitude == null) return null;
  const href = `https://www.google.com/maps/search/?api=1&query=${m.latitude},${m.longitude}`;
  return (
    <a className="crm-msg-file" href={href} target="_blank" rel="noreferrer">
      <MapPin size={15} aria-hidden="true" />
      <span className="crm-msg-file__name">Open in Maps</span>
    </a>
  );
}

/**
 * Where a message came from, when that is not obvious.
 *
 * Only shown when it changes how an agent should read the thread. A customer's
 * own message and a reply typed here need no explanation; a reply the owner
 * sent from their phone, or a line backfilled from WhatsApp history, very much
 * do — otherwise the agent sees answers nobody on the team appears to have
 * written.
 */
const SOURCE_BADGE: Partial<Record<NonNullable<InboxMessage['source']>, { label: string; icon: typeof Smartphone }>> = {
  whatsapp_business_app: { label: 'Sent from phone', icon: Smartphone },
  history_import: { label: 'Imported history', icon: History },
  external_crm_import: { label: 'Imported', icon: History },
  campaign: { label: 'Campaign', icon: Megaphone },
  ai_agent: { label: 'AI agent', icon: Sparkles },
};

function SourceBadge({ source }: { source?: InboxMessage['source'] }) {
  const badge = source ? SOURCE_BADGE[source] : undefined;
  if (!badge) return null;
  const Icon = badge.icon;
  return (
    <span className={`crm-msg-source crm-msg-source--${source}`}>
      <Icon size={10} aria-hidden="true" />
      {badge.label}
    </span>
  );
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

  // Media WhatsApp can no longer hand over. History reaches 180 days but media
  // only about 14, so the rest arrive as a record of what was sent. Showing a
  // broken thumbnail here would read as a bug in the CRM rather than a limit of
  // the import.
  if (m.mediaUnavailable) {
    return (
      <div className={`crm-msg-bubble crm-msg-bubble--${m.direction === 'outbound' ? 'outbound' : 'inbound'}`}>
        <div className="crm-msg-bubble__content">
          <div className="crm-msg-missing">
            <ImageOff size={15} aria-hidden="true" />
            <span className="crm-msg-missing__text">
              <span className="crm-msg-missing__title">Older WhatsApp attachment</span>
              <span className="crm-msg-missing__sub">
                The original file is no longer available through the history import.
              </span>
            </span>
          </div>
          <div className="crm-msg-bubble__meta">
            <SourceBadge source={m.source} />
            <span>{formatTime(m.at)}</span>
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
      className={`crm-msg-bubble crm-msg-bubble--${isOutbound ? 'outbound' : 'inbound'}${m.isHistorical ? ' crm-msg-bubble--historical' : ''}`}
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
          <Attachment m={m} />
          <LocationLink m={m} />
          {m.text}
        </div>
        <div className="crm-msg-bubble__meta">
          {isOutbound && sender && <span>{sender.name.split(' ')[0]}</span>}
          <SourceBadge source={m.source} />
          <span>{formatTime(m.at)}</span>
          {/* Imported messages carry WhatsApp's own status, not ours — a tick
              against a six-month-old line would be meaningless. */}
          {isOutbound && !m.isHistorical && (
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

/**
 * Marks where imported history ends and the live conversation begins.
 *
 * Without it an agent cannot tell which part of a thread their team actually
 * handled and which came off someone's phone before TalkTrack existed.
 */
export function HistoryDivider({ from }: { from?: string | null }) {
  const since = from
    ? new Date(from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;
  return (
    <div className="crm-msg-day-sep crm-msg-day-sep--history">
      <div className="crm-msg-day-sep__line" />
      <span className="crm-msg-day-sep__label">
        <History size={11} aria-hidden="true" />
        {since ? `Imported from WhatsApp — since ${since}` : 'Imported from WhatsApp'}
      </span>
      <div className="crm-msg-day-sep__line" />
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
