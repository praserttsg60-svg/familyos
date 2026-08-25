const CACHE='familyos-v10-ios-push';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return; const u=new URL(r.url);
 if(u.origin===location.origin){e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c)).catch(()=>{});return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));return;}
 if(/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u.href)){e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c)).catch(()=>{});return res;}).catch(()=>hit)));}
});
self.addEventListener('push',event=>{
 let data={};try{data=event.data?event.data.json():{};}catch(e){data={title:'Family OS',body:event.data?.text()||'มีรายการที่ต้องจัดการ'};}
 const title=data.title||'Family OS';
 const options={body:data.body||'',icon:data.icon||'/icon-192.png',badge:data.badge||'/icon-192.png',tag:'familyos-reminder',renotify:true,data:{url:data.url||'/'}};
 event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification.data?.url||'/';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus' in c){c.navigate(url);return c.focus();}}return clients.openWindow(url);}));});
