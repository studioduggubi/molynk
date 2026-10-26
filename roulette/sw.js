'use strict';
const VERSION='20261026-r16';
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
  'assets/spin-cake.mp3',
  'assets/spin-win.mp3',
  'assets/spin-again.mp3',
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
async function cachedResponse(request,response){
  // Safari seeks with Range requests, including when audio is played offline.
  const range=request.headers?.get('range');
  if(!range||!new URL(request.url).pathname.endsWith('.mp3'))return response;
  const data=await response.arrayBuffer(),size=data.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  const end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  return new Response(data.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1)}});
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
    if(cached)return cachedResponse(request,cached);
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
