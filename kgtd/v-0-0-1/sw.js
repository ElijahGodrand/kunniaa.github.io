const CACHE_NAME = 'kgtd-cache-v1';
const urlsToCache = [
    'kgtd.html',
    'css/tailwind.kgtd.min.css',
    'js/sql-wasm.js',
    'js/ksqlite.min.js',
    'js/kgtd-egn.min.js',
    'js/kgtd.min.js',
    'js/sql-wasm.wasm',
    'https://unpkg.com/dexie/dist/dexie.js',
    'https://cdn.jsdelivr.net/npm/eruda',
    'https://unpkg.com/vconsole@latest/dist/vconsole.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    '/favicon.png'
];

// 安装 Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 处理请求
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果在缓存中找到响应，则返回缓存的响应
                if (response) {
                    return response;
                }

                // 否则发起网络请求
                return fetch(event.request).then(
                    response => {
                        // 检查是否是有效的响应
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 克隆响应
                        const responseToCache = response.clone();

                        // 将响应添加到缓存
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
            .catch(() => {
                // 如果都失败了，可以返回一个离线页面
                return new Response('离线模式：无法获取新数据');
            })
    );
});
