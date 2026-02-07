import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';

interface QuickAddButtonProps {
  onPress: () => void;
}

export default function QuickAddButton({ onPress }: QuickAddButtonProps) {
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

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: Dimensions.screenPadding,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  fabPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
  icon: {
    fontSize: 28,
    color: Colors.surface,
    fontWeight: '300',
    lineHeight: 30,
  },
});
