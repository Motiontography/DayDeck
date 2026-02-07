import { create } from 'zustand';
import type { TimeBlock } from '../types';

interface TimeBlockStoreState {
  timeBlocks: TimeBlock[];
  addTimeBlock: (block: TimeBlock) => void;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (id: string) => void;
}

export const useTimeBlockStore = create<TimeBlockStoreState>((set) => ({
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
}));
