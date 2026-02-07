import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Dimensions } from '../../constants';
import type { Subtask } from '../../types';

interface SubtaskRowProps {
  subtask: Subtask;
  onToggle: (subtaskId: string) => void;
  onRemove: (subtaskId: string) => void;
}

export default function SubtaskRow({ subtask, onToggle, onRemove }: SubtaskRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onToggle(subtask.id)}
        style={styles.checkboxHitArea}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: subtask.completed }}
        accessibilityLabel={`${subtask.title}, ${subtask.completed ? 'completed' : 'not completed'}`}
      >
        <View style={[styles.checkbox, subtask.completed && styles.checkboxChecked]}>
          {subtask.completed && <Text style={styles.checkmark}>{'✓'}</Text>}
        </View>
      </Pressable>

      <Text style={[styles.title, subtask.completed && styles.titleCompleted]} numberOfLines={1}>
        {subtask.title}
      </Text>

      <Pressable
        onPress={() => onRemove(subtask.id)}
        style={styles.removeButton}
        accessibilityLabel={`Remove subtask: ${subtask.title}`}
        accessibilityRole="button"
      >
        <Text style={styles.removeText}>{'×'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  checkboxHitArea: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
    color: Colors.text,
    marginLeft: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  removeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    fontSize: 20,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
});
