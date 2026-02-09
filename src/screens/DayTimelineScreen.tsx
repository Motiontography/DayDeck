import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { Dimensions } from '../constants';
import { TimelineView, TemplateSheet } from '../components/timeline';
import { WeeklyCalendar, DaySummaryStats, MonthCalendar, WeekView } from '../components/common';
import { useCalendar } from '../hooks/useCalendar';
import { useCalendarStore, useTaskStore, useSettingsStore } from '../store';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../constants/colors';

type ViewMode = 'day' | 'week' | 'month';

export default function DayTimelineScreen() {
  const colors = useTheme();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setCalendarEvents = useCalendarStore((s) => s.setCalendarEvents);
  const setReminders = useCalendarStore((s) => s.setReminders);
  const calendarSyncEnabled = useSettingsStore((s) => s.calendarSyncEnabled);
  const calendarEnabled = useCalendarStore((s) => s.calendarEnabled);
  const {
    events,
    reminders,
    hasCalendarPermission,
    hasRemindersPermission,
    loading,
    requestPermissions,
    fetchEvents,
    fetchReminders,
  } = useCalendar();
  const [templateSheetVisible, setTemplateSheetVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');

  const dayName = format(parseISO(selectedDate), 'EEEE');
  const dateLabel = format(parseISO(selectedDate), 'MMMM d, yyyy');

  // Sync calendar enabled setting to store
  useEffect(() => {
    useCalendarStore.getState().setCalendarEnabled(calendarSyncEnabled);
  }, [calendarSyncEnabled]);

  // Fetch events for the current week (broader range than single day)
  useEffect(() => {
    if (hasCalendarPermission && calendarSyncEnabled) {
      const parsed = parseISO(selectedDate);
      const weekStart = startOfWeek(parsed, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(parsed, { weekStartsOn: 0 });
      fetchEvents(startOfDay(weekStart), endOfDay(weekEnd));
    }
  }, [selectedDate, hasCalendarPermission, calendarSyncEnabled, fetchEvents]);

  // Fetch reminders for a 30-day window around the selected date
  useEffect(() => {
    if (hasRemindersPermission && calendarSyncEnabled) {
      const parsed = parseISO(selectedDate);
      const rangeStart = startOfDay(parsed);
      const rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + 30);
      fetchReminders(rangeStart, rangeEnd);
    }
  }, [selectedDate, hasRemindersPermission, calendarSyncEnabled, fetchReminders]);

  useEffect(() => {
    setCalendarEvents(events);
  }, [events, setCalendarEvents]);

  useEffect(() => {
    setReminders(reminders);
  }, [reminders, setReminders]);

  return (
    <View style={styles.container}>
      <View style={[styles.headerArea, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.dayName}>{dayName}</Text>
            <Text style={styles.dateLabel} accessibilityRole="header">
              {dateLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => setTemplateSheetVisible(true)}
            style={({ pressed }) => [
              styles.templateButton,
              pressed && { backgroundColor: colors.primary + '25' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open templates"
          >
            <Text style={styles.templateButtonIcon}>{'\u{1F4CB}'}</Text>
            <Text style={styles.templateButtonText}>Templates</Text>
          </Pressable>
        </View>
        {!hasCalendarPermission && calendarSyncEnabled && (
          <Pressable
            onPress={requestPermissions}
            style={styles.calendarPrompt}
            accessibilityRole="button"
            accessibilityLabel="Enable calendar and reminders sync"
          >
            <Text style={styles.calendarPromptIcon}>{'\u{1F4C5}'}</Text>
            <Text style={styles.calendarPromptText}>Sync Calendar & Reminders</Text>
          </Pressable>
        )}
        {loading && <Text style={styles.loadingText}>Syncing...</Text>}

        {/* View mode toggle */}
        <View style={styles.toggleContainer}>
          <Pressable
            onPress={() => setViewMode('day')}
            style={[
              styles.toggleTab,
              viewMode === 'day' && styles.toggleTabActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Day view"
            accessibilityState={{ selected: viewMode === 'day' }}
          >
            <Text
              style={[
                styles.toggleTabText,
                viewMode === 'day' && styles.toggleTabTextActive,
              ]}
            >
              Day
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('week')}
            style={[
              styles.toggleTab,
              viewMode === 'week' && styles.toggleTabActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Week view"
            accessibilityState={{ selected: viewMode === 'week' }}
          >
            <Text
              style={[
                styles.toggleTabText,
                viewMode === 'week' && styles.toggleTabTextActive,
              ]}
            >
              Week
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('month')}
            style={[
              styles.toggleTab,
              viewMode === 'month' && styles.toggleTabActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Month view"
            accessibilityState={{ selected: viewMode === 'month' }}
          >
            <Text
              style={[
                styles.toggleTabText,
                viewMode === 'month' && styles.toggleTabTextActive,
              ]}
            >
              Month
            </Text>
          </Pressable>
        </View>
      </View>

      {viewMode === 'day' ? (
        <>
          <WeeklyCalendar />
          <DaySummaryStats />
          <TimelineView />
        </>
      ) : viewMode === 'week' ? (
        <WeekView />
      ) : (
        <MonthCalendar />
      )}

      <TemplateSheet
        visible={templateSheetVisible}
        onClose={() => setTemplateSheetVisible(false)}
      />
    </View>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerArea: {
      paddingHorizontal: Dimensions.screenPadding,
      paddingBottom: 10,
      backgroundColor: colors.primaryMuted,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flex: 1,
    },
    dayName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 2,
      letterSpacing: 0.3,
    },
    dateLabel: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    templateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary + '12',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
    },
    templateButtonIcon: {
      fontSize: 14,
    },
    templateButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    calendarPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      marginTop: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    calendarPromptIcon: {
      fontSize: 16,
    },
    calendarPromptText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    loadingText: {
      fontSize: Dimensions.fontXS,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 8,
    },
    // View mode toggle
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.primary + '12',
      borderRadius: 12,
      padding: 3,
      marginTop: 12,
    },
    toggleTab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 7,
      borderRadius: 10,
    },
    toggleTabActive: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    toggleTabText: {
      fontSize: Dimensions.fontSM,
      fontWeight: '700',
      color: colors.primary,
    },
    toggleTabTextActive: {
      color: '#FFFFFF',
    },
  }), [colors]);
}
