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

// ===== バッジカウント管理 =====
let badgeCount = 0;
 
async function setBadge(count) {
  badgeCount = count;
  if ('setAppBadge' in self.navigator) {
    if (count > 0) {
      await self.navigator.setAppBadge(count).catch(() => {});
    } else {
      await self.navigator.clearAppBadge().catch(() => {});
    }
  }
}

// ===== プッシュ通知の受信（バッジ対応） =====
self.addEventListener('push', e => {
  let data = { title: '森のプレーパーク八尾', body: '新しいお知らせがあります', url: './index.html', badge: 1 };
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

// ===== 通知タップ時 → バッジ全消去してアプリを開く =====
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
 
  e.waitUntil((async () => {
    // バッジを0にリセット
    badgeCount = 0;
    await setBadge(0);
 
    // 全通知を消去
    const notifications = await self.registration.getNotifications();
    notifications.forEach(n => n.close());
 
    // アプリを開くかフォーカス
    const cs = await clients.matchAll({ type:'window', includeUncontrolled:true });
    const c = cs.find(w => 'focus' in w);
    if (c) {
      await c.focus();
      await c.navigate(url);
    } else {
      await clients.openWindow(url);
    }
  })());
});
 
// ===== ページから「clearBadge」メッセージを受け取ったら消去 =====
self.addEventListener('message', e => {
  if (e.data === 'clearBadge') {
    badgeCount = 0;
    setBadge(0);
    self.registration.getNotifications().then(ns => ns.forEach(n => n.close()));
  }
});
 
