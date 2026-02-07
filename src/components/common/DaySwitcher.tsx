import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { addDays, parseISO, format } from 'date-fns';
import { Colors, Dimensions } from '../../constants';
import { useTaskStore } from '../../store';
import { todayISO } from '../../utils';

export default function DaySwitcher() {
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setSelectedDate = useTaskStore((s) => s.setSelectedDate);
  const today = todayISO();

  const displayDate = format(
    parseISO(selectedDate),
    'EEEE, MMM d',
  );

  const isToday = selectedDate === today;

  const goToPrevDay = useCallback(() => {
    const prev = format(addDays(parseISO(selectedDate), -1), 'yyyy-MM-dd');
    setSelectedDate(prev);
  }, [selectedDate, setSelectedDate]);

  const goToNextDay = useCallback(() => {
    const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(next);
  }, [selectedDate, setSelectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(today);
  }, [today, setSelectedDate]);

  // Horizontal swipe gesture for day switching
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((event) => {
      if (event.translationX < -50) {
        // Swiped left -> next day
        const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
        setSelectedDate(next);
      } else if (event.translationX > 50) {
        // Swiped right -> prev day
        const prev = format(addDays(parseISO(selectedDate), -1), 'yyyy-MM-dd');
        setSelectedDate(prev);
      }
    })
    .runOnJS(true);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View
        style={styles.container}
        accessibilityHint="Swipe left or right to change day"
      >
        <View style={styles.row}>
          <Pressable
            onPress={goToPrevDay}
            style={styles.arrowButton}
            accessibilityLabel="Previous day"
            accessibilityRole="button"
          >
            <Text style={styles.arrowText}>{'<'}</Text>
          </Pressable>

          <Pressable
            onPress={goToToday}
            style={styles.dateButton}
            accessibilityLabel={`Selected date: ${displayDate}. Tap to go to today.`}
            accessibilityRole="button"
          >
            <Text style={styles.dateText}>{displayDate}</Text>
            {isToday && <Text style={styles.todayBadge}>Today</Text>}
          </Pressable>

          <Pressable
            onPress={goToNextDay}
            style={styles.arrowButton}
            accessibilityLabel="Next day"
            accessibilityRole="button"
          >
            <Text style={styles.arrowText}>{'>'}</Text>
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Dimensions.screenPadding,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Dimensions.radiusSmall,
  },
  arrowText: {
    fontSize: Dimensions.fontXL,
    fontWeight: '600',
    color: Colors.primary,
  },
  dateButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: Dimensions.fontLG,
    fontWeight: '600',
    color: Colors.text,
  },
  todayBadge: {
    fontSize: Dimensions.fontXS,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
});
