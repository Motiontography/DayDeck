import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Text, Modal, TextInput, Pressable, StyleSheet } from 'react-native';
import { Colors, Dimensions, Defaults, Config } from '../../constants';
import { useTimeBlockStore, useTaskStore } from '../../store';
import { generateId, areSameDay } from '../../utils';
import type { TimeBlock, TimeBlockType } from '../../types';
import HourMarker from './HourMarker';
import TimeBlockCard from './TimeBlockCard';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import QuickAddButton from './QuickAddButton';

const START_HOUR = Defaults.dayStartHour;
const END_HOUR = Defaults.dayEndHour;
const HOUR_HEIGHT = Dimensions.timelineHourHeight;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function getBlockPosition(block: TimeBlock) {
  const start = new Date(block.startTime);
  const end = new Date(block.endTime);
  const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
  const endMinutes = (end.getHours() - START_HOUR) * 60 + end.getMinutes();
  const topOffset = (startMinutes / 60) * HOUR_HEIGHT;
  const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  return { topOffset, height };
}

export default function TimelineView() {
  const scrollRef = useRef<ScrollView>(null);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);
  const addTimeBlock = useTimeBlockStore((s) => s.addTimeBlock);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TimeBlockType>('task');

  // Filter blocks for the selected date
  const todayBlocks = timeBlocks.filter((b) => areSameDay(b.startTime, selectedDate));

  // Auto-scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const minutesFromStart = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
    const scrollY = Math.max(0, (minutesFromStart / 60) * HOUR_HEIGHT - 120);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: scrollY, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
    const startMinute = Math.floor(now.getMinutes() / 15) * 15; // Round to nearest 15 min

    const startTime = new Date(selectedDate);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + Config.defaultTaskDuration);

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
  }, [newTitle, newType, selectedDate, addTimeBlock]);

  const typeOptions: { value: TimeBlockType; label: string }[] = [
    { value: 'task', label: 'Task' },
    { value: 'event', label: 'Event' },
    { value: 'break', label: 'Break' },
    { value: 'focus', label: 'Focus' },
  ];

  const totalHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const hasBlocks = todayBlocks.length > 0;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { height: totalHeight + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hour grid */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <HourMarker key={START_HOUR + i} hour={START_HOUR + i} />
        ))}

        {/* Time blocks */}
        {todayBlocks.map((block) => {
          const { topOffset, height } = getBlockPosition(block);
          return (
            <TimeBlockCard
              key={block.id}
              block={block}
              topOffset={topOffset}
              height={height}
            />
          );
        })}

        {/* Current time indicator */}
        <CurrentTimeIndicator startHour={START_HOUR} />

        {/* Empty state */}
        {!hasBlocks && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No blocks yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first time block
            </Text>
          </View>
        )}
      </ScrollView>

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
    top: 4 * HOUR_HEIGHT, // Center-ish in the view
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
  // Modal
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
