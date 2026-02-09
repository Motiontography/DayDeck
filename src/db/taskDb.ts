import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task, Subtask, Recurrence, TaskNotification, Priority, TaskStatus } from '../types';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  scheduled_date: string;
  scheduled_time: string | null;
  estimated_minutes: number | null;
  sort_order: number;
  recurrence_json: string | null;
  notifications_json: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  carried_over_from: string | null;
}

interface SubtaskRow {
  id: string;
  parent_task_id: string;
  title: string;
  completed: number; // SQLite stores booleans as 0/1
}

function rowToTask(row: TaskRow, subtasks: Subtask[]): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as Priority,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time ?? null,
    estimatedMinutes: row.estimated_minutes,
    subtasks,
    recurrence: row.recurrence_json ? (JSON.parse(row.recurrence_json) as Recurrence) : null,
    notifications: row.notifications_json
      ? (JSON.parse(row.notifications_json) as TaskNotification[])
      : [],
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    carriedOverFrom: row.carried_over_from,
  };
}

function subtaskRowToSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    parentTaskId: row.parent_task_id,
  };
}

/**
 * Load all tasks from SQLite, including their subtasks.
 */
export async function loadAllTasks(db: SQLiteDatabase): Promise<Task[]> {
  const taskRows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC',
  );

  if (taskRows.length === 0) return [];

  const subtaskRows = await db.getAllAsync<SubtaskRow>(
    'SELECT * FROM subtasks ORDER BY rowid ASC',
  );

  // Group subtasks by parent task ID
  const subtasksByTaskId = new Map<string, Subtask[]>();
  for (const row of subtaskRows) {
    const subtask = subtaskRowToSubtask(row);
    const existing = subtasksByTaskId.get(row.parent_task_id);
    if (existing) {
      existing.push(subtask);
    } else {
      subtasksByTaskId.set(row.parent_task_id, [subtask]);
    }
  }

  return taskRows.map((row) => rowToTask(row, subtasksByTaskId.get(row.id) ?? []));
}

/**
 * Upsert a task and its subtasks into SQLite.
 * Uses a transaction to ensure atomicity.
 */
export async function saveTask(db: SQLiteDatabase, task: Task): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO tasks (
        id, title, description, status, priority, scheduled_date, scheduled_time,
        estimated_minutes, sort_order, recurrence_json, notifications_json,
        created_at, updated_at, completed_at, carried_over_from
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        status = excluded.status,
        priority = excluded.priority,
        scheduled_date = excluded.scheduled_date,
        scheduled_time = excluded.scheduled_time,
        estimated_minutes = excluded.estimated_minutes,
        sort_order = excluded.sort_order,
        recurrence_json = excluded.recurrence_json,
        notifications_json = excluded.notifications_json,
        updated_at = excluded.updated_at,
        completed_at = excluded.completed_at,
        carried_over_from = excluded.carried_over_from`,
      [
        task.id,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.scheduledDate,
        task.scheduledTime,
        task.estimatedMinutes,
        task.sortOrder,
        task.recurrence ? JSON.stringify(task.recurrence) : null,
        JSON.stringify(task.notifications),
        task.createdAt,
        task.updatedAt,
        task.completedAt,
        task.carriedOverFrom,
      ],
    );

    // Replace all subtasks: delete existing, then insert current ones.
    // This is simpler and safer than diffing individual subtask changes.
    await txn.runAsync('DELETE FROM subtasks WHERE parent_task_id = ?', [task.id]);

    for (const subtask of task.subtasks) {
      await txn.runAsync(
        'INSERT INTO subtasks (id, parent_task_id, title, completed) VALUES (?, ?, ?, ?)',
        [subtask.id, task.id, subtask.title, subtask.completed ? 1 : 0],
      );
    }
  });
}

/**
 * Delete a task and its subtasks from SQLite.
 * Subtasks are cascade-deleted by the foreign key constraint,
 * but we also delete explicitly for clarity and in case PRAGMA foreign_keys is off.
 */
export async function deleteTaskFromDb(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM subtasks WHERE parent_task_id = ?', [id]);
    await txn.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  });
}
