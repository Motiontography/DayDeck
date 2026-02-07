import { create } from 'zustand';
import type { Task, Subtask, TaskStatus } from '../types';
import { todayISO } from '../utils';

interface TaskStoreState {
  tasks: Task[];
  selectedDate: string;

  setSelectedDate: (date: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, subtask: Subtask) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
  getTasksByDate: (date: string) => Task[];
  getIncompleteTasksBeforeDate: (date: string) => Task[];
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  selectedDate: todayISO(),

  setSelectedDate: (date) => set({ selectedDate: date }),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
      ),
    })),

  deleteTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  setTaskStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              updatedAt: new Date().toISOString(),
              completedAt: status === 'done' ? new Date().toISOString() : t.completedAt,
            }
          : t,
      ),
    })),

  toggleSubtask: (taskId, subtaskId) =>
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
    })),

  addSubtask: (taskId, subtask) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...t.subtasks, subtask], updatedAt: new Date().toISOString() }
          : t,
      ),
    })),

  removeSubtask: (taskId, subtaskId) =>
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
    })),

  getTasksByDate: (date) => get().tasks.filter((t) => t.scheduledDate === date),

  getIncompleteTasksBeforeDate: (date) =>
    get().tasks.filter((t) => t.scheduledDate < date && t.status !== 'done' && t.status !== 'cancelled'),
}));
