/* E-Diary — background push handler.
   This runs even when the app/tab is closed, so notifications appear on the
   lock screen. FCM delivers queued messages automatically when the phone
   comes back online. These config values are the app's PUBLIC Firebase keys
   (safe to expose — they are not secrets). */
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

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
  var n = payload.notification || {};
  var d = payload.data || {};
  self.registration.showNotification(n.title || d.title || 'E-Diary', {
    body: n.body || d.body || '',
    icon: 'icon-192.png?v=3',
    badge: 'icon-192.png?v=3',
    tag: d.tag || n.tag || 'ediary',
    renotify: true,
    data: d
  });
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
