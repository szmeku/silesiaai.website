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
    
    if (url.pathname === '/toKindle/share-target/') {
        // Get shared data from URL parameters
        const sharedUrl = url.searchParams.get('url');
        const sharedTitle = url.searchParams.get('title');
        const sharedText = url.searchParams.get('text');
        
        // Redirect to main page with shared data
        event.respondWith(
            Response.redirect('/toKindle/?shared=' + encodeURIComponent(sharedUrl || sharedText))
        );
    }
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
}); 