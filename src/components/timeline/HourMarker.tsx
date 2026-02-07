import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';

interface HourMarkerProps {
  hour: number;
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 12) {
    return hour === 0 ? '12 AM' : '12 PM';
  }
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function HourMarker({ hour }: HourMarkerProps) {
  const label = formatHourLabel(hour);

  return (
    <View style={styles.container}>
      <Text
        style={styles.label}
        accessibilityLabel={label}
      >
        {label}
      </Text>
      <View style={styles.line} importantForAccessibility="no-hide-descendants" />
    </View>
  );
}

export default React.memo(HourMarker);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: Dimensions.timelineHourHeight,
  },
  label: {
    width: Dimensions.timelineLeftGutter,
    fontSize: Dimensions.fontXS,
    color: Colors.textTertiary,
    textAlign: 'right',
    paddingRight: 8,
    lineHeight: 14,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginTop: 6,
  },
});
