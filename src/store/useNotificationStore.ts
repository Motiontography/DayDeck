import { create } from 'zustand';
import { Defaults } from '../constants';

interface NotificationSettings {
  enabled: boolean;
  quietHoursStart: string; // "HH:mm"
  quietHoursEnd: string; // "HH:mm"
  blockNudgeOffsetMinutes: number;

  setEnabled: (enabled: boolean) => void;
  setQuietHours: (start: string, end: string) => void;
  setBlockNudgeOffset: (minutes: number) => void;
}

export const useNotificationStore = create<NotificationSettings>((set) => ({
  enabled: true,
  quietHoursStart: Defaults.quietHoursStart,
  quietHoursEnd: Defaults.quietHoursEnd,
  blockNudgeOffsetMinutes: Defaults.reminderOffsetMinutes,

  setEnabled: (enabled) => set({ enabled }),

  setQuietHours: (start, end) =>
    set({ quietHoursStart: start, quietHoursEnd: end }),

  setBlockNudgeOffset: (minutes) =>
    set({ blockNudgeOffsetMinutes: minutes }),
}));
