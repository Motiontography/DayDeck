import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';

interface CurrentTimeIndicatorProps {
  startHour: number;
}

export default function CurrentTimeIndicator({ startHour }: CurrentTimeIndicatorProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutesFromStart = (hours - startHour) * 60 + minutes;
  const topOffset = (totalMinutesFromStart / 60) * Dimensions.timelineHourHeight;

  return (
    <View
      style={[styles.container, { top: topOffset }]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.dot} />
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Dimensions.timelineLeftGutter - 4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.error,
  },
});
