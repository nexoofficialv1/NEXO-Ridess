// NEXO Ride cache reset service worker sprint8j-market-stable-cache-reset
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    try { const keys = await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k))); } catch(e){}
    try { await self.registration.unregister(); } catch(e){}
    try { const cs = await clients.matchAll({type:'window'}); cs.forEach(c=>c.navigate(c.url)); } catch(e){}
  })());
});
self.addEventListener('fetch', event => { return; });
