export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  interval: number; // e.g. every 2 weeks
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  endDate?: string; // ISO date string
}

export interface TaskNotification {
  id: string;
  offsetMinutes: number; // minutes before dueDate to fire
  enabled: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string; // ISO date string
  estimatedDuration: number; // minutes
  completed: boolean;
  subtasks: Subtask[];
  recurrence: Recurrence | null;
  notifications: TaskNotification[];
  createdAt: string;
  updatedAt: string;
}

export type TimeBlockType = 'task' | 'event' | 'break' | 'focus';

export interface TimeBlock {
  id: string;
  taskId: string | null;
  title: string;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  color: string;
  type: TimeBlockType;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  calendarId: string;
  color: string;
}

export interface DayPlan {
  date: string; // ISO date string (YYYY-MM-DD)
  timeBlocks: TimeBlock[];
  tasks: Task[];
}
