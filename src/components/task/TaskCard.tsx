import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
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
import { Colors, Dimensions } from '../../constants';
import type { Task } from '../../types';
import PriorityBadge from './PriorityBadge';
import SubtaskRow from './SubtaskRow';

const DELETE_THRESHOLD = -80;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

interface TaskCardProps {
  task: Task;
  onToggleStatus: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

export default function TaskCard({
  task,
  onToggleStatus,
  onToggleSubtask,
  onRemoveSubtask,
  onDelete,
  onEdit,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDone = task.status === 'done';
  const hasSubtasks = task.subtasks.length > 0;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  // Swipe-to-delete shared values
  const translateX = useSharedValue(0);
  const isDeleting = useSharedValue(false);

  const handleToggleStatus = useCallback(() => {
    Haptics.impactAsync(
      isDone ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    );
    onToggleStatus(task.id);
  }, [isDone, onToggleStatus, task.id]);

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

  // Swipe gesture for delete
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      'worklet';
      // Only allow swiping left (negative)
      if (e.translationX < 0) {
        translateX.value = e.translationX;
      }
      // Trigger haptic feedback when crossing threshold
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
        // Keep it revealed and trigger delete
        translateX.value = withSpring(DELETE_THRESHOLD, SPRING_CONFIG);
        runOnJS(triggerDelete)();
      } else {
        // Snap back
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
      {/* Delete background revealed by swipe */}
      <Animated.View style={[styles.deleteBackground, deleteBackgroundStyle]}>
        <View style={styles.deleteBackgroundContent}>
          <Text style={styles.deleteBackgroundIcon}>{'\u{1F5D1}'}</Text>
          <Text style={styles.deleteBackgroundText}>Delete</Text>
        </View>
      </Animated.View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <View
            accessibilityLabel={`Task: ${task.title}, ${task.priority} priority, ${isDone ? 'completed' : 'not completed'}`}
          >
            <View style={styles.topRow}>
              {/* Completion checkbox */}
              <Pressable
                onPress={handleToggleStatus}
                style={styles.checkboxHitArea}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                accessibilityLabel={`Mark ${task.title} as ${isDone ? 'not done' : 'done'}`}
              >
                <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
                  {isDone && <Text style={styles.checkmark}>{'\u2713'}</Text>}
                </View>
              </Pressable>

              {/* Task content */}
              <Pressable
                style={styles.content}
                onPress={() => {
                  if (hasSubtasks) setExpanded(!expanded);
                }}
                onLongPress={() => onEdit(task)}
                accessibilityLabel={hasSubtasks ? `${task.title}. Tap to ${expanded ? 'collapse' : 'expand'} subtasks` : `${task.title}`}
                accessibilityHint="Long press to edit. Swipe left to delete."
                accessibilityRole="button"
              >
                <View style={styles.titleRow}>
                  <Text style={[styles.title, isDone && styles.titleDone]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <PriorityBadge priority={task.priority} />
                </View>

                {task.description ? (
                  <Text style={styles.description} numberOfLines={expanded ? undefined : 1}>
                    {task.description}
                  </Text>
                ) : null}

                <View style={styles.metaRow}>
                  {task.estimatedMinutes != null && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{task.estimatedMinutes} min</Text>
                    </View>
                  )}
                  {hasSubtasks && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>
                        {completedSubtasks}/{task.subtasks.length} subtasks
                      </Text>
                    </View>
                  )}
                  {task.recurrence && (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>
                        {formatRecurrenceLabel(task.recurrence.frequency, task.recurrence.interval)}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>

            {/* Expanded subtasks */}
            {expanded && hasSubtasks && (
              <View style={styles.subtaskSection}>
                {task.subtasks.map((subtask) => (
                  <SubtaskRow
                    key={subtask.id}
                    subtask={subtask}
                    onToggle={(subtaskId) => onToggleSubtask(task.id, subtaskId)}
                    onRemove={(subtaskId) => onRemoveSubtask(task.id, subtaskId)}
                  />
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
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

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: Dimensions.itemSpacing,
    borderRadius: Dimensions.radiusMedium,
    overflow: 'hidden',
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.error,
    borderRadius: Dimensions.radiusMedium,
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
    backgroundColor: Colors.surface,
    borderRadius: Dimensions.radiusMedium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  content: {
    flex: 1,
    marginLeft: 4,
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
    color: Colors.text,
    flex: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  description: {
    fontSize: Dimensions.fontSM,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaPill: {
    backgroundColor: Colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: Dimensions.fontXS,
    fontWeight: '500',
    color: Colors.textTertiary,
  },
  subtaskSection: {
    paddingHorizontal: Dimensions.cardPadding,
    paddingBottom: Dimensions.cardPadding,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
});
