import {
  getCarryOverCandidates,
  carryOverTasks,
  undoCarryOver,
  clearCarryOverBadge,
} from '../services/carryOverService';
import type { Task } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: '',
    status: 'todo',
    priority: 'medium',
    scheduledDate: '2026-01-04',
    scheduledTime: null,
    estimatedMinutes: 30,
    subtasks: [],
    recurrence: null,
    notifications: [],
    sortOrder: 0,
    createdAt: '2026-01-04T08:00:00.000Z',
    updatedAt: '2026-01-04T08:00:00.000Z',
    completedAt: null,
    carriedOverFrom: null,
    ...overrides,
  };
}

describe('getCarryOverCandidates', () => {
  const today = '2026-01-05';

  it('returns tasks scheduled before today with todo status', () => {
    const tasks = [makeTask({ scheduledDate: '2026-01-04', status: 'todo' })];
    expect(getCarryOverCandidates(tasks, today)).toHaveLength(1);
  });

  it('returns tasks scheduled before today with in_progress status', () => {
    const tasks = [makeTask({ scheduledDate: '2026-01-04', status: 'in_progress' })];
    expect(getCarryOverCandidates(tasks, today)).toHaveLength(1);
  });

  it('excludes completed tasks', () => {
    const tasks = [makeTask({ scheduledDate: '2026-01-04', status: 'done' })];
    expect(getCarryOverCandidates(tasks, today)).toHaveLength(0);
  });

  it('excludes cancelled tasks', () => {
    const tasks = [makeTask({ scheduledDate: '2026-01-04', status: 'cancelled' })];
    expect(getCarryOverCandidates(tasks, today)).toHaveLength(0);
  });

  it('excludes tasks scheduled today or later', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledDate: '2026-01-05', status: 'todo' }),
      makeTask({ id: 't2', scheduledDate: '2026-01-06', status: 'todo' }),
    ];
    expect(getCarryOverCandidates(tasks, today)).toHaveLength(0);
  });

  it('handles multiple candidates from different past dates', () => {
    const tasks = [
      makeTask({ id: 't1', scheduledDate: '2026-01-03', status: 'todo' }),
      makeTask({ id: 't2', scheduledDate: '2026-01-04', status: 'in_progress' }),
      makeTask({ id: 't3', scheduledDate: '2026-01-04', status: 'done' }),
    ];
    const result = getCarryOverCandidates(tasks, today);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['t1', 't2']);
  });
});

describe('carryOverTasks', () => {
  it('moves tasks to the target date', () => {
    const candidates = [makeTask({ scheduledDate: '2026-01-04' })];
    const { carriedOver } = carryOverTasks(candidates, '2026-01-05');
    expect(carriedOver[0].scheduledDate).toBe('2026-01-05');
  });

  it('sets carriedOverFrom to the original scheduledDate', () => {
    const candidates = [makeTask({ scheduledDate: '2026-01-04', carriedOverFrom: null })];
    const { carriedOver } = carryOverTasks(candidates, '2026-01-05');
    expect(carriedOver[0].carriedOverFrom).toBe('2026-01-04');
  });

  it('preserves original carriedOverFrom if already set (double carry-over)', () => {
    const candidates = [
      makeTask({
        scheduledDate: '2026-01-04',
        carriedOverFrom: '2026-01-02', // originally from Jan 2
      }),
    ];
    const { carriedOver } = carryOverTasks(candidates, '2026-01-05');
    expect(carriedOver[0].carriedOverFrom).toBe('2026-01-02');
    expect(carriedOver[0].scheduledDate).toBe('2026-01-05');
  });

  it('returns original snapshots for undo', () => {
    const candidates = [makeTask({ scheduledDate: '2026-01-04' })];
    const { originalSnapshots } = carryOverTasks(candidates, '2026-01-05');
    expect(originalSnapshots[0].scheduledDate).toBe('2026-01-04');
    expect(originalSnapshots[0].carriedOverFrom).toBeNull();
  });

  it('snapshots are independent copies (no reference sharing)', () => {
    const candidates = [makeTask({ scheduledDate: '2026-01-04' })];
    const { carriedOver, originalSnapshots } = carryOverTasks(candidates, '2026-01-05');
    carriedOver[0].title = 'Modified';
    expect(originalSnapshots[0].title).toBe('Test Task');
  });

  it('updates the updatedAt timestamp', () => {
    const candidates = [makeTask({ updatedAt: '2026-01-04T08:00:00.000Z' })];
    const { carriedOver } = carryOverTasks(candidates, '2026-01-05');
    expect(carriedOver[0].updatedAt).not.toBe('2026-01-04T08:00:00.000Z');
  });
});

describe('undoCarryOver', () => {
  it('returns independent copies of original snapshots', () => {
    const snapshots = [makeTask({ scheduledDate: '2026-01-04' })];
    const restored = undoCarryOver(snapshots);
    expect(restored[0].scheduledDate).toBe('2026-01-04');
    // Verify independence
    restored[0].title = 'Changed';
    expect(snapshots[0].title).toBe('Test Task');
  });
});

describe('clearCarryOverBadge', () => {
  it('sets carriedOverFrom to null', () => {
    const task = makeTask({ carriedOverFrom: '2026-01-02' });
    const cleared = clearCarryOverBadge(task);
    expect(cleared.carriedOverFrom).toBeNull();
  });

  it('updates the updatedAt timestamp', () => {
    const task = makeTask({
      carriedOverFrom: '2026-01-02',
      updatedAt: '2026-01-04T08:00:00.000Z',
    });
    const cleared = clearCarryOverBadge(task);
    expect(cleared.updatedAt).not.toBe('2026-01-04T08:00:00.000Z');
  });

  it('does not mutate the original task', () => {
    const task = makeTask({ carriedOverFrom: '2026-01-02' });
    clearCarryOverBadge(task);
    expect(task.carriedOverFrom).toBe('2026-01-02');
  });
});
