import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseISO, startOfDay, endOfDay, format } from 'date-fns';
import { Colors, Dimensions } from '../constants';
import { TimelineView, TemplateSheet } from '../components/timeline';
import { WeeklyCalendar, DaySummaryStats } from '../components/common';
import { useCalendar } from '../hooks/useCalendar';
import { useCalendarStore, useTaskStore } from '../store';

export default function DayTimelineScreen() {
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setCalendarEvents = useCalendarStore((s) => s.setCalendarEvents);
  const calendarEnabled = useCalendarStore((s) => s.calendarEnabled);
  const { events, hasPermission, loading, requestPermission, fetchEvents } = useCalendar();
  const [templateSheetVisible, setTemplateSheetVisible] = useState(false);

  const dayName = format(parseISO(selectedDate), 'EEEE');
  const dateLabel = format(parseISO(selectedDate), 'MMMM d, yyyy');

  useEffect(() => {
    if (hasPermission && calendarEnabled) {
      const dayStart = startOfDay(parseISO(selectedDate));
      const dayEnd = endOfDay(parseISO(selectedDate));
      fetchEvents(dayStart, dayEnd);
    }
  }, [selectedDate, hasPermission, calendarEnabled, fetchEvents]);

  useEffect(() => {
    setCalendarEvents(events);
  }, [events, setCalendarEvents]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerArea}>
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
              pressed && styles.templateButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open templates"
          >
            <Text style={styles.templateButtonIcon}>{'\u{1F4CB}'}</Text>
            <Text style={styles.templateButtonText}>Templates</Text>
          </Pressable>
        </View>
        {!hasPermission && calendarEnabled && (
          <Pressable
            onPress={requestPermission}
            style={styles.calendarPrompt}
            accessibilityRole="button"
            accessibilityLabel="Enable calendar sync"
          >
            <Text style={styles.calendarPromptIcon}>{'\u{1F4C5}'}</Text>
            <Text style={styles.calendarPromptText}>Sync Calendar</Text>
          </Pressable>
        )}
        {loading && <Text style={styles.loadingText}>Syncing...</Text>}
      </View>
      <WeeklyCalendar />
      <DaySummaryStats />
      <TimelineView />
      <TemplateSheet
        visible={templateSheetVisible}
        onClose={() => setTemplateSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerArea: {
    paddingHorizontal: Dimensions.screenPadding,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#EEF2FF',
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
    color: Colors.primary,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  dateLabel: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  templateButtonPressed: {
    backgroundColor: Colors.primary + '25',
  },
  templateButtonIcon: {
    fontSize: 14,
  },
  templateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  calendarPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
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
    color: Colors.primary,
  },
  loadingText: {
    fontSize: Dimensions.fontXS,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
});
