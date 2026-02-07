import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Dimensions } from '../constants';
import { useTaskStore } from '../store';

export default function DayTimelineScreen() {
  const selectedDate = useTaskStore((s) => s.selectedDate);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Day Timeline</Text>
        <Text style={styles.date}>{selectedDate}</Text>
      </View>
      <ScrollView style={styles.timeline} contentContainerStyle={styles.timelineContent}>
        {Array.from({ length: Dimensions.timelineEndHour - Dimensions.timelineStartHour }, (_, i) => {
          const hour = Dimensions.timelineStartHour + i;
          const label = hour.toString().padStart(2, '0') + ':00';
          return (
            <View key={hour} style={styles.hourRow}>
              <Text style={styles.hourLabel}>{label}</Text>
              <View style={styles.hourLine} />
            </View>
          );
        })}
      </ScrollView>
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
  date: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: 40,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: Dimensions.timelineHourHeight,
  },
  hourLabel: {
    width: Dimensions.timelineLeftGutter,
    fontSize: Dimensions.fontSM,
    color: Colors.textTertiary,
    textAlign: 'right',
    paddingRight: 8,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 6,
  },
});
