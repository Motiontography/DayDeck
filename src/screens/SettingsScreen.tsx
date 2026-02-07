import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Dimensions } from '../constants';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Timeline start hour</Text>
            <Text style={styles.settingValue}>6:00 AM</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Timeline end hour</Text>
            <Text style={styles.settingValue}>10:00 PM</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: Dimensions.fontSM,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Dimensions.radiusMedium,
    padding: Dimensions.cardPadding,
    marginBottom: 4,
  },
  settingLabel: {
    fontSize: Dimensions.fontLG,
    color: Colors.text,
  },
  settingValue: {
    fontSize: Dimensions.fontMD,
    color: Colors.textSecondary,
  },
});
