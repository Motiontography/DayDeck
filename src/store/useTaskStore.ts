import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task, Subtask, TaskStatus, TimeBlock } from '../types';
import { todayISO, generateId } from '../utils';
import { loadAllTasks, saveTask, deleteTaskFromDb } from '../db';
import { useTimeBlockStore } from './useTimeBlockStore';

let _db: SQLiteDatabase | null = null;

function persistTask(task: Task): Promise<void> {
  if (_db) return saveTask(_db, task);
  return Promise.resolve();
}

/**
 * Sync a TimeBlock on the timeline for a task with a scheduledTime.
 * Creates, updates, or deletes the linked TimeBlock as needed.
 * MUST be called after persistTask has completed to avoid DB lock.
 */
function syncTimeBlockForTask(task: Task): void {
  const tbStore = useTimeBlockStore.getState();
  const existingBlock = tbStore.timeBlocks.find((b) => b.taskId === task.id);

  if (!task.scheduledTime) {
    // No time set — remove linked block if it exists
    if (existingBlock) {
      tbStore.deleteTimeBlock(existingBlock.id);
    }
    return;
  }

  // Build start/end ISO datetime strings from scheduledDate + scheduledTime
  const durationMinutes = task.estimatedMinutes ?? 30;
  const startDate = new Date(`${task.scheduledDate}T${task.scheduledTime}:00`);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const blockColor = '#818CF8'; // timeBlockTask color

  if (existingBlock) {
    // Update the existing block
    tbStore.updateTimeBlock(existingBlock.id, {
      title: task.title,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    });
  } else {
    // Create a new TimeBlock linked to the task
    const newBlock: TimeBlock = {
      id: generateId(),
      taskId: task.id,
      title: task.title,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      color: blockColor,
      type: 'task',
    };
    tbStore.addTimeBlock(newBlock);
  }
}

interface TaskStoreState {
  tasks: Task[];
  selectedDate: string;

  hydrateFromDb: (db: SQLiteDatabase) => Promise<void>;
  setSelectedDate: (date: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  deleteFutureRecurring: (task: Task) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, subtask: Subtask) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  selectedDate: todayISO(),

  hydrateFromDb: async (db) => {
    _db = db;
    const tasks = await loadAllTasks(db);
    set({ tasks });
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  addTask: (task) => {
    set((state) => ({ tasks: [...state.tasks, task] }));
    // Serialize: save task first, then sync time block after DB lock is released
    persistTask(task)
      .then(() => syncTimeBlockForTask(task))
      .catch(console.error);
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
      ),
    }));
    const updated = get().tasks.find((t) => t.id === id);
    if (updated) {
      // Serialize: save task first, then sync time block after DB lock is released
      persistTask(updated)
        .then(() => syncTimeBlockForTask(updated))
        .catch(console.error);
    }
  },

  deleteTask: (id) => {
    // Remove any linked TimeBlock before deleting the task
    const tbStore = useTimeBlockStore.getState();
    const linkedBlock = tbStore.timeBlocks.find((b) => b.taskId === id);
    if (linkedBlock) {
      tbStore.deleteTimeBlock(linkedBlock.id);
    }
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    if (_db) deleteTaskFromDb(_db, id).catch(console.error);
  },

  deleteFutureRecurring: (task) => {
    const recurrenceKey = JSON.stringify(task.recurrence);
    const toDelete = get().tasks.filter(
      (t) =>
        t.title === task.title &&
        JSON.stringify(t.recurrence) === recurrenceKey &&
        t.scheduledDate >= task.scheduledDate,
    );
    const tbStore = useTimeBlockStore.getState();
    for (const t of toDelete) {
      const linkedBlock = tbStore.timeBlocks.find((b) => b.taskId === t.id);
      if (linkedBlock) tbStore.deleteTimeBlock(linkedBlock.id);
      if (_db) deleteTaskFromDb(_db, t.id).catch(console.error);
    }
    const deleteIds = new Set(toDelete.map((t) => t.id));
    set((state) => ({ tasks: state.tasks.filter((t) => !deleteIds.has(t.id)) }));
  },

  setTaskStatus: (id, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              updatedAt: new Date().toISOString(),
              completedAt: status === 'done' ? new Date().toISOString() : null,
            }
          : t,
      ),
    }));
    const updated = get().tasks.find((t) => t.id === id);
    if (updated) persistTask(updated).catch(console.error);
  },

  toggleSubtask: (taskId, subtaskId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    }));
    const updated = get().tasks.find((t) => t.id === taskId);
    if (updated) persistTask(updated).catch(console.error);
  },

  addSubtask: (taskId, subtask) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, subtask], updatedAt: new Date().toISOString() }
          : t,
      ),
    }));
    const updated = get().tasks.find((t) => t.id === taskId);
    if (updated) persistTask(updated).catch(console.error);
  },

  removeSubtask: (taskId, subtaskId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    }));
    const updated = get().tasks.find((t) => t.id === taskId);
    if (updated) persistTask(updated).catch(console.error);
  },
}));
