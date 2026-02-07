import { useEffect, useRef, useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTaskStore } from '../store';
import { useSettingsStore } from '../store';
import { todayISO } from '../utils';
import {
  getCarryOverCandidates,
  carryOverTasks,
  undoCarryOver,
} from '../services/carryOverService';
import type { Task } from '../types';

/**
 * Hook that manages automatic carry-over of unfinished tasks.
 * Should be called once in the root component after DB hydration.
 *
 * Behavior depends on carryOverBehavior setting:
 * - 'auto': silently carry over tasks to today
 * - 'ask': prompt user before carrying over
 * - 'never': do nothing
 */
export function useCarryOver() {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const carryOverBehavior = useSettingsStore((s) => s.carryOverBehavior);
  const isHydrated = useSettingsStore((s) => s.isHydrated);
  const hasRunRef = useRef(false);
  const [undoSnapshots, setUndoSnapshots] = useState<Task[] | null>(null);

  const applyCarryOver = useCallback(
    (candidates: Task[], today: string) => {
      const { carriedOver, originalSnapshots } = carryOverTasks(candidates, today);

      // Apply each carried-over task to the store (which persists to SQLite)
      for (const task of carriedOver) {
        updateTask(task.id, {
          scheduledDate: task.scheduledDate,
          carriedOverFrom: task.carriedOverFrom,
          updatedAt: task.updatedAt,
        });
      }

      // Save snapshots for undo
      setUndoSnapshots(originalSnapshots);
    },
    [updateTask],
  );

  const handleUndo = useCallback(() => {
    if (!undoSnapshots) return;

    const restored = undoCarryOver(undoSnapshots);
    for (const task of restored) {
      updateTask(task.id, {
        scheduledDate: task.scheduledDate,
        carriedOverFrom: task.carriedOverFrom,
        updatedAt: task.updatedAt,
      });
    }

    setUndoSnapshots(null);
  }, [undoSnapshots, updateTask]);

  // Run carry-over once on startup after hydration
  useEffect(() => {
    if (hasRunRef.current || !isHydrated || tasks.length === 0) return;

    const today = todayISO();
    const candidates = getCarryOverCandidates(tasks, today);

    if (candidates.length === 0) {
      hasRunRef.current = true;
      return;
    }

    switch (carryOverBehavior) {
      case 'auto':
        applyCarryOver(candidates, today);
        hasRunRef.current = true;
        break;

      case 'ask':
        Alert.alert(
          'Carry Over Tasks',
          `You have ${candidates.length} unfinished task${candidates.length > 1 ? 's' : ''} from previous days. Move them to today?`,
          [
            {
              text: 'Skip',
              style: 'cancel',
              onPress: () => {
                hasRunRef.current = true;
              },
            },
            {
              text: 'Move to Today',
              onPress: () => {
                applyCarryOver(candidates, today);
                hasRunRef.current = true;
              },
            },
          ],
        );
        break;

      case 'never':
        hasRunRef.current = true;
        break;
    }
  }, [tasks, isHydrated, carryOverBehavior, applyCarryOver]);

  return {
    /** Whether an undo is available */
    canUndo: undoSnapshots !== null && undoSnapshots.length > 0,
    /** Undo the last carry-over */
    undo: handleUndo,
    /** Dismiss the undo option */
    dismissUndo: () => setUndoSnapshots(null),
  };
}
