import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';

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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: Dimensions.timelineHourHeight,
  },
  containerEven: {
    backgroundColor: '#F5F7FB',
  },
  containerOdd: {
    backgroundColor: '#FFFFFF',
  },
  label: {
    width: Dimensions.timelineLeftGutter,
    fontSize: 11,
    fontWeight: '700',
    color: '#8B95A9',
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
    backgroundColor: '#D8E0EC',
  },
  lineOdd: {
    backgroundColor: '#E8EDF4',
  },
});
