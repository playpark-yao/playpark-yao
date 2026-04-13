const CACHE_NAME = 'playpark-yao-v3';
const URLS = ['./index.html','./news.html','./events-list.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

// ===== プッシュ通知 =====
self.addEventListener('push', e => {
  let data = { title:'プレーパーク八尾', body:'新しいお知らせがあります', url:'/' };
  try { data = e.data ? e.data.json() : data; } catch(err) {}
  // バッジを設定
  if('setAppBadge' in self.navigator){
    self.navigator.setAppBadge(1).catch(()=>{});
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: false
    })
  );
});

// 通知タップ時
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    // バッジを消去
    (('clearAppBadge' in self.navigator) ? self.navigator.clearAppBadge().catch(()=>{}) : Promise.resolve())
    .then(() => clients.matchAll({ type:'window', includeUncontrolled:true }))
    .then(cs => {
      const c = cs.find(w => 'focus' in w);
      return c ? c.focus().then(w => w.navigate(url)) : clients.openWindow(url);
    })
  );
});

// ページが開かれたらバッジ消去
self.addEventListener('message', e => {
  if(e.data === 'clearBadge'){
    if('clearAppBadge' in self.navigator){
      self.navigator.clearAppBadge().catch(()=>{});
    }
    // 全通知も消去
    self.registration.getNotifications().then(ns => ns.forEach(n => n.close()));
  }
});
