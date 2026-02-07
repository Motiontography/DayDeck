import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import type { Task } from '../../types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

export default function TaskList({
  tasks,
  onToggleStatus,
  onToggleSubtask,
  onRemoveSubtask,
  onDelete,
  onEdit,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <View
        style={styles.emptyState}
        accessible
        accessibilityLabel="No tasks yet. Tap the plus button to add your first task."
      >
        <View style={styles.emptyIllustration}>
          <Text style={styles.emptyIllustrationText}>{'\u{1F4DD}'}</Text>
        </View>
        <Text style={styles.emptyTitle}>No tasks for today</Text>
        <Text style={styles.emptySubtitle}>
          Tap the + button to add your first task.{'\n'}
          Swipe left on any task to delete it.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          onToggleStatus={onToggleStatus}
          onToggleSubtask={onToggleSubtask}
          onRemoveSubtask={onRemoveSubtask}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Dimensions.screenPadding,
    paddingBottom: 100, // room for FAB
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Dimensions.screenPadding,
  },
  emptyIllustration: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIllustrationText: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: Dimensions.fontXL,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 21,
  },
});
