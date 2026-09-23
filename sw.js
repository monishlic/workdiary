/* WorkDiary service worker — offline shell + push notifications.
   Handles the raw 'push' event directly (no Firebase SDK inside the SW), which
   is the most reliable way to draw web notifications. Lives under /workdiary/
   so it works on GitHub Pages project sites. */

const CACHE = 'workdiary-v36';
/* Cloudflare Worker that sends pushes AND (new) writes quick replies to Firestore. */
const PUSH_ENDPOINT = 'https://ediary-push.monishlic-8e8.workers.dev/';

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
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){
      // If an app window is focused, it shows its own in-app alert — skip the OS popup
      // to avoid a duplicate. Otherwise (closed / background) show the lock-screen popup.
      var focused = list.some(function(c){ return c.focused === true || c.visibilityState === 'visible'; });
      if(focused) return;
      var opts = {
        body: body,
        icon: 'icon-192.png?v=3',
        badge: 'icon-192.png?v=3',
        tag: tag,
        renotify: true,
        requireInteraction: true,   // stay on screen until the user acts (no 5s auto-hide)
        data: d
      };
      // Chat / DM / mention notifications get quick-reply buttons.
      // Desktop shows the first two; Android shows all three (and an inline text box for Reply).
      if(d.quick === '1'){
        opts.actions = [
          { action:'reply',    type:'text', title:'Reply', placeholder:'Type a reply…' },
          { action:'thumbsup', title:'👍 Thumbs up' },
          { action:'okay',     title:'Okay' }
        ];
      }
      return self.registration.showNotification(title, opts);
    })
  );
});

function focusApp(){
  return clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){
    for(var i=0;i<list.length;i++){ if('focus' in list[i]) return list[i].focus(); }
    if(clients.openWindow) return clients.openWindow('./');
  });
}

/* Post a quick reply to the Worker, which writes it to Firestore and pushes the
   other person. Then show a small confirmation so the user knows it went through. */
function sendQuickReply(d, text){
  return fetch(PUSH_ENDPOINT, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ type:'reply', kind:d.kind || 'dm', meId:d.meId || '', peerId:d.peerId || '', channel:d.channel || '', text: text })
  }).then(function(r){
    if(!r.ok) throw new Error('reply failed');
    return self.registration.showNotification('E-Diary', {
      body: '✓ Sent: ' + text, icon:'icon-192.png?v=3', badge:'icon-192.png?v=3',
      tag: (d.tag || 'ediary') + '-sent', requireInteraction:false
    });
  }).catch(function(){
    return self.registration.showNotification('E-Diary', {
      body: '⚠️ Couldn’t send your reply — tap to open and try again.',
      icon:'icon-192.png?v=3', badge:'icon-192.png?v=3', tag:(d.tag || 'ediary') + '-fail'
    });
  });
}

self.addEventListener('notificationclick', function(event){
  var d = (event.notification && event.notification.data) || {};
  var act = event.action;
  event.notification.close();
  if(d.quick === '1' && (act === 'thumbsup' || act === 'okay' || act === 'reply')){
    var text = act === 'thumbsup' ? '👍' : (act === 'okay' ? 'Okay' : (event.reply || ''));
    // Reply tapped with no inline text (e.g. desktop) → open the app to type.
    if(act === 'reply' && !text){ event.waitUntil(focusApp()); return; }
    event.waitUntil(sendQuickReply(d, text));
    return;
  }
  event.waitUntil(focusApp());
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
