import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
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
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No tasks yet</Text>
        <Text style={styles.emptySubtitle}>Tap the + button to add your first task</Text>
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
  emptyTitle: {
    fontSize: Dimensions.fontXL,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
