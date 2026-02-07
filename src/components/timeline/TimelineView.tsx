import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Modal, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import { Colors, Dimensions, Config } from '../../constants';
import { useTimeBlockStore, useTaskStore, useCalendarStore, useSettingsStore } from '../../store';
import { generateId, areSameDay, detectConflicts, hasConflict } from '../../utils';
import type { TimeBlock, TimeBlockType, CalendarEvent } from '../../types';
import HourMarker from './HourMarker';
import DraggableTimeBlock from './DraggableTimeBlock';
import CalendarEventCard from './CalendarEventCard';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import QuickAddButton from './QuickAddButton';

const HOUR_HEIGHT = Dimensions.timelineHourHeight;

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

export default function TimelineView() {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);
  const addTimeBlock = useTimeBlockStore((s) => s.addTimeBlock);
  const updateTimeBlock = useTimeBlockStore((s) => s.updateTimeBlock);
  const moveTimeBlock = useTimeBlockStore((s) => s.moveTimeBlock);
  const calendarEvents = useCalendarStore((s) => s.calendarEvents);
  const calendarEnabled = useCalendarStore((s) => s.calendarEnabled);
  const dayStartHour = useSettingsStore((s) => s.dayStartHour);
  const dayEndHour = useSettingsStore((s) => s.dayEndHour);
  const defaultTaskDuration = useSettingsStore((s) => s.defaultTaskDurationMinutes);
  const totalHours = dayEndHour - dayStartHour;

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TimeBlockType>('task');
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Filter blocks for the selected date
  const todayBlocks = timeBlocks.filter((b) => areSameDay(b.startTime, selectedDate));

  // Filter calendar events for the selected date
  const todayEvents = calendarEnabled
    ? calendarEvents.filter((e) => areSameDay(e.startTime, selectedDate))
    : [];

  // Detect conflicts between time blocks and calendar events
  const conflicts = useMemo(
    () => detectConflicts(todayBlocks, todayEvents),
    [todayBlocks, todayEvents],
  );

  // Auto-scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const minutesFromStart = (now.getHours() - dayStartHour) * 60 + now.getMinutes();
    const targetY = Math.max(0, (minutesFromStart / 60) * HOUR_HEIGHT - 120);
    const timer = setTimeout(() => {
      scrollTo(scrollRef, 0, targetY, false);
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollRef, dayStartHour]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Disable scroll while dragging/resizing a block
  const handleDragStateChange = useCallback((isDragging: boolean) => {
    setScrollEnabled(!isDragging);
  }, []);

  // Commit a drag-to-move: compute new startTime/endTime from pixel offset
  const handleMoveEnd = useCallback(
    (blockId: string, newTopOffset: number) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;

      const durationMs = new Date(block.endTime).getTime() - new Date(block.startTime).getTime();
      const newStart = topOffsetToDate(newTopOffset, selectedDate, dayStartHour);
      const newEnd = new Date(newStart.getTime() + durationMs);

      updateTimeBlock(blockId, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      });
    },
    [timeBlocks, selectedDate, updateTimeBlock, dayStartHour],
  );

  // Commit a resize: compute new endTime from pixel height
  const handleResizeEnd = useCallback(
    (blockId: string, newHeight: number) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;

      const { topOffset } = getBlockPosition(block, dayStartHour);
      const newEndOffset = topOffset + newHeight;
      const newEnd = topOffsetToDate(newEndOffset, selectedDate, dayStartHour);

      updateTimeBlock(blockId, {
        endTime: newEnd.toISOString(),
      });
    },
    [timeBlocks, selectedDate, updateTimeBlock, dayStartHour],
  );

  const handleQuickAdd = useCallback(() => {
    setNewTitle('');
    setNewType('task');
    setModalVisible(true);
  }, []);

  const handleSaveBlock = useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;

    const now = new Date();
    const startHour = now.getHours();
    const startMinute = Math.floor(now.getMinutes() / 15) * 15;

    const startTime = new Date(selectedDate + 'T00:00:00');
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + defaultTaskDuration);

    const colorMap: Record<TimeBlockType, string> = {
      task: Colors.timeBlockTask,
      event: Colors.timeBlockEvent,
      break: Colors.timeBlockBreak,
      focus: Colors.timeBlockFocus,
    };

    const block: TimeBlock = {
      id: generateId(),
      taskId: null,
      title,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      color: colorMap[newType],
      type: newType,
    };

    addTimeBlock(block);
    setModalVisible(false);
  }, [newTitle, newType, selectedDate, addTimeBlock, defaultTaskDuration]);

  const typeOptions: { value: TimeBlockType; label: string }[] = [
    { value: 'task', label: 'Task' },
    { value: 'event', label: 'Event' },
    { value: 'break', label: 'Break' },
    { value: 'focus', label: 'Focus' },
  ];

  const totalHeight = totalHours * HOUR_HEIGHT;
  const hasBlocks = todayBlocks.length > 0;

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
      >
        {/* Hour grid */}
        {Array.from({ length: totalHours }, (_, i) => (
          <HourMarker key={dayStartHour + i} hour={dayStartHour + i} />
        ))}

        {/* Time blocks (draggable) */}
        {todayBlocks.map((block) => {
          const { topOffset, height } = getBlockPosition(block, dayStartHour);
          return (
            <DraggableTimeBlock
              key={block.id}
              block={block}
              topOffset={topOffset}
              height={height}
              hasConflict={hasConflict(block.id, conflicts)}
              onMoveEnd={handleMoveEnd}
              onResizeEnd={handleResizeEnd}
              onDragStateChange={handleDragStateChange}
            />
          );
        })}

        {/* Calendar events (read-only overlay) */}
        {todayEvents.map((event) => {
          const { topOffset, height } = getEventPosition(event, dayStartHour);
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
            />
          );
        })}

        {/* Current time indicator */}
        <CurrentTimeIndicator startHour={dayStartHour} />

        {/* Empty state */}
        {!hasBlocks && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No blocks yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first time block
            </Text>
          </View>
        )}
      </Animated.ScrollView>

      <QuickAddButton onPress={handleQuickAdd} />

      {/* Quick Add Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Time Block</Text>

            <TextInput
              style={styles.input}
              placeholder="What are you working on?"
              placeholderTextColor={Colors.textTertiary}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveBlock}
            />

            <View style={styles.typeRow}>
              {typeOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.typeChip,
                    newType === opt.value && styles.typeChipActive,
                  ]}
                  onPress={() => setNewType(opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Block type: ${opt.label}`}
                  accessibilityState={{ selected: newType === opt.value }}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      newType === opt.value && styles.typeChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
              onPress={handleSaveBlock}
              accessibilityRole="button"
              accessibilityLabel="Save time block"
            >
              <Text style={styles.saveButtonText}>Add Block</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  emptyState: {
    position: 'absolute',
    top: 4 * HOUR_HEIGHT,
    left: Dimensions.timelineLeftGutter + 16,
    right: Dimensions.screenPadding + 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Dimensions.fontLG,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: Dimensions.fontSM,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Dimensions.radiusLarge,
    borderTopRightRadius: Dimensions.radiusLarge,
    paddingHorizontal: Dimensions.screenPadding,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: Dimensions.fontXL,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Dimensions.radiusMedium,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: Dimensions.fontMD,
    color: Colors.text,
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Dimensions.radiusLarge,
    backgroundColor: Colors.surfaceSecondary,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
  },
  typeChipText: {
    fontSize: Dimensions.fontSM,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.surface,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Dimensions.radiusMedium,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  saveButtonText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '600',
    color: Colors.surface,
  },
});
