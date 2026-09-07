import {
  MessageSquare,
  UserCheck,
  UserX,
  Tag,
  CheckCircle2,
  Clock,
  Archive,
  RotateCcw,
  Bot,
  Sparkles,
  AlertTriangle,
  Lock,
  Handshake,
  Plus,
} from 'lucide-react';
import { Drawer, Avatar } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import { findLabel } from '../inbox-mock-data';
import type { ConversationActivityEvent, ConversationEventKind } from '../inbox-types';

interface ActivityDrawerProps {
  open: boolean;
  events: ConversationActivityEvent[];
  onClose: () => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date('2026-08-10T23:59:00+05:30');
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

interface EventConfig {
  icon: JSX.Element;
  color: string;
  bg: string;
}

function getEventConfig(kind: ConversationEventKind): EventConfig {
  const map: Partial<Record<ConversationEventKind, EventConfig>> = {
    'conversation-created': { icon: <Plus size={12} />, color: 'var(--crm-text-brand)', bg: 'var(--crm-green-tint, #f0faf0)' },
    'assignment': { icon: <UserCheck size={12} />, color: 'var(--crm-text-brand)', bg: 'var(--crm-green-tint, #f0faf0)' },
    'reassignment': { icon: <UserCheck size={12} />, color: 'var(--crm-text-brand)', bg: 'var(--crm-green-tint, #f0faf0)' },
    'unassignment': { icon: <UserX size={12} />, color: 'var(--crm-text-muted)', bg: 'var(--crm-bg-secondary)' },
    'label-add': { icon: <Tag size={12} />, color: '#b8892b', bg: '#fff8e6' },
    'label-remove': { icon: <Tag size={12} />, color: 'var(--crm-text-muted)', bg: 'var(--crm-bg-secondary)' },
    'status-open': { icon: <CheckCircle2 size={12} />, color: 'var(--crm-success)', bg: '#f0faf0' },
    'status-pending': { icon: <Clock size={12} />, color: 'var(--crm-warning)', bg: '#fffbf0' },
    'status-resolved': { icon: <Archive size={12} />, color: 'var(--crm-text-muted)', bg: 'var(--crm-bg-secondary)' },
    'status-reopen': { icon: <RotateCcw size={12} />, color: 'var(--crm-text-brand)', bg: 'var(--crm-green-tint, #f0faf0)' },
    'note-added': { icon: <Lock size={12} />, color: '#b8892b', bg: '#fff8e6' },
    'mention': { icon: <MessageSquare size={12} />, color: 'var(--crm-text-brand)', bg: 'var(--crm-green-tint, #f0faf0)' },
    'bot-started': { icon: <Bot size={12} />, color: '#6366f1', bg: '#ede9fe' },
    'bot-ended': { icon: <Bot size={12} />, color: 'var(--crm-text-muted)', bg: 'var(--crm-bg-secondary)' },
    'handoff-requested': { icon: <Handshake size={12} />, color: '#b8892b', bg: '#fff8e6' },
    'handoff-completed': { icon: <Handshake size={12} />, color: 'var(--crm-success)', bg: '#f0faf0' },
    'task-created': { icon: <Sparkles size={12} />, color: 'var(--crm-text-brand)', bg: 'var(--crm-green-tint, #f0faf0)' },
    'task-approved': { icon: <CheckCircle2 size={12} />, color: 'var(--crm-success)', bg: '#f0faf0' },
    'task-rejected': { icon: <AlertTriangle size={12} />, color: 'var(--crm-danger)', bg: 'var(--crm-danger-tint)' },
    'spam-marked': { icon: <AlertTriangle size={12} />, color: 'var(--crm-danger)', bg: 'var(--crm-danger-tint)' },
    'spam-cleared': { icon: <CheckCircle2 size={12} />, color: 'var(--crm-success)', bg: '#f0faf0' },
    'window-expiring': { icon: <Clock size={12} />, color: 'var(--crm-warning)', bg: '#fffbf0' },
    'window-expired': { icon: <AlertTriangle size={12} />, color: 'var(--crm-danger)', bg: 'var(--crm-danger-tint)' },
  };
  return map[kind] ?? { icon: <MessageSquare size={12} />, color: 'var(--crm-text-muted)', bg: 'var(--crm-bg-secondary)' };
}

function EventRow({ event }: { event: ConversationActivityEvent }) {
  const cfg = getEventConfig(event.kind);
  const actor = event.actorId ? findUser(event.actorId) : null;
  const label = event.labelId ? findLabel(event.labelId) : null;

  return (
    <div style={{ display: 'flex', gap: 10, paddingBottom: 14, position: 'relative' }}>
      {/* Connector line */}
      <div style={{ position: 'absolute', left: 16, top: 26, bottom: 0, width: 1, background: 'var(--crm-border-subtle)' }} />

      {/* Icon bubble */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, zIndex: 1,
        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 5 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1 }}>
            {/* Actor */}
            {actor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <Avatar initials={nameInitials(actor.name)} name={actor.name} size="sm" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{actor.name}</span>
              </div>
            )}
            {/* Description */}
            <div style={{ fontSize: 12, color: 'var(--crm-text-secondary)', lineHeight: 1.4 }}>
              {event.description}
            </div>
            {/* Label pill */}
            {label && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                padding: '1px 6px', borderRadius: 999, fontSize: 11,
                background: `${label.color}18`, color: label.color, border: `1px solid ${label.color}40`,
              }}>
                <Tag size={9} />
                {label.name}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'var(--crm-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {formatTimestamp(event.at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ActivityDrawer({ open, events, onClose }: ActivityDrawerProps) {
  const sorted = [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <Drawer open={open} title="Activity" onClose={onClose}>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--crm-text-muted)', fontSize: 13 }}>
          No activity recorded yet.
        </div>
      ) : (
        <div style={{ paddingTop: 8 }}>
          {sorted.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
          <div style={{ fontSize: 11, color: 'var(--crm-text-muted)', textAlign: 'center', paddingTop: 8 }}>
            Showing all {sorted.length} event{sorted.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </Drawer>
  );
}
