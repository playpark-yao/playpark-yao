const CACHE_NAME = 'playpark-yao-v3'; // バージョンを上げて更新を促す
const URLS = [
  './index.html',
  './news.html',
  './events-list.html',
  './manifest.json',
  './icon-192.png'
];

// インストール: キャッシュの保存
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(URLS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート: 古いキャッシュの削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// フェッチ: キャッシュがあれば返し、なければネットワークから取得
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // 動的なリクエスト（Supabase APIなど）はキャッシュしない
        if (e.request.url.includes('supabase.co')) return response;
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// ===== プッシュ通知の受信 =====
self.addEventListener('push', e => {
  console.log('Push received');
  let data = { title: 'プレーパーク八尾', body: '新しいお知らせがあります', url: './index.html' };

  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data.body = e.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: data.url || './index.html' },
    vibrate: [200, 100, 200],
    tag: 'playpark-notification', // 同じタグの通知はまとめる
    renotify: true, // 再通知を許可
    requireInteraction: true // iPhoneでは特に重要：ユーザーが確認するまで消さない
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知クリック時の動作
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const urlToOpen = new URL(e.notification.data?.url || './index.html', self.location.origin).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // 既に開いているページがあればフォーカス、なければ新規で開く
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
