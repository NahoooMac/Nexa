// Firebase Messaging Service Worker for Nexa
// Uses the ESM/CDN Firebase SDK — NO bundler, must use importScripts or ESM CDN.
// This file is served from the root (public/firebase-messaging-sw.js)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getMessaging, onBackgroundMessage } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-sw.js';

// These values are intentionally inlined. Firebase client-side API keys are
// safe to expose publicly (they only identify the project, not grant server access).
const firebaseConfig = {
  apiKey: "AIzaSyBgkLFXc2oWppSauu-4nAYsyZHhxZctiGk",
  authDomain: "shebacine.firebaseapp.com",
  projectId: "shebacine",
  storageBucket: "shebacine.firebasestorage.app",
  messagingSenderId: "255641134678",
  appId: "1:255641134678:web:836ea32220e0f678537df7",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// ── Handle background push messages (tab in background / closed) ──────────────
onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title ?? 'Nexa Reminder';
  const body  = payload.notification?.body  ?? 'You have a new notification';
  const tag   = payload.data?.tag ?? 'nexa-notification';
  const url   = payload.data?.url ?? '/reminders';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag,
    data: { url },
    requireInteraction: false,
    silent: false,
  });
});

// ── Handle notification click — deep-link into the app ────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/reminders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab if one is open
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Handle scheduled alarm notifications (non-FCM path) ──────────────────────
// When the main thread cannot reach us (app closed), the service worker can
// still show locally-triggered notifications via postMessage.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url } = event.data;
    self.registration.showNotification(title ?? 'Nexa', {
      body: body ?? '',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: tag ?? 'nexa',
      data: { url: url ?? '/reminders' },
      requireInteraction: false,
    });
  }
});
