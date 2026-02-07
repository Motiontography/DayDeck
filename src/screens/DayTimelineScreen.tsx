import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { Colors, Dimensions } from '../constants';
import { TimelineView } from '../components/timeline';
import { DaySwitcher } from '../components/common';
import { useCalendar } from '../hooks/useCalendar';
import { useCalendarStore, useTaskStore } from '../store';

export default function DayTimelineScreen() {
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setCalendarEvents = useCalendarStore((s) => s.setCalendarEvents);
  const calendarEnabled = useCalendarStore((s) => s.calendarEnabled);
  const { events, hasPermission, loading, requestPermission, fetchEvents } = useCalendar();

  // Fetch calendar events when the selected date changes or permission is granted
  useEffect(() => {
    if (hasPermission && calendarEnabled) {
      const dayStart = startOfDay(parseISO(selectedDate));
      const dayEnd = endOfDay(parseISO(selectedDate));
      fetchEvents(dayStart, dayEnd);
    }
  }, [selectedDate, hasPermission, calendarEnabled, fetchEvents]);

  // Sync fetched events to the store
  useEffect(() => {
    setCalendarEvents(events);
  }, [events, setCalendarEvents]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        {!hasPermission && calendarEnabled && (
          <Pressable
            onPress={requestPermission}
            style={styles.calendarPrompt}
            accessibilityRole="button"
            accessibilityLabel="Enable calendar sync"
          >
            <Text style={styles.calendarPromptText}>Enable Calendar</Text>
          </Pressable>
        )}
        {loading && <Text style={styles.loadingText}>Syncing calendar...</Text>}
      </View>
      <DaySwitcher />
      <TimelineView />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Dimensions.screenPadding,
    paddingTop: Dimensions.cardPadding,
  },
  title: {
    fontSize: Dimensions.fontTitle,
    fontWeight: '700',
    color: Colors.text,
  },
  calendarPrompt: {
    backgroundColor: Colors.info + '1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Dimensions.radiusSmall,
    borderWidth: 1,
    borderColor: Colors.info,
  },
  calendarPromptText: {
    fontSize: Dimensions.fontXS,
    fontWeight: '600',
    color: Colors.info,
  },
  loadingText: {
    fontSize: Dimensions.fontXS,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
