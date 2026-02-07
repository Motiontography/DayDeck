import { useTimeBlockStore } from '../store/useTimeBlockStore';
import type { TimeBlock } from '../types';

function makeBlock(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 'block-1',
    taskId: null,
    title: 'Block',
    startTime: '2026-01-05T09:00:00.000Z',
    endTime: '2026-01-05T10:00:00.000Z',
    color: '#4F46E5',
    type: 'task',
    ...overrides,
  };
}

describe('useTimeBlockStore', () => {
  beforeEach(() => {
    useTimeBlockStore.setState({ timeBlocks: [] });
  });

  it('adds a time block', () => {
    const block = makeBlock();
    useTimeBlockStore.getState().addTimeBlock(block);
    expect(useTimeBlockStore.getState().timeBlocks).toHaveLength(1);
    expect(useTimeBlockStore.getState().timeBlocks[0].id).toBe('block-1');
  });

  it('updates a time block', () => {
    useTimeBlockStore.getState().addTimeBlock(makeBlock());
    useTimeBlockStore.getState().updateTimeBlock('block-1', { title: 'Updated' });
    expect(useTimeBlockStore.getState().timeBlocks[0].title).toBe('Updated');
  });

  it('deletes a time block', () => {
    useTimeBlockStore.getState().addTimeBlock(makeBlock());
    useTimeBlockStore.getState().deleteTimeBlock('block-1');
    expect(useTimeBlockStore.getState().timeBlocks).toHaveLength(0);
  });

  it('moves a block and resolves overlaps', () => {
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

    useTimeBlockStore.getState().addTimeBlock(block1);
    useTimeBlockStore.getState().addTimeBlock(block2);

    // Move block-1 to overlap with block-2
    useTimeBlockStore.getState().moveTimeBlock(
      'block-1',
      '2026-01-05T10:00:00.000Z',
      '2026-01-05T11:00:00.000Z',
    );

    const blocks = useTimeBlockStore.getState().timeBlocks;
    // block-2 should be shifted after block-1
    const b1 = blocks.find((b) => b.id === 'block-1')!;
    const b2 = blocks.find((b) => b.id === 'block-2')!;
    expect(new Date(b2.startTime).getTime()).toBeGreaterThanOrEqual(
      new Date(b1.endTime).getTime(),
    );
  });

  it('reorderBlocks shifts overlapping blocks down', () => {
    const block1 = makeBlock({
      id: 'block-1',
      startTime: '2026-01-05T09:00:00.000Z',
      endTime: '2026-01-05T10:30:00.000Z',
    });
    const block2 = makeBlock({
      id: 'block-2',
      startTime: '2026-01-05T10:00:00.000Z',
      endTime: '2026-01-05T11:00:00.000Z',
    });
    const block3 = makeBlock({
      id: 'block-3',
      startTime: '2026-01-05T10:30:00.000Z',
      endTime: '2026-01-05T11:30:00.000Z',
    });

    useTimeBlockStore.setState({ timeBlocks: [block1, block2, block3] });
    useTimeBlockStore.getState().reorderBlocks();

    const blocks = useTimeBlockStore.getState().timeBlocks;
    // All blocks should be non-overlapping and sorted
    for (let i = 1; i < blocks.length; i++) {
      expect(new Date(blocks[i].startTime).getTime()).toBeGreaterThanOrEqual(
        new Date(blocks[i - 1].endTime).getTime(),
      );
    }
  });

  it('preserves duration when resolving overlaps', () => {
    const block1 = makeBlock({
      id: 'block-1',
      startTime: '2026-01-05T09:00:00.000Z',
      endTime: '2026-01-05T10:00:00.000Z',
    });
    const block2 = makeBlock({
      id: 'block-2',
      startTime: '2026-01-05T09:30:00.000Z', // overlaps with block-1
      endTime: '2026-01-05T10:30:00.000Z',   // 60 min duration
    });

    useTimeBlockStore.setState({ timeBlocks: [block1, block2] });
    useTimeBlockStore.getState().reorderBlocks();

    const b2 = useTimeBlockStore.getState().timeBlocks.find((b) => b.id === 'block-2')!;
    const duration = new Date(b2.endTime).getTime() - new Date(b2.startTime).getTime();
    expect(duration).toBe(60 * 60 * 1000); // 60 minutes preserved
  });
});
