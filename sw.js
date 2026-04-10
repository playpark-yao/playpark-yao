// 通知を受け取った時の処理
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'プレーパーク八尾', body: '新しいお知らせがあります！' };
    const title = data.title;
    const options = {
        body: data.body,
        icon: 'icon.png',
        badge: 'icon.png',
        data: { url: './index.html' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// 通知をクリックした時の処理
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
