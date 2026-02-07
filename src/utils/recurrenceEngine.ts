import { parseISO, addDays, addWeeks, addMonths, addYears, getDay, format, isAfter, isBefore, isSameDay } from 'date-fns';
import type { Task, Recurrence } from '../types';

const DATE_FORMAT = 'yyyy-MM-dd';

/**
 * Given a task with a recurrence rule and a reference date (the task's scheduledDate),
 * returns the next occurrence date as an ISO date string, or null if there are no more.
 */
export function generateNextOccurrence(task: Task): string | null {
  if (!task.recurrence) return null;

  const { recurrence } = task;
  const currentDate = parseISO(task.scheduledDate);
  const nextDate = advanceDate(currentDate, recurrence);

  if (!nextDate) return null;

  if (recurrence.endDate && isAfter(nextDate, parseISO(recurrence.endDate))) {
    return null;
  }

  return format(nextDate, DATE_FORMAT);
}

/**
 * Generates all occurrence dates for a recurring task within a date range [startDate, endDate].
 * Returns an array of ISO date strings.
 */
export function generateOccurrences(
  task: Task,
  startDate: string,
  endDate: string
): string[] {
  if (!task.recurrence) return [];

  const { recurrence } = task;
  const rangeStart = parseISO(startDate);
  const rangeEnd = parseISO(endDate);
  const ruleEnd = recurrence.endDate ? parseISO(recurrence.endDate) : null;
  const occurrences: string[] = [];

  let cursor = parseISO(task.scheduledDate);

  // If the task's original due date is before the range, advance to range start
  while (isBefore(cursor, rangeStart) && !isSameDay(cursor, rangeStart)) {
    const next = advanceDate(cursor, recurrence);
    if (!next) break;
    if (ruleEnd && isAfter(next, ruleEnd)) break;
    cursor = next;
  }

  // Collect occurrences within range
  while (
    (isBefore(cursor, rangeEnd) || isSameDay(cursor, rangeEnd)) &&
    (!ruleEnd || isBefore(cursor, ruleEnd) || isSameDay(cursor, ruleEnd))
  ) {
    if (isSameDay(cursor, rangeStart) || isAfter(cursor, rangeStart)) {
      occurrences.push(format(cursor, DATE_FORMAT));
    }

    const next = advanceDate(cursor, recurrence);
    if (!next) break;
    // Safety: prevent infinite loops if advanceDate returns same date
    if (isSameDay(next, cursor)) break;
    cursor = next;
  }

  return occurrences;
}

/**
 * Advance a date by the recurrence rule. Returns the next Date or null.
 */
function advanceDate(current: Date, recurrence: Recurrence): Date | null {
  const { frequency, interval } = recurrence;

  switch (frequency) {
    case 'daily':
      return addDays(current, interval);

    case 'weekly': {
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        return findNextWeekday(current, recurrence.daysOfWeek, interval);
      }
      return addWeeks(current, interval);
    }

    case 'monthly':
      return addMonths(current, interval);

    case 'yearly':
      return addYears(current, interval);

    default:
      return null;
  }
}

/**
 * For weekly recurrence with specific days, finds the next matching weekday.
 * Days are 0=Sun..6=Sat.
 * If there are more matching days in the current week, picks the next one.
 * Otherwise, jumps ahead by `interval` weeks and picks the first matching day.
 */
function findNextWeekday(
  current: Date,
  daysOfWeek: number[],
  interval: number
): Date {
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  const currentDay = getDay(current); // 0-6

  // Find next day in the same week (same interval cycle)
  for (const day of sorted) {
    if (day > currentDay) {
      return addDays(current, day - currentDay);
    }
  }

  // No more days this week; jump to the first matching day of the next interval week
  const daysUntilSunday = 7 - currentDay;
  const nextWeekStart = addDays(current, daysUntilSunday + (interval - 1) * 7);
  // nextWeekStart is Sunday of the target week
  const firstDay = sorted[0];
  return addDays(nextWeekStart, firstDay);
}
