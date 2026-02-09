import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import type { TimeBlock, TimeBlockType } from '../../types';

const HOUR_HEIGHT = Dimensions.timelineHourHeight;
const SNAP_MINUTES = 15;
const SNAP_PX = (SNAP_MINUTES / 60) * HOUR_HEIGHT; // 15px per 15-min snap
const MIN_DURATION_MINUTES = 15;
const MIN_HEIGHT = (MIN_DURATION_MINUTES / 60) * HOUR_HEIGHT;
const RESIZE_HANDLE_HEIGHT = 14;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

const TYPE_ICONS: Record<TimeBlockType, string> = {
  task: '\u2611',
  focus: '\u26A1',
  event: '\u{1F4C5}',
  break: '\u2615',
};

interface DraggableTimeBlockProps {
  block: TimeBlock;
  topOffset: number;
  height: number;
  timelineHeight?: number;
  hasConflict?: boolean;
  onMoveEnd: (blockId: string, newTopOffset: number) => void;
  onResizeEnd: (blockId: string, newHeight: number) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onPress?: (block: TimeBlock) => void;
}

function snapToGrid(value: number): number {
  'worklet';
  return Math.round(value / SNAP_PX) * SNAP_PX;
}

function clampTop(top: number, blockHeight: number, totalHeight: number): number {
  'worklet';
  return Math.max(0, Math.min(top, totalHeight - blockHeight));
}

function clampHeight(h: number, currentTop: number, totalHeight: number): number {
  'worklet';
  const maxH = totalHeight - currentTop;
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
  return `${fmt(start)} \u2013 ${fmt(end)}`;
}

function getDurationLabel(startTime: string, endTime: string): string {
  const dur = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000;
  if (dur < 60) return `${Math.round(dur)}m`;
  const h = Math.floor(dur / 60);
  const m = Math.round(dur % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function DraggableTimeBlock({
  block,
  topOffset,
  height,
  hasConflict: blockHasConflict = false,
  timelineHeight: totalHeight = 16 * HOUR_HEIGHT,
  onMoveEnd,
  onResizeEnd,
  onDragStateChange,
  onMoveUp,
  onMoveDown,
  onPress,
}: DraggableTimeBlockProps) {
  const colors = useTheme();
  const styles = useStyles(colors);
  const blockColor = block.color || colors.timeBlockTask;
  const minDisplayHeight = 52;
  const displayHeight = Math.max(height, minDisplayHeight);
  const isCompact = height < 52;
  const isTall = height >= 80;
  const [isFocused, setIsFocused] = useState(false);
  const typeIcon = TYPE_ICONS[block.type] || '\u2611';

  // Shared values for drag (move) gesture
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragScale = useSharedValue(1);

  // Shared values for resize gesture
  const resizeDelta = useSharedValue(0);
  const isResizing = useSharedValue(false);

  // Track if a drag actually happened (to distinguish tap from drag)
  const didDrag = useSharedValue(false);

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
      const clamped = clampTop(newTop, displayHeight, totalHeight);
      onMoveEnd(block.id, clamped);
    },
    [block.id, topOffset, displayHeight, totalHeight, onMoveEnd],
  );

  const commitResize = useCallback(
    (delta: number) => {
      const newHeight = snapToGrid(displayHeight + delta);
      const clamped = clampHeight(newHeight, topOffset, totalHeight);
      onResizeEnd(block.id, clamped);
    },
    [block.id, displayHeight, topOffset, totalHeight, onResizeEnd],
  );

  const handleTap = useCallback(() => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(block);
    }
  }, [onPress, block]);

  // Drag gesture: long-press to activate, then pan to move
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      didDrag.value = true;
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

  // Tap gesture for opening edit sheet
  const tapGesture = Gesture.Tap()
    .onStart(() => {
      'worklet';
      didDrag.value = false;
    })
    .onEnd(() => {
      'worklet';
      if (!didDrag.value) {
        runOnJS(handleTap)();
      }
    });

  // Compose gestures: tap is simultaneous, drag is exclusive
  const composedGesture = Gesture.Simultaneous(tapGesture, dragGesture);

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
      shadowOpacity: isDragging.value ? 0.25 : 0.1,
      elevation: isDragging.value ? 8 : 3,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            top: topOffset,
            height: displayHeight,
            backgroundColor: blockColor + '28',
            borderLeftColor: blockColor,
          },
          blockHasConflict && styles.conflictBorder,
          animatedBlockStyle,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${block.title}, ${formatTimeRange(block.startTime, block.endTime)}${blockHasConflict ? ', conflicts with a calendar event' : ''}. Tap to edit. Long press to drag, drag bottom edge to resize.`}
        onAccessibilityEscape={() => setIsFocused(false)}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') {
            setIsFocused((prev) => !prev);
          }
        }}
        accessibilityActions={[{ name: 'activate', label: 'Toggle move controls' }]}
      >
        {/* Colored accent bar at top */}
        <View style={[styles.accentBar, { backgroundColor: blockColor }]} />

        <View style={styles.contentRow}>
          <View style={[styles.iconBubble, { backgroundColor: blockColor + '30' }]}>
            <Text style={styles.typeIconText}>{typeIcon}</Text>
          </View>
          <View style={styles.textContent}>
            <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={1}>
              {block.title}
            </Text>
            {!isCompact && (
              <View style={styles.timeRow}>
                <Text style={[styles.time, { color: blockColor }]} numberOfLines={1}>
                  {formatTimeRange(block.startTime, block.endTime)}
                </Text>
                {isTall && (
                  <View style={[styles.durationPill, { backgroundColor: blockColor + '20' }]}>
                    <Text style={[styles.durationText, { color: blockColor }]}>
                      {getDurationLabel(block.startTime, block.endTime)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

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

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      left: Dimensions.timelineLeftGutter + 4,
      right: Dimensions.screenPadding,
      borderLeftWidth: 5,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: RESIZE_HANDLE_HEIGHT + 2,
      justifyContent: 'flex-start',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      overflow: 'hidden',
    },
    accentBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      opacity: 0.6,
    },
    conflictBorder: {
      borderWidth: 1.5,
      borderColor: colors.warning,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    iconBubble: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    typeIconText: {
      fontSize: 14,
    },
    textContent: {
      flex: 1,
    },
    title: {
      fontSize: Dimensions.fontMD,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.2,
    },
    titleCompact: {
      fontSize: Dimensions.fontSM,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 3,
    },
    time: {
      fontSize: Dimensions.fontXS,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    durationPill: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
    },
    durationText: {
      fontSize: 10,
      fontWeight: '700',
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
      width: 30,
      height: 3.5,
      borderRadius: 2,
      opacity: 0.45,
    },
    moveButtonRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    moveButton: {
      backgroundColor: colors.surfaceSecondary,
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
      color: colors.primary,
    },
  }), [colors]);
}
