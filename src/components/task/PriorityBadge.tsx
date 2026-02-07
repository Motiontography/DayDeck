import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import type { Priority } from '../../types';

interface PriorityBadgeProps {
  priority: Priority;
}

const PRIORITY_CONFIG: Record<
  Priority,
  { color: string; textColor: string; label: string; icon: string }
> = {
  low: {
    color: Colors.priorityLow,
    textColor: '#FFFFFF',
    label: 'Low priority',
    icon: '\u2193', // downward arrow
  },
  medium: {
    color: Colors.priorityMedium,
    textColor: '#78350F',
    label: 'Medium priority',
    icon: '\u2192', // rightward arrow
  },
  high: {
    color: Colors.priorityHigh,
    textColor: '#FFFFFF',
    label: 'High priority',
    icon: '\u2191', // upward arrow
  },
  urgent: {
    color: Colors.priorityUrgent,
    textColor: '#FFFFFF',
    label: 'Urgent priority',
    icon: '\u21C8', // double upward arrow
  },
};

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

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

const styles = StyleSheet.create({
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
});
