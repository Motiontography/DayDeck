import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task, Subtask, TaskStatus } from '../types';
import { todayISO } from '../utils';
import { loadAllTasks, saveTask, deleteTaskFromDb } from '../db';

let _db: SQLiteDatabase | null = null;

function persistTask(task: Task) {
  if (_db) saveTask(_db, task).catch(console.error);
}

interface TaskStoreState {
  tasks: Task[];
  selectedDate: string;

  hydrateFromDb: (db: SQLiteDatabase) => Promise<void>;
  setSelectedDate: (date: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
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
    persistTask(task);
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
      ),
    }));
    const updated = get().tasks.find((t) => t.id === id);
    if (updated) persistTask(updated);
  },

  deleteTask: (id) => {
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    if (_db) deleteTaskFromDb(_db, id).catch(console.error);
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
    if (updated) persistTask(updated);
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
    if (updated) persistTask(updated);
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
    if (updated) persistTask(updated);
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
    if (updated) persistTask(updated);
  },
}));
