import { format, parseISO, startOfDay, endOfDay, addMinutes, differenceInMinutes, isSameDay } from 'date-fns';
import { Config } from '../constants';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, Config.dateFormat);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, Config.timeFormat);
}

export function todayISO(): string {
  return formatDate(new Date());
}

export function getDayStart(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(d);
}

export function getDayEnd(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfDay(d);
}

export function addMinutesToDate(date: Date | string, minutes: number): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addMinutes(d, minutes);
}

export function minutesBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  return differenceInMinutes(e, s);
}

export function areSameDay(a: Date | string, b: Date | string): boolean {
  const dateA = typeof a === 'string' ? parseISO(a) : a;
  const dateB = typeof b === 'string' ? parseISO(b) : b;
  return isSameDay(dateA, dateB);
}
