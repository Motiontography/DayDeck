import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Dimensions } from '../constants';
import { useTaskStore } from '../store';
import type { Task } from '../types';
import { TaskList, TaskForm } from '../components/task';

export default function TasksScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const setTaskStatus = useTaskStore((s) => s.setTaskStatus);
  const toggleSubtask = useTaskStore((s) => s.toggleSubtask);
  const removeSubtask = useTaskStore((s) => s.removeSubtask);

  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filter tasks for the selected date
  const dateTasks = useMemo(
    () => tasks.filter((t) => t.scheduledDate === selectedDate),
    [tasks, selectedDate]
  );

  const handleToggleStatus = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      setTaskStatus(taskId, task.status === 'done' ? 'todo' : 'done');
    },
    [tasks, setTaskStatus]
  );

  const handleDelete = useCallback(
    (taskId: string) => {
      Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTask(taskId) },
      ]);
    },
    [deleteTask]
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setFormVisible(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setEditingTask(null);
  }, []);

  const handleAddTask = useCallback(
    (task: Task) => {
      addTask(task);
    },
    [addTask]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.dateLabel}>{selectedDate}</Text>
      </View>

      {/* Task list */}
      <TaskList
        tasks={dateTasks}
        onToggleStatus={handleToggleStatus}
        onToggleSubtask={toggleSubtask}
        onRemoveSubtask={removeSubtask}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      {/* FAB - Floating Action Button */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          setEditingTask(null);
          setFormVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Add new task"
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      {/* Task form modal */}
      <TaskForm
        visible={formVisible}
        onClose={handleCloseForm}
        onSubmit={handleAddTask}
        onUpdate={updateTask}
        editingTask={editingTask}
      />
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
  dateLabel: {
    fontSize: Dimensions.fontSM,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 30,
  },
});
