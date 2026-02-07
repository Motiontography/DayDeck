import * as Notifications from 'expo-notifications';
import { parseISO, subMinutes, isAfter, isBefore, set as setDate } from 'date-fns';
import type { Task, TimeBlock, TaskNotification } from '../types';

/**
 * Parse a "HH:mm" time string into { hour, minute }.
 */
function parseTimeString(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

/**
 * Check if a given Date falls within quiet hours.
 * Quiet hours may span midnight (e.g. 22:00 -> 07:00).
 */
export function isInQuietHours(
  date: Date,
  quietStart: string,
  quietEnd: string,
): boolean {
  const start = parseTimeString(quietStart);
  const end = parseTimeString(quietEnd);

  const dateHour = date.getHours();
  const dateMinute = date.getMinutes();
  const dateMinutes = dateHour * 60 + dateMinute;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  if (startMinutes <= endMinutes) {
    // Quiet hours don't span midnight (e.g. 13:00 -> 15:00)
    return dateMinutes >= startMinutes && dateMinutes < endMinutes;
  }
  // Quiet hours span midnight (e.g. 22:00 -> 07:00)
  return dateMinutes >= startMinutes || dateMinutes < endMinutes;
}

/**
 * Request notification permissions from the user.
 * Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Configure how notifications are displayed when the app is in the foreground.
 */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Build a stable notification identifier for a task notification.
 * This allows us to cancel/replace specific notifications.
 */
function buildTaskNotificationId(taskId: string, notificationId: string): string {
  return `task-${taskId}-${notificationId}`;
}

/**
 * Build a stable notification identifier for a time block nudge.
 */
function buildBlockNotificationId(blockId: string): string {
  return `block-${blockId}`;
}

/**
 * Schedule all enabled notifications for a task, respecting quiet hours.
 * Cancels any previously scheduled notifications for this task first.
 */
export async function scheduleTaskNotifications(
  task: Task,
  quietStart: string,
  quietEnd: string,
  notificationsEnabled: boolean,
): Promise<void> {
  // Always cancel existing notifications for this task first
  await cancelTaskNotifications(task.id, task.notifications);

  if (!notificationsEnabled) return;
  if (task.status === 'done' || task.status === 'cancelled') return;
  if (!task.scheduledDate) return;

  for (const notification of task.notifications) {
    if (!notification.enabled) continue;

    const taskDate = parseISO(task.scheduledDate + 'T00:00:00');
    const fireDate = subMinutes(taskDate, notification.offsetMinutes);
    const now = new Date();

    // Don't schedule notifications in the past
    if (!isAfter(fireDate, now)) continue;

    // Don't schedule during quiet hours
    if (isInQuietHours(fireDate, quietStart, quietEnd)) continue;

    const identifier = buildTaskNotificationId(task.id, notification.id);

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Task Reminder',
        body: task.title,
        data: { type: 'task-reminder', taskId: task.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  }
}

/**
 * Cancel all scheduled notifications for a specific task.
 */
export async function cancelTaskNotifications(
  taskId: string,
  notifications: TaskNotification[],
): Promise<void> {
  for (const notification of notifications) {
    const identifier = buildTaskNotificationId(taskId, notification.id);
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
}

/**
 * Schedule a start-of-block nudge notification for a time block.
 * Fires at the block's start time (or offset before it).
 */
export async function scheduleBlockNudge(
  block: TimeBlock,
  offsetMinutes: number,
  quietStart: string,
  quietEnd: string,
  notificationsEnabled: boolean,
): Promise<void> {
  // Cancel any existing nudge for this block
  await cancelBlockNudge(block.id);

  if (!notificationsEnabled) return;

  const startTime = parseISO(block.startTime);
  const fireDate = subMinutes(startTime, offsetMinutes);
  const now = new Date();

  if (!isAfter(fireDate, now)) return;
  if (isInQuietHours(fireDate, quietStart, quietEnd)) return;

  const identifier = buildBlockNotificationId(block.id);

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Time Block Starting',
      body: block.title,
      data: { type: 'block-nudge', blockId: block.id },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
    },
  });
}

/**
 * Cancel a scheduled block nudge notification.
 */
export async function cancelBlockNudge(blockId: string): Promise<void> {
  const identifier = buildBlockNotificationId(blockId);
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Cancel all DayDeck notifications (e.g. when user disables notifications globally).
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Re-schedule all task notifications (e.g. after quiet hours change).
 * Call this when notification settings change.
 */
export async function rescheduleAllTaskNotifications(
  tasks: Task[],
  quietStart: string,
  quietEnd: string,
  notificationsEnabled: boolean,
): Promise<void> {
  await cancelAllNotifications();

  if (!notificationsEnabled) return;

  for (const task of tasks) {
    if (task.notifications.length > 0) {
      await scheduleTaskNotifications(task, quietStart, quietEnd, notificationsEnabled);
    }
  }
}
