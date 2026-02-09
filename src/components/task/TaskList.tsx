import React, { useMemo, useState, useCallback } from 'react';
import { SectionList, StyleSheet, Text, View, Pressable } from 'react-native';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import type { Task, TaskStatus, Subtask } from '../../types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  selectedDate: string;
  activeFilter: TaskStatus | 'all';
  onToggleStatus: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, subtask: Subtask) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

interface Section {
  title: string;
  key: string;
  data: Task[];
  collapsible: boolean;
}

const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  todo: 1,
  done: 2,
  cancelled: 3,
};

const SECTION_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  todo: 'To Do',
  done: 'Done',
  cancelled: 'Cancelled',
};

export default function TaskList({
  tasks,
  selectedDate,
  activeFilter,
  onToggleStatus,
  onToggleSubtask,
  onRemoveSubtask,
  onAddSubtask,
  onDelete,
  onEdit,
}: TaskListProps) {
  const colors = useTheme();
  const styles = useStyles(colors);

  const [doneCollapsed, setDoneCollapsed] = useState(true);

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter((t) => t.status === activeFilter);
  }, [tasks, activeFilter]);

  const sections = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const task of filteredTasks) {
      const status = task.status;
      if (!groups[status]) groups[status] = [];
      groups[status].push(task);
    }

    const result: Section[] = [];
    const statuses = Object.keys(groups).sort(
      (a, b) => (STATUS_ORDER[a] ?? 99) - (STATUS_ORDER[b] ?? 99),
    );

    for (const status of statuses) {
      const isCollapsible = status === 'done';
      const collapsed = isCollapsible && doneCollapsed;
      result.push({
        title: SECTION_LABELS[status] || status,
        key: status,
        data: collapsed ? [] : groups[status],
        collapsible: isCollapsible,
      });
    }

    return result;
  }, [filteredTasks, doneCollapsed]);

  const doneCount = useMemo(
    () => filteredTasks.filter((t) => t.status === 'done').length,
    [filteredTasks],
  );

  if (tasks.length === 0) {
    return (
      <View
        style={styles.emptyState}
        accessible
        accessibilityLabel="No tasks yet. Tap the plus button to add your first task."
      >
        <View style={styles.emptyIllustration}>
          <Text style={styles.emptyIllustrationText}>{'\u{1F680}'}</Text>
        </View>
        <Text style={styles.emptyTitle}>Ready to plan your day?</Text>
        <Text style={styles.emptySubtitle}>
          Tap the + button to add your first task.{'\n'}
          Stay focused and crush your goals.
        </Text>
      </View>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <View
        style={styles.emptyState}
        accessible
        accessibilityLabel={`No ${activeFilter} tasks for this day.`}
      >
        <View style={styles.emptyIllustrationSmall}>
          <Text style={styles.emptyIllustrationTextSmall}>{'\u{1F50D}'}</Text>
        </View>
        <Text style={styles.emptyFilterTitle}>
          No {activeFilter === 'all' ? '' : SECTION_LABELS[activeFilter]?.toLowerCase() || activeFilter} tasks
        </Text>
        <Text style={styles.emptyFilterSubtitle}>
          Try a different filter or add a new task.
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          selectedDate={selectedDate}
          onToggleStatus={onToggleStatus}
          onToggleSubtask={onToggleSubtask}
          onRemoveSubtask={onRemoveSubtask}
          onAddSubtask={onAddSubtask}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      )}
      renderSectionHeader={({ section }) => {
        const sec = section as Section;
        const isDoneSection = sec.key === 'done';
        const sectionItemCount = isDoneSection
          ? doneCount
          : sec.data.length;

        return (
          <Pressable
            onPress={
              sec.collapsible
                ? () => setDoneCollapsed(!doneCollapsed)
                : undefined
            }
            style={styles.sectionHeader}
            accessibilityRole={sec.collapsible ? 'button' : 'header'}
            accessibilityLabel={`${sec.title} section, ${sectionItemCount} tasks${sec.collapsible ? `. Tap to ${doneCollapsed ? 'expand' : 'collapse'}` : ''}`}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{sec.title}</Text>
              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCount}>{sectionItemCount}</Text>
              </View>
              {sec.collapsible && (
                <Text style={styles.sectionChevron}>
                  {doneCollapsed ? '\u25BC' : '\u25B2'}
                </Text>
              )}
            </View>
          </Pressable>
        );
      }}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    />
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    list: {
      paddingHorizontal: Dimensions.screenPadding,
      paddingBottom: 100,
    },
    sectionHeader: {
      paddingTop: 16,
      paddingBottom: 8,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: Dimensions.fontSM,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sectionCountBadge: {
      backgroundColor: colors.surfaceTertiary,
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: 10,
    },
    sectionCount: {
      fontSize: Dimensions.fontXS,
      fontWeight: '700',
      color: colors.textTertiary,
    },
    sectionChevron: {
      fontSize: 10,
      color: colors.textTertiary,
      marginLeft: 2,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Dimensions.screenPadding * 2,
    },
    emptyIllustration: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    emptyIllustrationText: {
      fontSize: 36,
    },
    emptyTitle: {
      fontSize: Dimensions.fontXL,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: Dimensions.fontMD,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
    },
    emptyIllustrationSmall: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyIllustrationTextSmall: {
      fontSize: 26,
    },
    emptyFilterTitle: {
      fontSize: Dimensions.fontLG,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    emptyFilterSubtitle: {
      fontSize: Dimensions.fontSM,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  }), [colors]);
}
