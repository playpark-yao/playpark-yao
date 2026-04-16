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

// ===== プッシュ通知受信時 =====
self.addEventListener('push', e => {
  let data = { title: '森のプレーパーク八尾', body: '【お知らせ】ページに新しい情報があります', url: '/' };
  try { data = e.data ? e.data.json() : data; } catch (err) {}

  const promiseChain = (async () => {
    // 1. 現在表示されている通知のリストを取得
    const notifications = await self.registration.getNotifications();
    const newBadgeCount = notifications.length + 1;

    // 2. バッジを更新 (現在の通知数 + 新しい通知1つ)
    if ('setAppBadge' in self.navigator) {
      await self.navigator.setAppBadge(newBadgeCount).catch(() => {});
    }

    // 3. 通知を表示
    return self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png', // Androidのステータスバー用アイコン
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    });
  })();

  e.waitUntil(promiseChain);
});

// バッジをクリアする共通関数
async function clearAllBadges() {
  // バッジをリセット
  if ('clearAppBadge' in self.navigator) {
    await self.navigator.clearAppBadge().catch(() => {});
  }
  // 全ての通知も消去する場合
  const ns = await self.registration.getNotifications();
  ns.forEach(n => n.close());
}

// ===== 通知タップ時 =====
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';

  e.waitUntil((async () => {
    await clearAllBadges(); // バッジと通知をクリア

    // アプリを開く処理
    const cs = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = cs.find(w => 'focus' in w);
    if (c) {
      await c.focus();
      if (c.url !== url) await c.navigate(url);
    } else {
      await clients.openWindow(url);
    }
  })());
});
 
// ===== アプリ起動中などにメッセージを受け取って消去 =====
self.addEventListener('message', e => {
  if (e.data === 'clearBadge') {
    e.waitUntil(clearAllBadges());
  }
});
 
