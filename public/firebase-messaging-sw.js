// Firebase Messaging Service Worker — ESM version
// Uses the modular SDK so it does NOT request /__/firebase/init.json
// This file must be served from the root (public/firebase-messaging-sw.js)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getMessaging, onBackgroundMessage } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-sw.js';

// NOTE: These values are intentionally hardcoded in the service worker
// because it runs outside the Vite/module bundler environment.
// Firebase client-side API keys are safe to expose publicly.
const firebaseConfig = {
  apiKey: self.__FIREBASE_API_KEY__ || '',
  authDomain: self.__FIREBASE_AUTH_DOMAIN__ || '',
  projectId: self.__FIREBASE_PROJECT_ID__ || '',
  storageBucket: self.__FIREBASE_STORAGE_BUCKET__ || '',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || '',
  appId: self.__FIREBASE_APP_ID__ || '',
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages (app tab is in background or closed)
onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title || 'Nexa Reminder';
  const body = payload.notification?.body || 'You have a new notification';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.data?.tag || 'nexa-notification',
    requireInteraction: false,
    silent: false,
  });
});

// On notification click — focus the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/reminders');
      }
    })
  );
});
