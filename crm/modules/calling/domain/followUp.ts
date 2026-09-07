import type { CallTask } from './types';

/**
 * Duplicate future-task detection (SKILL.md "Follow-up duplicate
 * prevention"). Before creating a new call task for a contact, check whether
 * an active future task already exists for the same contact.
 */
export function findDuplicateFutureTask(
  tasks: CallTask[],
  contactId: string,
  excludeTaskId?: string,
): CallTask | undefined {
  const now = Date.now();
  return tasks.find(
    (task) =>
      task.contactId === contactId &&
      task.id !== excludeTaskId &&
      (task.status === 'scheduled' || task.status === 'due') &&
      new Date(task.dueAt).getTime() >= now,
  );
}
