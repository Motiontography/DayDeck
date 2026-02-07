import { useEffect, useState, useCallback } from 'react';
import * as Calendar from 'expo-calendar';
import { Platform, Alert, Linking } from 'react-native';
import type { CalendarEvent } from '../types';

interface UseCalendarResult {
  events: CalendarEvent[];
  hasPermission: boolean;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  fetchEvents: (startDate: Date, endDate: Date) => Promise<void>;
}

export function useCalendar(): UseCalendarResult {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        setError(null);
      } else {
        setHasPermission(false);
        setError('Calendar permission denied');
        Alert.alert(
          'Calendar Access Required',
          'DayDeck needs access to your calendar to show events on the timeline. You can enable this in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
    }
  }, []);

  // Check permission on mount
  useEffect(() => {
    async function checkPermission() {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      setHasPermission(status === 'granted');
    }
    checkPermission();
  }, []);

  const fetchEvents = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!hasPermission) return;

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
    [hasPermission],
  );

  return { events, hasPermission, loading, error, requestPermission, fetchEvents };
}

function getCalendarColor(
  calendars: Calendar.Calendar[],
  calendarId: string | undefined,
): string {
  if (!calendarId) return '#8B5CF6'; // default purple
  const cal = calendars.find((c) => c.id === calendarId);
  return cal?.color || '#8B5CF6';
}
