import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  parseISO,
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Dimensions } from '../../constants';
import { useTaskStore, useTimeBlockStore, useCalendarStore } from '../../store';
import { todayISO } from '../../utils';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import { TaskForm } from '../task';
import type { Task, TimeBlock, CalendarEvent, DeviceReminder } from '../../types';

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

export default function WeekView() {
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
  const deviceReminders = useCalendarStore((s) => s.reminders);
  const calendarEnabled = useCalendarStore((s) => s.calendarEnabled);

  const selectedParsed = parseISO(selectedDate);
  const todayParsed = parseISO(todayISO());

  // Editing state
  const [taskFormVisible, setTaskFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Monday-based week days
  const weekStart = startOfWeek(selectedParsed, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedParsed, { weekStartsOn: 0 });
  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [weekStart.getTime(), weekEnd.getTime()]);

  const weekLabel = `${format(weekStart, 'MMM d')} \u2013 ${format(weekEnd, 'MMM d, yyyy')}`;

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

  // Build data for each day of the week
  const weekData = useMemo(() => {
    return weekDays.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');

      const dayTasks = tasks
        .filter((t: Task) => t.scheduledDate === dayStr)
        .sort((a: Task, b: Task) => a.sortOrder - b.sortOrder);

      const dayBlocks = timeBlocks
        .filter((b) => {
          const bDate = parseISO(b.startTime);
          return isSameDay(bDate, day);
        })
        .filter((b) => !b.taskId)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      const dayCalendarEvents = calendarEnabled
        ? calendarEvents.filter((e: CalendarEvent) => {
            const eDate = parseISO(e.startTime);
            return isSameDay(eDate, day);
          })
        : [];

      const dayReminders = calendarEnabled
        ? deviceReminders.filter((r: DeviceReminder) => {
            const dateStr = r.dueDate || r.startDate;
            if (!dateStr) return false;
            return isSameDay(parseISO(dateStr), day);
          })
        : [];

      return { day, dayStr, dayTasks, dayBlocks, dayCalendarEvents, dayReminders };
    });
  }, [weekDays, tasks, timeBlocks, calendarEvents, deviceReminders, calendarEnabled]);

  // Handlers
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

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.weekHeader} accessibilityHint="Swipe left or right to change week">
          <Pressable
            onPress={goToPrevWeek}
            style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            hitSlop={8}
          >
            <Text style={styles.arrowText}>{'\u2039'}</Text>
          </Pressable>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Pressable
            onPress={goToNextWeek}
            style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Next week"
            hitSlop={8}
          >
            <Text style={styles.arrowText}>{'\u203A'}</Text>
          </Pressable>
        </View>
      </GestureDetector>

      {/* Day sections */}
      {weekData.map(({ day, dayStr, dayTasks, dayBlocks, dayCalendarEvents, dayReminders }) => {
        const isSelected = isSameDay(day, selectedParsed);
        const isToday = isSameDay(day, todayParsed);
        const isEmpty = dayTasks.length === 0 && dayBlocks.length === 0 && dayCalendarEvents.length === 0 && dayReminders.length === 0;

        return (
          <Pressable
            key={dayStr}
            style={[styles.daySection, isSelected && styles.daySectionSelected]}
            onPress={() => selectDay(day)}
          >
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, isToday && styles.dayNameToday, isSelected && styles.dayNameSelected]}>
                {format(day, 'EEEE')}
              </Text>
              <Text style={[styles.dayDate, isToday && styles.dayDateToday, isSelected && styles.dayDateSelected]}>
                {format(day, 'MMM d')}
              </Text>
            </View>

            {isEmpty ? (
              <Text style={styles.emptyText}>No items</Text>
            ) : (
              <View style={styles.itemList}>
                {/* Time blocks */}
                {dayBlocks.map((block: TimeBlock) => (
                  <Pressable
                    key={block.id}
                    style={styles.item}
                    onPress={() => handlePressBlock(block)}
                  >
                    <View
                      style={[styles.itemDot, { backgroundColor: block.color || colors.primary }]}
                    />
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {block.title}
                      </Text>
                      <Text style={styles.itemTime}>
                        {formatBlockTime(block.startTime, block.endTime)}
                      </Text>
                    </View>
                    <Text style={[styles.itemLabel, { color: block.color || colors.primary }]}>
                      {block.type === 'focus' ? 'Focus' : block.type === 'break' ? 'Break' : block.type === 'event' ? 'Event' : 'Task'}
                    </Text>
                  </Pressable>
                ))}
                {/* Tasks */}
                {dayTasks.map((task: Task) => (
                  <Pressable
                    key={task.id}
                    style={styles.item}
                    onPress={() => handlePressTask(task)}
                  >
                    <View
                      style={[
                        styles.itemDot,
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
                    <View style={styles.itemContent}>
                      <Text
                        style={[styles.itemTitle, task.status === 'done' && styles.itemTitleDone]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      <Text style={styles.itemTime}>
                        {task.scheduledTime
                          ? formatScheduledTime(task.scheduledTime)
                          : task.estimatedMinutes != null && task.estimatedMinutes > 0
                            ? (task.estimatedMinutes >= 60
                                ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60 > 0 ? `${task.estimatedMinutes % 60}m` : ''}`
                                : `${task.estimatedMinutes}m`)
                            : 'All day'}
                      </Text>
                    </View>
                    <Text style={styles.itemLabel}>
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
                {dayCalendarEvents.map((event: CalendarEvent) => (
                  <View key={`cal-${event.id}`} style={styles.item}>
                    <View
                      style={[styles.itemDot, { backgroundColor: event.color || '#8B5CF6' }]}
                    />
                    <View style={styles.itemContent}>
                      <Text style={[styles.itemTitle, styles.calendarTitle]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.itemTime}>
                        {formatBlockTime(event.startTime, event.endTime)}
                      </Text>
                    </View>
                    <Text style={[styles.itemLabel, { color: event.color || '#8B5CF6' }]}>
                      Calendar
                    </Text>
                  </View>
                ))}
                {/* Reminders */}
                {dayReminders.map((reminder: DeviceReminder) => (
                  <View key={`rem-${reminder.id}`} style={styles.item}>
                    <Text style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
                      {reminder.completed ? '\u2611' : '\u2610'}
                    </Text>
                    <View style={styles.itemContent}>
                      <Text
                        style={[
                          styles.itemTitle,
                          reminder.completed && styles.itemTitleDone,
                        ]}
                        numberOfLines={1}
                      >
                        {reminder.title}
                      </Text>
                      {reminder.dueDate && (
                        <Text style={styles.itemTime}>
                          {formatHour(new Date(reminder.dueDate))}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.itemLabel, { color: reminder.color || '#FB923C' }]}>
                      Reminder
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Spacer */}
      <View style={{ height: 24 }} />

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
        weekHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Dimensions.screenPadding,
          paddingTop: 8,
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
        weekLabel: {
          fontSize: Dimensions.fontLG,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.3,
        },
        // Day sections
        daySection: {
          marginHorizontal: Dimensions.screenPadding,
          marginBottom: 8,
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
        daySectionSelected: {
          backgroundColor: colors.primaryMuted,
          borderWidth: 1.5,
          borderColor: colors.primary + '40',
        },
        dayHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        },
        dayName: {
          fontSize: Dimensions.fontMD,
          fontWeight: '700',
          color: colors.text,
        },
        dayNameToday: {
          color: colors.primary,
        },
        dayNameSelected: {
          color: colors.primary,
        },
        dayDate: {
          fontSize: Dimensions.fontSM,
          fontWeight: '600',
          color: colors.textSecondary,
        },
        dayDateToday: {
          color: colors.primary,
        },
        dayDateSelected: {
          color: colors.primary,
        },
        emptyText: {
          fontSize: Dimensions.fontSM,
          fontWeight: '500',
          color: colors.textTertiary,
          fontStyle: 'italic',
        },
        itemList: {
          gap: 4,
        },
        item: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 10,
          gap: 8,
        },
        itemDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        itemContent: {
          flex: 1,
        },
        itemTitle: {
          fontSize: Dimensions.fontSM,
          fontWeight: '600',
          color: colors.text,
        },
        itemTitleDone: {
          textDecorationLine: 'line-through',
          color: colors.textTertiary,
        },
        calendarTitle: {
          fontStyle: 'italic',
          color: colors.textSecondary,
        },
        itemTime: {
          fontSize: Dimensions.fontXS,
          fontWeight: '500',
          color: colors.textSecondary,
          marginTop: 1,
        },
        itemLabel: {
          fontSize: Dimensions.fontXS,
          fontWeight: '600',
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
