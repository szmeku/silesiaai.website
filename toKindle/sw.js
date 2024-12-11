const CACHE_NAME = 'tokindle-v1';
const ASSETS = [
    '/toKindle/',
    '/toKindle/index.html',
    '/toKindle/style.css',
    '/toKindle/app.js',
    '/toKindle/manifest.json',
    '/toKindle/libs/Readability.js',
    '/toKindle/libs/purify.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Cache what we can, ignore failures
                return Promise.allSettled(
                    ASSETS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn('Failed to cache:', url, err);
                            return null;
                        })
                    )
                );
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Handle share target and direct navigation
    if (url.pathname.endsWith('/share-target/') || url.pathname.endsWith('/toKindle/')) {
        const targetUrl = url.searchParams.get('url') || url.searchParams.get('text');
        if (targetUrl) {
            event.respondWith(
                Response.redirect('/toKindle/index.html?url=' + encodeURIComponent(targetUrl))
            );
            return;
        }
    }

    // Serve index.html for root path
    if (url.pathname === '/toKindle/' || url.pathname === '/toKindle/index.html') {
        event.respondWith(
            caches.match('/toKindle/index.html')
                .then(response => response || fetch('/toKindle/index.html'))
        );
        return;
    }

    // Check if this is a request for our own assets
    if (url.pathname.startsWith('/toKindle/')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
                .catch(() => fetch(event.request)) // Fallback to network if cache fails
        );
        return;
    }

    // For external requests
    event.respondWith(fetch(event.request));
}); 