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
            .then(cache => cache.addAll(ASSETS))
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
        );
        return;
    }

    // For external requests, including CORS proxy
    if (!url.pathname.startsWith('/toKindle/')) {
        // If it's already a CORS proxy request, let it through
        if (url.href.includes('cors-anywhere.herokuapp.com')) {
            event.respondWith(
                fetch(event.request, {
                    mode: 'cors',
                    credentials: 'omit'
                })
            );
            return;
        }

        // Otherwise, proxy the request
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${event.request.url}`;
        event.respondWith(
            fetch(proxyUrl, {
                mode: 'cors',
                credentials: 'omit'
            }).then(async response => {
                if (!response.ok) {
                    console.error('Proxy response not OK:', response.status, response.statusText);
                    const text = await response.text();
                    console.error('Response text:', text);
                    throw new Error(`Proxy response ${response.status}`);
                }
                return response;
            }).catch(error => {
                console.error('Proxy fetch failed:', error);
                return fetch(event.request); // Fallback to direct request
            })
        );
        return;
    }

    // Default response for other requests
    event.respondWith(fetch(event.request));
}); 