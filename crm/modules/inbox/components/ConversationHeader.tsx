import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  MoreHorizontal,
  UserCheck,
  Tag,
  ChevronDown,
  Activity,
  Sparkles,
  ChevronLeft,
  Users,
  Phone,
  Zap,
  BarChart2,
  Settings,
} from 'lucide-react';
import { Avatar, IconButton } from '@crm/design-system';
import { contacts, findUser, findWhatsAppNumber } from '@crm/mock-data';

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}
import type { InboxConversation } from '../inbox-types';
import { findLabel } from '../inbox-mock-data';
import { ResponseWindowBadge } from './ResponseWindowBadge';
import { SlaIndicator } from './SlaIndicator';
import type { InboxRoleCapabilities } from '../inbox-types';

interface ConversationHeaderProps {
  conversation: InboxConversation;
  policy: InboxRoleCapabilities;
  onOpenAssign: () => void;
  onOpenStatus: () => void;
  onOpenLabels: () => void;
  onOpenActivity: () => void;
  onOpenAiTasks: () => void;
  onOpenHandoff: () => void;
  onOpenMenu: () => void;
  onOpenCustomerContext?: () => void;
  onBack?: () => void;
}

export function ConversationHeader({
  conversation: c,
  policy,
  onOpenAssign,
  onOpenStatus,
  onOpenLabels,
  onOpenActivity,
  onOpenAiTasks,
  onOpenHandoff,
  onOpenMenu: _onOpenMenu,
  onOpenCustomerContext,
  onBack,
}: ConversationHeaderProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const contact = c.contactId ? contacts.find((ct) => ct.id === c.contactId) : null;
  const assignee = c.assigneeId ? findUser(c.assigneeId) : null;
  const waNumber = findWhatsAppNumber(c.whatsappNumberId);
  const displayName = contact?.name ?? c.rawMobile ?? 'Unknown';

  const statusClasses: Record<string, string> = {
    open: 'crm-conv-header__status-badge--open',
    pending: 'crm-conv-header__status-badge--pending',
    resolved: 'crm-conv-header__status-badge--resolved',
  };

  return (
    <header className="crm-conv-header">
      {onBack && (
        <button className="crm-inbox-back-btn" onClick={onBack}>
          <ChevronLeft size={14} /> Back
        </button>
      )}
      {c.botOwned && (
        <div className="crm-conv-header__bot-banner">
          <Bot size={13} />
          Bot-managed conversation — awaiting handoff to a human agent
          {policy.canHandoffBot && (
            <button
              onClick={onOpenHandoff}
              style={{
                marginLeft: 8,
                color: 'var(--crm-on-dark)',
                fontWeight: 600,
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 'inherit',
              }}
            >
              Handoff
            </button>
          )}
        </div>
      )}

      <div className="crm-conv-header__top">
        <div className="crm-conv-header__identity">
          <div className="crm-conv-header__avatar-wrap">
            <Avatar initials={nameInitials(displayName)} name={displayName} size="md" />
            {c.botOwned && (
              <span className="crm-conv-header__bot-badge">
                <Bot />
              </span>
            )}
          </div>
          <div className="crm-conv-header__name-block">
            <div className="crm-conv-header__name">
              {displayName}
              {c.isSpam && (
                <span style={{ fontSize: 10, background: 'var(--crm-danger-tint)', color: 'var(--crm-danger)', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>
                  SPAM
                </span>
              )}
            </div>
            {waNumber && (
              <div className="crm-conv-header__number-name">
                via {waNumber.displayName}
              </div>
            )}
          </div>
        </div>

        <div className="crm-conv-header__actions">
          {c.aiTaskCount > 0 && (
            <IconButton
              label={`AI suggestions (${c.aiTaskCount})`}
              icon={<Sparkles size={16} />}
              onClick={onOpenAiTasks}
            />
          )}
          <IconButton label="Activity" icon={<Activity size={16} />} onClick={onOpenActivity} />
          {onOpenCustomerContext && (
            <IconButton label="Customer context" icon={<Users size={16} />} onClick={onOpenCustomerContext} />
          )}
          <div style={{ position: 'relative' }}>
            <IconButton label="More options" icon={<MoreHorizontal size={16} />} onClick={() => setMenuOpen((o) => !o)} />
            {menuOpen && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 100,
                  background: 'var(--crm-bg-primary)', border: '1px solid var(--crm-border)',
                  borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 200, overflow: 'hidden',
                }}
              >
                {[
                  { icon: <Phone size={13} />, label: 'Schedule call', path: `/calling?sourceModule=inbox&contactId=${c.contactId ?? ''}&conversationId=${c.id}&returnTo=/inbox` },
                  { icon: <Zap size={13} />, label: 'Automation', path: `/automation?sourceModule=inbox&conversationId=${c.id}&returnTo=/inbox` },
                  { icon: <BarChart2 size={13} />, label: 'Reports', path: `/reports?sourceModule=inbox&returnTo=/inbox` },
                  { icon: <Settings size={13} />, label: 'Inbox settings', path: `/settings?section=inbox-config&returnTo=/inbox` },
                ].map(({ icon, label, path }) => (
                  <button
                    key={label}
                    onClick={() => { setMenuOpen(false); navigate(path); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                      padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--crm-text-primary)', borderBottom: '1px solid var(--crm-border-subtle)',
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--crm-bg-secondary)'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                  >
                    <span style={{ color: 'var(--crm-text-muted)' }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="crm-conv-header__meta">
        {/* Status */}
        <div className="crm-conv-header__meta-item">
          <button
            className={`crm-conv-header__status-badge ${statusClasses[c.status]}`}
            onClick={onOpenStatus}
          >
            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
            <ChevronDown size={10} style={{ marginLeft: 2 }} />
          </button>
        </div>

        {/* Assignee */}
        <div className="crm-conv-header__meta-item">
          <button onClick={policy.canReassign ? onOpenAssign : undefined} style={{ cursor: policy.canReassign ? 'pointer' : 'default' }}>
            <UserCheck size={11} />
            {assignee ? assignee.name : 'Unassigned'}
            {policy.canReassign && <ChevronDown size={10} />}
          </button>
        </div>

        {/* Response window */}
        <div className="crm-conv-header__meta-item">
          <ResponseWindowBadge window={c.responseWindow} />
        </div>

        {/* SLA */}
        <div className="crm-conv-header__meta-item">
          <SlaIndicator sla={c.sla} compact />
        </div>

        {/* Labels */}
        <div className="crm-conv-header__meta-item">
          <div className="crm-conv-header__labels">
            {c.labelIds.map((lid) => {
              const label = findLabel(lid);
              if (!label) return null;
              return (
                <span
                  key={lid}
                  className="crm-conv-header__label-pill"
                  style={{
                    background: `${label.color}18`,
                    color: label.color,
                    borderColor: `${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              );
            })}
            <button onClick={onOpenLabels} style={{ display: 'flex', alignItems: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--crm-text-muted)', padding: '1px 4px', borderRadius: 4 }}>
              <Tag size={11} />
              {c.labelIds.length === 0 ? 'Add label' : ''}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
