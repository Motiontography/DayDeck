import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Dimensions } from '../../constants';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../constants/colors';

interface QuickAddButtonProps {
  onPress: () => void;
}

export default function QuickAddButton({ onPress }: QuickAddButtonProps) {
  const colors = useTheme();
  const styles = useStyles(colors);

  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add new time block"
    >
      <Text style={styles.icon}>+</Text>
    </Pressable>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: 24,
      right: Dimensions.screenPadding,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    fabPressed: {
      backgroundColor: colors.primaryDark,
      transform: [{ scale: 0.93 }],
    },
    icon: {
      fontSize: 32,
      color: '#FFFFFF',
      fontWeight: '300',
      lineHeight: 34,
    },
  }), [colors]);
}
