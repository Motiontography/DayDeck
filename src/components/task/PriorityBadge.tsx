import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import type { Priority } from '../../types';

interface PriorityBadgeProps {
  priority: Priority;
}

const PRIORITY_CONFIG: Record<Priority, { color: string; textColor: string; label: string }> = {
  low: { color: Colors.priorityLow, textColor: '#FFFFFF', label: 'Low priority' },
  medium: { color: Colors.priorityMedium, textColor: '#78350F', label: 'Medium priority' },
  high: { color: Colors.priorityHigh, textColor: '#FFFFFF', label: 'High priority' },
  urgent: { color: Colors.priorityUrgent, textColor: '#FFFFFF', label: 'Urgent priority' },
};

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <View
      style={[styles.badge, { backgroundColor: config.color }]}
      accessibilityLabel={config.label}
      accessibilityRole="text"
    >
      <Text style={[styles.label, { color: config.textColor }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Dimensions.radiusSmall,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: Dimensions.fontXS,
    fontWeight: '600',
  },
});
