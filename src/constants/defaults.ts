export const Defaults = {
  dayStartHour: 7,
  dayEndHour: 23,
  defaultTaskDurationMinutes: 30,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  carryOverBehavior: 'auto' as const,
  reminderOffsetMinutes: 15,
} as const;
