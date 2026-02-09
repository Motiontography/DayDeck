import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  parseISO,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Dimensions } from '../../constants';
import { useTaskStore, useTimeBlockStore, useCalendarStore } from '../../store';
import { todayISO } from '../../utils';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import { TaskForm } from '../task';
import type { Task, TimeBlock, CalendarEvent } from '../../types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatBlockTime(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${formatHour(start)} \u2013 ${formatHour(end)}`;
}

function formatHour(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function formatScheduledTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${mStr} ${suffix}`;
}

export default function MonthCalendar() {
  const colors = useTheme();
  const styles = useStyles(colors);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setSelectedDate = useTaskStore((s) => s.setSelectedDate);
  const tasks = useTaskStore((s) => s.tasks);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const addTask = useTaskStore((s) => s.addTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const deleteFutureRecurring = useTaskStore((s) => s.deleteFutureRecurring);
  const updateTimeBlock = useTimeBlockStore((s) => s.updateTimeBlock);
  const deleteTimeBlock = useTimeBlockStore((s) => s.deleteTimeBlock);
  const calendarEvents = useCalendarStore((s) => s.calendarEvents);
  const calendarEnabled = useCalendarStore((s) => s.calendarEnabled);

  const selectedParsed = parseISO(selectedDate);
  const todayParsed = parseISO(todayISO());

  // The displayed month can differ from the selected date
  const [displayedMonth, setDisplayedMonth] = useState<Date>(
    startOfMonth(selectedParsed),
  );

  // Editing state
  const [taskFormVisible, setTaskFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Build the calendar grid (Monday-based weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(displayedMonth);
    const monthEnd = endOfMonth(displayedMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [displayedMonth.getTime()]);

  // Split into rows of 7
  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  // Build a map of date string -> task info for the visible range
  const taskInfoMap = useMemo(() => {
    const map: Record<string, { count: number; status: 'none' | 'pending' | 'partial' | 'complete' }> = {};
    for (const day of calendarDays) {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTasks = tasks.filter((t: Task) => t.scheduledDate === dayStr);
      const blockCount = timeBlocks.filter((b) => {
        const bDate = parseISO(b.startTime);
        return isSameDay(bDate, day);
      }).length;
      const totalCount = Math.min(dayTasks.length + blockCount, 3);

      let status: 'none' | 'pending' | 'partial' | 'complete' = 'none';
      if (dayTasks.length > 0) {
        const allDone = dayTasks.every((t: Task) => t.status === 'done');
        if (allDone) {
          status = 'complete';
        } else {
          const someDone = dayTasks.some((t: Task) => t.status === 'done');
          status = someDone ? 'partial' : 'pending';
        }
      }

      map[dayStr] = { count: totalCount, status };
    }
    return map;
  }, [calendarDays, tasks, timeBlocks]);

  const goToPrevMonth = useCallback(() => {
    setDisplayedMonth((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setDisplayedMonth((prev) => addMonths(prev, 1));
  }, []);

  const selectDay = useCallback(
    (day: Date) => {
      setSelectedDate(format(day, 'yyyy-MM-dd'));
    },
    [setSelectedDate],
  );

  const handlePressTask = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskFormVisible(true);
  }, []);

  const handlePressBlock = useCallback((block: TimeBlock) => {
    setSelectedBlock(block);
    setEditTitle(block.title);
    setIsEditingTitle(false);
    setEditSheetVisible(true);
  }, []);

  const handleSaveBlockTitle = useCallback(() => {
    if (!selectedBlock) return;
    const title = editTitle.trim();
    if (!title) return;
    updateTimeBlock(selectedBlock.id, { title });
    setSelectedBlock({ ...selectedBlock, title });
    setIsEditingTitle(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedBlock, editTitle, updateTimeBlock]);

  const handleDeleteBlock = useCallback(() => {
    if (!selectedBlock) return;
    Alert.alert(
      'Delete Block',
      `Are you sure you want to delete "${selectedBlock.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTimeBlock(selectedBlock.id);
            setEditSheetVisible(false);
            setSelectedBlock(null);
          },
        },
      ],
    );
  }, [selectedBlock, deleteTimeBlock]);

  const handleCloseTaskForm = useCallback(() => {
    setTaskFormVisible(false);
    setEditingTask(null);
  }, []);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((event) => {
      if (event.translationX < -50) {
        setDisplayedMonth((prev) => addMonths(prev, 1));
      } else if (event.translationX > 50) {
        setDisplayedMonth((prev) => subMonths(prev, 1));
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

  // Selected day details — merge tasks and time blocks
  const selectedDayTasks = useMemo(() => {
    return tasks
      .filter((t: Task) => t.scheduledDate === selectedDate)
      .sort((a: Task, b: Task) => a.sortOrder - b.sortOrder);
  }, [tasks, selectedDate]);

  const selectedDayBlocks = useMemo(() => {
    const selParsed = parseISO(selectedDate);
    return timeBlocks
      .filter((b) => {
        const bDate = parseISO(b.startTime);
        return isSameDay(bDate, selParsed);
      })
      // Exclude blocks that are linked to a task (already shown via tasks)
      .filter((b) => !b.taskId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [timeBlocks, selectedDate]);

  const selectedDayCalendarEvents = useMemo(() => {
    if (!calendarEnabled) return [];
    const selParsed2 = parseISO(selectedDate);
    return calendarEvents.filter((e: CalendarEvent) => {
      const eDate = parseISO(e.startTime);
      return isSameDay(eDate, selParsed2);
    });
  }, [calendarEvents, calendarEnabled, selectedDate]);

  const monthLabel = format(displayedMonth, 'MMMM yyyy');

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.container} accessibilityHint="Swipe left or right to change month">
          {/* Month header with navigation arrows */}
          <View style={styles.monthHeader}>
            <Pressable
              onPress={goToPrevMonth}
              style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={8}
            >
              <Text style={styles.arrowText}>{'\u2039'}</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable
              onPress={goToNextMonth}
              style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              hitSlop={8}
            >
              <Text style={styles.arrowText}>{'\u203A'}</Text>
            </Pressable>
          </View>

          {/* Day-of-week header row */}
          <View style={styles.dayHeaderRow}>
            {DAY_LABELS.map((label) => (
              <View key={label} style={styles.dayHeaderCell}>
                <Text style={styles.dayHeaderText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, displayedMonth);
                const isSelected = isSameDay(day, selectedParsed);
                const isToday = isSameDay(day, todayParsed);
                const info = taskInfoMap[dayStr] || { count: 0, status: 'none' };

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
                        styles.dayNumber,
                        !isCurrentMonth && styles.outsideMonthText,
                        isToday && !isSelected && styles.todayText,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                    <View style={styles.dotsRow}>
                      {info.count > 0 &&
                        Array.from({ length: info.count }, (_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              { backgroundColor: getDotColor(info.status, isSelected) },
                            ]}
                          />
                        ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </GestureDetector>

      {/* Day detail panel below the calendar */}
      <View style={styles.dayDetailPanel}>
        <Text style={styles.dayDetailDate}>
          {format(selectedParsed, 'EEEE, MMMM d')}
        </Text>
        {selectedDayTasks.length === 0 && selectedDayBlocks.length === 0 && selectedDayCalendarEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tasks or blocks for this day</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {/* Time blocks (non-task) */}
            {selectedDayBlocks.map((block: TimeBlock) => (
              <Pressable key={block.id} style={styles.taskItem} onPress={() => handlePressBlock(block)}>
                <View
                  style={[
                    styles.taskStatusDot,
                    { backgroundColor: block.color || colors.primary },
                  ]}
                />
                <View style={styles.taskItemContent}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {block.title}
                  </Text>
                  <Text style={styles.taskTime}>
                    {formatBlockTime(block.startTime, block.endTime)}
                  </Text>
                </View>
                <Text style={[styles.taskStatusLabel, { color: block.color || colors.primary }]}>
                  {block.type === 'focus' ? 'Focus' : block.type === 'break' ? 'Break' : block.type === 'event' ? 'Event' : 'Task'}
                </Text>
              </Pressable>
            ))}
            {/* Tasks */}
            {selectedDayTasks.map((task: Task) => (
              <Pressable key={task.id} style={styles.taskItem} onPress={() => handlePressTask(task)}>
                <View
                  style={[
                    styles.taskStatusDot,
                    {
                      backgroundColor:
                        task.status === 'done'
                          ? colors.success
                          : task.status === 'in_progress'
                            ? colors.warning
                            : colors.textTertiary,
                    },
                  ]}
                />
                <View style={styles.taskItemContent}>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.status === 'done' && styles.taskTitleDone,
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <Text style={styles.taskTime}>
                    {task.scheduledTime
                      ? formatScheduledTime(task.scheduledTime)
                      : task.estimatedMinutes != null && task.estimatedMinutes > 0
                        ? (task.estimatedMinutes >= 60
                            ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60 > 0 ? `${task.estimatedMinutes % 60}m` : ''}`
                            : `${task.estimatedMinutes}m`)
                        : 'All day'}
                  </Text>
                </View>
                <Text style={styles.taskStatusLabel}>
                  {task.status === 'done'
                    ? 'Done'
                    : task.status === 'in_progress'
                      ? 'In Progress'
                      : task.status === 'cancelled'
                        ? 'Cancelled'
                        : 'To Do'}
                </Text>
              </Pressable>
            ))}
            {/* Calendar events */}
            {selectedDayCalendarEvents.map((event: CalendarEvent) => (
              <View key={`cal-${event.id}`} style={styles.taskItem}>
                <View
                  style={[
                    styles.taskStatusDot,
                    { backgroundColor: event.color || '#8B5CF6' },
                  ]}
                />
                <View style={styles.taskItemContent}>
                  <Text style={[styles.taskTitle, styles.calendarEventTitle]} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.taskTime}>
                    {formatBlockTime(event.startTime, event.endTime)}
                  </Text>
                </View>
                <Text style={[styles.taskStatusLabel, { color: event.color || '#8B5CF6' }]}>
                  Calendar
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Task edit form */}
      <TaskForm
        visible={taskFormVisible}
        onClose={handleCloseTaskForm}
        onSubmit={addTask}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onDeleteFutureRecurring={deleteFutureRecurring}
        editingTask={editingTask}
        selectedDate={selectedDate}
      />

      {/* Time block edit sheet */}
      <Modal
        visible={editSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditSheetVisible(false)}
      >
        <Pressable
          style={styles.editOverlay}
          onPress={() => setEditSheetVisible(false)}
        >
          <Pressable style={styles.editSheet} onPress={() => {}}>
            <View style={styles.editHandle} />
            {selectedBlock && (
              <>
                <View style={styles.editHeader}>
                  <View style={[styles.editIconBubble, { backgroundColor: (selectedBlock.color || colors.primary) + '25' }]}>
                    <Text style={styles.editIconText}>
                      {selectedBlock.type === 'focus' ? '\u26A1' : selectedBlock.type === 'break' ? '\u2615' : selectedBlock.type === 'event' ? '\u{1F4C5}' : '\u2611'}
                    </Text>
                  </View>
                  <View style={styles.editHeaderTextWrap}>
                    {isEditingTitle ? (
                      <TextInput
                        style={styles.editTitleInput}
                        value={editTitle}
                        onChangeText={setEditTitle}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleSaveBlockTitle}
                        onBlur={handleSaveBlockTitle}
                        selectTextOnFocus
                      />
                    ) : (
                      <Text style={styles.editTitleText} numberOfLines={2}>
                        {selectedBlock.title}
                      </Text>
                    )}
                    <Text style={[styles.editTimeText, { color: selectedBlock.color || colors.textSecondary }]}>
                      {formatBlockTime(selectedBlock.startTime, selectedBlock.endTime)}
                    </Text>
                  </View>
                </View>

                <View style={styles.editActions}>
                  <Pressable
                    style={({ pressed }) => [styles.editActionButton, pressed && styles.editActionPressed]}
                    onPress={() => {
                      setIsEditingTitle(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit block title"
                  >
                    <Text style={styles.editActionLabel}>Edit Title</Text>
                    <Text style={styles.editActionChevron}>{'\u203A'}</Text>
                  </Pressable>

                  <View style={styles.editActionDivider} />

                  <Pressable
                    style={({ pressed }) => [styles.editActionButton, pressed && styles.editActionPressed]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleDeleteBlock();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete block"
                  >
                    <Text style={[styles.editActionLabel, { color: colors.error }]}>Delete Block</Text>
                    <Text style={[styles.editActionChevron, { color: colors.error }]}>{'\u203A'}</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.editCloseButton, pressed && { opacity: 0.7 }]}
                  onPress={() => setEditSheetVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={styles.editCloseText}>Done</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(
    () =>
      StyleSheet.create({
        scrollContainer: {
          flex: 1,
        },
        container: {
          paddingHorizontal: Dimensions.screenPadding,
          paddingTop: 8,
          paddingBottom: 4,
        },
        monthHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
        },
        arrowButton: {
          width: Dimensions.minTouchTarget,
          height: Dimensions.minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
        },
        arrowPressed: {
          backgroundColor: colors.surfaceTertiary,
        },
        arrowText: {
          fontSize: 28,
          fontWeight: '300',
          color: colors.primary,
          lineHeight: 32,
        },
        monthLabel: {
          fontSize: Dimensions.fontXL,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.3,
        },
        dayHeaderRow: {
          flexDirection: 'row',
          marginBottom: 4,
        },
        dayHeaderCell: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: 6,
        },
        dayHeaderText: {
          fontSize: Dimensions.fontXS,
          fontWeight: '600',
          color: colors.textTertiary,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
        },
        weekRow: {
          flexDirection: 'row',
        },
        dayCell: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 6,
          minHeight: Dimensions.minTouchTarget,
          borderRadius: 12,
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
        dayNumber: {
          fontSize: Dimensions.fontMD,
          fontWeight: '600',
          color: colors.text,
        },
        outsideMonthText: {
          color: colors.textTertiary + '60',
        },
        todayText: {
          color: colors.primary,
          fontWeight: '800',
        },
        selectedText: {
          color: '#FFFFFF',
          fontWeight: '800',
        },
        dotsRow: {
          flexDirection: 'row',
          gap: 2,
          marginTop: 2,
          height: 5,
        },
        dot: {
          width: 4,
          height: 4,
          borderRadius: 2,
        },
        // Day detail panel
        dayDetailPanel: {
          paddingHorizontal: Dimensions.screenPadding,
          paddingTop: 12,
          paddingBottom: 24,
        },
        dayDetailDate: {
          fontSize: Dimensions.fontLG,
          fontWeight: '700',
          color: colors.text,
          marginBottom: 10,
        },
        emptyState: {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 18,
          alignItems: 'center',
        },
        emptyStateText: {
          fontSize: Dimensions.fontSM,
          fontWeight: '500',
          color: colors.textTertiary,
        },
        taskList: {
          gap: 6,
        },
        taskItem: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          gap: 10,
        },
        taskStatusDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        taskItemContent: {
          flex: 1,
        },
        taskTitle: {
          fontSize: Dimensions.fontMD,
          fontWeight: '600',
          color: colors.text,
        },
        taskTitleDone: {
          textDecorationLine: 'line-through',
          color: colors.textTertiary,
        },
        taskTime: {
          fontSize: Dimensions.fontXS,
          fontWeight: '500',
          color: colors.textSecondary,
          marginTop: 2,
        },
        taskStatusLabel: {
          fontSize: Dimensions.fontXS,
          fontWeight: '600',
          color: colors.textSecondary,
        },
        calendarEventTitle: {
          fontStyle: 'italic',
          color: colors.textSecondary,
        },
        // Edit sheet styles
        editOverlay: {
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          justifyContent: 'flex-end',
        },
        editSheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingBottom: 40,
          paddingTop: 12,
        },
        editHandle: {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          alignSelf: 'center',
          marginBottom: 20,
        },
        editHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginBottom: 24,
          paddingTop: 4,
        },
        editIconBubble: {
          width: 52,
          height: 52,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        editIconText: {
          fontSize: 24,
        },
        editHeaderTextWrap: {
          flex: 1,
        },
        editTitleInput: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.3,
          marginBottom: 4,
          borderBottomWidth: 2,
          borderBottomColor: colors.primary,
          paddingVertical: 4,
          paddingHorizontal: 0,
        },
        editTitleText: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.3,
          marginBottom: 4,
        },
        editTimeText: {
          fontSize: 13,
          fontWeight: '600',
        },
        editActions: {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 16,
        },
        editActionButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        editActionPressed: {
          backgroundColor: colors.surfaceTertiary,
        },
        editActionLabel: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.text,
        },
        editActionChevron: {
          fontSize: 22,
          color: colors.textTertiary,
          fontWeight: '300',
        },
        editActionDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: 16,
        },
        editCloseButton: {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: 'center',
        },
        editCloseText: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.primary,
        },
      }),
    [colors],
  );
}
