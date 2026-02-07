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

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Today: 'T',
    Tasks: 'L',
    Settings: 'S',
  };
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icons[label] ?? '-'}
    </Text>
  );
}

export default function App() {
  const { isReady, error } = useDatabase();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        {error ? (
          <Text style={styles.errorText}>Failed to load database: {error.message}</Text>
        ) : (
          <ActivityIndicator size="large" color={Colors.primary} />
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
              tabBarActiveTintColor: Colors.primary,
              tabBarInactiveTintColor: Colors.textTertiary,
              tabBarStyle: { height: Dimensions.tabBarHeight, paddingBottom: 8, paddingTop: 8 },
              headerShown: false,
            })}
          >
            <Tab.Screen name="Today" component={DayTimelineScreen} />
            <Tab.Screen name="Tasks" component={TasksScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textTertiary,
  },
  tabIconFocused: {
    color: Colors.primary,
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
