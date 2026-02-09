import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { addDays, parseISO, format } from 'date-fns';
import { Dimensions } from '../../constants';
import { useTaskStore } from '../../store';
import { todayISO } from '../../utils';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

export default function DaySwitcher() {
  const colors = useTheme();
  const styles = useStyles(colors);
  const selectedDate = useTaskStore((s) => s.selectedDate);
  const setSelectedDate = useTaskStore((s) => s.setSelectedDate);
  const today = todayISO();

  const dayOfWeek = format(parseISO(selectedDate), 'EEEE');
  const dateStr = format(parseISO(selectedDate), 'MMM d');

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
        const next = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
        setSelectedDate(next);
      } else if (event.translationX > 50) {
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
            style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
            accessibilityLabel="Previous day"
            accessibilityRole="button"
          >
            <Text style={styles.arrowText}>{'\u2039'}</Text>
          </Pressable>

          <Pressable
            onPress={goToToday}
            style={styles.dateButton}
            accessibilityLabel={`Selected date: ${dayOfWeek}, ${dateStr}. Tap to go to today.`}
            accessibilityRole="button"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.dayOfWeek}>{dayOfWeek}</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{dateStr}</Text>
              {isToday && (
                <View style={styles.todayPill}>
                  <Text style={styles.todayText}>Today</Text>
                </View>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={goToNextDay}
            style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
            accessibilityLabel="Next day"
            accessibilityRole="button"
          >
            <Text style={styles.arrowText}>{'\u203A'}</Text>
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    container: {
      paddingHorizontal: Dimensions.screenPadding,
      paddingVertical: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Dimensions.radiusMedium,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    arrowButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
    arrowPressed: {
      backgroundColor: colors.surfaceTertiary,
    },
    arrowText: {
      fontSize: 28,
      fontWeight: '300',
      color: colors.primary,
      lineHeight: 32,
    },
    dateButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    dayOfWeek: {
      fontSize: Dimensions.fontXS,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateText: {
      fontSize: Dimensions.fontXL,
      fontWeight: '700',
      color: colors.text,
    },
    todayPill: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    todayText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
  }), [colors]);
}
