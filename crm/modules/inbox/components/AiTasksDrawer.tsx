import { useState } from 'react';
import { Sparkles, Check, X, Edit3, AlertTriangle, Clock, User, ExternalLink } from 'lucide-react';
import { Drawer, Button } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import type { AiSuggestedTask } from '../inbox-types';

interface AiTasksDrawerProps {
  open: boolean;
  tasks: AiSuggestedTask[];
  onClose: () => void;
  onApprove: (taskId: string, edits?: Partial<AiSuggestedTask>) => void;
  onReject: (taskId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
}

type TaskOverrideMap = Map<string, 'approved' | 'rejected' | 'editing'>;

interface EditForm {
  title: string;
  description: string;
  suggestedAssigneeId: string;
  suggestedDueAt: string;
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const cfg = {
    high: { color: 'var(--crm-success)', bg: '#f0faf0', label: 'High confidence' },
    medium: { color: 'var(--crm-warning)', bg: '#fffbf0', label: 'Medium confidence' },
    low: { color: 'var(--crm-text-muted)', bg: 'var(--crm-bg-secondary)', label: 'Low confidence' },
  }[confidence];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: 999, letterSpacing: 0.3 }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}

function TaskCard({
  task,
  localStatus,
  onApprove,
  onReject,
  onScrollToMessage,
}: {
  task: AiSuggestedTask;
  localStatus: 'pending' | 'approved' | 'rejected' | 'editing' | undefined;
  onApprove: (edits?: Partial<AiSuggestedTask>) => void;
  onReject: () => void;
  onScrollToMessage?: (messageId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    title: task.title,
    description: task.description,
    suggestedAssigneeId: task.suggestedAssigneeId ?? '',
    suggestedDueAt: task.suggestedDueAt?.slice(0, 16) ?? '',
  });

  const status = localStatus ?? task.status;
  const assignee = task.suggestedAssigneeId ? findUser(task.suggestedAssigneeId) : null;

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const, padding: '6px 8px',
    border: '1px solid var(--crm-border)', borderRadius: 5, fontSize: 12,
    background: 'var(--crm-bg-primary)', color: 'var(--crm-text-primary)',
  };

  if (status === 'approved') {
    return (
      <div style={{ border: '1px solid var(--crm-success)', borderRadius: 10, padding: 12, background: '#f0faf0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--crm-success)', fontSize: 12, fontWeight: 600 }}>
          <Check size={14} /> Task approved
        </div>
        <div style={{ fontSize: 12, color: 'var(--crm-text-secondary)', marginTop: 4 }}>{task.title}</div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div style={{ border: '1px solid var(--crm-border)', borderRadius: 10, padding: 12, background: 'var(--crm-bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--crm-text-muted)', fontSize: 12, fontWeight: 600 }}>
          <X size={14} /> Task rejected
        </div>
        <div style={{ fontSize: 12, color: 'var(--crm-text-muted)', marginTop: 4, textDecoration: 'line-through' }}>{task.title}</div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--crm-border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} style={{ color: 'var(--crm-text-brand)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-brand)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            AI Suggestion
          </span>
        </div>
        <ConfidenceBadge confidence={task.confidence} />
      </div>

      {/* Edit form or read view */}
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 10, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 3 }}>Title</label>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 3 }}>Description</label>
            <textarea style={{ ...inputStyle, resize: 'none' }} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 3 }}>Due date</label>
            <input type="datetime-local" style={inputStyle} value={form.suggestedDueAt} onChange={(e) => setForm((f) => ({ ...f, suggestedDueAt: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => { onApprove({ ...form, suggestedDueAt: form.suggestedDueAt ? `${form.suggestedDueAt}:00+05:30` : null }); setEditing(false); }}>
              <Check size={11} style={{ marginRight: 3 }} /> Approve with edits
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--crm-text-primary)', marginBottom: 4 }}>{task.title}</div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-secondary)', lineHeight: 1.5 }}>{task.description}</div>
          </div>

          {/* Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {assignee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--crm-text-muted)' }}>
                <User size={11} />
                Suggested assignee: <strong style={{ color: 'var(--crm-text-primary)' }}>{assignee.name}</strong>
              </div>
            )}
            {task.suggestedDueAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--crm-text-muted)' }}>
                <Clock size={11} />
                Suggested due: <strong style={{ color: 'var(--crm-text-primary)' }}>{new Date(task.suggestedDueAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
              </div>
            )}
          </div>

          {/* Evidence link */}
          <button
            onClick={() => onScrollToMessage?.(task.sourceMessageId)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--crm-text-brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            <ExternalLink size={11} />
            View triggering message
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="secondary" size="sm" onClick={onReject}>
              <X size={11} style={{ marginRight: 3 }} /> Reject
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Edit3 size={11} style={{ marginRight: 3 }} /> Edit & Approve
            </Button>
            <Button variant="primary" size="sm" onClick={() => onApprove()}>
              <Check size={11} style={{ marginRight: 3 }} /> Approve
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function AiTasksDrawer({ open, tasks, onClose, onApprove, onReject, onScrollToMessage }: AiTasksDrawerProps) {
  const [taskStatuses, setTaskStatuses] = useState<TaskOverrideMap>(new Map());

  function handleApprove(taskId: string, edits?: Partial<AiSuggestedTask>) {
    setTaskStatuses((prev) => new Map(prev).set(taskId, 'approved'));
    onApprove(taskId, edits);
  }

  function handleReject(taskId: string) {
    setTaskStatuses((prev) => new Map(prev).set(taskId, 'rejected'));
    onReject(taskId);
  }

  return (
    <Drawer open={open} title="AI Suggested Tasks" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--crm-text-muted)', fontSize: 13 }}>
            <Sparkles size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
            No AI suggestions for this conversation yet.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 10px', background: '#ede9fe', borderRadius: 6 }}>
              <AlertTriangle size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#4338ca' }}>
                Human approval is required for all AI suggestions before any action is taken.
              </span>
            </div>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                localStatus={taskStatuses.get(task.id) as 'pending' | 'approved' | 'rejected' | 'editing' | undefined}
                onApprove={(edits) => handleApprove(task.id, edits)}
                onReject={() => handleReject(task.id)}
                onScrollToMessage={onScrollToMessage}
              />
            ))}
          </>
        )}
      </div>
    </Drawer>
  );
}
