/**
 * Nexa Notifications — handles browser Notification API, PWA Service Worker
 * notifications, and Firebase Cloud Messaging (FCM) for background push.
 *
 * Strategy (in priority order):
 *  1. FCM push (works when app is closed, requires VITE_FIREBASE_VAPID_KEY)
 *  2. Service Worker showNotification (works when app is in background, best PWA support)
 *  3. Notification API (works when app tab is open/visible)
 *  4. Graceful degradation — no crash if unsupported
 */

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// ─── Send a notification immediately ─────────────────────────────────────────

/**
 * Show a notification using the best available method:
 *  1. Service Worker showNotification (works even when tab is in background)
 *  2. Fallback: Notification API (requires foreground tab)
 */
export async function sendBrowserNotification(
  title: string,
  body: string,
  options: {
    icon?: string;
    tag?: string;
    url?: string;
    vibrate?: boolean;
  } = {}
): Promise<void> {
  if (!hasNotificationPermission()) return;

  const icon = options.icon ?? '/favicon.png';
  const tag  = options.tag  ?? 'nexa-notification';
  const url  = options.url  ?? '/reminders';

  // Prefer SW showNotification so it works in the background
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon,
        badge: '/favicon.png',
        tag,
        data: { url },
        requireInteraction: false,
        silent: false,
      } as NotificationOptions);

      if (options.vibrate !== false && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      return;
    } catch {
      // Fall through to Notification API
    }
  }

  // Fallback: direct Notification API (foreground only)
  const n = new Notification(title, { body, icon, tag, silent: false });
  if (options.vibrate !== false && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  setTimeout(() => n.close(), 8000);
}

// ─── Schedule a future notification ──────────────────────────────────────────

/**
 * Schedule a browser notification for a specific ISO datetime.
 * Uses setTimeout — only works while the tab is alive.
 * Returns a timeout ID for cancellation, or null if the time is in the past.
 */
export function scheduleNotification(
  title: string,
  body: string,
  isoDateTime: string,
  options: { tag?: string; url?: string } = {}
): ReturnType<typeof setTimeout> | null {
  const fireAt = new Date(isoDateTime).getTime();
  const now = Date.now();
  const delay = fireAt - now;

  if (delay <= 0) return null;

  // Cap at 2 billion ms (~24 days) to stay within 32-bit setTimeout limits
  const safeDelay = Math.min(delay, 2_000_000_000);

  return setTimeout(() => {
    sendBrowserNotification(title, body, options);
  }, safeDelay);
}

// ─── Module-level reminder timeout map ───────────────────────────────────────

/**
 * Tracks active reminder timeouts to prevent duplicates from Firestore
 * real-time listener firing multiple times.
 */
const activeReminderTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Schedule notifications for an array of active reminders.
 * Clears previously-scheduled timeouts before re-scheduling.
 */
export function scheduleReminders(
  reminders: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    dueTime?: string;
    repeat?: string;
  }>
): Map<string, ReturnType<typeof setTimeout>> {
  // 1. Clear all previously tracked timeouts
  for (const [, timeoutId] of activeReminderTimeouts) {
    clearTimeout(timeoutId);
  }
  activeReminderTimeouts.clear();

  // 2. Schedule fresh timeouts
  for (const r of reminders) {
    const dateStr = r.dueTime
      ? `${r.dueDate}T${r.dueTime}:00`
      : `${r.dueDate}T09:00:00`;

    const repeatLabel = r.repeat && r.repeat !== 'none'
      ? ` (${r.repeat})`
      : '';

    const id = scheduleNotification(
      r.title,
      (r.description ?? 'Nexa reminder') + repeatLabel,
      dateStr,
      { tag: `reminder-${r.id}`, url: '/reminders' }
    );

    if (id !== null) {
      activeReminderTimeouts.set(r.id, id);
    }
  }

  return new Map(activeReminderTimeouts);
}

/**
 * Cancel all currently scheduled reminder notifications.
 */
export function clearAllScheduledReminders(): void {
  for (const [, timeoutId] of activeReminderTimeouts) {
    clearTimeout(timeoutId);
  }
  activeReminderTimeouts.clear();
}

// ─── FCM Push Notifications ───────────────────────────────────────────────────

/**
 * Initialize Firebase Cloud Messaging for true background push notifications.
 *
 * Prerequisites (must be configured externally):
 *   1. Add VITE_FIREBASE_VAPID_KEY to .env.local (get from Firebase Console →
 *      Project Settings → Cloud Messaging → Web Push Certificates → Key Pair).
 *   2. Deploy a server-side function (Cloud Functions or your own backend) that
 *      calls the FCM HTTP v1 API to send push messages to saved tokens.
 *   3. Save the returned FCM token to Firestore so your backend can target it.
 *
 * Returns the FCM token string, or null if unsupported / permission denied.
 *
 * ⚠️  WITHOUT a server sending push messages, FCM tokens alone won't trigger
 *     background notifications. The setTimeout path above handles in-tab alerts.
 */
export async function initializeFCM(): Promise<string | null> {
  try {
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
    const { app } = await import('./firebase');

    const messaging = getMessaging(app);

    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey) {
      console.warn(
        '[Nexa] VITE_FIREBASE_VAPID_KEY is not set.\n' +
        'FCM background push will not work until you:\n' +
        '  1. Go to Firebase Console → Project Settings → Cloud Messaging\n' +
        '  2. Generate a Web Push key pair\n' +
        '  3. Copy the key pair value into .env.local as VITE_FIREBASE_VAPID_KEY\n' +
        '  4. Restart the dev server\n'
      );
      return null;
    }

    // Register the Firebase messaging service worker
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      // Register with type: 'module' since the SW uses ESM imports from CDN
      swRegistration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        { type: 'module' }
      );
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn('[Nexa] FCM returned an empty token. Check VAPID key and SW registration.');
      return null;
    }

    // Handle foreground messages — show as browser notification
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'Nexa';
      const body  = payload.notification?.body  ?? '';
      const url   = (payload.data?.url as string | undefined) ?? '/reminders';
      sendBrowserNotification(title, body, { url, tag: payload.data?.tag as string });
    });

    // TODO: Save `token` to Firestore under users/{uid}/fcmTokens so your backend
    // can send targeted push notifications to this device.
    console.info('[Nexa] FCM token registered:', token.slice(0, 20) + '…');
    return token;
  } catch (err) {
    console.warn('[Nexa] FCM init failed:', err);
    return null;
  }
}

// ─── iOS PWA Notification Helper ──────────────────────────────────────────────

/**
 * Returns true if the app is running as an installed PWA on iOS (Safari).
 * iOS Safari supports Web Push from iOS 16.4+ when the PWA is installed to the
 * home screen. Earlier versions require a third-party fallback.
 */
export function isIOSPWA(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isStandalone = ('standalone' in navigator) && (navigator as any).standalone === true;
  return isIOS && isStandalone;
}

/**
 * Returns a human-readable string explaining the current notification support
 * level for display in Settings.
 */
export function getNotificationStatusLabel(): string {
  if (!('Notification' in window)) {
    return 'Not supported on this browser';
  }
  if (Notification.permission === 'denied') {
    return 'Blocked — enable in browser/device settings';
  }
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      return 'Enabled — works in background';
    }
    return 'Enabled — foreground only';
  }
  return 'Not yet enabled';
}
