import { useEffect, useState, useCallback } from 'react';
import * as Calendar from 'expo-calendar';
import { Platform, Alert, Linking } from 'react-native';
import type { CalendarEvent, DeviceReminder } from '../types';

interface UseCalendarResult {
  events: CalendarEvent[];
  reminders: DeviceReminder[];
  hasCalendarPermission: boolean;
  hasRemindersPermission: boolean;
  loading: boolean;
  error: string | null;
  requestPermissions: () => Promise<void>;
  fetchEvents: (startDate: Date, endDate: Date) => Promise<void>;
  fetchReminders: (startDate: Date, endDate: Date) => Promise<void>;
}

export function useCalendar(): UseCalendarResult {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<DeviceReminder[]>([]);
  const [hasCalendarPermission, setHasCalendarPermission] = useState(false);
  const [hasRemindersPermission, setHasRemindersPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      const { status: calStatus } = await Calendar.requestCalendarPermissionsAsync();
      if (calStatus === 'granted') {
        setHasCalendarPermission(true);
      } else {
        setHasCalendarPermission(false);
      }

      // Request reminders permission (iOS only)
      if (Platform.OS === 'ios') {
        const { status: remStatus } = await Calendar.requestRemindersPermissionsAsync();
        if (remStatus === 'granted') {
          setHasRemindersPermission(true);
        } else {
          setHasRemindersPermission(false);
        }
      }

      if (calStatus !== 'granted') {
        setError('Calendar permission denied');
        Alert.alert(
          'Calendar Access Required',
          'DayDeck needs access to your calendar and reminders to show them on the timeline. You can enable this in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permissions');
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    async function checkPermissions() {
      const { status: calStatus } = await Calendar.getCalendarPermissionsAsync();
      setHasCalendarPermission(calStatus === 'granted');

      if (Platform.OS === 'ios') {
        const { status: remStatus } = await Calendar.getRemindersPermissionsAsync();
        setHasRemindersPermission(remStatus === 'granted');
      }
    }
    checkPermissions();
  }, []);

  const fetchEvents = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!hasCalendarPermission) return;

      setLoading(true);
      setError(null);

      try {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const calendarIds = calendars.map((c) => c.id);

        if (calendarIds.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const rawEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);

        const mapped: CalendarEvent[] = rawEvents.map((e) => ({
          id: e.id,
          title: e.title || 'Untitled Event',
          startTime: new Date(e.startDate).toISOString(),
          endTime: new Date(e.endDate).toISOString(),
          calendarId: e.calendarId || '',
          color: getCalendarColor(calendars, e.calendarId),
        }));

        setEvents(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [hasCalendarPermission],
  );

  const fetchReminders = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!hasRemindersPermission || Platform.OS !== 'ios') return;

      try {
        const reminderCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
        const calendarIds = reminderCalendars.map((c) => c.id);

        if (calendarIds.length === 0) {
          setReminders([]);
          return;
        }

        const rawReminders = await Calendar.getRemindersAsync(
          calendarIds,
          null, // status filter — null = all
          startDate,
          endDate,
        );

        const mapped: DeviceReminder[] = rawReminders.map((r) => ({
          id: r.id ?? '',
          title: r.title || 'Untitled Reminder',
          notes: r.notes ?? null,
          dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : null,
          startDate: r.startDate ? new Date(r.startDate).toISOString() : null,
          completed: r.completed ?? false,
          calendarId: r.calendarId || '',
          color: getReminderCalendarColor(reminderCalendars, r.calendarId),
        }));

        setReminders(mapped);
      } catch (err) {
        // Silently fail for reminders — not critical
        console.warn('Failed to fetch reminders:', err);
        setReminders([]);
      }
    },
    [hasRemindersPermission],
  );

  return {
    events,
    reminders,
    hasCalendarPermission,
    hasRemindersPermission,
    loading,
    error,
    requestPermissions,
    fetchEvents,
    fetchReminders,
  };
}

function getCalendarColor(
  calendars: Calendar.Calendar[],
  calendarId: string | undefined,
): string {
  if (!calendarId) return '#8B5CF6'; // default purple
  const cal = calendars.find((c) => c.id === calendarId);
  return cal?.color || '#8B5CF6';
}

function getReminderCalendarColor(
  calendars: Calendar.Calendar[],
  calendarId: string | undefined,
): string {
  if (!calendarId) return '#FB923C'; // default orange for reminders
  const cal = calendars.find((c) => c.id === calendarId);
  return cal?.color || '#FB923C';
}
