import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, Modal, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView as RNScrollView, Keyboard, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import { useTimeBlockStore, useTaskStore, useCalendarStore, useSettingsStore } from '../../store';
import { generateId, areSameDay, detectConflicts, hasConflict } from '../../utils';
import type { TimeBlock, TimeBlockType, CalendarEvent, DeviceReminder } from '../../types';
import HourMarker from './HourMarker';
import DraggableTimeBlock from './DraggableTimeBlock';
import CalendarEventCard from './CalendarEventCard';
import ReminderCard from './ReminderCard';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import QuickAddButton from './QuickAddButton';

const HOUR_HEIGHT = Dimensions.timelineHourHeight;

const COLOR_PALETTE = [
  { color: '#818CF8', label: 'Indigo' },
  { color: '#F87171', label: 'Red' },
  { color: '#FB923C', label: 'Orange' },
  { color: '#FBBF24', label: 'Yellow' },
  { color: '#34D399', label: 'Green' },
  { color: '#22D3EE', label: 'Cyan' },
  { color: '#60A5FA', label: 'Blue' },
  { color: '#C084FC', label: 'Purple' },
  { color: '#F472B6', label: 'Pink' },
  { color: '#94A3B8', label: 'Gray' },
];

const TYPE_ICONS: Record<TimeBlockType, string> = {
  task: '\u2611',
  focus: '\u26A1',
  event: '\u{1F4C5}',
  break: '\u2615',
};

function getTypeOptions(colors: ThemeColors): { value: TimeBlockType; label: string; icon: string; color: string; desc: string }[] {
  return [
    { value: 'task', label: 'Task', icon: '\u2611', color: colors.timeBlockTask, desc: 'Get something done' },
    { value: 'focus', label: 'Focus', icon: '\u26A1', color: colors.timeBlockFocus, desc: 'Deep work session' },
    { value: 'event', label: 'Event', icon: '\u{1F4C5}', color: colors.timeBlockEvent, desc: 'Meeting or appointment' },
    { value: 'break', label: 'Break', icon: '\u2615', color: colors.timeBlockBreak, desc: 'Rest and recharge' },
  ];
}

function getBlockPosition(block: TimeBlock, startHour: number) {
  const start = new Date(block.startTime);
  const end = new Date(block.endTime);
  const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
  const endMinutes = (end.getHours() - startHour) * 60 + end.getMinutes();
  const topOffset = (startMinutes / 60) * HOUR_HEIGHT;
  const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  return { topOffset, height };
}

function topOffsetToDate(topOffset: number, baseDate: string, startHour: number): Date {
  const totalMinutes = (topOffset / HOUR_HEIGHT) * 60;
  const hours = Math.floor(totalMinutes / 60) + startHour;
  const minutes = Math.round(totalMinutes % 60);
  const d = new Date(baseDate + 'T00:00:00');
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function getEventPosition(event: CalendarEvent, startHour: number) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
  const endMinutes = (end.getHours() - startHour) * 60 + end.getMinutes();
  const topOffset = (startMinutes / 60) * HOUR_HEIGHT;
  const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  return { topOffset, height };
}

function getReminderPosition(reminder: DeviceReminder, startHour: number) {
  const dateStr = reminder.dueDate || reminder.startDate;
  if (!dateStr) return { topOffset: 0, height: HOUR_HEIGHT / 2 };
  const start = new Date(dateStr);
  const startMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
  const topOffset = (startMinutes / 60) * HOUR_HEIGHT;
  const height = HOUR_HEIGHT / 2; // 30-min default height for reminders
  return { topOffset, height };
}

function formatStartTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function formatTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${formatStartTime(start)} \u2013 ${formatStartTime(end)}`;
}

function getDurationLabel(startTime: string, endTime: string): string {
  const dur = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000;
  if (dur < 60) return `${Math.round(dur)} min`;
  const h = Math.floor(dur / 60);
  const m = Math.round(dur % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TimelineView() {
  const colors = useTheme();
  const styles = useStyles(colors);
  const TYPE_OPTIONS = useMemo(() => getTypeOptions(colors), [colors]);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);
  const addTimeBlock = useTimeBlockStore((s) => s.addTimeBlock);
  const updateTimeBlock = useTimeBlockStore((s) => s.updateTimeBlock);
  const deleteTimeBlock = useTimeBlockStore((s) => s.deleteTimeBlock);
  const moveTimeBlock = useTimeBlockStore((s) => s.moveTimeBlock);
  const calendarEvents = useCalendarStore((s) => s.calendarEvents);
  const deviceReminders = useCalendarStore((s) => s.reminders);
  const calendarEnabled = useCalendarStore((s) => s.calendarEnabled);
  const dayStartHour = useSettingsStore((s) => s.dayStartHour);
  const dayEndHour = useSettingsStore((s) => s.dayEndHour);
  const defaultTaskDuration = useSettingsStore((s) => s.defaultTaskDurationMinutes);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TimeBlockType>('task');
  const [newColor, setNewColor] = useState<string | null>(null); // null = use type default
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Edit/Delete bottom sheet state
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Calendar event detail sheet state
  const [calEventSheetVisible, setCalEventSheetVisible] = useState(false);
  const [selectedCalEvent, setSelectedCalEvent] = useState<CalendarEvent | null>(null);

  // Filter blocks for the selected date
  const todayBlocks = timeBlocks.filter((b) => areSameDay(b.startTime, selectedDate));

  // Extend visible range to include blocks that fall outside configured hours
  const renderStartHour = useMemo(() => {
    if (todayBlocks.length === 0) return dayStartHour;
    const earliest = Math.min(...todayBlocks.map((b) => new Date(b.startTime).getHours()));
    return Math.min(dayStartHour, earliest);
  }, [todayBlocks, dayStartHour]);

  const renderEndHour = useMemo(() => {
    if (todayBlocks.length === 0) return dayEndHour;
    const latest = Math.max(...todayBlocks.map((b) => {
      const end = new Date(b.endTime);
      return end.getMinutes() > 0 ? end.getHours() + 1 : end.getHours();
    }));
    return Math.max(dayEndHour, latest);
  }, [todayBlocks, dayEndHour]);

  const totalHours = renderEndHour - renderStartHour;

  // Filter calendar events for the selected date
  const todayEvents = calendarEnabled
    ? calendarEvents.filter((e) => areSameDay(e.startTime, selectedDate))
    : [];

  // Filter reminders for the selected date (by dueDate or startDate)
  const todayReminders = calendarEnabled
    ? deviceReminders.filter((r) => {
        const dateStr = r.dueDate || r.startDate;
        return dateStr ? areSameDay(dateStr, selectedDate) : false;
      })
    : [];

  // Detect conflicts between time blocks and calendar events
  const conflicts = useMemo(
    () => detectConflicts(todayBlocks, todayEvents),
    [todayBlocks, todayEvents],
  );

  // Interactive start time and duration for new blocks
  const [newStartHour, setNewStartHour] = useState(dayStartHour);
  const [newStartMinute, setNewStartMinute] = useState(0);
  const [newDuration, setNewDuration] = useState(defaultTaskDuration);

  const newBlockStart = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setHours(newStartHour, newStartMinute, 0, 0);
    return d;
  }, [selectedDate, newStartHour, newStartMinute]);

  const newBlockEnd = useMemo(() => {
    const end = new Date(newBlockStart);
    end.setMinutes(end.getMinutes() + newDuration);
    return end;
  }, [newBlockStart, newDuration]);

  const handleNudgeStart = useCallback((delta: number) => {
    setNewStartHour((h) => {
      const totalMin = h * 60 + newStartMinute + delta;
      const newH = Math.floor(totalMin / 60);
      const newM = totalMin % 60;
      if (newH < dayStartHour || (newH >= dayEndHour && newM > 0)) return h;
      setNewStartMinute(newM);
      return newH;
    });
  }, [newStartMinute, dayStartHour, dayEndHour]);

  // Auto-scroll to current time on mount (once only)
  const hasAutoScrolled = useRef(false);
  useEffect(() => {
    if (hasAutoScrolled.current) return;
    hasAutoScrolled.current = true;
    const now = new Date();
    const minutesFromStart = (now.getHours() - renderStartHour) * 60 + now.getMinutes();
    const targetY = Math.max(0, (minutesFromStart / 60) * HOUR_HEIGHT - 120);
    const timer = setTimeout(() => {
      scrollTo(scrollRef, 0, targetY, false);
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollRef, renderStartHour]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const handleDragStateChange = useCallback((isDragging: boolean) => {
    setScrollEnabled(!isDragging);
  }, []);

  const handleMoveEnd = useCallback(
    (blockId: string, newTopOffset: number) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const durationMs = new Date(block.endTime).getTime() - new Date(block.startTime).getTime();
      const newStart = topOffsetToDate(newTopOffset, selectedDate, renderStartHour);
      const newEnd = new Date(newStart.getTime() + durationMs);
      moveTimeBlock(blockId, newStart.toISOString(), newEnd.toISOString());
    },
    [timeBlocks, selectedDate, moveTimeBlock, renderStartHour],
  );

  const handleResizeEnd = useCallback(
    (blockId: string, newHeight: number) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const { topOffset } = getBlockPosition(block, renderStartHour);
      const newEndOffset = topOffset + newHeight;
      const newEnd = topOffsetToDate(newEndOffset, selectedDate, renderStartHour);
      updateTimeBlock(blockId, { endTime: newEnd.toISOString() });
    },
    [timeBlocks, selectedDate, updateTimeBlock, renderStartHour],
  );

  const STEP_MINUTES = 15;

  const handleMoveUp = useCallback(
    (blockId: string) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const newStart = new Date(block.startTime);
      const newEnd = new Date(block.endTime);
      newStart.setMinutes(newStart.getMinutes() - STEP_MINUTES);
      newEnd.setMinutes(newEnd.getMinutes() - STEP_MINUTES);
      if (newStart.getHours() < dayStartHour) return;
      moveTimeBlock(blockId, newStart.toISOString(), newEnd.toISOString());
    },
    [timeBlocks, dayStartHour, moveTimeBlock],
  );

  const handleMoveDown = useCallback(
    (blockId: string) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const newStart = new Date(block.startTime);
      const newEnd = new Date(block.endTime);
      newStart.setMinutes(newStart.getMinutes() + STEP_MINUTES);
      newEnd.setMinutes(newEnd.getMinutes() + STEP_MINUTES);
      if (newEnd.getHours() >= dayEndHour && newEnd.getMinutes() > 0) return;
      moveTimeBlock(blockId, newStart.toISOString(), newEnd.toISOString());
    },
    [timeBlocks, dayEndHour, moveTimeBlock],
  );

  const handleQuickAdd = useCallback(() => {
    const now = new Date();
    let hour = now.getHours();
    let minute = Math.ceil(now.getMinutes() / 15) * 15;
    if (minute >= 60) { hour++; minute = 0; }
    if (hour < dayStartHour) { hour = dayStartHour; minute = 0; }
    if (hour >= dayEndHour) { hour = dayEndHour - 1; minute = 0; }
    setNewStartHour(hour);
    setNewStartMinute(minute);
    setNewDuration(defaultTaskDuration);
    setNewTitle('');
    setNewType('task');
    setNewColor(null);
    setModalVisible(true);
  }, [dayStartHour, dayEndHour, defaultTaskDuration]);

  const handleSaveBlock = useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;

    const colorMap: Record<TimeBlockType, string> = {
      task: colors.timeBlockTask,
      event: colors.timeBlockEvent,
      break: colors.timeBlockBreak,
      focus: colors.timeBlockFocus,
    };

    const block: TimeBlock = {
      id: generateId(),
      taskId: null,
      title,
      startTime: newBlockStart.toISOString(),
      endTime: newBlockEnd.toISOString(),
      color: colorMap[newType],
      type: newType,
    };

    addTimeBlock(block);
    setModalVisible(false);
  }, [newTitle, newType, newBlockStart, newBlockEnd, addTimeBlock, colors]);

  // --- Tap-to-edit handlers ---
  const handleBlockPress = useCallback((block: TimeBlock) => {
    setSelectedBlock(block);
    setEditTitle(block.title);
    setIsEditingTitle(false);
    setEditSheetVisible(true);
  }, []);

  const handleCalEventPress = useCallback((event: CalendarEvent) => {
    setSelectedCalEvent(event);
    setCalEventSheetVisible(true);
  }, []);

  const handleOpenInCalendar = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('calshow:');
    } else {
      Linking.openURL('content://com.android.calendar/time/');
    }
    setCalEventSheetVisible(false);
  }, []);

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

  const handleSaveTitle = useCallback(() => {
    if (!selectedBlock) return;
    const title = editTitle.trim();
    if (!title) return;
    updateTimeBlock(selectedBlock.id, { title });
    setSelectedBlock({ ...selectedBlock, title });
    setIsEditingTitle(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedBlock, editTitle, updateTimeBlock]);

  const totalHeight = totalHours * HOUR_HEIGHT;
  const hasBlocks = todayBlocks.length > 0;
  const selectedTypeOption = TYPE_OPTIONS.find((o) => o.value === newType)!;
  const selectedBlockIcon = selectedBlock ? (TYPE_ICONS[selectedBlock.type] || '\u2611') : '\u2611';

  return (
    <View style={styles.wrapper}>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { height: totalHeight + 40 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Hour grid */}
        {Array.from({ length: totalHours }, (_, i) => (
          <HourMarker key={renderStartHour + i} hour={renderStartHour + i} isEven={i % 2 === 0} />
        ))}

        {/* Time blocks (draggable) */}
        {todayBlocks.map((block) => {
          const { topOffset, height } = getBlockPosition(block, renderStartHour);
          return (
            <DraggableTimeBlock
              key={block.id}
              block={block}
              topOffset={topOffset}
              height={height}
              timelineHeight={totalHeight}
              hasConflict={hasConflict(block.id, conflicts)}
              onMoveEnd={handleMoveEnd}
              onResizeEnd={handleResizeEnd}
              onDragStateChange={handleDragStateChange}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onPress={handleBlockPress}
            />
          );
        })}

        {/* Calendar events (read-only overlay) */}
        {todayEvents.map((event) => {
          const { topOffset, height } = getEventPosition(event, renderStartHour);
          const eventHasConflict = conflicts.some(
            (c) => c.calendarEventId === event.id,
          );
          return (
            <CalendarEventCard
              key={`cal-${event.id}`}
              event={event}
              topOffset={topOffset}
              height={height}
              hasConflict={eventHasConflict}
              onPress={handleCalEventPress}
            />
          );
        })}

        {/* Reminders (read-only overlay) */}
        {todayReminders
          .filter((r) => r.dueDate || r.startDate) // only show timed reminders
          .map((reminder) => {
            const { topOffset, height } = getReminderPosition(reminder, renderStartHour);
            return (
              <ReminderCard
                key={`rem-${reminder.id}`}
                reminder={reminder}
                topOffset={topOffset}
                height={height}
              />
            );
          })}

        {/* Current time indicator */}
        <CurrentTimeIndicator startHour={renderStartHour} />

        {/* Empty state */}
        {!hasBlocks && (
          <View
            style={styles.emptyState}
            accessible
            accessibilityLabel="No blocks yet. Tap the plus button to add your first time block."
          >
            <View style={styles.emptyIllustration}>
              <Text style={styles.emptyIllustrationText}>{'\u{1F3AF}'}</Text>
            </View>
            <Text style={styles.emptyTitle}>Your day is wide open</Text>
            <Text style={styles.emptySubtitle}>
              Start planning by adding time blocks for{'\n'}your tasks, focus sessions, and breaks.
            </Text>
            <Pressable
              style={styles.emptyCTA}
              onPress={handleQuickAdd}
              accessibilityRole="button"
              accessibilityLabel="Add your first block"
            >
              <Text style={styles.emptyCTAIcon}>+</Text>
              <Text style={styles.emptyCTAText}>Add Your First Block</Text>
            </Pressable>
          </View>
        )}
      </Animated.ScrollView>

      {hasBlocks && <QuickAddButton onPress={handleQuickAdd} />}

      {/* === EDIT/DELETE BOTTOM SHEET === */}
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
            <View style={styles.modalHandle} />

            {selectedBlock && (
              <>
                {/* Block info header */}
                <View style={styles.editHeader}>
                  <View style={[styles.editIconBubble, { backgroundColor: (selectedBlock.color || colors.timeBlockTask) + '25' }]}>
                    <Text style={styles.editIconText}>{selectedBlockIcon}</Text>
                  </View>
                  <View style={styles.editHeaderText}>
                    {isEditingTitle ? (
                      <TextInput
                        style={styles.editTitleInput}
                        value={editTitle}
                        onChangeText={setEditTitle}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleSaveTitle}
                        onBlur={handleSaveTitle}
                        selectTextOnFocus
                      />
                    ) : (
                      <Text style={styles.editTitle} numberOfLines={2}>
                        {selectedBlock.title}
                      </Text>
                    )}
                    <Text style={[styles.editTime, { color: selectedBlock.color || colors.textSecondary }]}>
                      {formatTimeRange(selectedBlock.startTime, selectedBlock.endTime)}
                      {'  \u00B7  '}
                      {getDurationLabel(selectedBlock.startTime, selectedBlock.endTime)}
                    </Text>
                  </View>
                </View>

                {/* Action buttons */}
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
                    <View style={[styles.editActionIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={styles.editActionEmoji}>{'\u270F\uFE0F'}</Text>
                    </View>
                    <View style={styles.editActionContent}>
                      <Text style={styles.editActionTitle}>Edit Title</Text>
                      <Text style={styles.editActionDesc}>Change the block name</Text>
                    </View>
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
                    <View style={[styles.editActionIcon, { backgroundColor: colors.error + '15' }]}>
                      <Text style={styles.editActionEmoji}>{'\u{1F5D1}'}</Text>
                    </View>
                    <View style={styles.editActionContent}>
                      <Text style={[styles.editActionTitle, { color: colors.error }]}>Delete Block</Text>
                      <Text style={styles.editActionDesc}>Remove from timeline</Text>
                    </View>
                    <Text style={[styles.editActionChevron, { color: colors.error }]}>{'\u203A'}</Text>
                  </Pressable>
                </View>

                {/* Close button */}
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

      {/* === CALENDAR EVENT DETAIL SHEET === */}
      <Modal
        visible={calEventSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalEventSheetVisible(false)}
      >
        <Pressable
          style={styles.editOverlay}
          onPress={() => setCalEventSheetVisible(false)}
        >
          <Pressable style={styles.editSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            {selectedCalEvent && (
              <>
                <View style={styles.editHeader}>
                  <View style={[styles.editIconBubble, { backgroundColor: (selectedCalEvent.color || '#8B5CF6') + '25' }]}>
                    <Text style={styles.editIconText}>{'\u{1F4C5}'}</Text>
                  </View>
                  <View style={styles.editHeaderText}>
                    <Text style={styles.editTitle} numberOfLines={2}>
                      {selectedCalEvent.title}
                    </Text>
                    <Text style={[styles.editTime, { color: selectedCalEvent.color || '#8B5CF6' }]}>
                      {formatTimeRange(selectedCalEvent.startTime, selectedCalEvent.endTime)}
                    </Text>
                  </View>
                </View>

                <View style={styles.editActions}>
                  <Pressable
                    style={({ pressed }) => [styles.editActionButton, pressed && styles.editActionPressed]}
                    onPress={handleOpenInCalendar}
                    accessibilityRole="button"
                    accessibilityLabel="Open in Calendar app"
                  >
                    <View style={[styles.editActionIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={styles.editActionEmoji}>{'\u{1F4C5}'}</Text>
                    </View>
                    <View style={styles.editActionContent}>
                      <Text style={styles.editActionTitle}>Open in Calendar</Text>
                      <Text style={styles.editActionDesc}>Edit in your Calendar app</Text>
                    </View>
                    <Text style={styles.editActionChevron}>{'\u203A'}</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.editCloseButton, pressed && { opacity: 0.7 }]}
                  onPress={() => setCalEventSheetVisible(false)}
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

      {/* === QUICK ADD MODAL === */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalVisible(false)}
          >
            <Pressable style={styles.modalSheet} onPress={() => Keyboard.dismiss()}>
              <View style={styles.modalHandle} />

              <RNScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* Header */}
                <Text style={styles.modalTitle}>Schedule a Block</Text>

                {/* Start time stepper */}
                <Text style={styles.sectionLabel}>Start time</Text>
                <View style={styles.timeStepperRow}>
                  <Pressable
                    style={({ pressed }) => [styles.timeStepperBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => handleNudgeStart(-15)}
                    accessibilityLabel="Earlier by 15 minutes"
                  >
                    <Text style={[styles.timeStepperBtnText, { color: colors.primary }]}>{'\u2190'} 15m</Text>
                  </Pressable>
                  <View style={[styles.timeDisplay, { backgroundColor: selectedTypeOption.color + '18' }]}>
                    <Text style={[styles.timeDisplayText, { color: selectedTypeOption.color }]}>
                      {formatStartTime(newBlockStart)}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.timeStepperBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => handleNudgeStart(15)}
                    accessibilityLabel="Later by 15 minutes"
                  >
                    <Text style={[styles.timeStepperBtnText, { color: colors.primary }]}>15m {'\u2192'}</Text>
                  </Pressable>
                </View>

                {/* Duration presets */}
                <Text style={styles.sectionLabel}>Duration</Text>
                <View style={styles.durationRow}>
                  {[15, 30, 45, 60, 90, 120].map((min) => {
                    const isActive = newDuration === min;
                    const label = min < 60 ? `${min}m` : min === 60 ? '1h' : min === 90 ? '1.5h' : '2h';
                    return (
                      <Pressable
                        key={min}
                        style={[
                          styles.durationChip,
                          isActive && { backgroundColor: selectedTypeOption.color, borderColor: selectedTypeOption.color },
                        ]}
                        onPress={() => setNewDuration(min)}
                      >
                        <Text style={[styles.durationChipText, isActive && { color: '#FFFFFF' }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.timeEndLabel, { color: selectedTypeOption.color }]}>
                  Ends at {formatStartTime(newBlockEnd)}
                </Text>

                {/* Type selector - big visual cards */}
                <Text style={styles.sectionLabel}>What kind of block?</Text>
                <View style={styles.typeGrid}>
                  {TYPE_OPTIONS.map((opt) => {
                    const isSelected = newType === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[
                          styles.typeCard,
                          isSelected && { borderColor: opt.color, backgroundColor: opt.color + '18' },
                        ]}
                        onPress={() => setNewType(opt.value)}
                        accessibilityRole="radio"
                        accessibilityLabel={`${opt.label}: ${opt.desc}`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={styles.typeCardIcon}>{opt.icon}</Text>
                        <Text style={[
                          styles.typeCardLabel,
                          isSelected && { color: opt.color, fontWeight: '700' },
                        ]}>
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Text style={[styles.typeCardDesc, { color: opt.color }]}>{opt.desc}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Title input */}
                <Text style={styles.sectionLabel}>
                  {newType === 'break' ? 'Break activity (optional)' : 'What are you working on?'}
                </Text>
                <View style={[styles.inputContainer, { borderColor: selectedTypeOption.color + '60' }]}>
                  <Text style={styles.inputIcon}>{selectedTypeOption.icon}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      newType === 'task' ? 'e.g. Finish report, Review PR...'
                      : newType === 'focus' ? 'e.g. Deep work on feature...'
                      : newType === 'event' ? 'e.g. Team standup, 1:1 meeting...'
                      : 'e.g. Coffee break, Walk...'
                    }
                    placeholderTextColor={colors.textTertiary}
                    value={newTitle}
                    onChangeText={setNewTitle}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveBlock}
                    accessibilityLabel="Block title"
                  />
                </View>

                {/* Save button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.saveButton,
                    { backgroundColor: selectedTypeOption.color },
                    pressed && styles.saveButtonPressed,
                    !newTitle.trim() && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSaveBlock}
                  disabled={!newTitle.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Add block to timeline"
                >
                  <Text style={styles.saveButtonText}>
                    Add to Timeline
                  </Text>
                </Pressable>
              </RNScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingBottom: 40,
    },
    // --- Empty state ---
    emptyState: {
      position: 'absolute',
      top: 2 * HOUR_HEIGHT,
      left: Dimensions.timelineLeftGutter + 8,
      right: Dimensions.screenPadding + 8,
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 20,
      paddingVertical: 36,
      paddingHorizontal: 24,
      borderWidth: 2,
      borderColor: colors.primaryLight + '40',
      borderStyle: 'dashed',
    },
    emptyIllustration: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    emptyIllustrationText: {
      fontSize: 36,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    emptySubtitle: {
      fontSize: Dimensions.fontMD,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 20,
    },
    emptyCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    emptyCTAIcon: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    emptyCTAText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    // --- Edit/Delete Bottom Sheet ---
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
    editHeaderText: {
      flex: 1,
    },
    editTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: 4,
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
    editTime: {
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
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 14,
    },
    editActionPressed: {
      backgroundColor: colors.surfaceTertiary,
    },
    editActionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editActionEmoji: {
      fontSize: 18,
    },
    editActionContent: {
      flex: 1,
    },
    editActionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    editActionDesc: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 1,
    },
    editActionChevron: {
      fontSize: 22,
      color: colors.textTertiary,
      fontWeight: '300',
    },
    editActionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 70,
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
    // --- Quick Add Modal ---
    modalKeyboard: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      maxHeight: '90%',
    },
    modalScrollContent: {
      paddingBottom: 36,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: 20,
    },
    timeStepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 20,
    },
    timeStepperBtn: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
    },
    timeStepperBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },
    timeDisplay: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 14,
      minWidth: 110,
      alignItems: 'center',
    },
    timeDisplayText: {
      fontSize: 18,
      fontWeight: '800',
    },
    durationRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
      flexWrap: 'wrap',
    },
    durationChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    durationChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    timeEndLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 20,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    typeGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },
    typeCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    typeCardIcon: {
      fontSize: 22,
      marginBottom: 4,
    },
    typeCardLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeCardDesc: {
      fontSize: 9,
      fontWeight: '500',
      marginTop: 2,
      textAlign: 'center',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderRadius: 14,
      paddingHorizontal: 14,
      marginBottom: 20,
      backgroundColor: colors.surfaceSecondary,
    },
    inputIcon: {
      fontSize: 18,
      marginRight: 10,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    saveButton: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    saveButtonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
  }), [colors]);
}
