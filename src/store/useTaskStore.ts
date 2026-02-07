import { create } from 'zustand';
import type { Task, DayPlan } from '../types';
import { todayISO } from '../utils';

interface TaskStoreState {
  tasks: Task[];
  selectedDate: string;
  dayPlan: DayPlan | null;

  setSelectedDate: (date: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompleted: (id: string) => void;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  tasks: [],
  selectedDate: todayISO(),
  dayPlan: null,

  setSelectedDate: (date) => set({ selectedDate: date }),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    })),

  deleteTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  toggleTaskCompleted: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t
      ),
    })),
}));
