import { generateNextOccurrence, generateOccurrences } from '../utils/recurrenceEngine';
import type { Task, Recurrence } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: '',
    status: 'todo',
    priority: 'medium',
    scheduledDate: '2026-01-05', // Monday
    estimatedMinutes: 30,
    subtasks: [],
    recurrence: null,
    notifications: [],
    sortOrder: 0,
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-01-05T08:00:00.000Z',
    completedAt: null,
    carriedOverFrom: null,
    ...overrides,
  };
}

describe('generateNextOccurrence', () => {
  it('returns null when task has no recurrence', () => {
    const task = makeTask();
    expect(generateNextOccurrence(task)).toBeNull();
  });

  it('advances daily by interval', () => {
    const task = makeTask({
      recurrence: { frequency: 'daily', interval: 1 },
    });
    expect(generateNextOccurrence(task)).toBe('2026-01-06');
  });

  it('advances daily by interval > 1', () => {
    const task = makeTask({
      recurrence: { frequency: 'daily', interval: 3 },
    });
    expect(generateNextOccurrence(task)).toBe('2026-01-08');
  });

  it('advances weekly by interval', () => {
    const task = makeTask({
      recurrence: { frequency: 'weekly', interval: 1 },
    });
    expect(generateNextOccurrence(task)).toBe('2026-01-12');
  });

  it('advances weekly by interval of 2', () => {
    const task = makeTask({
      recurrence: { frequency: 'weekly', interval: 2 },
    });
    expect(generateNextOccurrence(task)).toBe('2026-01-19');
  });

  it('advances monthly by interval', () => {
    const task = makeTask({
      recurrence: { frequency: 'monthly', interval: 1 },
    });
    expect(generateNextOccurrence(task)).toBe('2026-02-05');
  });

  it('advances yearly by interval', () => {
    const task = makeTask({
      recurrence: { frequency: 'yearly', interval: 1 },
    });
    expect(generateNextOccurrence(task)).toBe('2027-01-05');
  });

  it('returns null when next occurrence is past endDate', () => {
    const task = makeTask({
      recurrence: { frequency: 'daily', interval: 1, endDate: '2026-01-05' },
    });
    expect(generateNextOccurrence(task)).toBeNull();
  });

  it('returns the date when next occurrence equals endDate', () => {
    const task = makeTask({
      recurrence: { frequency: 'daily', interval: 1, endDate: '2026-01-06' },
    });
    expect(generateNextOccurrence(task)).toBe('2026-01-06');
  });

  it('handles weekly with specific daysOfWeek', () => {
    // Task on Monday 2026-01-05, recurs on Wed(3) and Fri(5)
    const task = makeTask({
      recurrence: { frequency: 'weekly', interval: 1, daysOfWeek: [3, 5] },
    });
    // Next matching day after Monday is Wednesday
    expect(generateNextOccurrence(task)).toBe('2026-01-07');
  });

  it('wraps to next week when no more days this week', () => {
    // Task on Friday 2026-01-09, recurs on Mon(1) and Wed(3), interval=1
    const task = makeTask({
      scheduledDate: '2026-01-09', // Friday
      recurrence: { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3] },
    });
    // No more days this week after Friday -> next week Monday
    expect(generateNextOccurrence(task)).toBe('2026-01-12');
  });

  it('handles monthly across year boundary', () => {
    const task = makeTask({
      scheduledDate: '2026-11-15',
      recurrence: { frequency: 'monthly', interval: 2 },
    });
    expect(generateNextOccurrence(task)).toBe('2027-01-15');
  });
});

describe('generateOccurrences', () => {
  it('returns empty array when no recurrence', () => {
    const task = makeTask();
    expect(generateOccurrences(task, '2026-01-01', '2026-01-31')).toEqual([]);
  });

  it('generates daily occurrences within range', () => {
    const task = makeTask({
      scheduledDate: '2026-01-05',
      recurrence: { frequency: 'daily', interval: 1 },
    });
    const result = generateOccurrences(task, '2026-01-05', '2026-01-08');
    expect(result).toEqual(['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08']);
  });

  it('generates weekly occurrences within range', () => {
    const task = makeTask({
      scheduledDate: '2026-01-05',
      recurrence: { frequency: 'weekly', interval: 1 },
    });
    const result = generateOccurrences(task, '2026-01-01', '2026-01-31');
    expect(result).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']);
  });

  it('respects endDate', () => {
    const task = makeTask({
      scheduledDate: '2026-01-05',
      recurrence: { frequency: 'daily', interval: 1, endDate: '2026-01-07' },
    });
    const result = generateOccurrences(task, '2026-01-01', '2026-01-31');
    expect(result).toEqual(['2026-01-05', '2026-01-06', '2026-01-07']);
  });

  it('advances to range start when task starts before range', () => {
    const task = makeTask({
      scheduledDate: '2025-12-01',
      recurrence: { frequency: 'weekly', interval: 1 },
    });
    const result = generateOccurrences(task, '2026-01-05', '2026-01-19');
    // 2025-12-01 + weekly: 12/08, 12/15, 12/22, 12/29, 01/05, 01/12, 01/19
    expect(result).toEqual(['2026-01-05', '2026-01-12', '2026-01-19']);
  });

  it('handles biweekly with daysOfWeek across range', () => {
    const task = makeTask({
      scheduledDate: '2026-01-05', // Monday
      recurrence: { frequency: 'weekly', interval: 2, daysOfWeek: [1] }, // every other Monday
    });
    const result = generateOccurrences(task, '2026-01-05', '2026-02-10');
    expect(result).toEqual(['2026-01-05', '2026-01-19', '2026-02-02']);
  });
});
