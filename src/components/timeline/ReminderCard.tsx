import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import type { DeviceReminder } from '../../types';

interface ReminderCardProps {
  reminder: DeviceReminder;
  topOffset: number;
  height: number;
  onPress?: (reminder: DeviceReminder) => void;
}

function formatTime(isoDate: string): string {
  const d = new Date(isoDate);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function ReminderCard({ reminder, topOffset, height, onPress }: ReminderCardProps) {
  const colors = useTheme();
  const styles = useStyles(colors);
  const reminderColor = reminder.color || '#FB923C';
  const minHeight = 24;
  const displayHeight = Math.max(height, minHeight);
  const isCompact = height < 36;
  const timeStr = reminder.dueDate
    ? formatTime(reminder.dueDate)
    : reminder.startDate
      ? formatTime(reminder.startDate)
      : '';

  const handlePress = () => {
    if (onPress) {
      onPress(reminder);
    } else if (Platform.OS === 'ios') {
      Linking.openURL('x-apple-reminderkit://');
    }
  };

  return (
    <Pressable
      style={[
        styles.container,
        {
          top: topOffset,
          height: displayHeight,
          borderLeftColor: reminderColor,
          backgroundColor: reminderColor + '12',
        },
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Reminder: ${reminder.title}${timeStr ? `, ${timeStr}` : ''}${reminder.completed ? ', completed' : ''}`}
    >
      <View style={styles.contentRow}>
        <Text style={styles.checkIcon}>
          {reminder.completed ? '\u2611' : '\u2610'}
        </Text>
        <Text
          style={[
            styles.title,
            isCompact && styles.titleCompact,
            reminder.completed && styles.titleCompleted,
          ]}
          numberOfLines={1}
        >
          {reminder.title}
        </Text>
      </View>
      {!isCompact && timeStr !== '' && (
        <Text style={styles.time} numberOfLines={1}>
          {timeStr}
        </Text>
      )}
    </Pressable>
  );
}

export default React.memo(ReminderCard);

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      left: Dimensions.timelineLeftGutter + 4,
      right: Dimensions.screenPadding,
      borderLeftWidth: 3,
      borderRadius: Dimensions.radiusSmall,
      paddingHorizontal: 8,
      paddingVertical: 3,
      justifyContent: 'center',
      borderStyle: 'dashed',
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    checkIcon: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    title: {
      flex: 1,
      fontSize: Dimensions.fontSM,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    titleCompact: {
      fontSize: Dimensions.fontXS,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    time: {
      fontSize: Dimensions.fontXS,
      color: colors.textTertiary,
      marginTop: 1,
      marginLeft: 19,
    },
  }), [colors]);
}
