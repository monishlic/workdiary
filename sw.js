/* WorkDiary service worker — makes the app installable and works offline for the shell.
   It ONLY touches same-origin GET requests (the app files); all backend/API calls pass through untouched. */
const CACHE = 'workdiary-v3';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(
  caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); })
); });
self.addEventListener('fetch', function(e){
  try{
    var url = new URL(e.request.url);
    if(e.request.method !== 'GET' || url.origin !== location.origin) return; // leave API/cross-origin alone
    e.respondWith(
      fetch(e.request).then(function(r){
        var copy = r.clone();
        caches.open(CACHE).then(function(c){ try{ c.put(e.request, copy); }catch(_){} });
        return r;
      }).catch(function(){ return caches.match(e.request); })
    );
  }catch(_){}
});
