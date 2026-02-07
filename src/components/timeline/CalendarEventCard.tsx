import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import type { CalendarEvent } from '../../types';

interface CalendarEventCardProps {
  event: CalendarEvent;
  topOffset: number;
  height: number;
  hasConflict: boolean;
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
  return `${fmt(start)} - ${fmt(end)}`;
}

function CalendarEventCard({ event, topOffset, height, hasConflict }: CalendarEventCardProps) {
  const eventColor = event.color || '#8B5CF6';
  const minHeight = 24;
  const displayHeight = Math.max(height, minHeight);
  const isCompact = height < 36;

  return (
    <View
      style={[
        styles.container,
        {
          top: topOffset,
          height: displayHeight,
          borderLeftColor: eventColor,
          backgroundColor: eventColor + '12', // 7% opacity, lighter than task blocks
        },
        hasConflict && styles.conflictBorder,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Calendar event: ${event.title}, ${formatTimeRange(event.startTime, event.endTime)}${hasConflict ? ', conflicts with a scheduled block' : ''}`}
    >
      <View style={styles.contentRow}>
        <View style={[styles.calendarDot, { backgroundColor: eventColor }]} />
        <Text
          style={[styles.title, isCompact && styles.titleCompact]}
          numberOfLines={1}
        >
          {event.title}
        </Text>
        {hasConflict && (
          <View style={styles.conflictBadge}>
            <Text style={styles.conflictBadgeText}>!</Text>
          </View>
        )}
      </View>
      {!isCompact && (
        <Text style={styles.time} numberOfLines={1}>
          {formatTimeRange(event.startTime, event.endTime)}
        </Text>
      )}
    </View>
  );
}

export default React.memo(CalendarEventCard);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Dimensions.timelineLeftGutter + 4,
    right: Dimensions.screenPadding,
    borderLeftWidth: 3,
    borderRadius: Dimensions.radiusSmall,
    paddingHorizontal: 8,
    paddingVertical: 3,
    justifyContent: 'center',
    borderStyle: 'solid',
  },
  conflictBorder: {
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    flex: 1,
    fontSize: Dimensions.fontSM,
    fontWeight: '500',
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  titleCompact: {
    fontSize: Dimensions.fontXS,
  },
  time: {
    fontSize: Dimensions.fontXS,
    color: Colors.textTertiary,
    marginTop: 1,
    marginLeft: 12,
  },
  conflictBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conflictBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
});
