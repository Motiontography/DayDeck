import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Defaults } from '../constants';
import { loadSettings, saveSetting } from '../db';

export type CarryOverBehavior = 'auto' | 'ask' | 'never';
export type ThemeSetting = 'light' | 'dark' | 'system';

export interface SettingsState {
  dayStartHour: number;
  dayEndHour: number;
  defaultTaskDurationMinutes: number;
  quietHoursStart: string; // "HH:mm"
  quietHoursEnd: string; // "HH:mm"
  carryOverBehavior: CarryOverBehavior;
  reminderOffsetMinutes: number;
  theme: ThemeSetting;
  calendarSyncEnabled: boolean;

  isHydrated: boolean;
  hydrateFromDb: (db: SQLiteDatabase) => Promise<void>;
  updateSetting: <K extends keyof EditableSettings>(key: K, value: EditableSettings[K]) => void;
}

// The subset that represents user-configurable values
export interface EditableSettings {
  dayStartHour: number;
  dayEndHour: number;
  defaultTaskDurationMinutes: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  carryOverBehavior: CarryOverBehavior;
  reminderOffsetMinutes: number;
  theme: ThemeSetting;
  calendarSyncEnabled: boolean;
}

let _db: SQLiteDatabase | null = null;

const SETTING_KEYS: (keyof EditableSettings)[] = [
  'dayStartHour',
  'dayEndHour',
  'defaultTaskDurationMinutes',
  'quietHoursStart',
  'quietHoursEnd',
  'carryOverBehavior',
  'reminderOffsetMinutes',
  'theme',
  'calendarSyncEnabled',
];

function parseSettingValue(key: keyof EditableSettings, raw: string): EditableSettings[keyof EditableSettings] {
  switch (key) {
    case 'dayStartHour':
    case 'dayEndHour':
    case 'defaultTaskDurationMinutes':
    case 'reminderOffsetMinutes':
      return parseInt(raw, 10);
    case 'quietHoursStart':
    case 'quietHoursEnd':
    case 'carryOverBehavior':
    case 'theme':
      return raw;
    case 'calendarSyncEnabled':
      return raw === 'true';
    default:
      return raw;
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  dayStartHour: Defaults.dayStartHour,
  dayEndHour: Defaults.dayEndHour,
  defaultTaskDurationMinutes: Defaults.defaultTaskDurationMinutes,
  quietHoursStart: Defaults.quietHoursStart,
  quietHoursEnd: Defaults.quietHoursEnd,
  carryOverBehavior: Defaults.carryOverBehavior,
  reminderOffsetMinutes: Defaults.reminderOffsetMinutes,
  theme: 'system',
  calendarSyncEnabled: Defaults.calendarSyncEnabled,

  isHydrated: false,

  hydrateFromDb: async (db) => {
    _db = db;
    try {
      const raw = await loadSettings(db);
      const updates: Partial<EditableSettings> = {};
      for (const key of SETTING_KEYS) {
        if (key in raw) {
          (updates as Record<string, unknown>)[key] = parseSettingValue(key, raw[key]);
        }
      }
      set({ ...updates, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  updateSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    if (_db) {
      saveSetting(_db, key, String(value)).catch(console.error);
    }
  },
}));
