import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import type { Priority } from '../../types';

interface PriorityBadgeProps {
  priority: Priority;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colors = useTheme();
  const styles = useStyles(colors);

  const priorityConfig: Record<
    Priority,
    { color: string; textColor: string; label: string; icon: string }
  > = useMemo(
    () => ({
      low: {
        color: colors.priorityLow,
        textColor: '#FFFFFF',
        label: 'Low priority',
        icon: '\u2193', // downward arrow
      },
      medium: {
        color: colors.priorityMedium,
        textColor: '#78350F',
        label: 'Medium priority',
        icon: '\u2192', // rightward arrow
      },
      high: {
        color: colors.priorityHigh,
        textColor: '#FFFFFF',
        label: 'High priority',
        icon: '\u2191', // upward arrow
      },
      urgent: {
        color: colors.priorityUrgent,
        textColor: '#FFFFFF',
        label: 'Urgent priority',
        icon: '\u21C8', // double upward arrow
      },
    }),
    [colors],
  );

  const config = priorityConfig[priority];

  return (
    <View
      style={[styles.badge, { backgroundColor: config.color }]}
      accessibilityLabel={config.label}
      accessibilityRole="text"
    >
      <Text style={[styles.icon, { color: config.textColor }]}>
        {config.icon}
      </Text>
      <Text style={[styles.label, { color: config.textColor }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Dimensions.radiusSmall,
      alignSelf: 'flex-start',
      gap: 3,
    },
    icon: {
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 13,
    },
    label: {
      fontSize: Dimensions.fontXS,
      fontWeight: '700',
    },
  }), [colors]);
}
