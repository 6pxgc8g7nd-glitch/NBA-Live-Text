const CACHE='nba-live-v13';
const SHELL=['./','index.html','zh.js','features.js','playoffs.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET')return;
  // 比分資料一律走網路,不快取
  if(u.hostname==='site.api.espn.com')return;
  // 同源外殼:網路優先,失敗才用快取(離線可開)
  if(u.origin===location.origin){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(ch=>ch.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
    return;
  }
  // 球隊 logo 等外部圖片:快取優先
  if(e.request.destination==='image'){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const c=n.clone();caches.open(CACHE).then(ch=>ch.put(e.request,c));return n}).catch(()=>Response.error())));
  }
});
