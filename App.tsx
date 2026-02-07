import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import DayTimelineScreen from './src/screens/DayTimelineScreen';
import TasksScreen from './src/screens/TasksScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Colors } from './src/constants/colors';
import { Dimensions } from './src/constants/dimensions';
import { useDatabase } from './src/hooks/useDatabase';
import { useCarryOver } from './src/hooks/useCarryOver';
import { useNotifications } from './src/hooks/useNotifications';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { ThemeProvider } from './src/theme/ThemeContext';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, { active: string; inactive: string }> = {
    Today: { active: '\u{1F4C5}', inactive: '\u{1F5D3}' },
    Tasks: { active: '\u2611\uFE0F', inactive: '\u{1F4CB}' },
    Settings: { active: '\u2699\uFE0F', inactive: '\u2699' },
  };
  const iconSet = icons[label];
  const icon = iconSet ? (focused ? iconSet.active : iconSet.inactive) : '-';
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icon}
      </Text>
    </View>
  );
}

export default function App() {
  const { isReady, error } = useDatabase();
  useCarryOver();
  useNotifications();

  if (!isReady) {
    return (
      <View style={styles.loading} accessibilityRole="alert">
        {error ? (
          <Text style={styles.errorText}>Failed to load database: {error.message}</Text>
        ) : (
          <ActivityIndicator size="large" color={Colors.primary} accessibilityLabel="Loading application" />
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
        <ErrorBoundary>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
              tabBarActiveTintColor: Colors.primary,
              tabBarInactiveTintColor: Colors.textTertiary,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabBarLabel,
              headerShown: false,
            })}
          >
            <Tab.Screen
              name="Today"
              component={DayTimelineScreen}
              options={{ tabBarAccessibilityLabel: 'Today timeline tab' }}
            />
            <Tab.Screen
              name="Tasks"
              component={TasksScreen}
              options={{ tabBarAccessibilityLabel: 'Tasks list tab' }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ tabBarAccessibilityLabel: 'Settings tab' }}
            />
          </Tab.Navigator>
        </NavigationContainer>
        </ErrorBoundary>
        </ThemeProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabIconWrap: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapFocused: {
    backgroundColor: Colors.primaryMuted,
  },
  tabIcon: {
    fontSize: 20,
    color: Colors.textTertiary,
  },
  tabIconFocused: {
    color: Colors.primary,
    fontSize: 22,
  },
  tabBar: {
    height: Dimensions.tabBarHeight + 4,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.error,
    fontSize: Dimensions.fontMD,
    textAlign: 'center',
    padding: Dimensions.screenPadding,
  },
});
