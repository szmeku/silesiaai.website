const CACHE_NAME = 'tokindle-v1';
const ASSETS = [
    '/toKindle/',
    '/toKindle/index.html',
    '/toKindle/style.css',
    '/toKindle/app.js',
    '/toKindle/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Handle share target
    if (url.pathname === '/toKindle/share-target/') {
        event.respondWith(
            Response.redirect('/toKindle/index.html?shared=' + encodeURIComponent(url.searchParams.get('url') || url.searchParams.get('text')))
        );
        return;
    }

    // Handle root path
    if (url.pathname === '/toKindle/') {
        event.respondWith(
            caches.match('/toKindle/index.html')
                .then(response => response || fetch('/toKindle/index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
}); 