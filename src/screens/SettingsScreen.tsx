import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dimensions } from '../constants';
import { useSettingsStore } from '../store';
import { useTheme } from '../theme/ThemeContext';
import type { CarryOverBehavior, ThemeSetting } from '../store/useSettingsStore';
import type { ThemeColors } from '../constants/colors';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const THEME_OPTIONS: { value: ThemeSetting; label: string; icon: string; desc: string }[] = [
  { value: 'light', label: 'Light', icon: '\u2600\uFE0F', desc: 'Always light mode' },
  { value: 'dark', label: 'Dark', icon: '\uD83C\uDF19', desc: 'Always dark mode' },
  { value: 'system', label: 'System', icon: '\uD83D\uDCF1', desc: 'Matches your phone' },
];

const CARRY_OVER_OPTIONS: { value: CarryOverBehavior; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Moves tasks automatically' },
  { value: 'ask', label: 'Ask me', desc: 'Prompts you each morning' },
  { value: 'never', label: 'Never', desc: 'Incomplete tasks stay' },
];

const DURATION_PRESETS = [15, 30, 45, 60] as const;

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const colors = useTheme();
  const dayStartHour = useSettingsStore((s) => s.dayStartHour);
  const dayEndHour = useSettingsStore((s) => s.dayEndHour);
  const defaultTaskDurationMinutes = useSettingsStore((s) => s.defaultTaskDurationMinutes);
  const quietHoursStart = useSettingsStore((s) => s.quietHoursStart);
  const quietHoursEnd = useSettingsStore((s) => s.quietHoursEnd);
  const carryOverBehavior = useSettingsStore((s) => s.carryOverBehavior);
  const reminderOffsetMinutes = useSettingsStore((s) => s.reminderOffsetMinutes);
  const theme = useSettingsStore((s) => s.theme);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);

  const s = useStyles(colors);

  // --- Helpers ---

  const formatHour = useCallback((hour: number): string => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:00 ${ampm}`;
  }, []);

  const formatQuietTime = useCallback((time: string): string => {
    const [hStr, mStr] = time.split(':');
    const hour = parseInt(hStr, 10);
    const min = mStr || '00';
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${min} ${ampm}`;
  }, []);

  const adjustQuietTime = useCallback(
    (current: string, delta: number): string => {
      const [hStr, mStr] = current.split(':');
      let hour = parseInt(hStr, 10) + delta;
      if (hour < 0) hour = 23;
      if (hour > 23) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${mStr || '00'}`;
    },
    [],
  );

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset All Settings',
      'This will restore all settings to their defaults. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            updateSetting('dayStartHour', 7);
            updateSetting('dayEndHour', 23);
            updateSetting('defaultTaskDurationMinutes', 30);
            updateSetting('quietHoursStart', '22:00');
            updateSetting('quietHoursEnd', '07:00');
            updateSetting('carryOverBehavior', 'auto');
            updateSetting('reminderOffsetMinutes', 15);
            updateSetting('theme', 'system');
          },
        },
      ],
    );
  }, [updateSetting]);

  // --- Timeline preview ---

  const totalHours = 24;
  const startPct = (dayStartHour / totalHours) * 100;
  const endPct = (dayEndHour / totalHours) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarIcon}>{'\u{1F4C5}'}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          DayDeck
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Customize your planning experience
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Appearance ---- */}
        <SectionHeader icon={'\uD83C\uDFA8'} title="Appearance" colors={colors} />
        <View style={s.card}>
          <SettingLabel icon={'\u2600\uFE0F'} label="Theme" colors={colors} />
          <View style={styles.segmentWrap}>
            <View
              style={[styles.segmentControl, { backgroundColor: colors.surfaceSecondary }]}
              accessibilityRole="radiogroup"
              accessibilityLabel="Theme"
            >
              {THEME_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => updateSetting('theme', opt.value)}
                  style={[
                    styles.segmentBtn,
                    theme === opt.value && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: theme === opt.value }}
                  accessibilityLabel={`Theme: ${opt.label}`}
                >
                  <Text style={styles.segmentIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.segmentLabel,
                      { color: colors.text },
                      theme === opt.value && styles.segmentLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {THEME_OPTIONS.find((o) => o.value === theme) && (
            <Text style={[styles.settingHint, { color: colors.textTertiary }]}>
              {THEME_OPTIONS.find((o) => o.value === theme)!.desc}
            </Text>
          )}
        </View>

        {/* ---- Schedule ---- */}
        <SectionHeader icon={'\uD83D\uDD52'} title="Schedule" colors={colors} />
        <View style={s.card}>
          <SettingRowStepper
            icon={'\uD83C\uDF05'}
            label="Day starts at"
            value={formatHour(dayStartHour)}
            onDecrement={() => {
              if (dayStartHour > 0) updateSetting('dayStartHour', dayStartHour - 1);
            }}
            onIncrement={() => {
              if (dayStartHour < dayEndHour - 1) updateSetting('dayStartHour', dayStartHour + 1);
            }}
            accessibilityLabel={`Day start time: ${formatHour(dayStartHour)}`}
            colors={colors}
          />
          <Divider colors={colors} />
          <SettingRowStepper
            icon={'\uD83C\uDF19'}
            label="Day ends at"
            value={formatHour(dayEndHour)}
            onDecrement={() => {
              if (dayEndHour > dayStartHour + 1) updateSetting('dayEndHour', dayEndHour - 1);
            }}
            onIncrement={() => {
              if (dayEndHour < 24) updateSetting('dayEndHour', dayEndHour + 1);
            }}
            accessibilityLabel={`Day end time: ${formatHour(dayEndHour)}`}
            colors={colors}
          />
          {/* Timeline preview */}
          <View style={styles.previewWrap}>
            <View style={[styles.previewTrack, { backgroundColor: colors.surfaceSecondary }]}>
              <View
                style={[
                  styles.previewActive,
                  {
                    backgroundColor: colors.primary + '30',
                    left: `${startPct}%` as unknown as number,
                    right: `${100 - endPct}%` as unknown as number,
                  },
                ]}
              />
            </View>
            <View style={styles.previewLabels}>
              <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>12 AM</Text>
              <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>12 PM</Text>
              <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>12 AM</Text>
            </View>
          </View>
        </View>

        {/* ---- Tasks ---- */}
        <SectionHeader icon={'\u2705'} title="Tasks" colors={colors} />
        <View style={s.card}>
          <SettingLabel icon={'\u23F1\uFE0F'} label="Default duration" colors={colors} />
          <View style={styles.presetRow}>
            {DURATION_PRESETS.map((mins) => (
              <Pressable
                key={mins}
                onPress={() => updateSetting('defaultTaskDurationMinutes', mins)}
                style={[
                  styles.presetBtn,
                  { backgroundColor: colors.surfaceSecondary },
                  defaultTaskDurationMinutes === mins && { backgroundColor: colors.primary },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: defaultTaskDurationMinutes === mins }}
                accessibilityLabel={`Default duration: ${mins} minutes`}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: colors.text },
                    defaultTaskDurationMinutes === mins && styles.presetTextActive,
                  ]}
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Divider colors={colors} />

          <SettingLabel icon={'\uD83D\uDD04'} label="Carry-over behavior" colors={colors} />
          <View style={styles.segmentWrap}>
            <View
              style={[styles.segmentControl, { backgroundColor: colors.surfaceSecondary }]}
              accessibilityRole="radiogroup"
              accessibilityLabel="Carry-over behavior"
            >
              {CARRY_OVER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => updateSetting('carryOverBehavior', opt.value)}
                  style={[
                    styles.segmentBtn,
                    carryOverBehavior === opt.value && [
                      styles.segmentBtnActive,
                      { backgroundColor: colors.primary },
                    ],
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: carryOverBehavior === opt.value }}
                  accessibilityLabel={`Carry over: ${opt.label} - ${opt.desc}`}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      { color: colors.text },
                      carryOverBehavior === opt.value && styles.segmentLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {CARRY_OVER_OPTIONS.find((o) => o.value === carryOverBehavior) && (
            <Text style={[styles.settingHint, { color: colors.textTertiary }]}>
              {CARRY_OVER_OPTIONS.find((o) => o.value === carryOverBehavior)!.desc}
            </Text>
          )}
          <Divider colors={colors} />

          <SettingRowStepper
            icon={'\uD83D\uDD14'}
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
            colors={colors}
          />
        </View>

        {/* ---- Notifications ---- */}
        <SectionHeader icon={'\uD83D\uDD14'} title="Notifications" colors={colors} />
        <View style={s.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.rowIcon}>{'\uD83D\uDCE3'}</Text>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Enable notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.surfaceTertiary, true: colors.primary + '60' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textTertiary}
              ios_backgroundColor={colors.surfaceTertiary}
            />
          </View>
          {notificationsEnabled && (
            <>
              <Divider colors={colors} />
              <SettingRowStepper
                icon={'\uD83C\uDF1C'}
                label="Quiet hours start"
                value={formatQuietTime(quietHoursStart)}
                onDecrement={() =>
                  updateSetting('quietHoursStart', adjustQuietTime(quietHoursStart, -1))
                }
                onIncrement={() =>
                  updateSetting('quietHoursStart', adjustQuietTime(quietHoursStart, 1))
                }
                accessibilityLabel={`Quiet hours start: ${formatQuietTime(quietHoursStart)}`}
                colors={colors}
              />
              <Divider colors={colors} />
              <SettingRowStepper
                icon={'\uD83C\uDF1E'}
                label="Quiet hours end"
                value={formatQuietTime(quietHoursEnd)}
                onDecrement={() =>
                  updateSetting('quietHoursEnd', adjustQuietTime(quietHoursEnd, -1))
                }
                onIncrement={() =>
                  updateSetting('quietHoursEnd', adjustQuietTime(quietHoursEnd, 1))
                }
                accessibilityLabel={`Quiet hours end: ${formatQuietTime(quietHoursEnd)}`}
                colors={colors}
              />
            </>
          )}
        </View>

        {/* ---- Calendar ---- */}
        <SectionHeader icon={'\uD83D\uDCC5'} title="Calendar" colors={colors} />
        <View style={s.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Text style={styles.rowIcon}>{'\uD83D\uDD17'}</Text>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Calendar sync</Text>
            </View>
            <Switch
              value={calendarSyncEnabled}
              onValueChange={setCalendarSyncEnabled}
              trackColor={{ false: colors.surfaceTertiary, true: colors.primary + '60' }}
              thumbColor={calendarSyncEnabled ? colors.primary : colors.textTertiary}
              ios_backgroundColor={colors.surfaceTertiary}
            />
          </View>
          {calendarSyncEnabled && (
            <>
              <Divider colors={colors} />
              <Text style={[styles.settingHint, { color: colors.textTertiary, paddingVertical: 8 }]}>
                Calendar events will appear on your timeline as reference blocks.
              </Text>
            </>
          )}
        </View>

        {/* ---- About ---- */}
        <SectionHeader icon={'\u2139\uFE0F'} title="About" colors={colors} />
        <View style={s.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.rowIcon}>{'\uD83D\uDCE6'}</Text>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
          <Divider colors={colors} />
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Reset all settings"
          >
            <Text style={styles.rowIcon}>{'\u26A0\uFE0F'}</Text>
            <Text style={[styles.rowLabel, { color: colors.error }]}>Reset all settings</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          Made with care for people who plan their day.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  icon,
  title,
  colors,
}: {
  icon: string;
  title: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text
        style={[styles.sectionTitle, { color: colors.textSecondary }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </View>
  );
}

function SettingLabel({
  icon,
  label,
  colors,
}: {
  icon: string;
  label: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function SettingRowStepper({
  icon,
  label,
  value,
  onDecrement,
  onIncrement,
  accessibilityLabel,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  accessibilityLabel: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.stepperRow} accessibilityLabel={accessibilityLabel}>
      <View style={styles.stepperLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={onDecrement}
          style={({ pressed }) => [
            styles.stepperBtn,
            { backgroundColor: colors.surfaceSecondary },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={[styles.stepperBtnText, { color: colors.primary }]}>{'\u2212'}</Text>
        </Pressable>
        <Text style={[styles.stepperValue, { color: colors.text }]}>{value}</Text>
        <Pressable
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.stepperBtn,
            { backgroundColor: colors.surfaceSecondary },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={[styles.stepperBtnText, { color: colors.primary }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Divider({ colors }: { colors: ThemeColors }) {
  return <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />;
}

// ---------------------------------------------------------------------------
// Dynamic styles (depend on theme colors)
// ---------------------------------------------------------------------------

function useStyles(colors: ThemeColors) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: Dimensions.radiusLarge,
      padding: Dimensions.cardPadding + 4,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: colors.background === '#FFFFFF' ? 0.06 : 0.3,
          shadowRadius: 4,
        },
        android: { elevation: 1 },
      }),
    } as const,
  };
}

// ---------------------------------------------------------------------------
// Static styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Dimensions.screenPadding,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  avatarIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: Dimensions.fontTitle,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: Dimensions.fontSM,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Dimensions.screenPadding,
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Labels & rows
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  rowIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  rowLabel: {
    fontSize: Dimensions.fontMD,
    fontWeight: '500',
    flex: 1,
  },
  settingHint: {
    fontSize: Dimensions.fontSM,
    marginTop: 6,
    paddingLeft: 32,
  },
  // Segment controls
  segmentWrap: {
    marginBottom: 4,
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: Dimensions.radiusMedium,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Dimensions.radiusSmall + 1,
    flexDirection: 'row',
    gap: 4,
  },
  segmentBtnActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  segmentIcon: {
    fontSize: 14,
  },
  segmentLabel: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: '#FFFFFF',
  },
  // Preset buttons (duration)
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  presetBtn: {
    flex: 1,
    height: 40,
    borderRadius: Dimensions.radiusSmall + 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetText: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  // Stepper row
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  stepperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  stepperValue: {
    fontSize: Dimensions.fontSM,
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'center',
  },
  // Switch row
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  // About
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  aboutValue: {
    fontSize: Dimensions.fontMD,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
    marginLeft: 32,
  },
  // Timeline preview
  previewWrap: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  previewTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  previewActive: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  previewLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  previewLabel: {
    fontSize: 10,
  },
  // Footer
  footer: {
    textAlign: 'center',
    fontSize: Dimensions.fontSM,
    marginTop: 32,
    marginBottom: 8,
  },
});
