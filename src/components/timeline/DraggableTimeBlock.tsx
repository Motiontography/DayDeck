import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Dimensions, Defaults } from '../../constants';
import type { TimeBlock } from '../../types';

const HOUR_HEIGHT = Dimensions.timelineHourHeight;
const SNAP_MINUTES = 15;
const SNAP_PX = (SNAP_MINUTES / 60) * HOUR_HEIGHT; // 15px per 15-min snap
const MIN_DURATION_MINUTES = 15;
const MIN_HEIGHT = (MIN_DURATION_MINUTES / 60) * HOUR_HEIGHT;
const START_HOUR = Defaults.dayStartHour;
const END_HOUR = Defaults.dayEndHour;
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const RESIZE_HANDLE_HEIGHT = 12;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

interface DraggableTimeBlockProps {
  block: TimeBlock;
  topOffset: number;
  height: number;
  hasConflict?: boolean;
  onMoveEnd: (blockId: string, newTopOffset: number) => void;
  onResizeEnd: (blockId: string, newHeight: number) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
}

function snapToGrid(value: number): number {
  'worklet';
  return Math.round(value / SNAP_PX) * SNAP_PX;
}

function clampTop(top: number, blockHeight: number): number {
  'worklet';
  return Math.max(0, Math.min(top, TOTAL_HEIGHT - blockHeight));
}

function clampHeight(h: number, currentTop: number): number {
  'worklet';
  const maxH = TOTAL_HEIGHT - currentTop;
  return Math.max(MIN_HEIGHT, Math.min(h, maxH));
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

function DraggableTimeBlock({
  block,
  topOffset,
  height,
  hasConflict: blockHasConflict = false,
  onMoveEnd,
  onResizeEnd,
  onDragStateChange,
  onMoveUp,
  onMoveDown,
}: DraggableTimeBlockProps) {
  const blockColor = block.color || Colors.timeBlockTask;
  const minDisplayHeight = 28;
  const displayHeight = Math.max(height, minDisplayHeight);
  const isCompact = height < 40;
  const [isFocused, setIsFocused] = useState(false);

  // Shared values for drag (move) gesture
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragScale = useSharedValue(1);

  // Shared values for resize gesture
  const resizeDelta = useSharedValue(0);
  const isResizing = useSharedValue(false);

  const triggerHapticStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const triggerHapticSnap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const notifyDragStart = useCallback(() => {
    onDragStateChange(true);
  }, [onDragStateChange]);

  const notifyDragEnd = useCallback(() => {
    onDragStateChange(false);
  }, [onDragStateChange]);

  const commitMove = useCallback(
    (finalTranslateY: number) => {
      const newTop = snapToGrid(topOffset + finalTranslateY);
      const clamped = clampTop(newTop, displayHeight);
      onMoveEnd(block.id, clamped);
    },
    [block.id, topOffset, displayHeight, onMoveEnd],
  );

  const commitResize = useCallback(
    (delta: number) => {
      const newHeight = snapToGrid(displayHeight + delta);
      const clamped = clampHeight(newHeight, topOffset);
      onResizeEnd(block.id, clamped);
    },
    [block.id, displayHeight, topOffset, onResizeEnd],
  );

  // Drag gesture: long-press to activate, then pan to move
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      dragScale.value = withSpring(1.03, SPRING_CONFIG);
      runOnJS(triggerHapticStart)();
      runOnJS(notifyDragStart)();
    })
    .onUpdate((e) => {
      'worklet';
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      const snapped = snapToGrid(topOffset + translateY.value) - topOffset;
      translateY.value = withSpring(snapped, SPRING_CONFIG);
      runOnJS(triggerHapticSnap)();
      runOnJS(commitMove)(translateY.value);
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      dragScale.value = withSpring(1, SPRING_CONFIG);
      translateY.value = withSpring(0, SPRING_CONFIG);
      runOnJS(notifyDragEnd)();
    });

  // Resize gesture on the bottom handle
  const resizeGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      isResizing.value = true;
      runOnJS(triggerHapticStart)();
      runOnJS(notifyDragStart)();
    })
    .onUpdate((e) => {
      'worklet';
      resizeDelta.value = e.translationY;
    })
    .onEnd(() => {
      'worklet';
      runOnJS(triggerHapticSnap)();
      runOnJS(commitResize)(resizeDelta.value);
    })
    .onFinalize(() => {
      'worklet';
      isResizing.value = false;
      resizeDelta.value = withSpring(0, SPRING_CONFIG);
      runOnJS(notifyDragEnd)();
    });

  // Animated style for the entire block (drag + resize combined)
  const animatedBlockStyle = useAnimatedStyle(() => {
    const currentHeight = displayHeight + resizeDelta.value;
    const clampedHeight = Math.max(MIN_HEIGHT, currentHeight);
    return {
      transform: [
        { translateY: translateY.value },
        { scale: dragScale.value },
      ],
      height: isResizing.value ? clampedHeight : displayHeight,
      zIndex: isDragging.value || isResizing.value ? 100 : 1,
      shadowOpacity: isDragging.value ? 0.3 : 0.08,
      elevation: isDragging.value ? 8 : 2,
    };
  });

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            top: topOffset,
            height: displayHeight,
            backgroundColor: blockColor + '1A',
            borderLeftColor: blockColor,
          },
          blockHasConflict && styles.conflictBorder,
          animatedBlockStyle,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${block.title}, ${formatTimeRange(block.startTime, block.endTime)}${blockHasConflict ? ', conflicts with a calendar event' : ''}. Long press to drag, drag bottom edge to resize.`}
        onAccessibilityEscape={() => setIsFocused(false)}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') {
            setIsFocused((prev) => !prev);
          }
        }}
        accessibilityActions={[{ name: 'activate', label: 'Toggle move controls' }]}
      >
        <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={1}>
          {block.title}
        </Text>
        {!isCompact && (
          <Text style={styles.time} numberOfLines={1}>
            {formatTimeRange(block.startTime, block.endTime)}
          </Text>
        )}

        {/* Accessibility: Move up / Move down buttons (non-gesture alternative) */}
        {isFocused && (onMoveUp || onMoveDown) && (
          <View style={styles.moveButtonRow}>
            {onMoveUp && (
              <Pressable
                style={styles.moveButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onMoveUp(block.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Move ${block.title} up 15 minutes`}
              >
                <Text style={styles.moveButtonText}>Up</Text>
              </Pressable>
            )}
            {onMoveDown && (
              <Pressable
                style={styles.moveButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onMoveDown(block.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Move ${block.title} down 15 minutes`}
              >
                <Text style={styles.moveButtonText}>Down</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Resize handle at the bottom */}
        <GestureDetector gesture={resizeGesture}>
          <Animated.View
            style={styles.resizeHandle}
            hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
          >
            <View style={[styles.resizeBar, { backgroundColor: blockColor }]} />
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(DraggableTimeBlock);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Dimensions.timelineLeftGutter + 4,
    right: Dimensions.screenPadding,
    borderLeftWidth: 3,
    borderRadius: Dimensions.radiusSmall,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: RESIZE_HANDLE_HEIGHT + 2,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  conflictBorder: {
    borderWidth: 1,
    borderColor: Colors.warning,
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
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: RESIZE_HANDLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resizeBar: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
  moveButtonRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  moveButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Dimensions.radiusSmall,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: Dimensions.minTouchTarget,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveButtonText: {
    fontSize: Dimensions.fontXS,
    fontWeight: '600',
    color: Colors.primary,
  },
});
