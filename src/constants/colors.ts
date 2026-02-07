export const Colors = {
  primary: '#6366F1', // indigo-500 — vibrant
  primaryLight: '#A5B4FC', // indigo-300
  primaryDark: '#4338CA', // indigo-700
  primaryMuted: '#EEF2FF', // indigo-50

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC', // slate-50
  surfaceTertiary: '#F1F5F9', // slate-100

  text: '#0F172A', // slate-900
  textSecondary: '#64748B', // slate-500
  textTertiary: '#94A3B8', // slate-400

  border: '#E2E8F0', // slate-200
  borderLight: '#F1F5F9', // slate-100
  borderFocus: '#6366F1',

  success: '#10B981', // emerald-500
  successLight: '#D1FAE5', // emerald-100
  warning: '#F59E0B', // amber-500
  warningLight: '#FEF3C7', // amber-100
  error: '#EF4444', // red-500
  errorLight: '#FEE2E2', // red-100
  info: '#3B82F6', // blue-500

  priorityLow: '#10B981',
  priorityMedium: '#F59E0B',
  priorityHigh: '#F97316', // orange-500
  priorityUrgent: '#EF4444',

  timeBlockTask: '#818CF8',
  timeBlockEvent: '#60A5FA',
  timeBlockBreak: '#34D399',
  timeBlockFocus: '#FBBF24',

  timelineBackground: '#F8FAFC',
  timelineHourLine: '#E2E8F0',
  timelineNowLine: '#EF4444',
} as const;

// Light theme is the same as the default Colors export
export const LightColors = Colors;

// Dark theme
export const DarkColors: ThemeColors = {
  primary: '#818CF8', // indigo-400 — brighter on dark
  primaryLight: '#A5B4FC', // indigo-300
  primaryDark: '#6366F1', // indigo-500
  primaryMuted: '#1E1B4B', // indigo-950

  background: '#0F172A', // slate-900
  surface: '#1E293B', // slate-800
  surfaceSecondary: '#334155', // slate-700
  surfaceTertiary: '#475569', // slate-600

  text: '#F8FAFC', // slate-50
  textSecondary: '#94A3B8', // slate-400
  textTertiary: '#64748B', // slate-500

  border: '#334155', // slate-700
  borderLight: '#1E293B', // slate-800
  borderFocus: '#818CF8',

  success: '#10B981',
  successLight: '#064E3B', // emerald-900
  warning: '#F59E0B',
  warningLight: '#78350F', // amber-900
  error: '#EF4444',
  errorLight: '#7F1D1D', // red-900
  info: '#3B82F6',

  priorityLow: '#10B981',
  priorityMedium: '#F59E0B',
  priorityHigh: '#F97316',
  priorityUrgent: '#EF4444',

  timeBlockTask: '#818CF8',
  timeBlockEvent: '#60A5FA',
  timeBlockBreak: '#34D399',
  timeBlockFocus: '#FBBF24',

  timelineBackground: '#1E293B',
  timelineHourLine: '#334155',
  timelineNowLine: '#EF4444',
} as const;

export type ThemeColors = { [K in keyof typeof Colors]: string };
