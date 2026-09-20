/**
 * Notifications library — handles browser Notification API,
 * schedules in-app reminder alerts, and manages FCM push tokens.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function sendBrowserNotification(
  title: string,
  body: string,
  icon = '/vite.svg',
  vibrate = true
) {
  if (!hasNotificationPermission()) return;
  const n = new Notification(title, { body, icon, silent: false });
  // Vibrate on mobile if supported
  if (vibrate && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  setTimeout(() => n.close(), 8000);
}

/**
 * Schedule a browser notification for a specific ISO datetime.
 * Returns a timeout ID you can use to cancel it.
 */
export function scheduleNotification(
  title: string,
  body: string,
  isoDateTime: string
): ReturnType<typeof setTimeout> | null {
  const fireAt = new Date(isoDateTime).getTime();
  const now = Date.now();
  const delay = fireAt - now;

  if (delay <= 0) return null;
  // Cap at 2 billion ms (~24 days) to avoid 32-bit overflow
  const safDelay = Math.min(delay, 2_000_000_000);

  return setTimeout(() => {
    sendBrowserNotification(title, body);
  }, safDelay);
}

/**
 * Schedule notifications for an array of reminders.
 * Returns a map of reminderId → timeoutId for cleanup.
 */
export function scheduleReminders(
  reminders: Array<{ id: string; title: string; description?: string; dueDate: string; dueTime?: string }>
): Map<string, ReturnType<typeof setTimeout>> {
  const map = new Map<string, ReturnType<typeof setTimeout>>();

  for (const r of reminders) {
    const dateStr = r.dueTime ? `${r.dueDate}T${r.dueTime}:00` : `${r.dueDate}T09:00:00`;
    const id = scheduleNotification(r.title, r.description ?? 'Nexa reminder', dateStr);
    if (id !== null) map.set(r.id, id);
  }

  return map;
}

/**
 * Initialize Firebase Cloud Messaging for push notifications.
 * Returns the FCM token string, or null if not supported / permission denied.
 */
export async function initializeFCM(): Promise<string | null> {
  try {
    // Dynamic import to avoid breaking SSR or environments without messaging support
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
    const { app } = await import('./firebase');

    const messaging = getMessaging(app);

    // Request permission first
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey) {
      console.warn('[Nexa] VITE_FIREBASE_VAPID_KEY not set — FCM token not registered');
      return null;
    }

    // Register the firebase messaging service worker as an ES module
    // (avoids the /__/firebase/init.json 404 from the compat SDK)
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        { type: 'module' }
      );
    }

    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });

    // Handle foreground messages — show as browser notification
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'Nexa';
      const body = payload.notification?.body ?? '';
      sendBrowserNotification(title, body);
    });

    return token;
  } catch (err) {
    console.warn('[Nexa] FCM init failed:', err);
    return null;
  }
}
