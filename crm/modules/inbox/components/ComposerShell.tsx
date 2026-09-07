import { useState, useEffect } from 'react';
import {
  Smile,
  Paperclip,
  LayoutTemplate,
  Zap,
  Send,
  Lock,
  X,
  Reply,
} from 'lucide-react';
import { Button, IconButton } from '@crm/design-system';
import type { ResponseWindow, InboxMessage } from '../inbox-types';
import { ResponseWindowBanner } from './ResponseWindowBadge';

export type ComposerMode = 'reply' | 'note';

interface ComposerShellProps {
  responseWindow: ResponseWindow;
  isSpam: boolean;
  isResolved: boolean;
  replyToMessage?: InboxMessage | null;
  onClearReplyTo?: () => void;
  /** Text injected from outside (quick replies). Changing this value replaces composer text. */
  pendingInsert?: string;
  onPendingInsertConsumed?: () => void;
  onSend: (text: string, mode: ComposerMode, replyToId?: string) => void;
  onReopen: () => void;
  onChooseTemplate: () => void;
  onChooseQuickReply: () => void;
  onChooseAttachment: () => void;
}

export function ComposerShell({
  responseWindow,
  isSpam,
  isResolved,
  replyToMessage,
  onClearReplyTo,
  pendingInsert,
  onPendingInsertConsumed,
  onSend,
  onReopen,
  onChooseTemplate,
  onChooseQuickReply,
  onChooseAttachment,
}: ComposerShellProps) {
  const [mode, setMode] = useState<ComposerMode>('reply');
  const [text, setText] = useState('');

  // Inject text from quick replies
  useEffect(() => {
    if (pendingInsert !== undefined && pendingInsert !== '') {
      setText(pendingInsert);
      onPendingInsertConsumed?.();
    }
  }, [pendingInsert, onPendingInsertConsumed]);

  const canSendFreeform = responseWindow.canSendFreeform && !isSpam && !isResolved;
  const isNoteMode = mode === 'note';

  function handleSend() {
    if (!text.trim()) return;
    onSend(text.trim(), mode, replyToMessage?.id);
    setText('');
    onClearReplyTo?.();
  }

  // Spam: full disable
  if (isSpam) {
    return (
      <div className="crm-composer">
        <div className="crm-composer__disabled-msg">
          <Lock size={14} />
          Actions are restricted for spam conversations.
        </div>
      </div>
    );
  }

  // Resolved: show reopen prompt (allow notes though)
  if (isResolved && !isNoteMode) {
    return (
      <div className="crm-composer">
        <div className="crm-composer__mode-bar">
          <button className="crm-composer__mode-btn crm-composer__mode-btn--active-reply" onClick={() => setMode('reply')}>
            Reply
          </button>
          <button
            className={`crm-composer__mode-btn${isNoteMode ? ' crm-composer__mode-btn--active-note' : ''}`}
            onClick={() => setMode('note')}
          >
            Internal Note
          </button>
        </div>
        <div className="crm-composer__disabled-msg">
          <Lock size={14} />
          This conversation is resolved.{' '}
          <button
            onClick={onReopen}
            style={{ fontWeight: 600, color: 'var(--crm-text-brand)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Reopen
          </button>
          {' '}to send a reply.
        </div>
      </div>
    );
  }

  // Expired window, reply mode: template-only
  if (!canSendFreeform && !isNoteMode) {
    return (
      <div className="crm-composer">
        <div className="crm-composer__mode-bar">
          <button className="crm-composer__mode-btn crm-composer__mode-btn--active-reply" onClick={() => setMode('reply')}>
            Reply
          </button>
          <button
            className={`crm-composer__mode-btn${isNoteMode ? ' crm-composer__mode-btn--active-note' : ''}`}
            onClick={() => setMode('note')}
          >
            Internal Note
          </button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <ResponseWindowBanner window={responseWindow} />
          <button className="crm-composer__choose-template-btn" onClick={onChooseTemplate}>
            <LayoutTemplate size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Choose Template to Reply
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`crm-composer${isNoteMode ? ' crm-composer--note-mode' : ''}`}>
      <div className="crm-composer__mode-bar">
        <button
          className={`crm-composer__mode-btn${!isNoteMode ? ' crm-composer__mode-btn--active-reply' : ''}`}
          onClick={() => setMode('reply')}
        >
          Reply
        </button>
        <button
          className={`crm-composer__mode-btn${isNoteMode ? ' crm-composer__mode-btn--active-note' : ''}`}
          onClick={() => setMode('note')}
        >
          Internal Note
        </button>
      </div>

      {isNoteMode && (
        <div className="crm-composer__note-label">
          <Lock size={11} />
          Internal note — not visible to the customer. Use @mentions to notify teammates.
        </div>
      )}

      {!isNoteMode && responseWindow.status === 'expiring' && (
        <div className="crm-composer__window-banner">
          <ResponseWindowBanner window={responseWindow} />
        </div>
      )}

      {/* Reply-to context bar */}
      {replyToMessage && !isNoteMode && (
        <div className="crm-composer__reply-bar">
          <Reply size={12} style={{ flexShrink: 0, color: 'var(--crm-text-muted)' }} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 10, color: 'var(--crm-text-muted)', marginBottom: 1 }}>Replying to</div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyToMessage.text}
            </div>
          </div>
          {onClearReplyTo && (
            <button
              onClick={onClearReplyTo}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-text-muted)', flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      <div className="crm-composer__input-area">
        <textarea
          className="crm-composer__textarea"
          placeholder={isNoteMode ? 'Add an internal note… Use @name to mention a teammate.' : 'Type a message…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={3}
        />
      </div>

      <div className="crm-composer__toolbar">
        <div className="crm-composer__toolbar-left">
          {!isNoteMode && (
            <>
              <IconButton label="Emoji" icon={<Smile size={16} />} onClick={() => {}} />
              <IconButton label="Attachment" icon={<Paperclip size={16} />} onClick={onChooseAttachment} />
              <IconButton label="Template" icon={<LayoutTemplate size={16} />} onClick={onChooseTemplate} />
              <IconButton label="Quick reply" icon={<Zap size={16} />} onClick={onChooseQuickReply} />
            </>
          )}
        </div>
        <div className="crm-composer__toolbar-right">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!text.trim()}
          >
            <Send size={13} style={{ marginRight: 4 }} />
            {isNoteMode ? 'Save Note' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
