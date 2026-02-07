import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { Colors, Dimensions } from '../constants';
import { useTaskStore } from '../store';
import type { Task, TaskStatus, Subtask } from '../types';
import { TaskList, TaskForm } from '../components/task';
import { DaySwitcher } from '../components/common';
import { todayISO } from '../utils';

type FilterOption = TaskStatus | 'all';

const FILTER_TABS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'Active' },
  { key: 'done', label: 'Done' },
];

export default function TasksScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const setTaskStatus = useTaskStore((s) => s.setTaskStatus);
  const toggleSubtask = useTaskStore((s) => s.toggleSubtask);
  const addSubtask = useTaskStore((s) => s.addSubtask);
  const removeSubtask = useTaskStore((s) => s.removeSubtask);

  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [fabPressed, setFabPressed] = useState(false);

  const dateTasks = useMemo(
    () => tasks.filter((t) => t.scheduledDate === selectedDate),
    [tasks, selectedDate],
  );

  // Stats
  const totalCount = dateTasks.length;
  const doneCount = useMemo(
    () => dateTasks.filter((t) => t.status === 'done').length,
    [dateTasks],
  );
  const progressPercent =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<FilterOption, number> = {
      all: dateTasks.length,
      todo: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
    };
    for (const t of dateTasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [dateTasks]);

  const motivationalText = useMemo(() => {
    if (totalCount === 0) return 'Plan your day';
    if (doneCount === totalCount) return 'All done! Great job!';
    if (progressPercent >= 75) return 'Almost there! Keep going!';
    if (progressPercent >= 50) return 'Halfway there!';
    if (progressPercent > 0) return 'Making progress...';
    return "Let's get started!";
  }, [totalCount, doneCount, progressPercent]);

  const dateDisplay = useMemo(() => {
    try {
      const parsed = parseISO(selectedDate);
      const dayName = format(parsed, 'EEEE');
      const dateStr = format(parsed, 'MMM d');
      const isToday = selectedDate === todayISO();
      return { dayName, dateStr, isToday };
    } catch {
      return { dayName: '', dateStr: selectedDate, isToday: false };
    }
  }, [selectedDate]);

  const handleToggleStatus = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      setTaskStatus(taskId, task.status === 'done' ? 'todo' : 'done');
    },
    [tasks, setTaskStatus],
  );

  const handleDelete = useCallback(
    (taskId: string) => {
      deleteTask(taskId);
    },
    [deleteTask],
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
    [addTask],
  );

  const handleAddSubtask = useCallback(
    (taskId: string, subtask: Subtask) => {
      addSubtask(taskId, subtask);
    },
    [addSubtask],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Rich Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle} accessibilityRole="header">
              Tasks
            </Text>
            <Text style={styles.headerDate}>
              {dateDisplay.dateStr}
              {dateDisplay.isToday ? ' \u2022 Today' : ''}
            </Text>
          </View>

          {/* Progress ring area */}
          {totalCount > 0 && (
            <View style={styles.progressArea}>
              <View style={styles.progressRing}>
                <View
                  style={[
                    styles.progressRingInner,
                    doneCount === totalCount && styles.progressRingComplete,
                  ]}
                >
                  <Text style={styles.progressNumber}>{progressPercent}</Text>
                  <Text style={styles.progressPercentSign}>%</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Stats row */}
        {totalCount > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` as `${number}%` },
                  doneCount === totalCount && styles.progressBarComplete,
                ]}
              />
            </View>
            <Text style={styles.statsText}>
              {doneCount} of {totalCount} done
              {' \u2022 '}
              {motivationalText}
            </Text>
          </View>
        )}
      </View>

      <DaySwitcher />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = filterCounts[tab.key] || 0;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveFilter(tab.key)}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label} filter, ${count} tasks`}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    isActive && styles.filterBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      isActive && styles.filterBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Task list */}
      <TaskList
        tasks={dateTasks}
        selectedDate={selectedDate}
        activeFilter={activeFilter}
        onToggleStatus={handleToggleStatus}
        onToggleSubtask={toggleSubtask}
        onRemoveSubtask={removeSubtask}
        onAddSubtask={handleAddSubtask}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPressIn={() => setFabPressed(true)}
        onPressOut={() => setFabPressed(false)}
        onPress={() => {
          setEditingTask(null);
          setFormVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Add new task"
      >
        <Text
          style={[styles.fabIcon, fabPressed && styles.fabIconPressed]}
        >
          +
        </Text>
      </Pressable>

      {/* Task form modal */}
      <TaskForm
        visible={formVisible}
        onClose={handleCloseForm}
        onSubmit={handleAddTask}
        onUpdate={updateTask}
        editingTask={editingTask}
        selectedDate={selectedDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  headerContainer: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Dimensions.screenPadding,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: Dimensions.fontTitle,
    fontWeight: '800',
    color: Colors.text,
  },
  headerDate: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressArea: {
    alignItems: 'center',
  },
  progressRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  progressRingComplete: {
    // extra styling for 100%
  },
  progressNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressPercentSign: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },

  // Stats
  statsRow: {
    marginTop: 12,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryLight + '60',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  progressBarComplete: {
    backgroundColor: Colors.success,
  },
  statsText: {
    fontSize: Dimensions.fontXS,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 6,
  },

  // Filter tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Dimensions.screenPadding,
    paddingVertical: 10,
    gap: 6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceTertiary,
    gap: 5,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.93 }],
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 34,
  },
  fabIconPressed: {
    transform: [{ rotate: '45deg' }],
  },
});
