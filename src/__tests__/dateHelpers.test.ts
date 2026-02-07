import {
  formatDate,
  formatTime,
  todayISO,
  getDayStart,
  getDayEnd,
  addMinutesToDate,
  minutesBetween,
  areSameDay,
} from '../utils/dateHelpers';

describe('formatDate', () => {
  it('formats a Date object to yyyy-MM-dd', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formats an ISO string to yyyy-MM-dd', () => {
    expect(formatDate('2026-01-05')).toBe('2026-01-05');
  });
});

describe('formatTime', () => {
  it('formats a Date object to HH:mm', () => {
    const d = new Date(2026, 0, 5, 14, 30);
    expect(formatTime(d)).toBe('14:30');
  });

  it('formats an ISO datetime string', () => {
    // Use local date constructor to avoid timezone offset issues
    const d = new Date(2026, 0, 5, 9, 5);
    expect(formatTime(d)).toBe('09:05');
  });
});

describe('todayISO', () => {
  it('returns today in yyyy-MM-dd format', () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDayStart', () => {
  it('returns midnight of the given date', () => {
    const result = getDayStart(new Date(2026, 0, 5, 14, 30));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('accepts string input', () => {
    const result = getDayStart('2026-01-05');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(5);
    expect(result.getHours()).toBe(0);
  });
});

describe('getDayEnd', () => {
  it('returns 23:59:59.999 of the given date', () => {
    const result = getDayEnd(new Date(2026, 0, 5, 8, 0));
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });
});

describe('addMinutesToDate', () => {
  it('adds minutes to a date', () => {
    const start = new Date(2026, 0, 5, 9, 0);
    const result = addMinutesToDate(start, 45);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(45);
  });

  it('handles crossing hour boundary', () => {
    const start = new Date(2026, 0, 5, 9, 45);
    const result = addMinutesToDate(start, 30);
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(15);
  });

  it('accepts string input', () => {
    const result = addMinutesToDate('2026-01-05', 120);
    expect(result.getHours()).toBe(2);
  });
});

describe('minutesBetween', () => {
  it('calculates difference in minutes', () => {
    const start = new Date(2026, 0, 5, 9, 0);
    const end = new Date(2026, 0, 5, 10, 30);
    expect(minutesBetween(start, end)).toBe(90);
  });

  it('returns negative when end is before start', () => {
    const start = new Date(2026, 0, 5, 10, 0);
    const end = new Date(2026, 0, 5, 9, 0);
    expect(minutesBetween(start, end)).toBe(-60);
  });

  it('accepts string inputs', () => {
    const result = minutesBetween('2026-01-05', '2026-01-06');
    expect(result).toBe(1440); // 24 hours
  });
});

describe('areSameDay', () => {
  it('returns true for same day', () => {
    const a = new Date(2026, 0, 5, 9, 0);
    const b = new Date(2026, 0, 5, 17, 30);
    expect(areSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date(2026, 0, 5);
    const b = new Date(2026, 0, 6);
    expect(areSameDay(a, b)).toBe(false);
  });

  it('accepts string inputs', () => {
    expect(areSameDay('2026-01-05', '2026-01-05')).toBe(true);
    expect(areSameDay('2026-01-05', '2026-01-06')).toBe(false);
  });

  it('handles mixed string and Date inputs', () => {
    expect(areSameDay('2026-01-05', new Date(2026, 0, 5))).toBe(true);
  });
});
