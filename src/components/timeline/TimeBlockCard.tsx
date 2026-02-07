import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import type { TimeBlock } from '../../types';

interface TimeBlockCardProps {
  block: TimeBlock;
  topOffset: number;
  height: number;
  onPress?: (block: TimeBlock) => void;
}

function formatTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const fmt = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
  };
  return `${fmt(start)} to ${fmt(end)}`;
}

function TimeBlockCard({ block, topOffset, height, onPress }: TimeBlockCardProps) {
  const blockColor = block.color || Colors.timeBlockTask;
  const minHeight = 28;
  const displayHeight = Math.max(height, minHeight);
  const isCompact = height < 40;

  return (
    <Pressable
      style={[
        styles.container,
        {
          top: topOffset,
          height: displayHeight,
          backgroundColor: blockColor + '1A', // 10% opacity
          borderLeftColor: blockColor,
        },
      ]}
      onPress={() => onPress?.(block)}
      accessibilityRole="button"
      accessibilityLabel={`${block.title}, ${formatTimeRange(block.startTime, block.endTime)}`}
    >
      <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={1}>
        {block.title}
      </Text>
      {!isCompact && (
        <Text style={styles.time} numberOfLines={1}>
          {formatTimeRange(block.startTime, block.endTime)}
        </Text>
      )}
    </Pressable>
  );
}

export default React.memo(TimeBlockCard);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Dimensions.timelineLeftGutter + 4,
    right: Dimensions.screenPadding,
    borderLeftWidth: 3,
    borderRadius: Dimensions.radiusSmall,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  title: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.text,
  },
  titleCompact: {
    fontSize: Dimensions.fontXS,
  },
  time: {
    fontSize: Dimensions.fontXS,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
