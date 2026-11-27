// PulseApp Service Worker — To-Do due-date reminders when the app is closed

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
  if (event.tag === 'pulse-background-check') {
    event.waitUntil(checkTodoDueDate());
  }
});

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
