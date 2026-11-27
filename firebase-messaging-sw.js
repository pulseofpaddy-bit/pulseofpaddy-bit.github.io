// PulseApp Service Worker — Background Notifications
// Handles: PingMe chat notifications + To-Do due-date reminders (even when app is closed)

const CACHE_NAME  = "pulse-sw-state-v3";

// ─── Helper: read/write from Cache Storage ────────────────────────────────────
async function cacheGet(key) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res   = await cache.match(key);
    return res ? await res.text() : null;
  } catch { return null; }
}
async function cacheSet(key, value) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(key, new Response(String(value)));
  } catch {}
}

// ─── Store user email / todo items sent from the app ─────────────────────────
self.addEventListener('message', function(event) {
  if (event.data?.type === 'SET_USER_EMAIL') {
    cacheSet('user-email', event.data.email);
  }
  if (event.data?.type === 'SET_TODO_ITEMS') {
    cacheSet('todo-items', JSON.stringify(event.data.items));
  }
  if (event.data?.type === 'SET_FIREBASE_AUTH') {
    cacheSet('fb-token', event.data.token || '');
    cacheSet('fb-refresh', event.data.refreshToken || '');
    cacheSet('fb-exp', String(event.data.expiresAt || 0));
    cacheSet('fb-api-key', event.data.apiKey || '');
    cacheSet('fb-ping-base', event.data.pingBase || '');
  }
});

function withAuth(url, token) {
  const parsed = new URL(url);
  if (token) parsed.searchParams.set('auth', token);
  return parsed.toString();
}

async function swFirebaseToken() {
  let token = await cacheGet('fb-token');
  const exp = parseInt(await cacheGet('fb-exp') || '0', 10);
  if (token && Date.now() < exp - 60000) return token;
  const refresh = await cacheGet('fb-refresh');
  const apiKey = await cacheGet('fb-api-key');
  if (!refresh || !apiKey) return token || '';
  try {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refresh)}`,
    });
    if (!res.ok) return '';
    const data = await res.json();
    if (!data.id_token) return '';
    const expiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
    await cacheSet('fb-token', data.id_token);
    if (data.refresh_token) await cacheSet('fb-refresh', data.refresh_token);
    await cacheSet('fb-exp', String(expiresAt));
    return data.id_token;
  } catch {
    return '';
  }
}

// ─── Push event (FCM) ────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.notification?.title || data.title || 'New PingMe message';
    const options = {
      body:   data.notification?.body || data.body || 'You have a new message',
      icon:   '/icon-192.png',
      badge:  '/icon-192.png',
      tag:    data.tag || 'pingme-message',
      data:   data.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch(e) {
    event.waitUntil(self.registration.showNotification('New PingMe message', {
      body: 'You have a new message', icon: '/icon-192.png',
    }));
  }
});

// ─── Notification click — open or focus the app ──────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('pulseofpaddy') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('https://pulseofpaddy-bit.github.io');
    })
  );
});

// ─── Periodic background sync (Android Chrome when app is closed) ─────────────
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'pulse-background-check' || event.tag === 'pingme-check') {
    event.waitUntil(backgroundCheck());
  }
});

// ─── Main background check function ──────────────────────────────────────────
async function backgroundCheck() {
  await checkPingMeNotifications();
  await checkTodoDueDate();
}

// ─── PingMe: poll Firebase for new messages ───────────────────────────────────
async function checkPingMeNotifications() {
  try {
    const userEmail = await cacheGet('user-email');
    const pingBase = await cacheGet('fb-ping-base');
    const token = await swFirebaseToken();
    if (!userEmail || !pingBase || !token) return;
    const safeEmail  = userEmail.replace(/[.@]/g, '_');
    const lastSeenTs = parseInt(await cacheGet('pingme-last-seen') || '0');

    const res  = await fetch(withAuth(`${pingBase}/notifications/${safeEmail}.json`, token), { referrer: 'no-referrer' });
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;

    const entries = Object.values(data).filter(n => n.ts > lastSeenTs);
    for (const n of entries) {
      await self.registration.showNotification(`💬 ${n.fromName || 'Family member'}`, {
        body:    n.preview ? `"${n.preview}"` : 'Sent you a message in PingMe',
        icon:    '/icon-192.png',
        badge:   '/icon-192.png',
        tag:     `pingme-${n.chatId}`,
        vibrate: [200, 100, 200],
      });
    }
    if (entries.length > 0) {
      await cacheSet('pingme-last-seen', Math.max(...entries.map(n => n.ts)));
    }
  } catch(e) {}
}

// ─── To-Do: fire due-date reminder once per task per day ─────────────────────
async function checkTodoDueDate() {
  try {
    const itemsJson = await cacheGet('todo-items');
    if (!itemsJson) return;
    const items = JSON.parse(itemsJson);

    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Load already-notified set for today
    let notifiedRaw = await cacheGet('todo-notified');
    let notified    = {};
    try { notified = JSON.parse(notifiedRaw || '{}'); } catch {}
    if (notified._date !== today) notified = { _date: today };

    let changed = false;
    for (const t of items) {
      if (t.done || t.dueDate !== tomorrowStr) continue;
      const key = t.id || t.text;
      if (notified[key]) continue; // already sent today
      await self.registration.showNotification('🔔 Task due tomorrow!', {
        body:    `"${t.text}" is due for ${t.assignee || 'Family'}`,
        icon:    '/favicon.ico',
        tag:     `todo-due-${key}`,
        vibrate: [200, 100, 200],
      });
      notified[key] = true;
      changed = true;
    }
    if (changed) await cacheSet('todo-notified', JSON.stringify(notified));
  } catch(e) {}
}

// ─── Install & activate ───────────────────────────────────────────────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(clients.claim()));
