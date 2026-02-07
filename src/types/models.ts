export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

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
  parentTaskId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  scheduledDate: string; // ISO date "YYYY-MM-DD" (user's local day)
  estimatedMinutes: number | null;
  subtasks: Subtask[];
  recurrence: Recurrence | null;
  notifications: TaskNotification[];
  sortOrder: number;
  createdAt: string; // ISO 8601 with timezone offset
  updatedAt: string; // ISO 8601 with timezone offset
  completedAt: string | null; // ISO 8601 with timezone offset
  carriedOverFrom: string | null; // original scheduledDate before carry-over
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
  wakeTime: string; // "07:00"
  sleepTime: string; // "23:00"
  taskIds: string[]; // ordered references, not embedded objects
  timeBlockIds: string[]; // ordered references
}

export interface TemplateBlock {
  title: string;
  type: TimeBlockType;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  durationMinutes: number;
  color: string;
}

export interface Template {
  id: string;
  name: string;
  icon: string; // unicode emoji
  blocks: TemplateBlock[];
  createdAt: string;
  updatedAt: string;
}
