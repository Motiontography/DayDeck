import React, { useState, useEffect, useCallback } from 'react';
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
import { format, addDays, parseISO, isValid } from 'date-fns';
import { Colors, Dimensions } from '../../constants';
import type {
  Task,
  Priority,
  Subtask,
  Recurrence,
  RecurrenceFrequency,
} from '../../types';
import { generateId, todayISO } from '../../utils';
import { useSettingsStore } from '../../store';

interface TaskFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (task: Task) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  editingTask?: Task | null;
  selectedDate?: string;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const FREQUENCIES: RecurrenceFrequency[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: Colors.priorityLow,
  medium: Colors.priorityMedium,
  high: Colors.priorityHigh,
  urgent: Colors.priorityUrgent,
};

const PRIORITY_TEXT_COLORS: Record<Priority, string> = {
  low: '#FFFFFF',
  medium: '#78350F',
  high: '#FFFFFF',
  urgent: '#FFFFFF',
};

const PRIORITY_ICONS: Record<Priority, string> = {
  low: '\u2193',
  medium: '\u2192',
  high: '\u2191',
  urgent: '\u21C8',
};

interface DurationPreset {
  label: string;
  minutes: number;
}

const DURATION_PRESETS: DurationPreset[] = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
];

export default function TaskForm({
  visible,
  onClose,
  onSubmit,
  onUpdate,
  editingTask,
  selectedDate: selectedDateProp,
}: TaskFormProps) {
  const defaultDuration = useSettingsStore(
    (s) => s.defaultTaskDurationMinutes,
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [scheduledDate, setScheduledDate] = useState(todayISO());
  const [customDateInput, setCustomDateInput] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    defaultDuration.toString(),
  );
  const [customDuration, setCustomDuration] = useState(false);
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('daily');
  const [interval, setInterval] = useState('1');

  // Subtask creation state
  const [formSubtasks, setFormSubtasks] = useState<
    { id: string; title: string }[]
  >([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const today = todayISO();
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  // Derive friendly date label
  const getDateLabel = useCallback(
    (date: string): string => {
      if (date === today) return 'Today';
      if (date === tomorrow) return 'Tomorrow';
      try {
        const parsed = parseISO(date);
        if (isValid(parsed)) return format(parsed, 'EEE, MMM d');
      } catch {
        // pass
      }
      return date;
    },
    [today, tomorrow],
  );

  useEffect(() => {
    if (visible && editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setPriority(editingTask.priority);
      setScheduledDate(editingTask.scheduledDate);
      setEstimatedMinutes(
        editingTask.estimatedMinutes?.toString() || defaultDuration.toString(),
      );
      setCustomDuration(
        !DURATION_PRESETS.some(
          (p) => p.minutes === editingTask.estimatedMinutes,
        ),
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
      setFormSubtasks(
        editingTask.subtasks.map((s) => ({ id: s.id, title: s.title })),
      );
      setShowCustomDate(false);
      setCustomDateInput('');
      setNewSubtaskText('');
    } else if (visible) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setScheduledDate(selectedDateProp || todayISO());
      setEstimatedMinutes(defaultDuration.toString());
      setCustomDuration(false);
      setHasRecurrence(false);
      setFrequency('daily');
      setInterval('1');
      setFormSubtasks([]);
      setShowCustomDate(false);
      setCustomDateInput('');
      setNewSubtaskText('');
    }
  }, [visible, editingTask, selectedDateProp, defaultDuration]);

  const handleAddFormSubtask = useCallback(() => {
    const trimmed = newSubtaskText.trim();
    if (!trimmed) return;
    setFormSubtasks((prev) => [...prev, { id: generateId(), title: trimmed }]);
    setNewSubtaskText('');
  }, [newSubtaskText]);

  const handleRemoveFormSubtask = useCallback((id: string) => {
    setFormSubtasks((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleCustomDateConfirm = useCallback(() => {
    const trimmed = customDateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      try {
        const parsed = parseISO(trimmed);
        if (isValid(parsed)) {
          setScheduledDate(trimmed);
          setShowCustomDate(false);
          setCustomDateInput('');
          return;
        }
      } catch {
        // invalid
      }
    }
  }, [customDateInput]);

  function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const recurrence: Recurrence | null = hasRecurrence
      ? { frequency, interval: Math.max(1, parseInt(interval, 10) || 1) }
      : null;

    const subtasksForTask: Subtask[] = formSubtasks.map((s) => ({
      id: s.id,
      title: s.title,
      completed: false,
      parentTaskId: editingTask?.id || '',
    }));

    if (editingTask && onUpdate) {
      onUpdate(editingTask.id, {
        title: trimmedTitle,
        description: description.trim(),
        priority,
        scheduledDate,
        estimatedMinutes: parseInt(estimatedMinutes, 10) || null,
        recurrence,
        subtasks: subtasksForTask.map((s) => ({
          ...s,
          parentTaskId: editingTask.id,
          completed:
            editingTask.subtasks.find((es) => es.id === s.id)?.completed ??
            false,
        })),
      });
    } else {
      const now = new Date().toISOString();
      const taskId = generateId();
      const task: Task = {
        id: taskId,
        title: trimmedTitle,
        description: description.trim(),
        status: 'todo',
        priority,
        scheduledDate,
        estimatedMinutes: parseInt(estimatedMinutes, 10) || null,
        subtasks: subtasksForTask.map((s) => ({
          ...s,
          parentTaskId: taskId,
        })),
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

  const currentMinutes = parseInt(estimatedMinutes, 10) || 0;

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
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.headerButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {editingTask ? 'Edit Task' : 'New Task'}
          </Text>
          <Pressable
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel={editingTask ? 'Save task' : 'Add task'}
            style={({ pressed }) => [
              styles.headerSaveButton,
              title.trim() ? styles.headerSaveButtonActive : null,
              pressed && title.trim() ? styles.headerSaveButtonPressed : null,
            ]}
          >
            <Text
              style={[
                styles.saveText,
                !title.trim() && styles.saveTextDisabled,
              ]}
            >
              {editingTask ? 'Save' : 'Add'}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={Colors.textTertiary}
            autoFocus
            accessibilityLabel="Task title"
          />

          {/* Description */}
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Add details..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
            accessibilityLabel="Task description"
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Priority */}
          <Text style={styles.sectionLabel}>Priority</Text>
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
                    styles.priorityIcon,
                    { color: priority === p ? PRIORITY_TEXT_COLORS[p] : PRIORITY_COLORS[p] },
                  ]}
                >
                  {PRIORITY_ICONS[p]}
                </Text>
                <Text
                  style={[
                    styles.priorityButtonText,
                    {
                      color:
                        priority === p
                          ? PRIORITY_TEXT_COLORS[p]
                          : Colors.text,
                    },
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Scheduled Date */}
          <Text style={styles.sectionLabel}>When</Text>
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => {
                setScheduledDate(today);
                setShowCustomDate(false);
              }}
              style={[
                styles.dateChip,
                scheduledDate === today &&
                  !showCustomDate &&
                  styles.dateChipActive,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: scheduledDate === today }}
              accessibilityLabel="Schedule for today"
            >
              <Text
                style={[
                  styles.dateChipText,
                  scheduledDate === today &&
                    !showCustomDate &&
                    styles.dateChipTextActive,
                ]}
              >
                Today
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setScheduledDate(tomorrow);
                setShowCustomDate(false);
              }}
              style={[
                styles.dateChip,
                scheduledDate === tomorrow &&
                  !showCustomDate &&
                  styles.dateChipActive,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: scheduledDate === tomorrow }}
              accessibilityLabel="Schedule for tomorrow"
            >
              <Text
                style={[
                  styles.dateChipText,
                  scheduledDate === tomorrow &&
                    !showCustomDate &&
                    styles.dateChipTextActive,
                ]}
              >
                Tomorrow
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setScheduledDate(nextWeek);
                setShowCustomDate(false);
              }}
              style={[
                styles.dateChip,
                scheduledDate === nextWeek &&
                  !showCustomDate &&
                  styles.dateChipActive,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: scheduledDate === nextWeek }}
              accessibilityLabel="Schedule for next week"
            >
              <Text
                style={[
                  styles.dateChipText,
                  scheduledDate === nextWeek &&
                    !showCustomDate &&
                    styles.dateChipTextActive,
                ]}
              >
                Next Week
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCustomDate(!showCustomDate)}
              style={[
                styles.dateChip,
                showCustomDate && styles.dateChipActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Pick a custom date"
            >
              <Text
                style={[
                  styles.dateChipText,
                  showCustomDate && styles.dateChipTextActive,
                ]}
              >
                Pick Date
              </Text>
            </Pressable>
          </View>

          {showCustomDate && (
            <View style={styles.customDateRow}>
              <TextInput
                style={styles.customDateInput}
                value={customDateInput}
                onChangeText={setCustomDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                onSubmitEditing={handleCustomDateConfirm}
                accessibilityLabel="Enter custom date"
              />
              <Pressable
                onPress={handleCustomDateConfirm}
                style={({ pressed }) => [
                  styles.customDateConfirm,
                  pressed && styles.customDateConfirmPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Confirm custom date"
              >
                <Text style={styles.customDateConfirmText}>Set</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.selectedDateDisplay}>
            <Text style={styles.selectedDateLabel}>Scheduled: </Text>
            <Text style={styles.selectedDateValue}>
              {getDateLabel(scheduledDate)}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Duration */}
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.durationRow}>
            {DURATION_PRESETS.map((preset) => (
              <Pressable
                key={preset.minutes}
                onPress={() => {
                  setEstimatedMinutes(preset.minutes.toString());
                  setCustomDuration(false);
                }}
                style={[
                  styles.durationChip,
                  !customDuration &&
                    currentMinutes === preset.minutes &&
                    styles.durationChipActive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{
                  selected:
                    !customDuration && currentMinutes === preset.minutes,
                }}
                accessibilityLabel={`${preset.label} duration`}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    !customDuration &&
                      currentMinutes === preset.minutes &&
                      styles.durationChipTextActive,
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setCustomDuration(true)}
              style={[
                styles.durationChip,
                customDuration && styles.durationChipActive,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: customDuration }}
              accessibilityLabel="Custom duration"
            >
              <Text
                style={[
                  styles.durationChipText,
                  customDuration && styles.durationChipTextActive,
                ]}
              >
                Custom
              </Text>
            </Pressable>
          </View>

          {customDuration && (
            <View style={styles.customDurationRow}>
              <TextInput
                style={styles.customDurationInput}
                value={estimatedMinutes}
                onChangeText={setEstimatedMinutes}
                placeholder="Minutes"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                accessibilityLabel="Custom duration in minutes"
              />
              <Text style={styles.customDurationUnit}>minutes</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Subtasks */}
          <Text style={styles.sectionLabel}>Subtasks</Text>
          {formSubtasks.map((subtask) => (
            <View key={subtask.id} style={styles.formSubtaskRow}>
              <View style={styles.formSubtaskBullet}>
                <Text style={styles.formSubtaskBulletText}>
                  {'\u2022'}
                </Text>
              </View>
              <Text style={styles.formSubtaskTitle} numberOfLines={1}>
                {subtask.title}
              </Text>
              <Pressable
                onPress={() => handleRemoveFormSubtask(subtask.id)}
                style={styles.formSubtaskRemove}
                accessibilityRole="button"
                accessibilityLabel={`Remove subtask: ${subtask.title}`}
              >
                <Text style={styles.formSubtaskRemoveText}>{'\u2715'}</Text>
              </Pressable>
            </View>
          ))}
          <View style={styles.addSubtaskRow}>
            <TextInput
              style={styles.addSubtaskInput}
              value={newSubtaskText}
              onChangeText={setNewSubtaskText}
              placeholder="Add a subtask..."
              placeholderTextColor={Colors.textTertiary}
              onSubmitEditing={handleAddFormSubtask}
              returnKeyType="done"
              accessibilityLabel="New subtask title"
            />
            <Pressable
              onPress={handleAddFormSubtask}
              style={({ pressed }) => [
                styles.addSubtaskButton,
                pressed && styles.addSubtaskButtonPressed,
                !newSubtaskText.trim() && styles.addSubtaskButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add subtask"
            >
              <Text
                style={[
                  styles.addSubtaskButtonText,
                  !newSubtaskText.trim() &&
                    styles.addSubtaskButtonTextDisabled,
                ]}
              >
                +
              </Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Recurrence */}
          <Pressable
            onPress={() => setHasRecurrence(!hasRecurrence)}
            style={styles.toggleRow}
            accessibilityRole="switch"
            accessibilityState={{ checked: hasRecurrence }}
            accessibilityLabel="Enable recurrence"
          >
            <Text style={styles.sectionLabel}>Recurring</Text>
            <View
              style={[styles.toggle, hasRecurrence && styles.toggleActive]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  hasRecurrence && styles.toggleKnobActive,
                ]}
              />
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

          {/* Spacer */}
          <View style={{ height: 80 }} />
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
    paddingVertical: 14,
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
    fontSize: Dimensions.fontXL,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSaveButton: {
    minHeight: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceTertiary,
  },
  headerSaveButtonActive: {
    backgroundColor: Colors.primary,
  },
  headerSaveButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  cancelText: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  saveText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveTextDisabled: {
    color: Colors.textTertiary,
  },
  form: {
    flex: 1,
    paddingHorizontal: Dimensions.screenPadding,
    paddingTop: 16,
  },
  titleInput: {
    fontSize: Dimensions.fontXXL,
    fontWeight: '700',
    color: Colors.text,
    paddingVertical: 8,
    borderBottomWidth: 0,
  },
  descriptionInput: {
    fontSize: Dimensions.fontMD,
    color: Colors.text,
    paddingVertical: 8,
    minHeight: 50,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: Dimensions.fontSM,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sublabel: {
    fontSize: Dimensions.fontSM,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },

  // Priority
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    gap: 2,
  },
  priorityIcon: {
    fontSize: 12,
    fontWeight: '800',
  },
  priorityButtonText: {
    fontSize: Dimensions.fontXS,
    fontWeight: '700',
  },

  // Date
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceTertiary,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: Colors.primary,
  },
  dateChipText: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.text,
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  customDateInput: {
    flex: 1,
    backgroundColor: Colors.surfaceTertiary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Dimensions.fontMD,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customDateConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  customDateConfirmPressed: {
    backgroundColor: Colors.primaryDark,
  },
  customDateConfirmText: {
    fontSize: Dimensions.fontMD,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.primaryMuted,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedDateLabel: {
    fontSize: Dimensions.fontSM,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  selectedDateValue: {
    fontSize: Dimensions.fontSM,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceTertiary,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationChipActive: {
    backgroundColor: Colors.primary,
  },
  durationChipText: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.text,
  },
  durationChipTextActive: {
    color: '#FFFFFF',
  },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  customDurationInput: {
    width: 80,
    backgroundColor: Colors.surfaceTertiary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Dimensions.fontMD,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  customDurationUnit: {
    fontSize: Dimensions.fontMD,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Subtasks in form
  formSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  formSubtaskBullet: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubtaskBulletText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  formSubtaskTitle: {
    flex: 1,
    fontSize: Dimensions.fontMD,
    fontWeight: '500',
    color: Colors.text,
  },
  formSubtaskRemove: {
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSubtaskRemoveText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addSubtaskInput: {
    flex: 1,
    backgroundColor: Colors.surfaceTertiary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Dimensions.fontMD,
    color: Colors.text,
  },
  addSubtaskButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSubtaskButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  addSubtaskButtonDisabled: {
    backgroundColor: Colors.surfaceTertiary,
  },
  addSubtaskButtonText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  addSubtaskButtonTextDisabled: {
    color: Colors.textTertiary,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // Recurrence
  recurrenceSection: {
    paddingLeft: 10,
    borderLeftWidth: 3,
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
    borderRadius: 10,
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
  input: {
    backgroundColor: Colors.surfaceTertiary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Dimensions.fontMD,
    color: Colors.text,
  },
});
