import type { TimeBlock, CalendarEvent } from '../types';

export interface Conflict {
  timeBlockId: string;
  calendarEventId: string;
  overlapStartTime: string;
  overlapEndTime: string;
}

/**
 * Detects overlaps between time blocks and calendar events.
 * Two intervals [a1, a2) and [b1, b2) overlap if a1 < b2 AND b1 < a2.
 */
export function detectConflicts(
  timeBlocks: TimeBlock[],
  calendarEvents: CalendarEvent[],
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const block of timeBlocks) {
    const blockStart = new Date(block.startTime).getTime();
    const blockEnd = new Date(block.endTime).getTime();

    for (const event of calendarEvents) {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();

      if (blockStart < eventEnd && eventStart < blockEnd) {
        const overlapStart = Math.max(blockStart, eventStart);
        const overlapEnd = Math.min(blockEnd, eventEnd);
        conflicts.push({
          timeBlockId: block.id,
          calendarEventId: event.id,
          overlapStartTime: new Date(overlapStart).toISOString(),
          overlapEndTime: new Date(overlapEnd).toISOString(),
        });
      }
    }
  }

  return conflicts;
}

/**
 * Checks if a specific time block has any conflicts.
 */
export function hasConflict(blockId: string, conflicts: Conflict[]): boolean {
  return conflicts.some((c) => c.timeBlockId === blockId);
}

/**
 * Gets the calendar event IDs that conflict with a specific time block.
 */
export function getConflictingEventIds(
  blockId: string,
  conflicts: Conflict[],
): string[] {
  return conflicts
    .filter((c) => c.timeBlockId === blockId)
    .map((c) => c.calendarEventId);
}
