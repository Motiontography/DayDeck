import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Dimensions } from '../constants';
import { useTaskStore } from '../store';
import { TimelineView } from '../components/timeline';

export default function DayTimelineScreen() {
  const selectedDate = useTaskStore((s) => s.selectedDate);

  // Format date for display: "Thursday, Feb 6"
  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.date}>{displayDate}</Text>
      </View>
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
});
