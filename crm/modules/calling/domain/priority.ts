import type { CallTask, QueuePriority } from './types';

/**
 * Transparent, rule-based queue priority (SKILL.md "Queue priority" — no
 * numeric scoring engine). Group 1 always outranks group 2, etc.; within a
 * group callers sort by due time.
 */

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function formatOverdueBy(due: Date, now: Date): string {
  const diffMs = now.getTime() - due.getTime();
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 1) return 'less than an hour ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  const days = Math.floor(diffHours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const reasonTagLabel: Record<CallTask['reasonTag'], string> = {
  new_enquiry: 'New enquiry',
  high_value: 'High priority — high value account',
  event: 'Event / festival outreach',
  standard: 'Standard scheduled call',
};

export function computeQueuePriority(task: CallTask, now: Date = new Date()): QueuePriority {
  if (task.status === 'completed') return { group: 5, label: 'Completed' };
  if (task.status === 'cancelled') return { group: 5, label: 'Cancelled' };

  const due = new Date(task.dueAt);

  if (due.getTime() < now.getTime()) {
    return { group: 1, label: `Overdue — was due ${formatOverdueBy(due, now)}` };
  }
  if (isSameCalendarDay(due, now)) {
    return { group: 2, label: `Due today, ${formatTime(task.dueAt)}` };
  }
  if (task.reasonTag === 'high_value') return { group: 3, label: reasonTagLabel.high_value };
  if (task.reasonTag === 'new_enquiry') return { group: 4, label: reasonTagLabel.new_enquiry };
  if (task.reasonTag === 'event') return { group: 4, label: reasonTagLabel.event };
  return { group: 5, label: reasonTagLabel.standard };
}

/** Stable sort: priority group, then due time ascending. */
export function sortByPriority<T extends CallTask>(tasks: T[], now: Date = new Date()): T[] {
  return [...tasks].sort((a, b) => {
    const pa = computeQueuePriority(a, now);
    const pb = computeQueuePriority(b, now);
    if (pa.group !== pb.group) return pa.group - pb.group;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}
