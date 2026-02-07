export const Colors = {
  primary: '#4F46E5', // indigo-600
  primaryLight: '#818CF8', // indigo-400
  primaryDark: '#3730A3', // indigo-800

  background: '#F9FAFB', // gray-50
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6', // gray-100

  text: '#111827', // gray-900
  textSecondary: '#6B7280', // gray-500
  textTertiary: '#6B7280', // gray-500 (meets WCAG AA 4.5:1 on gray-50)

  border: '#E5E7EB', // gray-200
  borderFocus: '#4F46E5',

  success: '#10B981', // emerald-500
  warning: '#F59E0B', // amber-500
  error: '#EF4444', // red-500
  info: '#3B82F6', // blue-500

  priorityLow: '#10B981',
  priorityMedium: '#F59E0B',
  priorityHigh: '#F97316', // orange-500
  priorityUrgent: '#EF4444',

  timeBlockTask: '#818CF8',
  timeBlockEvent: '#3B82F6',
  timeBlockBreak: '#10B981',
  timeBlockFocus: '#F59E0B',
} as const;
