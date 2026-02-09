import React, { useMemo } from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { Dimensions } from '../constants';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../constants/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export default function Card({ children, style, ...props }: CardProps) {
  const colors = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

function useStyles(colors: ThemeColors) {
  return useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: Dimensions.radiusMedium,
      padding: Dimensions.cardPadding,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
  }), [colors]);
}
