/* WorkDiary service worker — offline shell + push notifications in one worker.
   (One SW avoids scope clashes; this file lives under /workdiary/ so it works on
   GitHub Pages project sites where the app is served from a sub-path.) */

/* ---- Firebase Cloud Messaging (background / lock-screen notifications) ---- */
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');
try{
  firebase.initializeApp({
    apiKey: "AIzaSyCCxHyL24d_XWhywcDl1CHEu_l3FiPcKZQ",
    authDomain: "e-diary-3453b.firebaseapp.com",
    projectId: "e-diary-3453b",
    storageBucket: "e-diary-3453b.firebasestorage.app",
    messagingSenderId: "424630863645",
    appId: "1:424630863645:web:3c9b238d4fa89093b043f4"
  });
  var messaging = firebase.messaging();
  messaging.onBackgroundMessage(function(payload){
    var n = payload.notification || {}, d = payload.data || {};
    self.registration.showNotification(n.title || d.title || 'E-Diary', {
      body: n.body || d.body || '',
      icon: 'icon-192.png?v=3',
      badge: 'icon-192.png?v=3',
      tag: d.tag || n.tag || 'ediary',
      renotify: true,
      data: d
    });
  });
}catch(e){ /* messaging optional; offline still works */ }

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){
      for(var i=0;i<list.length;i++){ if('focus' in list[i]) return list[i].focus(); }
      if(clients.openWindow) return clients.openWindow('./');
    })
  );
});

/* ---- Offline shell (same-origin GET only; leaves API/cross-origin alone) ---- */
const CACHE = 'workdiary-v31';
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
