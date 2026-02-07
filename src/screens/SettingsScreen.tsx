import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Dimensions } from '../constants';
import { useSettingsStore } from '../store';
import type { CarryOverBehavior } from '../store/useSettingsStore';

const CARRY_OVER_OPTIONS: { value: CarryOverBehavior; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'ask', label: 'Ask me' },
  { value: 'never', label: 'Never' },
];

export default function SettingsScreen() {
  const dayStartHour = useSettingsStore((s) => s.dayStartHour);
  const dayEndHour = useSettingsStore((s) => s.dayEndHour);
  const defaultTaskDurationMinutes = useSettingsStore((s) => s.defaultTaskDurationMinutes);
  const quietHoursStart = useSettingsStore((s) => s.quietHoursStart);
  const quietHoursEnd = useSettingsStore((s) => s.quietHoursEnd);
  const carryOverBehavior = useSettingsStore((s) => s.carryOverBehavior);
  const reminderOffsetMinutes = useSettingsStore((s) => s.reminderOffsetMinutes);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  function formatHour(hour: number): string {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:00 ${ampm}`;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Day Schedule */}
        <Text style={styles.sectionTitle}>Day Schedule</Text>

        <SettingRowStepper
          label="Day start time"
          value={formatHour(dayStartHour)}
          onDecrement={() => {
            if (dayStartHour > 0) updateSetting('dayStartHour', dayStartHour - 1);
          }}
          onIncrement={() => {
            if (dayStartHour < dayEndHour - 1) updateSetting('dayStartHour', dayStartHour + 1);
          }}
          accessibilityLabel={`Day start time: ${formatHour(dayStartHour)}`}
        />

        <SettingRowStepper
          label="Day end time"
          value={formatHour(dayEndHour)}
          onDecrement={() => {
            if (dayEndHour > dayStartHour + 1) updateSetting('dayEndHour', dayEndHour - 1);
          }}
          onIncrement={() => {
            if (dayEndHour < 24) updateSetting('dayEndHour', dayEndHour + 1);
          }}
          accessibilityLabel={`Day end time: ${formatHour(dayEndHour)}`}
        />

        {/* Task Defaults */}
        <Text style={styles.sectionTitle}>Task Defaults</Text>

        <SettingRowStepper
          label="Default task duration"
          value={`${defaultTaskDurationMinutes} min`}
          onDecrement={() => {
            if (defaultTaskDurationMinutes > 5)
              updateSetting('defaultTaskDurationMinutes', defaultTaskDurationMinutes - 5);
          }}
          onIncrement={() => {
            if (defaultTaskDurationMinutes < 240)
              updateSetting('defaultTaskDurationMinutes', defaultTaskDurationMinutes + 5);
          }}
          accessibilityLabel={`Default task duration: ${defaultTaskDurationMinutes} minutes`}
        />

        <SettingRowStepper
          label="Reminder offset"
          value={`${reminderOffsetMinutes} min before`}
          onDecrement={() => {
            if (reminderOffsetMinutes > 0)
              updateSetting('reminderOffsetMinutes', reminderOffsetMinutes - 5);
          }}
          onIncrement={() => {
            if (reminderOffsetMinutes < 120)
              updateSetting('reminderOffsetMinutes', reminderOffsetMinutes + 5);
          }}
          accessibilityLabel={`Reminder offset: ${reminderOffsetMinutes} minutes before`}
        />

        {/* Quiet Hours */}
        <Text style={styles.sectionTitle}>Quiet Hours</Text>

        <SettingRowInput
          label="Quiet hours start"
          value={quietHoursStart}
          onChangeText={(val) => updateSetting('quietHoursStart', val)}
          placeholder="HH:mm"
          accessibilityLabel={`Quiet hours start: ${quietHoursStart}`}
        />

        <SettingRowInput
          label="Quiet hours end"
          value={quietHoursEnd}
          onChangeText={(val) => updateSetting('quietHoursEnd', val)}
          placeholder="HH:mm"
          accessibilityLabel={`Quiet hours end: ${quietHoursEnd}`}
        />

        {/* Carry Over */}
        <Text style={styles.sectionTitle}>Carry Over</Text>

        <View style={styles.segmentRow}>
          <Text style={styles.settingLabel}>Unfinished tasks</Text>
          <View style={styles.segmentControl}>
            {CARRY_OVER_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => updateSetting('carryOverBehavior', option.value)}
                style={[
                  styles.segmentButton,
                  carryOverBehavior === option.value && styles.segmentButtonActive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: carryOverBehavior === option.value }}
                accessibilityLabel={`Carry over: ${option.label}`}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    carryOverBehavior === option.value && styles.segmentButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Reusable setting row components ---

function SettingRowStepper({
  label,
  value,
  onDecrement,
  onIncrement,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.settingRow} accessibilityLabel={accessibilityLabel}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={onDecrement}
          style={styles.stepperButton}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={styles.stepperButtonText}>-</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={onIncrement}
          style={styles.stepperButton}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingRowInput({
  label,
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  placeholder: string;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput
        style={styles.settingInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        accessibilityLabel={accessibilityLabel}
        keyboardType="numbers-and-punctuation"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Dimensions.screenPadding,
    paddingVertical: Dimensions.cardPadding,
  },
  title: {
    fontSize: Dimensions.fontTitle,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Dimensions.screenPadding,
  },
  sectionTitle: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Dimensions.radiusMedium,
    padding: Dimensions.cardPadding,
    marginBottom: 4,
    minHeight: 48,
  },
  settingLabel: {
    fontSize: Dimensions.fontMD,
    color: Colors.text,
    flex: 1,
  },
  settingValue: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
  },
  settingInput: {
    fontSize: Dimensions.fontMD,
    color: Colors.text,
    textAlign: 'right',
    minWidth: 80,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Dimensions.radiusSmall,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: Dimensions.fontXL,
    fontWeight: '600',
    color: Colors.primary,
    lineHeight: 22,
  },
  stepperValue: {
    fontSize: Dimensions.fontMD,
    fontWeight: '500',
    color: Colors.text,
    minWidth: 70,
    textAlign: 'center',
  },
  segmentRow: {
    backgroundColor: Colors.surface,
    borderRadius: Dimensions.radiusMedium,
    padding: Dimensions.cardPadding,
    marginBottom: 4,
  },
  segmentControl: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Dimensions.radiusSmall,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentButtonText: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.text,
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
});
