import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';
import type { Subtask } from '../../types';

const DELETE_THRESHOLD = -70;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

interface SubtaskRowProps {
  subtask: Subtask;
  onToggle: (subtaskId: string) => void;
  onRemove: (subtaskId: string) => void;
}

export default function SubtaskRow({ subtask, onToggle, onRemove }: SubtaskRowProps) {
  const colors = useTheme();
  const styles = useStyles(colors);

  const translateX = useSharedValue(0);

  const doRemove = useCallback(() => {
    onRemove(subtask.id);
  }, [onRemove, subtask.id]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-8, 8])
    .onUpdate((e) => {
      'worklet';
      if (e.translationX < 0) {
        translateX.value = e.translationX;
      }
    })
    .onEnd(() => {
      'worklet';
      if (translateX.value < DELETE_THRESHOLD) {
        translateX.value = withTiming(-300, { duration: 200 });
        runOnJS(triggerHaptic)();
        runOnJS(doRemove)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteRevealStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, DELETE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.deleteReveal, deleteRevealStyle]}>
        <Text style={styles.deleteRevealText}>{'\u2715'} Remove</Text>
      </Animated.View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.row, rowAnimatedStyle]}>
          <Pressable
            onPress={() => onToggle(subtask.id)}
            style={styles.checkboxHitArea}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: subtask.completed }}
            accessibilityLabel={`${subtask.title}, ${subtask.completed ? 'completed' : 'not completed'}`}
          >
            <View
              style={[
                styles.checkbox,
                subtask.completed && styles.checkboxChecked,
              ]}
            >
              {subtask.completed && (
                <Text style={styles.checkmark}>{'\u2713'}</Text>
              )}
            </View>
          </Pressable>

          <Text
            style={[styles.title, subtask.completed && styles.titleCompleted]}
            numberOfLines={2}
          >
            {subtask.title}
          </Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    swipeContainer: {
      overflow: 'hidden',
      borderRadius: 8,
      marginVertical: 2,
    },
    deleteReveal: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.errorLight,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 14,
      borderRadius: 8,
    },
    deleteRevealText: {
      fontSize: Dimensions.fontXS,
      fontWeight: '700',
      color: colors.error,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      backgroundColor: colors.background,
      borderRadius: 8,
    },
    checkboxHitArea: {
      minWidth: 38,
      minHeight: 38,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 14,
    },
    title: {
      flex: 1,
      fontSize: Dimensions.fontMD,
      fontWeight: '500',
      color: colors.text,
      marginLeft: 6,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
  }), [colors]);
}
