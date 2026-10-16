(function(){
'use strict';
const M=window.WarehouseModel,canvas=document.getElementById('scene'),renderer=window.WarehouseRenderer.createRenderer(canvas);
const isoView=()=>innerWidth<520?{yaw:.22,elev:1,zoom:1}:{yaw:.66,elev:.76,zoom:1};
const initialMode=new URL(location.href).searchParams.get('layout')==='floor'?'floor':'racks';
let config={...M.defaults,storageMode:initialMode},result=M.calculate(config),view=isoView(),pointer=null;
const fmt=n=>n.toLocaleString('ko-KR'),el=id=>document.getElementById(id),form=el('carton-form');
function draw(){const r=canvas.getBoundingClientRect();renderer.render(result,{...view,width:r.width,height:r.height,dpr:Math.min(devicePixelRatio||1,2)});}
function update(){
 result=M.calculate(config);const floor=config.storageMode==='floor';
 document.querySelectorAll('[data-storage]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.storage===config.storageMode)));
 el('stack-control').hidden=!floor;el('floor-notice').hidden=!floor;
 el('capacity-label').textContent=floor?'박스 적재 가능 · 계산값':'선반 배치 가능 · 계산값';
 el('view-title').textContent=floor?'랙 없이 박스로만 쌓는 안':'기둥·곡면 외장을 보존한 선반 안';
 el('box-size').innerHTML=`${fmt(config.boxW)} × ${fmt(config.boxD)} × ${fmt(config.boxH)} <small>mm</small>`;
 el('placed').innerHTML=`${fmt(result.placed)} <small>/ ${fmt(config.count)}박스</small>`;el('overflow').innerHTML=`${fmt(result.overflow)} <small>박스 + 기타 물량 미확인</small>`;
 const fit=result.overflow===0;document.querySelector('.result-card').classList.toggle('fit',fit);
 el('result-title').textContent=fit?'이 가정에서는 케이크 배치 가능':`케이크 ${fmt(result.overflow)}박스의 자리가 더 필요해요`;
 el('result-copy').textContent=`${floor?'바닥 적재 구획':'케이크용 선반'}의 계산 수용량은 ${fmt(result.cakeCapacity)}박스입니다. ${config.reserveOther?'B1·B2는 기타 상품용으로 남겨두었습니다.':'B1·B2까지 케이크로 사용하는 비교 상태입니다. 기타 상품의 별도 자리가 필요합니다.'} 케이크 박스만의 외형 부피는 ${result.cakeVolume.toFixed(1)}㎥입니다. ${floor?'적재 단수는 비교를 위한 가정이며 박스의 허용 적재 단수는 아직 확인 전입니다.':fit?'실제 박스와 선반 내경·무게를 확인해 확정해주세요.':'박스 크기를 확인한 뒤 초도·추가 물량을 나누어 받는 방안을 함께 검토해주세요.'}`;
 const rackResult=M.calculate({...config,storageMode:'racks'}),floorResult=M.calculate({...config,storageMode:'floor'});
 el('compare-racks').textContent=`선반 ${fmt(rackResult.cakeCapacity)}박스`;
 el('compare-floor').textContent=`박스 ${floorResult.racks[0].levels}단 ${fmt(floorResult.cakeCapacity)}박스`;
 const actualLayers=floorResult.racks[0].levels;
 el('stack-height').textContent=`계산 ${actualLayers}단 · 높이 ${fmt(actualLayers*config.boxH)}mm${actualLayers<config.stackLayers?' · 높이 2m 상한 적용':''}`;
 el('schedule-title').textContent=floor?'바닥 구획별 적재·수량':'선반별 배치·수량';
 el('dimension-heading').textContent=floor?'바닥 구획 · mm':'선반 외경 · mm';
 el('rack-table').innerHTML=result.racks.map(r=>`<tr><td><b>${r.id}</b></td><td>${r.label}${r.reserved?'<small>기타 상품 공간 유지</small>':''}</td><td>${Math.round(r.w*1000)} × ${Math.round(r.d*1000)}${floor?`<small>적재 높이 ${Math.round(r.h*1000)}mm</small>`:' × 1950'}</td><td>${r.nx*r.ny}박스/${floor?'층':'단'} × ${r.levels}${floor?'층':'단'}<small>총 ${r.capacity}박스 · 동일 크기 가정</small></td><td>${r.reserved?'기타 상품용':r.placed+'박스'}</td></tr>`).join('');
 el('preview-download').href=(floor?'warehouse-floor-overview.webp':'warehouse-overview.webp')+'?v=20261016-w2';
 el('model-download').href=(floor?'warehouse-floor-layout.glb':'warehouse-layout.glb')+'?v=20261016-w2';
 el('selection').textContent=floor?'A는 케이크 박스 적재, B는 기타 상품 구획입니다. 작업대와 골대 자리는 비워둡니다.':'A는 케이크 선반, B는 기타 상품 선반입니다. 구획을 누르면 상세 수량을 볼 수 있어요.';
 draw();
}
function readForm(){return {...config,boxW:Number(form.elements.boxW.value),boxD:Number(form.elements.boxD.value),boxH:Number(form.elements.boxH.value),count:Number(form.elements.count.value),stackLayers:Number(form.elements.stackLayers.value)};}
for(const button of document.querySelectorAll('[data-storage]'))button.addEventListener('click',()=>{config={...config,storageMode:button.dataset.storage};const url=new URL(location.href);url.searchParams.set('layout',config.storageMode);history.replaceState(null,'',url);update();});
el('stack-layers').addEventListener('change',()=>form.requestSubmit());
form.addEventListener('submit',e=>{e.preventDefault();try{const candidate=readForm();M.calculate(candidate);config=candidate;update();el('input-error').textContent='';}catch(error){el('input-error').textContent=error.message;}});
for(const button of document.querySelectorAll('[data-size]'))button.addEventListener('click',()=>{const [w,d,h]=button.dataset.size.split(',');form.elements.boxW.value=w;form.elements.boxD.value=d;form.elements.boxH.value=h;form.requestSubmit();});
for(const [id,key] of [['reserve-other','reserveOther'],['store-hoop','storeHoop'],['show-boxes','showBoxes'],['show-structure','showStructure']])el(id).addEventListener('change',e=>{config={...config,[key]:e.target.checked};update();});
function preset(name){view=name==='plan'?{yaw:0,elev:Math.PI/2,zoom:1}:name==='reverse'?{yaw:Math.PI+.66,elev:.78,zoom:1}:name==='door'?{yaw:Math.PI/2,elev:.56,zoom:1}:isoView();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));draw();}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.view)));document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{view.zoom=Math.max(.65,Math.min(2.4,view.zoom*Number(b.dataset.zoom)));draw();}));el('reset-view').addEventListener('click',()=>preset('iso'));
canvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;view.yaw+=(e.clientX-pointer.x)*.007;view.elev=Math.max(.25,Math.min(Math.PI/2,view.elev+(e.clientY-pointer.y)*.006));pointer.x=e.clientX;pointer.y=e.clientY;draw();});
canvas.addEventListener('pointerup',e=>{if(pointer&&Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)<8){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let nearest=renderer.hitAreas.map(h=>({...h,distance:Math.hypot(h.anchor[0]-x,h.anchor[1]-y)})).sort((a,b)=>a.distance-b.distance)[0];if(nearest&&nearest.distance<70){const r=result.racks.find(r=>r.id===nearest.id);el('selection').textContent=`${r.id} · ${r.label} / ${r.storageType==='floor'?'바닥 구획':'선반 외경'} ${Math.round(r.w*1000)}×${Math.round(r.d*1000)}${r.storageType==='floor'?'':'×1,950'}mm / 입력 크기 기준 ${r.capacity}박스 수용${r.reserved?' · 기타 상품용으로 비워둠':` · 케이크 ${r.placed}박스 배치`}`;}}pointer=null;});
canvas.addEventListener('pointercancel',()=>{pointer=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();view.zoom=Math.max(.65,Math.min(2.4,view.zoom*Math.exp(-e.deltaY*.001)));draw();},{passive:false});
new ResizeObserver(draw).observe(canvas.parentElement);update();
})();
