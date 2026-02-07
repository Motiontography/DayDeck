import { create } from 'zustand';
import type { CalendarEvent } from '../types';

interface CalendarStoreState {
  calendarEvents: CalendarEvent[];
  calendarEnabled: boolean;
  setCalendarEvents: (events: CalendarEvent[]) => void;
  setCalendarEnabled: (enabled: boolean) => void;
}

export const useCalendarStore = create<CalendarStoreState>((set) => ({
  calendarEvents: [],
  calendarEnabled: true,

  setCalendarEvents: (events) => set({ calendarEvents: events }),
  setCalendarEnabled: (enabled) => set({ calendarEnabled: enabled }),
}));
