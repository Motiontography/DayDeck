import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { TimeBlock } from '../types';
import { loadAllTimeBlocks, saveTimeBlock, deleteTimeBlockFromDb } from '../db';

let _db: SQLiteDatabase | null = null;

function persistBlock(block: TimeBlock) {
  if (_db) saveTimeBlock(_db, block).catch(console.error);
}

interface TimeBlockStoreState {
  timeBlocks: TimeBlock[];
  hydrateFromDb: (db: SQLiteDatabase) => Promise<void>;
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

  hydrateFromDb: async (db) => {
    _db = db;
    const timeBlocks = await loadAllTimeBlocks(db);
    set({ timeBlocks });
  },

  addTimeBlock: (block) => {
    set((state) => ({ timeBlocks: [...state.timeBlocks, block] }));
    persistBlock(block);
  },

  updateTimeBlock: (id, updates) => {
    set((state) => ({
      timeBlocks: state.timeBlocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
    const updated = get().timeBlocks.find((b) => b.id === id);
    if (updated) persistBlock(updated);
  },

  deleteTimeBlock: (id) => {
    set((state) => ({ timeBlocks: state.timeBlocks.filter((b) => b.id !== id) }));
    if (_db) deleteTimeBlockFromDb(_db, id).catch(console.error);
  },

  moveTimeBlock: (id, newStartTime, newEndTime) => {
    set((state) => ({
      timeBlocks: state.timeBlocks.map((b) =>
        b.id === id ? { ...b, startTime: newStartTime, endTime: newEndTime } : b
      ),
    }));
    // Resolve overlaps after the move
    get().reorderBlocks();
    // Persist the moved block
    const moved = get().timeBlocks.find((b) => b.id === id);
    if (moved) persistBlock(moved);
  },

  reorderBlocks: () =>
    set((state) => {
      const sorted = [...state.timeBlocks].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      const changed: TimeBlock[] = [];

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (blocksOverlap(prev, curr)) {
          const prevEnd = new Date(prev.endTime);
          const currDuration = new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime();
          const newBlock = {
            ...curr,
            startTime: prevEnd.toISOString(),
            endTime: new Date(prevEnd.getTime() + currDuration).toISOString(),
          };
          sorted[i] = newBlock;
          changed.push(newBlock);
        }
      }

      // Persist all blocks that were shifted
      for (const block of changed) {
        persistBlock(block);
      }

      return { timeBlocks: sorted };
    }),
}));
