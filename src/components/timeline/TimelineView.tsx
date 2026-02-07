import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Modal, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView as RNScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Dimensions } from '../../constants';
import { useTimeBlockStore, useTaskStore, useCalendarStore, useSettingsStore } from '../../store';
import { generateId, areSameDay, detectConflicts, hasConflict } from '../../utils';
import type { TimeBlock, TimeBlockType, CalendarEvent } from '../../types';
import HourMarker from './HourMarker';
import DraggableTimeBlock from './DraggableTimeBlock';
import CalendarEventCard from './CalendarEventCard';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import QuickAddButton from './QuickAddButton';

const HOUR_HEIGHT = Dimensions.timelineHourHeight;

const TYPE_ICONS: Record<TimeBlockType, string> = {
  task: '\u2611',
  focus: '\u26A1',
  event: '\u{1F4C5}',
  break: '\u2615',
};

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

const TYPE_OPTIONS: { value: TimeBlockType; label: string; icon: string; color: string; desc: string }[] = [
  { value: 'task', label: 'Task', icon: '\u2611', color: Colors.timeBlockTask, desc: 'Get something done' },
  { value: 'focus', label: 'Focus', icon: '\u26A1', color: Colors.timeBlockFocus, desc: 'Deep work session' },
  { value: 'event', label: 'Event', icon: '\u{1F4C5}', color: Colors.timeBlockEvent, desc: 'Meeting or appointment' },
  { value: 'break', label: 'Break', icon: '\u2615', color: Colors.timeBlockBreak, desc: 'Rest and recharge' },
];

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
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);
  const addTimeBlock = useTimeBlockStore((s) => s.addTimeBlock);
  const updateTimeBlock = useTimeBlockStore((s) => s.updateTimeBlock);
  const deleteTimeBlock = useTimeBlockStore((s) => s.deleteTimeBlock);
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

  // Edit/Delete bottom sheet state
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

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

  // Compute the start time for new block (snapped to 15-min, clamped to visible range)
  const newBlockStart = useMemo(() => {
    const now = new Date();
    const startMinute = Math.ceil(now.getMinutes() / 15) * 15;
    const d = new Date(selectedDate + 'T00:00:00');
    d.setHours(now.getHours(), startMinute, 0, 0);
    if (startMinute >= 60) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    }
    // Clamp to visible timeline range
    if (d.getHours() < dayStartHour) {
      d.setHours(dayStartHour, 0, 0, 0);
    }
    if (d.getHours() >= dayEndHour) {
      d.setHours(dayEndHour - 1, 0, 0, 0);
    }
    return d;
  }, [selectedDate, modalVisible, dayStartHour, dayEndHour]); // eslint-disable-line react-hooks/exhaustive-deps

  const newBlockEnd = useMemo(() => {
    const end = new Date(newBlockStart);
    end.setMinutes(end.getMinutes() + defaultTaskDuration);
    return end;
  }, [newBlockStart, defaultTaskDuration]);

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

  const handleDragStateChange = useCallback((isDragging: boolean) => {
    setScrollEnabled(!isDragging);
  }, []);

  const handleMoveEnd = useCallback(
    (blockId: string, newTopOffset: number) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const durationMs = new Date(block.endTime).getTime() - new Date(block.startTime).getTime();
      const newStart = topOffsetToDate(newTopOffset, selectedDate, dayStartHour);
      const newEnd = new Date(newStart.getTime() + durationMs);
      moveTimeBlock(blockId, newStart.toISOString(), newEnd.toISOString());
    },
    [timeBlocks, selectedDate, moveTimeBlock, dayStartHour],
  );

  const handleResizeEnd = useCallback(
    (blockId: string, newHeight: number) => {
      const block = timeBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const { topOffset } = getBlockPosition(block, dayStartHour);
      const newEndOffset = topOffset + newHeight;
      const newEnd = topOffsetToDate(newEndOffset, selectedDate, dayStartHour);
      updateTimeBlock(blockId, { endTime: newEnd.toISOString() });
    },
    [timeBlocks, selectedDate, updateTimeBlock, dayStartHour],
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
    setNewTitle('');
    setNewType('task');
    setModalVisible(true);
  }, []);

  const handleSaveBlock = useCallback(() => {
    const title = newTitle.trim();
    if (!title) return;

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
      startTime: newBlockStart.toISOString(),
      endTime: newBlockEnd.toISOString(),
      color: colorMap[newType],
      type: newType,
    };

    addTimeBlock(block);
    setModalVisible(false);
  }, [newTitle, newType, newBlockStart, newBlockEnd, addTimeBlock]);

  // --- Tap-to-edit handlers ---
  const handleBlockPress = useCallback((block: TimeBlock) => {
    setSelectedBlock(block);
    setEditTitle(block.title);
    setIsEditingTitle(false);
    setEditSheetVisible(true);
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
      >
        {/* Hour grid */}
        {Array.from({ length: totalHours }, (_, i) => (
          <HourMarker key={dayStartHour + i} hour={dayStartHour + i} isEven={i % 2 === 0} />
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

      <QuickAddButton onPress={handleQuickAdd} />

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
                  <View style={[styles.editIconBubble, { backgroundColor: (selectedBlock.color || Colors.timeBlockTask) + '25' }]}>
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
                    <Text style={[styles.editTime, { color: selectedBlock.color || Colors.textSecondary }]}>
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
                    <View style={[styles.editActionIcon, { backgroundColor: Colors.primary + '15' }]}>
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
                    <View style={[styles.editActionIcon, { backgroundColor: Colors.error + '15' }]}>
                      <Text style={styles.editActionEmoji}>{'\u{1F5D1}'}</Text>
                    </View>
                    <View style={styles.editActionContent}>
                      <Text style={[styles.editActionTitle, { color: Colors.error }]}>Delete Block</Text>
                      <Text style={styles.editActionDesc}>Remove from timeline</Text>
                    </View>
                    <Text style={[styles.editActionChevron, { color: Colors.error }]}>{'\u203A'}</Text>
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
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />

              {/* Header with time preview */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Schedule a Block</Text>
                <View style={[styles.timePill, { backgroundColor: selectedTypeOption.color + '18' }]}>
                  <Text style={[styles.timePillText, { color: selectedTypeOption.color }]}>
                    {formatStartTime(newBlockStart)} - {formatStartTime(newBlockEnd)}
                  </Text>
                </View>
              </View>

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
                  placeholderTextColor={Colors.textTertiary}
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
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  // --- Empty state ---
  emptyState: {
    position: 'absolute',
    top: 2 * HOUR_HEIGHT,
    left: Dimensions.timelineLeftGutter + 8,
    right: Dimensions.screenPadding + 8,
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: Colors.primaryLight + '40',
    borderStyle: 'dashed',
  },
  emptyIllustration: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
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
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.primary,
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
    backgroundColor: Colors.surface,
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
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  editTitleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  editTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  editActions: {
    backgroundColor: Colors.surfaceSecondary,
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
    backgroundColor: Colors.surfaceTertiary,
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
    color: Colors.text,
  },
  editActionDesc: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  editActionChevron: {
    fontSize: 22,
    color: Colors.textTertiary,
    fontWeight: '300',
  },
  editActionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 70,
  },
  editCloseButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
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
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surfaceSecondary,
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
    color: Colors.textSecondary,
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
    backgroundColor: Colors.surfaceSecondary,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
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
});
