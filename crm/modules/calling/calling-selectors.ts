import { findContact, type RoleKey, type User } from '@crm/mock-data';
import type { CallAttempt, CallList, CallTask } from './domain';
import { referenceNow, sortByPriority } from './domain';

const OPEN_STATUSES: CallTask['status'][] = ['scheduled', 'due', 'in_progress'];

export function isOpenTask(task: CallTask): boolean {
  return OPEN_STATUSES.includes(task.status);
}

export function isOverdue(task: CallTask, now: Date = referenceNow()): boolean {
  return isOpenTask(task) && new Date(task.dueAt).getTime() < now.getTime();
}

export function isDueToday(task: CallTask, now: Date = referenceNow()): boolean {
  const due = new Date(task.dueAt);
  return (
    isOpenTask(task) &&
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

/** Role/scope visibility (SKILL.md "Multi-tenant/scope"). Owner sees everything in branch scope. */
export function tasksVisibleToRole(tasks: CallTask[], user: User, role: RoleKey): CallTask[] {
  if (role === 'agent') return tasks.filter((task) => task.assigneeId === user.id);
  if (role === 'manager') return tasks.filter((task) => task.branchId === user.branchId);
  return tasks;
}

export function applyBranchScope(tasks: CallTask[], branchId: string | null): CallTask[] {
  if (!branchId) return tasks;
  return tasks.filter((task) => task.branchId === branchId);
}

export interface QueueContext {
  userId: string;
  now?: Date;
}

/** One Queue screen, many saved views (CODE_FIRST_ADAPTER.md §3). */
export function applyQueueView(tasks: CallTask[], viewId: string, ctx: QueueContext): CallTask[] {
  const now = ctx.now ?? referenceNow();
  const open = tasks.filter(isOpenTask);
  switch (viewId) {
    case 'my-calls':
      return open.filter((task) => task.assigneeId === ctx.userId);
    case 'today':
      return open.filter((task) => isDueToday(task, now) || isOverdue(task, now));
    case 'follow-ups':
      return open.filter((task) => task.followUpOfTaskId !== null);
    case 'overdue':
      return open.filter((task) => isOverdue(task, now));
    case 'new-leads':
      return open.filter((task) => task.reasonTag === 'new_enquiry');
    case 'high-value':
      return open.filter((task) => task.reasonTag === 'high_value');
    case 'event':
      return open.filter((task) => task.reasonTag === 'event');
    case 'unassigned':
      return open.filter((task) => task.assigneeId === null);
    case 'callbacks':
      return [];
    default:
      return open;
  }
}

export function searchTasks(tasks: CallTask[], query: string): CallTask[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter((task) => {
    const contact = findContact(task.contactId);
    if (!contact) return false;
    return (
      contact.name.toLowerCase().includes(q) ||
      (contact.company ?? '').toLowerCase().includes(q) ||
      contact.mobile.toLowerCase().includes(q)
    );
  });
}

export interface QueueFilters {
  assigneeId?: string | null;
  lifecycle?: string | null;
  source?: string | null;
}

export function applyQueueFilters(tasks: CallTask[], filters: QueueFilters): CallTask[] {
  return tasks.filter((task) => {
    if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
    if (filters.lifecycle) {
      const contact = findContact(task.contactId);
      if (!contact || contact.stage !== filters.lifecycle) return false;
    }
    if (filters.source && !task.source.toLowerCase().includes(filters.source.toLowerCase())) {
      return false;
    }
    return true;
  });
}

export function sortQueue(tasks: CallTask[], now: Date = referenceNow()): CallTask[] {
  return sortByPriority(tasks, now);
}

/** Call Desk summary strip (SIMPLIFICATION_DECISIONS.md — 4-5 cards, not 8). */
export function deskSummary(tasks: CallTask[], now: Date = referenceNow()) {
  const open = tasks.filter(isOpenTask);
  return {
    dueToday: open.filter((t) => isDueToday(t, now)).length,
    followUpsDue: open.filter((t) => t.followUpOfTaskId !== null).length,
    overdue: open.filter((t) => isOverdue(t, now)).length,
    unassigned: open.filter((t) => t.assigneeId === null).length,
    completedToday: tasks.filter(
      (t) => t.status === 'completed' && new Date(t.dueAt).toDateString() === now.toDateString(),
    ).length,
  };
}

export function attemptsForContact(attempts: CallAttempt[], contactId: string): CallAttempt[] {
  return attempts
    .filter((attempt) => attempt.contactId === contactId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function attemptsForTask(attempts: CallAttempt[], taskId: string): CallAttempt[] {
  return attempts
    .filter((attempt) => attempt.taskId === taskId)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
}

/** Role/scope visibility for History (mirrors tasksVisibleToRole). */
export function attemptsVisibleToRole(
  attempts: CallAttempt[],
  tasks: CallTask[],
  user: User,
  role: RoleKey,
): CallAttempt[] {
  if (role === 'agent') return attempts.filter((attempt) => attempt.agentId === user.id);
  if (role === 'manager') {
    return attempts.filter((attempt) => tasks.find((task) => task.id === attempt.taskId)?.branchId === user.branchId);
  }
  return attempts;
}

export interface HistoryFilters {
  agentId?: string | null;
  connectionStatus?: string | null;
  disposition?: string | null;
  q?: string | null;
}

export function filterHistory(attempts: CallAttempt[], filters: HistoryFilters): CallAttempt[] {
  return attempts.filter((attempt) => {
    if (filters.agentId && attempt.agentId !== filters.agentId) return false;
    if (filters.connectionStatus && attempt.connectionStatus !== filters.connectionStatus) return false;
    if (filters.disposition && attempt.disposition !== filters.disposition) return false;
    if (filters.q) {
      const contact = findContact(attempt.contactId);
      const q = filters.q.toLowerCase();
      if (!contact || !contact.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

/** Call List progress (SKILL.md "Call List completion"). */
export function listProgress(list: CallList, tasks: CallTask[], attempts: CallAttempt[]) {
  const listTasks = list.taskIds.map((id) => tasks.find((t) => t.id === id)).filter((t): t is CallTask => !!t);
  const listAttempts = attempts.filter((a) => listTasks.some((t) => t.id === a.taskId));
  const attempted = listTasks.filter((t) => t.attemptCount > 0).length;
  const connected = listAttempts.filter((a) => a.connectionStatus === 'connected').length;
  const followUps = listTasks.filter(
    (t) => t.followUpOfTaskId !== null || t.latestDisposition === 'follow_up',
  ).length;
  const completed = listTasks.filter((t) => t.status === 'completed' || t.status === 'cancelled').length;
  const remaining = listTasks.filter((t) => isOpenTask(t)).length;
  const interested = listAttempts.filter((a) => a.disposition === 'interested').length;
  return { total: listTasks.length, attempted, connected, followUps, completed, remaining, interested };
}

export function listsVisibleToRole(lists: CallList[], tasks: CallTask[], user: User, role: RoleKey): CallList[] {
  if (role === 'owner') return lists;
  if (role === 'manager') return lists.filter((list) => list.branchId === user.branchId);
  return lists.filter((list) =>
    list.taskIds.some((id) => tasks.find((t) => t.id === id)?.assigneeId === user.id),
  );
}

/** Operational analytics (SKILL.md "Analytics" — lead metrics first). */
export function analyticsSummary(tasks: CallTask[], attempts: CallAttempt[]) {
  const attempted = tasks.filter((t) => t.attemptCount > 0).length;
  const connectedAttempts = attempts.filter((a) => a.connectionStatus === 'connected');
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const followUpsCreated = tasks.filter((t) => t.followUpOfTaskId !== null).length;
  const followUpsCompleted = tasks.filter(
    (t) => t.followUpOfTaskId !== null && t.status === 'completed',
  ).length;
  const interested = attempts.filter((a) => a.disposition === 'interested').length;
  const converted = attempts.filter((a) => a.disposition === 'completed').length;
  const connectionRate = attempted > 0 ? Math.round((connectedAttempts.length / attempted) * 100) : 0;
  const durations = attempts.filter((a) => a.durationSeconds !== null).map((a) => a.durationSeconds as number);
  const avgDurationSeconds =
    durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0;
  return {
    attempted,
    connected: connectedAttempts.length,
    completed,
    connectionRate,
    followUpsCreated,
    followUpsCompleted,
    interested,
    converted,
    unanswered: attempts.filter((a) => a.connectionStatus === 'no_answer').length,
    avgDurationSeconds,
  };
}
