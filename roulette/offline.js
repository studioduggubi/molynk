(function(){
  'use strict';
  const status=document.getElementById('offline-status'),text=document.getElementById('offline-status-text'),dialog=document.getElementById('offline-dialog'),help=document.getElementById('offline-help-status'),retry=document.getElementById('offline-retry');
  let registration=null,prepared=false,checking=false;
  function paint(kind,message){
    status.dataset.status=kind;status.classList.toggle('is-ready',kind==='ready');status.classList.toggle('is-error',kind==='error');
    text.textContent=message;help.textContent=kind==='ready'?'게임 저장이 끝났어요. 인터넷이 끊겨도 돌릴 수 있어요.':message;
  }
  function readyLabel(){return navigator.onLine?'오프라인 준비 완료':'인터넷 없이 사용 중';}
  function ask(worker,type){
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(new Error('상태 확인 시간이 초과됐어요.'));},5000);
      channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
      worker.postMessage({type},[channel.port2]);
    });
  }
  async function check(repair=false){
    if(checking)return;
    if(!('serviceWorker' in navigator)){paint('error','Safari에서 오프라인 준비를 해주세요');return;}
    checking=true;retry.disabled=true;paint('pending','게임을 이 기기에 저장하는 중…');
    try{
      // Reuse the installed worker offline: do not make registration depend on a network fetch.
      registration??=await navigator.serviceWorker.getRegistration('./');
      const expectedScope=new URL('./',location.href).href;
      if(!registration||registration.scope!==expectedScope)registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      let timeout;
      try{
        const ready=await Promise.race([navigator.serviceWorker.ready,new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(new Error('인터넷 연결 후 다시 확인해주세요.')),25000);})]);
        registration=ready;
      }finally{clearTimeout(timeout);}
      const worker=registration.active||navigator.serviceWorker.controller;
      if(!worker)throw new Error('게임 저장을 준비하고 있어요. 잠시 후 다시 확인해주세요.');
      let result=await ask(worker,repair&&navigator.onLine?'REPAIR_OFFLINE':'OFFLINE_STATUS');
      if(!result.ready&&navigator.onLine&&!repair)result=await ask(worker,'REPAIR_OFFLINE');
      prepared=Boolean(result.ready);
      if(prepared)paint('ready',readyLabel());
      else paint('error',navigator.onLine?'게임 저장을 완료하지 못했어요 · 다시 확인':'인터넷 연결 후 오프라인 준비를 해주세요');
      if(navigator.onLine)registration.update().catch(()=>{});
    }catch(error){prepared=false;paint('error',navigator.onLine?'게임 저장을 완료하지 못했어요 · 다시 확인':'인터넷 연결 후 오프라인 준비를 해주세요');}
    finally{checking=false;retry.disabled=false;}
  }
  status.addEventListener('click',()=>dialog.showModal());document.getElementById('offline-close').addEventListener('click',()=>dialog.close());retry.addEventListener('click',()=>check(true));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  window.addEventListener('online',()=>check());
  window.addEventListener('offline',()=>{if(prepared)paint('ready',readyLabel());else if(!checking)paint('error','인터넷 연결 후 오프라인 준비를 해주세요');});
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!checking)check();});
    navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='OFFLINE_STATUS'&&event.data.ready){prepared=true;paint('ready',readyLabel());}});
  }
  check();
})();
