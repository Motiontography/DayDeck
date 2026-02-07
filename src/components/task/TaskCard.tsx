import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import type { Task } from '../../types';
import PriorityBadge from './PriorityBadge';
import SubtaskRow from './SubtaskRow';

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

  return (
    <View
      style={styles.card}
      accessibilityLabel={`Task: ${task.title}, ${task.priority} priority, ${isDone ? 'completed' : 'not completed'}`}
      accessibilityRole="none"
    >
      <View style={styles.topRow}>
        {/* Completion checkbox */}
        <Pressable
          onPress={() => onToggleStatus(task.id)}
          style={styles.checkboxHitArea}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone }}
          accessibilityLabel={`Mark ${task.title} as ${isDone ? 'not done' : 'done'}`}
        >
          <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
            {isDone && <Text style={styles.checkmark}>{'✓'}</Text>}
          </View>
        </Pressable>

        {/* Task content */}
        <Pressable
          style={styles.content}
          onPress={() => {
            if (hasSubtasks) setExpanded(!expanded);
          }}
          onLongPress={() => onEdit(task)}
          accessibilityLabel={hasSubtasks ? `Tap to ${expanded ? 'collapse' : 'expand'} subtasks` : undefined}
          accessibilityRole={hasSubtasks ? 'button' : 'none'}
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
            {task.scheduledDate ? (
              <Text style={styles.metaText}>{task.scheduledDate}</Text>
            ) : null}
            {task.estimatedMinutes != null && (
              <Text style={styles.metaText}>{task.estimatedMinutes} min</Text>
            )}
            {hasSubtasks && (
              <Text style={styles.metaText}>
                {completedSubtasks}/{task.subtasks.length} subtasks
              </Text>
            )}
            {task.recurrence && (
              <Text style={styles.metaText}>
                {formatRecurrenceLabel(task.recurrence.frequency, task.recurrence.interval)}
              </Text>
            )}
          </View>
        </Pressable>

        {/* Delete button (non-gesture alternative to swipe) */}
        <Pressable
          onPress={() => onDelete(task.id)}
          style={styles.deleteHitArea}
          accessibilityLabel={`Delete task: ${task.title}`}
          accessibilityRole="button"
        >
          <Text style={styles.deleteIcon}>{'🗑'}</Text>
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Dimensions.radiusMedium,
    marginBottom: Dimensions.itemSpacing,
    overflow: 'hidden',
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
    width: 22,
    height: 22,
    borderRadius: 6,
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
    gap: 8,
    marginTop: 6,
  },
  metaText: {
    fontSize: Dimensions.fontXS,
    color: Colors.textTertiary,
  },
  deleteHitArea: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 16,
  },
  subtaskSection: {
    paddingHorizontal: Dimensions.cardPadding,
    paddingBottom: Dimensions.cardPadding,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
});
