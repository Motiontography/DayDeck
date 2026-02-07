import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseISO, startOfDay, endOfDay, format } from 'date-fns';
import { Colors, Dimensions } from '../constants';
import { TimelineView } from '../components/timeline';
import { DaySwitcher } from '../components/common';
import { useCalendar } from '../hooks/useCalendar';
import { useCalendarStore, useTaskStore, useTimeBlockStore } from '../store';
import { areSameDay } from '../utils';

export default function DayTimelineScreen() {
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const timeBlocks = useTimeBlockStore((s) => s.timeBlocks);
  const setCalendarEvents = useCalendarStore((s) => s.setCalendarEvents);
  const calendarEnabled = useCalendarStore((s) => s.calendarEnabled);
  const { events, hasPermission, loading, requestPermission, fetchEvents } = useCalendar();

  const todayBlocks = timeBlocks.filter((b) => areSameDay(b.startTime, selectedDate));
  const totalMinutes = todayBlocks.reduce((sum, b) => {
    const dur = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000;
    return sum + dur;
  }, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);

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
          <View style={styles.statsContainer}>
            {todayBlocks.length > 0 ? (
              <View style={styles.statsBubble}>
                <Text style={styles.statNumber}>{todayBlocks.length}</Text>
                <Text style={styles.statUnit}>
                  block{todayBlocks.length !== 1 ? 's' : ''}
                </Text>
                <View style={styles.statDivider} />
                <Text style={styles.statDuration}>
                  {hours > 0 ? `${hours}h ` : ''}{mins > 0 ? `${mins}m` : hours > 0 ? '' : '0m'}
                </Text>
              </View>
            ) : (
              <View style={styles.statsEmpty}>
                <Text style={styles.statEmoji}>{'\u{1F331}'}</Text>
                <Text style={styles.statEmptyLabel}>No plans</Text>
              </View>
            )}
          </View>
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
  statsContainer: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  statsBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    opacity: 0.8,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.primary + '30',
    marginHorizontal: 4,
  },
  statDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    opacity: 0.9,
  },
  statsEmpty: {
    alignItems: 'center',
    gap: 2,
  },
  statEmoji: {
    fontSize: 22,
  },
  statEmptyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
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
