import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';

interface CarriedOverBadgeProps {
  fromDate: string; // original scheduled date (YYYY-MM-DD)
}

export default function CarriedOverBadge({ fromDate }: CarriedOverBadgeProps) {
  return (
    <View
      style={styles.badge}
      accessibilityLabel={`Carried over from ${fromDate}`}
      accessibilityRole="text"
    >
      <Text style={styles.label}>Carried over</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.warning + '20', // 12% opacity
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Dimensions.radiusSmall,
    borderWidth: 1,
    borderColor: Colors.warning + '40', // 25% opacity
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: Dimensions.fontXS,
    fontWeight: '600',
    color: Colors.warning,
  },
});
