/* WorkDiary service worker — offline shell + push notifications.
   Handles the raw 'push' event directly (no Firebase SDK inside the SW), which
   is the most reliable way to draw web notifications. Lives under /workdiary/
   so it works on GitHub Pages project sites. */

const CACHE = 'workdiary-v33';

/* ---- Lock-screen / background notifications (raw Web Push) ---- */
self.addEventListener('push', function(event){
  var payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch(e){ try { payload = { data:{ body: event.data.text() } }; } catch(_){ payload = {}; } }
  var d = payload.data || {};
  var n = payload.notification || {};
  var title = d.title || n.title || 'E-Diary';
  var body  = d.body  || n.body  || '';
  var tag   = d.tag   || n.tag   || 'ediary';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: 'icon-192.png?v=3',
      badge: 'icon-192.png?v=3',
      tag: tag,
      renotify: true,
      data: d
    })
  );
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){
      for(var i=0;i<list.length;i++){ if('focus' in list[i]) return list[i].focus(); }
      if(clients.openWindow) return clients.openWindow('./');
    })
  );
});

/* ---- Offline shell (same-origin GET only) ---- */
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(
  caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); })
); });
self.addEventListener('fetch', function(e){
  try{
    var url = new URL(e.request.url);
    if(e.request.method !== 'GET' || url.origin !== location.origin) return;
    e.respondWith(
      fetch(e.request).then(function(r){
        var copy = r.clone();
        caches.open(CACHE).then(function(c){ try{ c.put(e.request, copy); }catch(_){} });
        return r;
      }).catch(function(){ return caches.match(e.request); })
    );
  }catch(_){}
});
