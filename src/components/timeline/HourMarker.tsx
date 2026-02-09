import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

interface HourMarkerProps {
  hour: number;
  isEven: boolean;
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 12) {
    return hour === 0 ? '12 AM' : '12 PM';
  }
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function HourMarker({ hour, isEven }: HourMarkerProps) {
  const colors = useTheme();
  const styles = useStyles(colors);
  const label = formatHourLabel(hour);

  return (
    <View style={[styles.container, isEven ? styles.containerEven : styles.containerOdd]}>
      <Text
        style={styles.label}
        accessibilityLabel={label}
      >
        {label}
      </Text>
      <View style={styles.lineContainer} importantForAccessibility="no-hide-descendants">
        <View style={[styles.line, isEven ? styles.lineEven : styles.lineOdd]} />
      </View>
    </View>
  );
}

export default React.memo(HourMarker);

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      height: Dimensions.timelineHourHeight,
    },
    containerEven: {
      backgroundColor: colors.surfaceTertiary,
    },
    containerOdd: {
      backgroundColor: colors.surface,
    },
    label: {
      width: Dimensions.timelineLeftGutter,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textTertiary,
      textAlign: 'right',
      paddingRight: 12,
      lineHeight: 14,
      letterSpacing: 0.3,
    },
    lineContainer: {
      flex: 1,
      paddingTop: 6,
    },
    line: {
      height: StyleSheet.hairlineWidth,
    },
    lineEven: {
      backgroundColor: colors.timelineHourLine,
    },
    lineOdd: {
      backgroundColor: colors.border,
    },
  }), [colors]);
}
