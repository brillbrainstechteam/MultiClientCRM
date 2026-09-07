import { Bot, Clock, AlertTriangle } from 'lucide-react';
import { Avatar, Checkbox } from '@crm/design-system';
import { contacts, findUser } from '@crm/mock-data';
import type { InboxConversation } from '../inbox-types';
import { findLabel } from '../inbox-mock-data';

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

interface ConversationRowProps {
  conversation: InboxConversation;
  isActive: boolean;
  isBulkMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleBulk: (id: string, checked: boolean) => void;
}

function formatRelativeTime(iso: string): string {
  const now = new Date('2026-08-10T10:00:00+05:30');
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d`;
}

export function ConversationRow({
  conversation: c,
  isActive,
  isBulkMode,
  isSelected,
  onSelect,
  onToggleBulk,
}: ConversationRowProps) {
  const contact = c.contactId ? contacts.find((ct) => ct.id === c.contactId) : null;
  const assignee = c.assigneeId ? findUser(c.assigneeId) : null;
  const displayName = contact?.name ?? c.rawMobile ?? 'Unknown';
  const hasUnread = c.unreadCount > 0;

  const rowClasses = [
    'crm-conv-row',
    isActive ? 'crm-conv-row--active' : '',
    hasUnread ? 'crm-conv-row--unread' : '',
    c.isSpam ? 'crm-conv-row--spam' : '',
    c.responseWindow.status === 'expired' ? 'crm-conv-row--expired' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick() {
    if (isBulkMode) {
      onToggleBulk(c.id, !isSelected);
    } else {
      onSelect(c.id);
    }
  }

  return (
    <div className={rowClasses} onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
      {isBulkMode && (
        <div className="crm-conv-row__checkbox">
          <Checkbox
            checked={isSelected}
            onChange={(e) => onToggleBulk(c.id, e.target.checked)}
            label=""
          />
        </div>
      )}

      <div className="crm-conv-row__avatar">
        <Avatar
          initials={nameInitials(displayName)}
          name={displayName}
          size="sm"
        />
        {c.botOwned && (
          <span className="crm-conv-row__bot-badge" title="Bot-owned">
            <Bot />
          </span>
        )}
      </div>

      <div className="crm-conv-row__body">
        <div className="crm-conv-row__top">
          <span className="crm-conv-row__name">{displayName}</span>
          <span className="crm-conv-row__time">{formatRelativeTime(c.lastMessageAt)}</span>
        </div>

        <div className="crm-conv-row__middle">
          <span
            className={[
              'crm-conv-row__preview',
              c.preview.isNote ? 'crm-conv-row__preview--note' : '',
            ].filter(Boolean).join(' ')}
          >
            {c.preview.isNote ? '📝 Note: ' : ''}{c.preview.text}
          </span>
        </div>

        <div className="crm-conv-row__badges">
          {c.status === 'pending' && (
            <span className="crm-conv-row__status crm-conv-row__status--pending">Pending</span>
          )}
          {c.status === 'resolved' && (
            <span className="crm-conv-row__status crm-conv-row__status--resolved">Resolved</span>
          )}

          {c.responseWindow.status === 'expiring' && c.responseWindow.remainingMinutes !== null && (
            <span className="crm-conv-row__window crm-conv-row__window--expiring">
              <Clock size={9} /> {c.responseWindow.remainingMinutes}m
            </span>
          )}
          {c.responseWindow.status === 'expired' && (
            <span className="crm-conv-row__window crm-conv-row__window--expired">
              Window closed
            </span>
          )}

          {c.sla.status === 'warning' && c.sla.minutesRemaining !== null && (
            <span className="crm-conv-row__sla crm-conv-row__sla--warning">
              <AlertTriangle size={9} /> {c.sla.minutesRemaining}m
            </span>
          )}
          {c.sla.status === 'breached' && (
            <span className="crm-conv-row__sla crm-conv-row__sla--breached">
              <AlertTriangle size={9} /> SLA breach
            </span>
          )}

          {c.labelIds.slice(0, 2).map((lid) => {
            const label = findLabel(lid);
            if (!label) return null;
            return (
              <span
                key={lid}
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 999,
                  background: `${label.color}18`,
                  color: label.color,
                  fontWeight: 500,
                  border: `1px solid ${label.color}40`,
                }}
              >
                {label.name}
              </span>
            );
          })}

          {c.aiTaskCount > 0 && <span className="crm-conv-row__ai-dot" title="AI task pending" />}

          {assignee && (
            <span className="crm-conv-row__assignee">{assignee.initials}</span>
          )}
        </div>
      </div>

      {hasUnread && !isBulkMode && (
        <span className="crm-conv-row__unread-count">{c.unreadCount}</span>
      )}
    </div>
  );
}
