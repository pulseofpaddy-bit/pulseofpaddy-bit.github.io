// PulseApp Firebase Messaging Service Worker
// Handles background push notifications for PingMe

const FIREBASE_DB = "https://pulse-family-default-rtdb.firebaseio.com/pingme";

// Listen for push events (FCM)
self.addEventListener('push', function(event) {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title || data.title || 'New PingMe message';
    const options = {
      body: data.notification?.body || data.body || 'You have a new message',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'pingme-message',
      data: data.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch(e) {
    const title = 'New PingMe message';
    event.waitUntil(self.registration.showNotification(title, {
      body: 'You have a new message',
      icon: '/icon-192.png',
    }));
  }
});

// Handle notification click — open or focus the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('pulseofpaddy') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://pulseofpaddy-bit.github.io');
      }
    })
  );
});

// Periodic background sync — poll Firebase for new messages every 15 minutes
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'pingme-check') {
    event.waitUntil(checkForNewMessages());
  }
});

async function checkForNewMessages() {
  try {
    const userEmail = await getStoredEmail();
    if (!userEmail) return;
    const safeEmail = userEmail.replace(/[.@]/g, '_');
    const res = await fetch(`${FIREBASE_DB}/notifications/${safeEmail}.json`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;
    const lastSeen = parseInt(await getLastSeen() || '0');
    const entries = Object.values(data).filter(n => n.ts > lastSeen);
    for (const n of entries) {
      await self.registration.showNotification(`💬 ${n.fromName || 'Someone'} sent you a message`, {
        body: n.preview || 'New message in PingMe',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `pingme-${n.chatId}`,
        vibrate: [200, 100, 200],
      });
    }
    if (entries.length > 0) {
      await setLastSeen(Math.max(...entries.map(n => n.ts)));
    }
  } catch(e) {}
}

async function getStoredEmail() {
  try {
    const clients_list = await clients.matchAll({ includeUncontrolled: true });
    // Try to get from IndexedDB or cache
    return null; // Will be set by the app
  } catch { return null; }
}

async function getLastSeen() {
  try {
    const cache = await caches.open('pingme-state');
    const res = await cache.match('last-seen');
    return res ? await res.text() : '0';
  } catch { return '0'; }
}

async function setLastSeen(ts) {
  try {
    const cache = await caches.open('pingme-state');
    await cache.put('last-seen', new Response(String(ts)));
  } catch {}
}

// Store user email from app
self.addEventListener('message', function(event) {
  if (event.data?.type === 'SET_USER_EMAIL') {
    caches.open('pingme-state').then(cache => {
      cache.put('user-email', new Response(event.data.email));
    });
  }
});
