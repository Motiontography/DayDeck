import { create } from 'zustand';
import type { TimeBlock } from '../types';

interface TimeBlockStoreState {
  timeBlocks: TimeBlock[];
  addTimeBlock: (block: TimeBlock) => void;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (id: string) => void;
  moveTimeBlock: (id: string, newStartTime: string, newEndTime: string) => void;
  reorderBlocks: () => void;
}

function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  return a.startTime < b.endTime && a.endTime > b.startTime;
}

export const useTimeBlockStore = create<TimeBlockStoreState>((set, get) => ({
  timeBlocks: [],

  addTimeBlock: (block) =>
    set((state) => ({ timeBlocks: [...state.timeBlocks, block] })),

  updateTimeBlock: (id, updates) =>
    set((state) => ({
      timeBlocks: state.timeBlocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),

  deleteTimeBlock: (id) =>
    set((state) => ({ timeBlocks: state.timeBlocks.filter((b) => b.id !== id) })),

  moveTimeBlock: (id, newStartTime, newEndTime) => {
    set((state) => ({
      timeBlocks: state.timeBlocks.map((b) =>
        b.id === id ? { ...b, startTime: newStartTime, endTime: newEndTime } : b
      ),
    }));
    // Resolve overlaps after the move
    get().reorderBlocks();
  },

  reorderBlocks: () =>
    set((state) => {
      // Sort blocks by startTime, then resolve overlaps by shifting later blocks down
      const sorted = [...state.timeBlocks].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (blocksOverlap(prev, curr)) {
          // Shift current block to start right after previous block ends
          const prevEnd = new Date(prev.endTime);
          const currDuration = new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime();
          sorted[i] = {
            ...curr,
            startTime: prevEnd.toISOString(),
            endTime: new Date(prevEnd.getTime() + currDuration).toISOString(),
          };
        }
      }

      return { timeBlocks: sorted };
    }),
}));
