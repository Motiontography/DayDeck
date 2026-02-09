import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import type { Task, Subtask } from '../../types';
import { generateId } from '../../utils';
import PriorityBadge from './PriorityBadge';
import CarriedOverBadge from './CarriedOverBadge';
import SubtaskRow from './SubtaskRow';

const DELETE_THRESHOLD = -80;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

interface TaskCardProps {
  task: Task;
  selectedDate: string;
  onToggleStatus: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, subtask: Subtask) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

export default function TaskCard({
  task,
  selectedDate,
  onToggleStatus,
  onToggleSubtask,
  onRemoveSubtask,
  onAddSubtask,
  onDelete,
  onEdit,
}: TaskCardProps) {
  const colors = useTheme();
  const styles = useStyles(colors);

  const priorityAccent: Record<string, string> = useMemo(
    () => ({
      low: colors.priorityLow,
      medium: colors.priorityMedium,
      high: colors.priorityHigh,
      urgent: colors.priorityUrgent,
    }),
    [colors],
  );

  const [expanded, setExpanded] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const isDone = task.status === 'done';
  const hasSubtasks = task.subtasks.length > 0;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  const translateX = useSharedValue(0);
  const isDeleting = useSharedValue(false);

  const handleToggleStatus = useCallback(() => {
    if (isDone) {
      // Uncompleting — no confirmation needed
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggleStatus(task.id);
    } else {
      // Completing — confirm first to prevent accidental taps
      Alert.alert(
        'Mark as Complete',
        `Mark "${task.title}" as done?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onToggleStatus(task.id);
            },
          },
        ],
      );
    }
  }, [isDone, onToggleStatus, task.id, task.title]);

  const triggerDelete = useCallback(() => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {
          translateX.value = withSpring(0, SPRING_CONFIG);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(task.id);
        },
      },
    ]);
  }, [onDelete, task.id, translateX]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleAddSubtask = useCallback(() => {
    const trimmed = newSubtaskText.trim();
    if (!trimmed) return;
    const subtask: Subtask = {
      id: generateId(),
      title: trimmed,
      completed: false,
      parentTaskId: task.id,
    };
    onAddSubtask(task.id, subtask);
    setNewSubtaskText('');
  }, [newSubtaskText, onAddSubtask, task.id]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      'worklet';
      if (e.translationX < 0) {
        translateX.value = e.translationX;
      }
      if (e.translationX < DELETE_THRESHOLD && !isDeleting.value) {
        isDeleting.value = true;
        runOnJS(triggerHaptic)();
      } else if (e.translationX >= DELETE_THRESHOLD && isDeleting.value) {
        isDeleting.value = false;
      }
    })
    .onEnd(() => {
      'worklet';
      if (translateX.value < DELETE_THRESHOLD) {
        translateX.value = withSpring(DELETE_THRESHOLD, SPRING_CONFIG);
        runOnJS(triggerDelete)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
      isDeleting.value = false;
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteBackgroundStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, DELETE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.deleteBackground, deleteBackgroundStyle]}>
        <View style={styles.deleteBackgroundContent}>
          <Text style={styles.deleteBackgroundIcon}>{'\u{1F5D1}'}</Text>
          <Text style={styles.deleteBackgroundText}>Delete</Text>
        </View>
      </Animated.View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          {/* Priority accent bar */}
          <View
            style={[
              styles.accentBar,
              { backgroundColor: priorityAccent[task.priority] },
            ]}
          />

          <View
            style={styles.cardInner}
            accessibilityLabel={`Task: ${task.title}, ${task.priority} priority, ${isDone ? 'completed' : 'not completed'}`}
          >
            <View style={styles.topRow}>
              {/* Checkbox */}
              <Pressable
                onPress={handleToggleStatus}
                style={styles.checkboxHitArea}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                accessibilityLabel={`Mark ${task.title} as ${isDone ? 'not done' : 'done'}`}
              >
                <View
                  style={[
                    styles.checkbox,
                    isDone && styles.checkboxChecked,
                  ]}
                >
                  {isDone && (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  )}
                </View>
              </Pressable>

              {/* Task content */}
              <Pressable
                style={styles.content}
                onPress={() => setExpanded(!expanded)}
                onLongPress={() => onEdit(task)}
                accessibilityLabel={
                  hasSubtasks
                    ? `${task.title}. Tap to ${expanded ? 'collapse' : 'expand'} subtasks`
                    : `${task.title}. Tap to expand, long press to edit.`
                }
                accessibilityHint="Long press to edit. Swipe left to delete."
                accessibilityRole="button"
              >
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.title, isDone && styles.titleDone]}
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>
                  <PriorityBadge priority={task.priority} />
                </View>

                {task.description ? (
                  <Text
                    style={[
                      styles.description,
                      isDone && styles.descriptionDone,
                    ]}
                    numberOfLines={expanded ? undefined : 1}
                  >
                    {task.description}
                  </Text>
                ) : null}

                <View style={styles.metaRow}>
                  {task.scheduledTime != null && (
                    <View style={[styles.metaPill, styles.metaPillTime]}>
                      <Text style={[styles.metaPillText, styles.metaPillTextTime]}>
                        {formatScheduledTime(task.scheduledTime)}
                      </Text>
                    </View>
                  )}
                  {task.estimatedMinutes != null && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>
                        {task.estimatedMinutes >= 60
                          ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 > 0 ? ` ${task.estimatedMinutes % 60}m` : ''}`
                          : `${task.estimatedMinutes}m`}
                      </Text>
                    </View>
                  )}
                  {hasSubtasks && (
                    <View
                      style={[
                        styles.metaPill,
                        completedSubtasks === task.subtasks.length &&
                          styles.metaPillSuccess,
                      ]}
                    >
                      <Text
                        style={[
                          styles.metaPillText,
                          completedSubtasks === task.subtasks.length &&
                            styles.metaPillTextSuccess,
                        ]}
                      >
                        {completedSubtasks}/{task.subtasks.length} subtasks
                      </Text>
                    </View>
                  )}
                  {task.recurrence && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>
                        {formatRecurrenceLabel(
                          task.recurrence.frequency,
                          task.recurrence.interval,
                        )}
                      </Text>
                    </View>
                  )}
                  {task.carriedOverFrom != null && (
                    <CarriedOverBadge fromDate={task.carriedOverFrom} />
                  )}
                </View>

                {/* Expand indicator */}
                <Text style={styles.expandHint}>
                  {expanded ? '\u25B2' : '\u25BC'}
                </Text>
              </Pressable>
            </View>

            {/* Expanded subtask section */}
            {expanded && (
              <View style={styles.subtaskSection}>
                {task.subtasks.map((subtask) => (
                  <SubtaskRow
                    key={subtask.id}
                    subtask={subtask}
                    onToggle={(subtaskId) =>
                      onToggleSubtask(task.id, subtaskId)
                    }
                    onRemove={(subtaskId) =>
                      onRemoveSubtask(task.id, subtaskId)
                    }
                  />
                ))}

                {/* Inline quick-add subtask */}
                {!isDone && (
                  <View style={styles.inlineAddRow}>
                    <TextInput
                      style={styles.inlineAddInput}
                      value={newSubtaskText}
                      onChangeText={setNewSubtaskText}
                      placeholder="Add subtask..."
                      placeholderTextColor={colors.textTertiary}
                      onSubmitEditing={handleAddSubtask}
                      returnKeyType="done"
                      accessibilityLabel="Add a new subtask"
                    />
                    <Pressable
                      onPress={handleAddSubtask}
                      style={({ pressed }) => [
                        styles.inlineAddButton,
                        pressed && styles.inlineAddButtonPressed,
                        !newSubtaskText.trim() &&
                          styles.inlineAddButtonDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Add subtask"
                    >
                      <Text
                        style={[
                          styles.inlineAddButtonText,
                          !newSubtaskText.trim() &&
                            styles.inlineAddButtonTextDisabled,
                        ]}
                      >
                        +
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function formatScheduledTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${mStr} ${suffix}`;
}

function formatRecurrenceLabel(frequency: string, interval: number): string {
  if (interval === 1) {
    const map: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return map[frequency] || frequency;
  }
  const unit: Record<string, string> = {
    daily: 'days',
    weekly: 'weeks',
    monthly: 'months',
    yearly: 'years',
  };
  return `Every ${interval} ${unit[frequency] || frequency}`;
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    swipeContainer: {
      marginBottom: Dimensions.itemSpacing,
      borderRadius: 14,
      overflow: 'hidden',
    },
    deleteBackground: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.error,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 20,
    },
    deleteBackgroundContent: {
      alignItems: 'center',
      gap: 2,
    },
    deleteBackgroundIcon: {
      fontSize: 20,
    },
    deleteBackgroundText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
      flexDirection: 'row',
    },
    accentBar: {
      width: 4,
    },
    cardInner: {
      flex: 1,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: Dimensions.cardPadding,
    },
    checkboxHitArea: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2.5,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 17,
    },
    content: {
      flex: 1,
      marginLeft: 6,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: {
      fontSize: Dimensions.fontLG,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    titleDone: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    description: {
      fontSize: Dimensions.fontSM,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 17,
    },
    descriptionDone: {
      color: colors.textTertiary,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    metaPill: {
      backgroundColor: colors.surfaceTertiary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    metaPillText: {
      fontSize: Dimensions.fontXS,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    metaPillTime: {
      backgroundColor: colors.primary + '18',
    },
    metaPillTextTime: {
      color: colors.primary,
    },
    metaPillSuccess: {
      backgroundColor: colors.successLight,
    },
    metaPillTextSuccess: {
      color: colors.success,
    },
    expandHint: {
      fontSize: 8,
      color: colors.textTertiary,
      textAlign: 'right',
      marginTop: 4,
    },
    subtaskSection: {
      paddingHorizontal: Dimensions.cardPadding,
      paddingBottom: Dimensions.cardPadding,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      marginTop: 2,
    },
    inlineAddRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 6,
    },
    inlineAddInput: {
      flex: 1,
      backgroundColor: colors.surfaceTertiary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: Dimensions.fontSM,
      color: colors.text,
    },
    inlineAddButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inlineAddButtonPressed: {
      backgroundColor: colors.primaryDark,
    },
    inlineAddButtonDisabled: {
      backgroundColor: colors.surfaceTertiary,
    },
    inlineAddButtonText: {
      fontSize: 20,
      fontWeight: '500',
      color: '#FFFFFF',
      lineHeight: 22,
    },
    inlineAddButtonTextDisabled: {
      color: colors.textTertiary,
    },
  }), [colors]);
}
