/* ASCEND caches public app files only. Never cache Auth, API responses or media. */
const CACHE='ascend-shell-8be291540a4ed556';
const base=new URL('./',self.location.href);
const assets=['ascend-index.html','vendor/supabase-2.112.3.js','manifest.webmanifest','icons/icon-1024.png','icons/apple-touch-icon.png'].map(p=>new URL(p,base).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const url of assets){const response=await fetch(new Request(url,{cache:'reload',credentials:'omit'}));if(!response.ok)throw Error('Offline asset missing');await cache.put(url,response);}await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('ascend-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==base.origin)return;const relative=url.pathname.slice(base.pathname.length),navigation=req.mode==='navigate'&&['','ascend-index','ascend-index.html'].includes(relative);if(!navigation&&!assets.includes(url.href))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(navigation){try{const response=await fetch(req);if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))throw Error('Shell unavailable');await cache.put(assets[0],response.clone());return response;}catch{const saved=await cache.match(assets[0]);return saved||new Response('ASCEND has not been saved for offline use. Open it online once.',{status:503,headers:{'Content-Type':'text/plain'}});}}return (await cache.match(url.href))||fetch(req);})());
});
