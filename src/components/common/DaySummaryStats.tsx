import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parseISO, isSameDay } from 'date-fns';
import { Dimensions } from '../../constants';
import { useTaskStore, useTimeBlockStore } from '../../store';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

export default function DaySummaryStats() {
  const colors = useTheme();
  const styles = useStyles(colors);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const tasks = useTaskStore((s) => s.tasks);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);

  const stats = useMemo(() => {
    const selectedParsed = parseISO(selectedDate);

    // Tasks for this day
    const dayTasks = tasks.filter((t) => t.scheduledDate === selectedDate);
    const completedCount = dayTasks.filter((t) => t.status === 'done').length;
    const totalTasks = dayTasks.length;

    // Time blocks for this day
    const dayBlocks = timeBlocks.filter((b) => {
      return isSameDay(parseISO(b.startTime), selectedParsed);
    });

    // Total planned time
    const totalMinutes = dayBlocks.reduce((sum, b) => {
      const dur = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000;
      return sum + Math.max(0, dur);
    }, 0);

    // Focus time = sum of 'focus' type blocks
    const focusMinutes = dayBlocks
      .filter((b) => b.type === 'focus')
      .reduce((sum, b) => {
        const dur = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000;
        return sum + Math.max(0, dur);
      }, 0);

    return { completedCount, totalTasks, totalMinutes, focusMinutes };
  }, [selectedDate, tasks, timeBlocks]);

  const allDone = stats.totalTasks > 0 && stats.completedCount === stats.totalTasks;
  const hasAnyContent = stats.totalTasks > 0 || stats.totalMinutes > 0;

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  if (!hasAnyContent) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No plans yet - add tasks or blocks to get started</Text>
        </View>
      </View>
    );
  }

  if (allDone) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.celebrationCard]}>
          <Text style={styles.celebrationEmoji}>{'\u{1F389}'}</Text>
          <Text style={styles.celebrationText}>
            All {stats.totalTasks} task{stats.totalTasks !== 1 ? 's' : ''} done!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {stats.totalTasks > 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillEmoji}>{'\u2705'}</Text>
            <Text style={styles.pillText}>
              {stats.completedCount}/{stats.totalTasks} tasks
            </Text>
          </View>
        )}

        {stats.totalMinutes > 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillEmoji}>{'\u23F1'}</Text>
            <Text style={styles.pillText}>{formatDuration(stats.totalMinutes)} planned</Text>
          </View>
        )}

        {stats.focusMinutes > 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillEmoji}>{'\u26A1'}</Text>
            <Text style={styles.pillText}>{formatDuration(stats.focusMinutes)} focus</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    container: {
      paddingHorizontal: Dimensions.screenPadding,
      paddingBottom: 6,
    },
    card: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    emptyCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: Dimensions.fontSM,
      fontWeight: '500',
      color: colors.textTertiary,
    },
    celebrationCard: {
      backgroundColor: colors.successLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    celebrationEmoji: {
      fontSize: 16,
    },
    celebrationText: {
      fontSize: Dimensions.fontSM,
      fontWeight: '700',
      color: colors.success,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.background,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    pillEmoji: {
      fontSize: 12,
    },
    pillText: {
      fontSize: Dimensions.fontSM,
      fontWeight: '600',
      color: colors.text,
    },
  }), [colors]);
}
