'use strict';
const VERSION='20261025-r7';
const PREFIX='molynk-roulette-offline-';
const CACHE=PREFIX+VERSION;
const SCOPE=new URL(self.registration.scope);
const ASSETS=[
  'index.html?v='+VERSION,
  'styles.css?v='+VERSION,
  'core.js?v='+VERSION,
  'app.js?v='+VERSION,
  'offline.js?v='+VERSION,
  'manifest.webmanifest?v='+VERSION,
  'assets/logo.svg',
  'assets/game-font.woff',
  'assets/paperlogy-extrabold.woff2',
  'assets/title.svg',
  'assets/cake.webp',
  'assets/gelato.webp',
  'assets/matcha-laugen.webp',
  'assets/honey-laugen.webp',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/apple-touch-icon.png'
].map(path=>new URL(path,SCOPE).href);

async function prepare(){
  const cache=await caches.open(CACHE);
  // addAll completes only when every required game asset has been fetched.
  await cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})));
}
async function readiness(){
  const cache=await caches.open(CACHE);
  const present=await Promise.all(ASSETS.map(url=>cache.match(url,{ignoreSearch:true})));
  return {type:'OFFLINE_STATUS',version:VERSION,ready:present.every(Boolean),missing:ASSETS.filter((url,index)=>!present[index])};
}
self.addEventListener('install',event=>{
  event.waitUntil(prepare().then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=request.mode==='navigate'
      ?await cache.match(ASSETS[0],{ignoreSearch:true})
      :await cache.match(request,{ignoreSearch:true});
    // A weak or disconnected network must not delay an already-prepared game.
    if(cached)return cached;
    return fetch(request);
  })());
});
self.addEventListener('message',event=>{
  if(!event.ports?.[0])return;
  const reply=event.ports[0];
  event.waitUntil((async()=>{
    try{
      if(event.data?.type==='REPAIR_OFFLINE')await prepare();
      if(event.data?.type==='OFFLINE_STATUS'||event.data?.type==='REPAIR_OFFLINE')reply.postMessage(await readiness());
    }catch(error){reply.postMessage({type:'OFFLINE_STATUS',version:VERSION,ready:false,error:'게임 저장을 완료하지 못했어요.'});}
  })());
});
