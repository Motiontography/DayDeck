import { format, addDays, parseISO, isBefore } from 'date-fns';
import type { Task } from '../types';

const DATE_FORMAT = 'yyyy-MM-dd';

export interface CarryOverResult {
  /** Tasks that were moved to the new date */
  carriedOver: Task[];
  /** Snapshot of original tasks before carry-over (for undo) */
  originalSnapshots: Task[];
}

/**
 * Identify tasks that are eligible for carry-over:
 * - scheduled before `today`
 * - status is 'todo' or 'in_progress' (not done or cancelled)
 */
export function getCarryOverCandidates(tasks: Task[], today: string): Task[] {
  return tasks.filter(
    (t) =>
      t.scheduledDate < today &&
      (t.status === 'todo' || t.status === 'in_progress'),
  );
}

/**
 * Perform carry-over: move incomplete tasks from past dates to `targetDate`.
 * Sets `carriedOverFrom` to the task's original scheduledDate (preserving
 * the first carry-over origin if already carried over).
 *
 * Returns the updated tasks and their original snapshots for undo.
 */
export function carryOverTasks(
  candidates: Task[],
  targetDate: string,
): CarryOverResult {
  const now = new Date().toISOString();
  const originalSnapshots = candidates.map((t) => ({ ...t }));

  const carriedOver = candidates.map((task) => ({
    ...task,
    carriedOverFrom: task.carriedOverFrom ?? task.scheduledDate,
    scheduledDate: targetDate,
    updatedAt: now,
  }));

  return { carriedOver, originalSnapshots };
}

/**
 * Undo a carry-over by restoring tasks to their original state.
 * Returns the restored tasks.
 */
export function undoCarryOver(originalSnapshots: Task[]): Task[] {
  return originalSnapshots.map((task) => ({ ...task }));
}

/**
 * Clear the carriedOverFrom badge on a task (e.g. when user acknowledges it).
 */
export function clearCarryOverBadge(task: Task): Task {
  return {
    ...task,
    carriedOverFrom: null,
    updatedAt: new Date().toISOString(),
  };
}
