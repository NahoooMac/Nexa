// Firebase Messaging Service Worker
// This file MUST be at the root of the public directory (served as /firebase-messaging-sw.js)
// It enables background push notifications when the app tab is not in focus.

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

// NOTE: These values are intentionally hardcoded in the service worker
// because it runs outside the Vite/module bundler environment.
// They are NOT secret — Firebase API keys are safe to expose client-side.
firebase.initializeApp({
  apiKey: 'AIzaSyBgkLFXc2oWppSauu-4nAYsyZHhxZctiGk',
  authDomain: 'shebacine.firebaseapp.com',
  projectId: 'shebacine',
  storageBucket: 'shebacine.firebasestorage.app',
  messagingSenderId: '255641134678',
  appId: '1:255641134678:web:836ea32220e0f678537df7',
});

const messaging = firebase.messaging();

// Handle background messages (app tab is in background or closed)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Nexa Reminder';
  const body = payload.notification?.body || 'You have a new notification';

  self.registration.showNotification(title, {
    body,
    icon: '/vite.svg',
    badge: '/vite.svg',
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
