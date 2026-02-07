import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Dimensions } from '../../constants';
import type { Task, Priority, Recurrence, RecurrenceFrequency } from '../../types';
import { generateId, todayISO } from '../../utils';
import { useSettingsStore } from '../../store';

interface TaskFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (task: Task) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  editingTask?: Task | null;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const FREQUENCIES: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: Colors.priorityLow,
  medium: Colors.priorityMedium,
  high: Colors.priorityHigh,
  urgent: Colors.priorityUrgent,
};

const PRIORITY_TEXT_COLORS: Record<Priority, string> = {
  low: '#FFFFFF',
  medium: '#78350F', // dark brown for contrast on amber
  high: '#FFFFFF',
  urgent: '#FFFFFF',
};

export default function TaskForm({
  visible,
  onClose,
  onSubmit,
  onUpdate,
  editingTask,
}: TaskFormProps) {
  const defaultDuration = useSettingsStore((s) => s.defaultTaskDurationMinutes);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [scheduledDate, setScheduledDate] = useState(todayISO());
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    defaultDuration.toString()
  );
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('daily');
  const [interval, setInterval] = useState('1');

  // Reset or populate form when visibility changes
  useEffect(() => {
    if (visible && editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setPriority(editingTask.priority);
      setScheduledDate(editingTask.scheduledDate);
      setEstimatedMinutes(
        editingTask.estimatedMinutes?.toString() || defaultDuration.toString()
      );
      if (editingTask.recurrence) {
        setHasRecurrence(true);
        setFrequency(editingTask.recurrence.frequency);
        setInterval(editingTask.recurrence.interval.toString());
      } else {
        setHasRecurrence(false);
        setFrequency('daily');
        setInterval('1');
      }
    } else if (visible) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setScheduledDate(todayISO());
      setEstimatedMinutes(defaultDuration.toString());
      setHasRecurrence(false);
      setFrequency('daily');
      setInterval('1');
    }
  }, [visible, editingTask]);

  function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const recurrence: Recurrence | null = hasRecurrence
      ? { frequency, interval: Math.max(1, parseInt(interval, 10) || 1) }
      : null;

    if (editingTask && onUpdate) {
      onUpdate(editingTask.id, {
        title: trimmedTitle,
        description: description.trim(),
        priority,
        scheduledDate,
        estimatedMinutes: parseInt(estimatedMinutes, 10) || null,
        recurrence,
      });
    } else {
      const now = new Date().toISOString();
      const task: Task = {
        id: generateId(),
        title: trimmedTitle,
        description: description.trim(),
        status: 'todo',
        priority,
        scheduledDate,
        estimatedMinutes: parseInt(estimatedMinutes, 10) || null,
        subtasks: [],
        recurrence,
        notifications: [],
        sortOrder: Date.now(),
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        carriedOverFrom: null,
      };
      onSubmit(task);
    }
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {editingTask ? 'Edit Task' : 'New Task'}
          </Text>
          <Pressable
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel={editingTask ? 'Save task' : 'Add task'}
            style={styles.headerButton}
          >
            <Text style={[styles.saveText, !title.trim() && styles.saveTextDisabled]}>
              {editingTask ? 'Save' : 'Add'}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={Colors.textTertiary}
            autoFocus
            accessibilityLabel="Task title"
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add details..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
            accessibilityLabel="Task description"
          />

          {/* Priority */}
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.priorityButton,
                  { borderColor: PRIORITY_COLORS[p] },
                  priority === p && { backgroundColor: PRIORITY_COLORS[p] },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: priority === p }}
                accessibilityLabel={`${p} priority`}
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    priority === p && { color: PRIORITY_TEXT_COLORS[p] },
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Scheduled date */}
          <Text style={styles.label}>Scheduled Date</Text>
          <TextInput
            style={styles.input}
            value={scheduledDate}
            onChangeText={setScheduledDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textTertiary}
            accessibilityLabel="Scheduled date"
          />

          {/* Duration */}
          <Text style={styles.label}>Estimated Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            value={estimatedMinutes}
            onChangeText={setEstimatedMinutes}
            placeholder="30"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            accessibilityLabel="Estimated duration in minutes"
          />

          {/* Recurrence */}
          <Pressable
            onPress={() => setHasRecurrence(!hasRecurrence)}
            style={styles.toggleRow}
            accessibilityRole="switch"
            accessibilityState={{ checked: hasRecurrence }}
            accessibilityLabel="Enable recurrence"
          >
            <Text style={styles.label}>Recurring</Text>
            <View style={[styles.toggle, hasRecurrence && styles.toggleActive]}>
              <View style={[styles.toggleKnob, hasRecurrence && styles.toggleKnobActive]} />
            </View>
          </Pressable>

          {hasRecurrence && (
            <View style={styles.recurrenceSection}>
              <Text style={styles.sublabel}>Frequency</Text>
              <View style={styles.frequencyRow}>
                {FREQUENCIES.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={[
                      styles.frequencyButton,
                      frequency === f && styles.frequencyButtonActive,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: frequency === f }}
                    accessibilityLabel={`${f} frequency`}
                  >
                    <Text
                      style={[
                        styles.frequencyButtonText,
                        frequency === f && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sublabel}>Every N intervals</Text>
              <TextInput
                style={styles.input}
                value={interval}
                onChangeText={setInterval}
                placeholder="1"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                accessibilityLabel="Recurrence interval"
              />
            </View>
          )}

          {/* Spacer for keyboard */}
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Dimensions.screenPadding,
    paddingVertical: Dimensions.cardPadding,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Dimensions.fontLG,
    fontWeight: '600',
    color: Colors.text,
  },
  cancelText: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
  },
  saveText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '600',
    color: Colors.primary,
  },
  saveTextDisabled: {
    color: Colors.textTertiary,
  },
  form: {
    flex: 1,
    paddingHorizontal: Dimensions.screenPadding,
    paddingTop: Dimensions.cardPadding,
  },
  label: {
    fontSize: Dimensions.fontMD,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 16,
  },
  sublabel: {
    fontSize: Dimensions.fontSM,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Dimensions.radiusMedium,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Dimensions.fontMD,
    color: Colors.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Dimensions.radiusSmall,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 0,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  recurrenceSection: {
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primaryLight,
    marginTop: 8,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  frequencyButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Dimensions.radiusSmall,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  frequencyButtonText: {
    fontSize: Dimensions.fontXS,
    fontWeight: '600',
    color: Colors.text,
  },
  frequencyButtonTextActive: {
    color: '#FFFFFF',
  },
});
