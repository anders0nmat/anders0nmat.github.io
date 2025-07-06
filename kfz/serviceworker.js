/// <reference lib="WebWorker" />
const cacheName = "v1";
async function addToCache(resources) {
    const cache = await caches.open(cacheName);
    await cache.addAll(resources);
}
self.addEventListener("install", event => {
    event.waitUntil(addToCache([
        '/kfz',
        '/kfz/settings',
        '/kfz/data.json',
        '/kfz/i18n.json',
        '/kfz/default_keys.json',
        '/kfz/eu-plate.ttf',
        '/kfz/eu-stars.svg',
    ]));
});
async function putInCache(request, response) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
}
async function cacheLast(request, event) {
    try {
        const networkResponse = await fetch(request);
        event.waitUntil(putInCache(request, networkResponse.clone()));
        return networkResponse;
    }
    catch {
        return await caches.match(request) ?? new Response("Network error", {
            status: 408,
            headers: { "Content-Type": "text/plain" }
        });
    }
}
self.addEventListener("fetch", event => {
    event.respondWith(cacheLast(event.request, event));
});
