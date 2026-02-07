import { detectConflicts, hasConflict, getConflictingEventIds } from '../utils/conflictDetection';
import type { TimeBlock, CalendarEvent } from '../types';

function makeBlock(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 'block-1',
    taskId: null,
    title: 'Work Block',
    startTime: '2026-01-05T09:00:00.000Z',
    endTime: '2026-01-05T10:00:00.000Z',
    color: '#4F46E5',
    type: 'task',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    title: 'Meeting',
    startTime: '2026-01-05T09:30:00.000Z',
    endTime: '2026-01-05T10:30:00.000Z',
    calendarId: 'cal-1',
    color: '#EF4444',
    ...overrides,
  };
}

describe('detectConflicts', () => {
  it('returns empty array when no blocks or events', () => {
    expect(detectConflicts([], [])).toEqual([]);
  });

  it('returns empty when no overlaps exist', () => {
    const block = makeBlock({
      startTime: '2026-01-05T09:00:00.000Z',
      endTime: '2026-01-05T10:00:00.000Z',
    });
    const event = makeEvent({
      startTime: '2026-01-05T10:00:00.000Z',
      endTime: '2026-01-05T11:00:00.000Z',
    });
    expect(detectConflicts([block], [event])).toEqual([]);
  });

  it('detects partial overlap (block starts before event)', () => {
    const block = makeBlock({
      startTime: '2026-01-05T09:00:00.000Z',
      endTime: '2026-01-05T10:00:00.000Z',
    });
    const event = makeEvent({
      startTime: '2026-01-05T09:30:00.000Z',
      endTime: '2026-01-05T10:30:00.000Z',
    });
    const conflicts = detectConflicts([block], [event]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].timeBlockId).toBe('block-1');
    expect(conflicts[0].calendarEventId).toBe('event-1');
    expect(conflicts[0].overlapStartTime).toBe('2026-01-05T09:30:00.000Z');
    expect(conflicts[0].overlapEndTime).toBe('2026-01-05T10:00:00.000Z');
  });

  it('detects full containment (event inside block)', () => {
    const block = makeBlock({
      startTime: '2026-01-05T08:00:00.000Z',
      endTime: '2026-01-05T12:00:00.000Z',
    });
    const event = makeEvent({
      startTime: '2026-01-05T09:00:00.000Z',
      endTime: '2026-01-05T10:00:00.000Z',
    });
    const conflicts = detectConflicts([block], [event]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapStartTime).toBe('2026-01-05T09:00:00.000Z');
    expect(conflicts[0].overlapEndTime).toBe('2026-01-05T10:00:00.000Z');
  });

  it('detects multiple blocks conflicting with one event', () => {
    const block1 = makeBlock({
      id: 'block-1',
      startTime: '2026-01-05T09:00:00.000Z',
      endTime: '2026-01-05T10:00:00.000Z',
    });
    const block2 = makeBlock({
      id: 'block-2',
      startTime: '2026-01-05T10:00:00.000Z',
      endTime: '2026-01-05T11:00:00.000Z',
    });
    const event = makeEvent({
      startTime: '2026-01-05T09:30:00.000Z',
      endTime: '2026-01-05T10:30:00.000Z',
    });
    const conflicts = detectConflicts([block1, block2], [event]);
    expect(conflicts).toHaveLength(2);
    expect(conflicts.map((c) => c.timeBlockId)).toEqual(['block-1', 'block-2']);
  });

  it('handles adjacent intervals (end == start) as non-overlapping', () => {
    const block = makeBlock({
      startTime: '2026-01-05T09:00:00.000Z',
      endTime: '2026-01-05T10:00:00.000Z',
    });
    const event = makeEvent({
      startTime: '2026-01-05T10:00:00.000Z',
      endTime: '2026-01-05T11:00:00.000Z',
    });
    expect(detectConflicts([block], [event])).toEqual([]);
  });
});

describe('hasConflict', () => {
  it('returns false when block has no conflicts', () => {
    expect(hasConflict('block-99', [])).toBe(false);
  });

  it('returns true when block is in conflict list', () => {
    const conflicts = [
      {
        timeBlockId: 'block-1',
        calendarEventId: 'event-1',
        overlapStartTime: '2026-01-05T09:30:00.000Z',
        overlapEndTime: '2026-01-05T10:00:00.000Z',
      },
    ];
    expect(hasConflict('block-1', conflicts)).toBe(true);
    expect(hasConflict('block-2', conflicts)).toBe(false);
  });
});

describe('getConflictingEventIds', () => {
  it('returns empty array when no conflicts for block', () => {
    expect(getConflictingEventIds('block-99', [])).toEqual([]);
  });

  it('returns matching event ids', () => {
    const conflicts = [
      {
        timeBlockId: 'block-1',
        calendarEventId: 'event-1',
        overlapStartTime: '',
        overlapEndTime: '',
      },
      {
        timeBlockId: 'block-1',
        calendarEventId: 'event-2',
        overlapStartTime: '',
        overlapEndTime: '',
      },
      {
        timeBlockId: 'block-2',
        calendarEventId: 'event-3',
        overlapStartTime: '',
        overlapEndTime: '',
      },
    ];
    expect(getConflictingEventIds('block-1', conflicts)).toEqual(['event-1', 'event-2']);
    expect(getConflictingEventIds('block-2', conflicts)).toEqual(['event-3']);
  });
});
