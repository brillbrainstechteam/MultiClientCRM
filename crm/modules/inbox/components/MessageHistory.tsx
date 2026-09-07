import { useEffect, useRef } from 'react';
import { LoadingSkeleton } from '@crm/design-system';
import type { InboxMessage } from '../inbox-types';
import { MessageBubble, DaySeparator } from './MessageBubble';

interface MessageHistoryProps {
  messages: InboxMessage[];
  /** Customer display name — used for inbound avatar initials. */
  inboundName?: string;
  isLoading?: boolean;
  focusMessageId?: string;
  onShowStatus: (messageId: string) => void;
  onShowFailure: (messageId: string) => void;
  onRetry: (messageId: string) => void;
  onReply?: (message: InboxMessage) => void;
  onForward?: (message: InboxMessage) => void;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const ref = new Date('2026-08-10T00:00:00+05:30');
  const diffDays = Math.floor((ref.getTime() - d.getTime()) / 86400000);
  if (diffDays < 1) return 'Today';
  if (diffDays < 2) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}


export function MessageHistory({
  messages,
  inboundName,
  isLoading,
  focusMessageId,
  onShowStatus,
  onShowFailure,
  onRetry,
  onReply,
  onForward,
}: MessageHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusMessageId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages, focusMessageId]);

  if (isLoading) {
    return (
      <div style={{ flex: 1, overflow: 'hidden auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LoadingSkeleton height={56} />
        <LoadingSkeleton height={40} />
        <LoadingSkeleton height={64} />
        <LoadingSkeleton height={40} />
        <LoadingSkeleton height={56} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crm-text-muted)', fontSize: 13 }}>
        No messages yet
      </div>
    );
  }

  // Insert day separators
  const items: Array<{ type: 'sep'; label: string } | { type: 'msg'; message: InboxMessage }> = [];
  let lastDay = '';

  for (const msg of messages) {
    const day = msg.at.slice(0, 10);
    if (day !== lastDay) {
      items.push({ type: 'sep', label: formatDateLabel(msg.at) });
      lastDay = day;
    }
    items.push({ type: 'msg', message: msg });
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: 'hidden auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingTop: 12,
        paddingBottom: 8,
      }}
    >
      {items.map((item, i) => {
        if (item.type === 'sep') {
          return <DaySeparator key={`sep-${i}`} label={item.label} />;
        }
        const isFocused = focusMessageId === item.message.id;
        return (
          <div
            key={item.message.id}
            ref={isFocused ? focusRef : undefined}
            style={isFocused ? { outline: '2px solid var(--crm-text-brand)', borderRadius: 6 } : undefined}
          >
            <MessageBubble
              message={item.message}
              inboundName={inboundName}
              onShowStatus={onShowStatus}
              onShowFailure={onShowFailure}
              onRetry={onRetry}
              onReply={onReply}
              onForward={onForward}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
