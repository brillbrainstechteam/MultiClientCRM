import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { callAttempts as initialAttempts, callLists as initialLists, callTasks as initialTasks } from './data';
import type { CallAttempt, CallList, CallTask } from './domain';

/**
 * In-memory, session-scoped Calling state (CLAUDE.md §6 — no fake backend,
 * but the core "log outcome / follow-up / assign / list" flows must be
 * interactive). Resets on reload; that is the correct amount of persistence
 * for this prototype.
 */
export interface CallNote {
  id: string;
  text: string;
  at: string;
  authorId: string;
}

export interface CallingDataValue {
  tasks: CallTask[];
  attempts: CallAttempt[];
  lists: CallList[];
  notesByTask: Record<string, CallNote[]>;
  updateTask: (id: string, patch: Partial<CallTask>) => void;
  bulkUpdateTasks: (ids: string[], patch: Partial<CallTask>) => void;
  addAttempt: (attempt: CallAttempt) => void;
  addTask: (task: CallTask) => void;
  addTasks: (tasks: CallTask[]) => void;
  addList: (list: CallList) => void;
  updateList: (id: string, patch: Partial<CallList>) => void;
  addNote: (taskId: string, note: CallNote) => void;
}

const CallingDataContext = createContext<CallingDataValue | null>(null);

export function CallingDataProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<CallTask[]>(initialTasks);
  const [attempts, setAttempts] = useState<CallAttempt[]>(initialAttempts);
  const [lists, setLists] = useState<CallList[]>(initialLists);
  const [notesByTask, setNotesByTask] = useState<Record<string, CallNote[]>>({});

  const value = useMemo<CallingDataValue>(
    () => ({
      tasks,
      attempts,
      lists,
      notesByTask,
      updateTask: (id, patch) =>
        setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task))),
      bulkUpdateTasks: (ids, patch) =>
        setTasks((prev) => prev.map((task) => (ids.includes(task.id) ? { ...task, ...patch } : task))),
      addAttempt: (attempt) => setAttempts((prev) => [...prev, attempt]),
      addTask: (task) => setTasks((prev) => [...prev, task]),
      addTasks: (newTasks) => setTasks((prev) => [...prev, ...newTasks]),
      addList: (list) => setLists((prev) => [...prev, list]),
      updateList: (id, patch) =>
        setLists((prev) => prev.map((list) => (list.id === id ? { ...list, ...patch } : list))),
      addNote: (taskId, note) =>
        setNotesByTask((prev) => ({ ...prev, [taskId]: [...(prev[taskId] ?? []), note] })),
    }),
    [tasks, attempts, lists, notesByTask],
  );

  return <CallingDataContext.Provider value={value}>{children}</CallingDataContext.Provider>;
}

export function useCallingData(): CallingDataValue {
  const context = useContext(CallingDataContext);
  if (!context) {
    throw new Error('useCallingData must be used inside <CallingDataProvider>.');
  }
  return context;
}
