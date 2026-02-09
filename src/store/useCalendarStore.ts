import { create } from 'zustand';
import type { CalendarEvent, DeviceReminder } from '../types';

interface CalendarStoreState {
  calendarEvents: CalendarEvent[];
  reminders: DeviceReminder[];
  calendarEnabled: boolean;
  setCalendarEvents: (events: CalendarEvent[]) => void;
  setReminders: (reminders: DeviceReminder[]) => void;
  setCalendarEnabled: (enabled: boolean) => void;
}

export const useCalendarStore = create<CalendarStoreState>((set) => ({
  calendarEvents: [],
  reminders: [],
  calendarEnabled: true,

  setCalendarEvents: (events) => set({ calendarEvents: events }),
  setReminders: (reminders) => set({ reminders }),
  setCalendarEnabled: (enabled) => set({ calendarEnabled: enabled }),
}));
