const CACHE_NAME = 'mh-refine-v1.3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 安装：预缓存所有资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 逐个添加，某个失败不影响整体
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => {
            console.warn('缓存失败:', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting(); // 新 SW 立即激活，不等旧页面关闭
});

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim(); // 立即接管所有页面
});

// 请求：缓存优先
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached; // 缓存命中，直接返回
      }
      // 缓存没有，去网络请求
      return fetch(event.request).then((response) => {
        // 只缓存同源的成功响应
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // 网络失败，回退到 index.html
        return caches.match('./index.html');
      });
    })
  );
});