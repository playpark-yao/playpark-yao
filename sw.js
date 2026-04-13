const CACHE_NAME = 'playpark-yao-v5'; // バージョンを v5 に上げる
const URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png'
];

// インストール
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(URLS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート（古いキャッシュを完全に消す）
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k))) // 全ての古いキャッシュを削除
    ).then(() => self.clients.claim())
  );
});

// フェッチ（画像やAPIはキャッシュせず、常に最新を取りに行く）
self.addEventListener('fetch', e => {
  // Supabaseの画像やデータは常にネットワークから取得
  if (e.request.url.includes('supabase.co')) {
    return e.respondWith(fetch(e.request));
  }
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request);
    })
  );
});

// ===== プッシュ通知の受信（バッジ対応） =====
self.addEventListener('push', e => {
  let data = { title: 'プレーパーク八尾', body: '新しいお知らせがあります', url: './index.html', badge: 1 };
  if (e.data) {
    try { data = e.data.json(); } catch (err) { data.body = e.data.text(); }
  }

  if (data.badge && 'setAppBadge' in navigator) {
    navigator.setAppBadge(data.badge).catch(() => {});
  }

  const options = {
    body: data.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: data.url || './index.html' },
    tag: 'playpark-notification',
    renotify: true,
    requireInteraction: true 
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

// 通知クリック
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const urlToOpen = new URL(e.notification.data?.url || './index.html', self.location.origin).href;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
