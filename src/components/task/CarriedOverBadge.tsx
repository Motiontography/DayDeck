import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

interface CarriedOverBadgeProps {
  fromDate: string; // original scheduled date (YYYY-MM-DD)
}

export default function CarriedOverBadge({ fromDate }: CarriedOverBadgeProps) {
  const colors = useTheme();
  const styles = useStyles(colors);

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

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    badge: {
      backgroundColor: colors.warning + '20', // 12% opacity
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Dimensions.radiusSmall,
      borderWidth: 1,
      borderColor: colors.warning + '40', // 25% opacity
      alignSelf: 'flex-start',
    },
    label: {
      fontSize: Dimensions.fontXS,
      fontWeight: '600',
      color: '#92400E', // amber-800 for WCAG AA contrast on light background
    },
  }), [colors]);
}
