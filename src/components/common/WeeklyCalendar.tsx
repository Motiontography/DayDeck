import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  parseISO,
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { Dimensions } from '../../constants';
import { useTaskStore, useTimeBlockStore } from '../../store';
import { todayISO } from '../../utils';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

export default function WeeklyCalendar() {
  const colors = useTheme();
  const styles = useStyles(colors);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setSelectedDate = useTaskStore((s) => s.setSelectedDate);
  const tasks = useTaskStore((s) => s.tasks);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);

  const selectedParsed = parseISO(selectedDate);
  const todayParsed = parseISO(todayISO());

  // Monday-based week
  const weekStart = startOfWeek(selectedParsed, { weekStartsOn: 0 });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart.getTime()]);

  // Check if week crosses month boundary
  const crossesMonths = !isSameMonth(weekDays[0], weekDays[6]);
  const monthLabel = crossesMonths
    ? `${format(weekDays[0], 'MMM')} / ${format(weekDays[6], 'MMM yyyy')}`
    : format(weekDays[0], 'MMMM yyyy');

  // Count dots for each day
  const dotCounts = useMemo(() => {
    return weekDays.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const taskCount = tasks.filter((t) => t.scheduledDate === dayStr).length;
      const blockCount = timeBlocks.filter((b) => {
        const bDate = parseISO(b.startTime);
        return isSameDay(bDate, day);
      }).length;
      return Math.min(taskCount + blockCount, 3);
    });
  }, [weekDays, tasks, timeBlocks]);

  // Completion status for dot colors
  const completionStatus = useMemo(() => {
    return weekDays.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTasks = tasks.filter((t) => t.scheduledDate === dayStr);
      if (dayTasks.length === 0) return 'none';
      const allDone = dayTasks.every((t) => t.status === 'done');
      if (allDone) return 'complete';
      const someDone = dayTasks.some((t) => t.status === 'done');
      if (someDone) return 'partial';
      return 'pending';
    });
  }, [weekDays, tasks]);

  const goToPrevWeek = useCallback(() => {
    const prev = subWeeks(selectedParsed, 1);
    setSelectedDate(format(prev, 'yyyy-MM-dd'));
  }, [selectedParsed, setSelectedDate]);

  const goToNextWeek = useCallback(() => {
    const next = addWeeks(selectedParsed, 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  }, [selectedParsed, setSelectedDate]);

  const selectDay = useCallback(
    (day: Date) => {
      setSelectedDate(format(day, 'yyyy-MM-dd'));
    },
    [setSelectedDate],
  );

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((event) => {
      if (event.translationX < -50) {
        const next = addWeeks(selectedParsed, 1);
        setSelectedDate(format(next, 'yyyy-MM-dd'));
      } else if (event.translationX > 50) {
        const prev = subWeeks(selectedParsed, 1);
        setSelectedDate(format(prev, 'yyyy-MM-dd'));
      }
    })
    .runOnJS(true);

  function getDotColor(status: string, isSelected: boolean): string {
    if (isSelected) return '#FFFFFF';
    switch (status) {
      case 'complete':
        return colors.success;
      case 'partial':
        return colors.warning;
      case 'pending':
        return colors.textTertiary;
      default:
        return 'transparent';
    }
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container} accessibilityHint="Swipe left or right to change week">
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <View style={styles.weekRow}>
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedParsed);
            const isToday = isSameDay(day, todayParsed);
            const dots = dotCounts[index];
            const status = completionStatus[index];

            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => selectDay(day)}
                style={({ pressed }) => [
                  styles.dayCell,
                  isToday && !isSelected && styles.todayCell,
                  isSelected && styles.selectedCell,
                  pressed && !isSelected && styles.pressedCell,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${format(day, 'EEEE, MMMM d')}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.dayAbbrev,
                    isSelected && styles.selectedText,
                    isToday && !isSelected && styles.todayText,
                  ]}
                >
                  {format(day, 'EEE')}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.selectedText,
                    isToday && !isSelected && styles.todayNumber,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
                <View style={styles.dotsRow}>
                  {dots > 0 &&
                    Array.from({ length: dots }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          { backgroundColor: getDotColor(status, isSelected) },
                        ]}
                      />
                    ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </GestureDetector>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    container: {
      paddingHorizontal: Dimensions.screenPadding,
      paddingTop: 4,
      paddingBottom: 6,
    },
    monthLabel: {
      fontSize: Dimensions.fontSM,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 14,
      minHeight: Dimensions.minTouchTarget,
    },
    todayCell: {
      borderWidth: 1.5,
      borderColor: colors.primary + '40',
    },
    selectedCell: {
      backgroundColor: colors.primary,
    },
    pressedCell: {
      backgroundColor: colors.surfaceTertiary,
    },
    dayAbbrev: {
      fontSize: Dimensions.fontXS,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.2,
      marginBottom: 2,
    },
    dayNumber: {
      fontSize: Dimensions.fontLG,
      fontWeight: '800',
      color: colors.text,
    },
    todayText: {
      color: colors.primary,
    },
    todayNumber: {
      color: colors.primary,
    },
    selectedText: {
      color: '#FFFFFF',
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 4,
      height: 5,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
  }), [colors]);
}
