import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Dimensions } from '../constants';
import { useTaskStore } from '../store';
import type { Task } from '../types';

function TaskItem({ task }: { task: Task }) {
  return (
    <View style={styles.taskItem}>
      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, task.completed && styles.taskCompleted]}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.taskDescription} numberOfLines={1}>
            {task.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function getPriorityColor(priority: Task['priority']): string {
  const map = {
    low: Colors.priorityLow,
    medium: Colors.priorityMedium,
    high: Colors.priorityHigh,
    urgent: Colors.priorityUrgent,
  };
  return map[priority];
}

export default function TasksScreen() {
  const tasks = useTaskStore((s) => s.tasks);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
      </View>
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptySubtitle}>Add your first task to get started</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskItem task={item} />}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Dimensions.screenPadding,
    paddingVertical: Dimensions.cardPadding,
  },
  title: {
    fontSize: Dimensions.fontTitle,
    fontWeight: '700',
    color: Colors.text,
  },
  list: {
    paddingHorizontal: Dimensions.screenPadding,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Dimensions.radiusMedium,
    padding: Dimensions.cardPadding,
    marginBottom: Dimensions.itemSpacing,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: Dimensions.fontLG,
    fontWeight: '500',
    color: Colors.text,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  taskDescription: {
    fontSize: Dimensions.fontSM,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
