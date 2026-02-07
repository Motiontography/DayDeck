import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import {
  requestNotificationPermissions,
  setupNotificationHandler,
} from '../services/notificationService';
import { useNotificationStore } from '../store/useNotificationStore';

/**
 * Hook to initialize notification permissions, set up the foreground handler,
 * and listen for notification interactions.
 *
 * Call this once in the root App component.
 */
export function useNotifications() {
  const setEnabled = useNotificationStore((s) => s.setEnabled);
  const responseListenerRef = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // Set up how notifications are displayed in the foreground
    setupNotificationHandler();

    // Request permissions on mount
    requestNotificationPermissions().then((granted) => {
      if (!granted) {
        setEnabled(false);
      }
    });

    // Listen for user interactions with notifications (tap, action)
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        // Navigation or other handling can be wired here later
        // For now, just log the notification interaction
        if (__DEV__) {
          console.log('Notification tapped:', data);
        }
      },
    );

    return () => {
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
      }
    };
  }, [setEnabled]);
}
