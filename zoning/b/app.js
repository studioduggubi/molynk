const baseData=JSON.parse(document.getElementById('b-data').textContent);
let data=MolynkZoning.forScenario(baseData,new URL(location.href).searchParams.get('plan')||'with-hoop');
let currentScenario=data.scenarioId,activeRoute='explore';
let products=data.products;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={'케이크':'#c33f70','젤라또':'#ce7798','빵':'#a5703c','디저트':'#aa668f','동물':'#7e78a4','굿즈':'#557b88'};
let selected=1,mode='products';
const dialog=document.getElementById('image-dialog');
const quantityLabel=s=>s.n===8?'디저트·과일 996개 + 민트 3종 수량 확인':s.quantity_text;
const countLabel=(amount,conditional=0,unit='개')=>`${amount}${unit}${conditional?` + 확인 후 ${conditional}${unit}`:''}`;
function jump(n,forceReveal=false){select(Number(n));if(forceReveal||matchMedia('(max-width: 1020px)').matches)document.getElementById('stand-detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
function showImage(key){const p=products[key];document.getElementById('image-name').textContent=p.name;document.getElementById('large-image').src=p.image;document.getElementById('large-image').alt=p.name;document.getElementById('image-quantity').textContent=p.quantity_label;dialog.showModal();}
function cards(s){return `<div class="product-grid">${s.keys.map(key=>{const p=products[key];return `<article class="product"><button class="product-image" data-image="${p.key}" aria-label="${esc(p.name)} 이미지 확대"><img src="${p.image}" alt="${esc(p.name)}" width="240" height="240"></button><div class="product-copy"><h3>${esc(p.name)}</h3><p class="qty">${esc(p.quantity_label)}</p><p class="product-target">전시·체험 ${countLabel(s.sample_by_key?.[key]??p.samples,p.conditional_samples)} · ${p.purchase_at==='캐셔'?'포장 전달: 캐셔':`구매 포장 ${countLabel(p.purchase,p.conditional_purchase)}`}</p><small>${esc(p.quantity_note)}</small></div></article>`;}).join('')}</div>`;}
function metrics(s){let buying=countLabel(s.purchase,s.conditional_purchase,'포장');if([1,2,3,4].includes(s.n))buying='캐셔에서 포장 전달';return `<div class="metrics"><div><span>발주 대응 수량</span><b>${esc(quantityLabel(s))}</b></div><div><span>전시·체험용 실물 목표</span><b>${countLabel(s.samples,s.conditional_samples)}</b></div><div><span>직접 고를 구매 포장</span><b>${esc(buying)}</b></div></div>`;}
function stockDetail(s){const grouped=new Map();for(const key of s.keys){const p=products[key];const loc=String(p.buffer_at);if(!grouped.has(loc))grouped.set(loc,[]);grouped.get(loc).push(p);}return `<div class="stock-connections">${[...grouped.entries()].map(([location,ps])=>`<div class="connection"><b>${/^\d+$/.test(location)?`<button data-jump="${location}">${location}번 하부 보기 ↗</button>`:esc(location)}</b><p>${ps.map(p=>`${esc(p.name)} · ${countLabel(p.buffer,p.conditional_buffer,'판매포장')}`).join('<br>')}</p></div>`).join('')}</div><p class="op-note">하부 목표는 이 상품군의 보충분입니다. 해당 매대의 자체 상품 자리를 먼저 확보하고, 실제 칸에 맞지 않는 위성 보충분은 창고에서 바로 보충합니다.</p>`;}
function ringLayout(s){
 if(!s.ring_pattern)return '';
 const count=s.ring_pattern.length;
 const images=s.ring_pattern.map((item,i)=>{
  const angle=(-80+160*i/(count-1))*Math.PI/180;
  const x=120+105*Math.cos(angle),y=130+105*Math.sin(angle);
  return `<image href="${esc(item.image)}" x="${x-13}" y="${y-13}" width="26" height="26" preserveAspectRatio="xMidYMid meet"><title>${esc(item.option)}</title></image>`;
 }).join('');
 return `<div class="ring-layout"><h3>반원 둘레 진열 · ${count}개 시작안</h3><svg class="ring-arrangement" viewBox="0 0 270 260" role="img" aria-label="${s.n}번 매대 반원 둘레의 ${count}개 제품 배열 예시"><path d="M138 27 A105 105 0 0 1 138 233" fill="none" stroke="#e5dbd6" stroke-width="32"/><text x="95" y="125" text-anchor="middle">기둥 쪽</text><text x="95" y="144" text-anchor="middle">안쪽</text>${images}</svg><p>${esc(s.touch_note)}</p><small>반원 구간을 채우는 순서의 예시입니다. 실물 폭·받침·간격을 재서 수량을 늘리거나 줄입니다. 전시와 체험 수량을 중복 계산하지 않습니다.</small></div>`;
}
function detail(s){const head=`<div class="detail-head"><span class="stand-number" style="background:${colors[s.zone]}">${s.n}</span><div><small>${esc(s.location)}</small><h2>${esc(s.role)}</h2></div></div>${metrics(s)}`;const operations=`<div class="operation"><h3>진열과 체험 위치</h3><p>${esc(s.display)}</p><h3>고객이 포장을 고르는 자리</h3><p>${esc(s.purchase_note)}</p><h3>보충 재고를 어디에 둘까</h3><p>${esc(s.stock_note)}</p></div>`;const content=ringLayout(s)+(mode==='stock'?stockDetail(s)+operations+cards(s):mode==='flow'?`<div class="flow-callout"><b>이 매대의 역할</b><p>${esc(s.change)}</p><p>${esc(s.purchase_note)}</p></div>`+cards(s)+operations:cards(s)+operations);document.getElementById('stand-detail').innerHTML=head+content;}
function select(n,updateHash=true){
 if(!Number.isInteger(n)||n<1||n>13)n=1;
 selected=n;const s=data.stations.find(s=>s.n===n);
 document.querySelectorAll('[data-id]').forEach(el=>{const yes=Number(el.dataset.id)===n;el.classList.toggle('selected',yes);el.setAttribute('aria-pressed',String(yes));});
 document.querySelectorAll('.number-button[data-jump]').forEach(el=>el.classList.toggle('selected',Number(el.dataset.jump)===n));
 document.querySelectorAll('#summary-table tr').forEach(el=>el.classList.toggle('selected-row',Number(el.dataset.row)===n));
 detail(s);
 document.getElementById('map-caption').textContent=mode==='stock'?'5번 NO.J는 9번 하부, 6번 작은 빵은 10번 하부, 7번 Tonki는 창고에서 보충합니다. 실제 하부 수용량을 먼저 확인합니다.':mode==='flow'?data.scenario.flow_intro:data.scenario.map_caption+' 번호를 누르면 상품·수량·배치 이유를 볼 수 있습니다. 배경 치수는 이동 전 기준입니다.';
 if(updateHash){const hash=`#${n}${mode==='products'?'':'-'+mode}`;if(location.hash!==hash)history.replaceState(null,'',hash);}
 document.getElementById('copy-status').textContent='';
}
function changeMode(next){mode=['products','stock','flow'].includes(next)?next:'products';document.querySelectorAll('[data-mode]').forEach(el=>{const yes=el.dataset.mode===mode;el.classList.toggle('active',yes);el.setAttribute('aria-pressed',String(yes));});document.getElementById('map-card').classList.toggle('products-mode',mode==='products');document.getElementById('map-card').classList.toggle('stock-mode',mode==='stock');document.getElementById('map-card').classList.toggle('flow-mode',mode==='flow');select(selected);}
function loadLocation(){if(['#customer-experience','#product-zoning','#approved-zoning','#event-queue'].includes(location.hash)){select(selected,false);return;}const m=location.hash.match(/^#(?:[ABC]-)?(\d{1,2})(?:-(stock|flow))?$/);selected=m?Number(m[1]):1;changeMode(m&&m[2]?m[2]:'products');}
for(const s of data.stations){const el=document.querySelector(`.station[data-id="${s.n}"]`);const color=colors[s.zone];el.querySelector('.pin').setAttribute('fill',color);const shape=el.querySelector('path,rect');shape.setAttribute('fill',color);if(shape.hasAttribute('stroke'))shape.setAttribute('stroke',color);el.setAttribute('aria-label',`${s.n}번 ${s.zone} ${s.keys.map(k=>products[k].name).join(', ')}`);}
document.addEventListener('click',e=>{
 const scenario=e.target.closest('[data-scenario]');if(scenario){applyScenario(scenario.dataset.scenario);return;}
 const route=e.target.closest('[data-route]');if(route){selectRoute(route.dataset.route);return;}
 const reveal=Boolean(e.target.closest('#customer-experience,#product-zoning,#stock-hubs,#representative-notes'));
 const photo=e.target.closest('[data-image]');if(photo){showImage(photo.dataset.image);return;}
 const jumpLink=e.target.closest('[data-jump]');if(jumpLink){jump(jumpLink.dataset.jump,reveal);return;}
 const pin=e.target.closest('.station');if(pin){jump(pin.dataset.id,reveal);return;}
 const tab=e.target.closest('[data-mode]');if(tab)changeMode(tab.dataset.mode);
});
document.querySelectorAll('.station').forEach(el=>el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();jump(el.dataset.id,Boolean(el.closest('#customer-experience')));}}));
document.getElementById('image-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
document.getElementById('copy-button').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);document.getElementById('copy-status').textContent=`${selected}번 매대 링크를 복사했어요.`;}catch{document.getElementById('copy-status').textContent='주소창의 링크를 복사하면 이 매대와 보기 모드를 함께 공유할 수 있어요.';}});
document.getElementById('inventory-search').addEventListener('input',e=>{const search=e.target.value.trim().toLocaleLowerCase();let visible=0;document.querySelectorAll('[data-inventory-name]').forEach(el=>{const show=el.dataset.inventoryName.toLocaleLowerCase().includes(search);el.hidden=!show;if(show)visible++;});document.getElementById('inventory-count').textContent=`40개 상품군 중 ${visible}개 표시`;});
window.addEventListener('hashchange',loadLocation);
const mapDialog=document.getElementById('map-dialog');
document.getElementById('map-expand').addEventListener('click',()=>{const clone=document.getElementById('floor-map').cloneNode(true);clone.removeAttribute('id');clone.querySelectorAll('.station').forEach(el=>{el.removeAttribute('tabindex');el.removeAttribute('role');el.removeAttribute('aria-pressed');});document.getElementById('large-map').replaceChildren(clone);mapDialog.showModal();});
document.getElementById('map-close').addEventListener('click',()=>mapDialog.close());
mapDialog.addEventListener('click',e=>{if(e.target.closest('.station'))mapDialog.close();});
function selectRoute(id){
 const route=data.journey.routes.find(r=>r.id===id)||data.journey.routes[0];
 activeRoute=route.id;
 document.querySelectorAll('[data-route]').forEach(el=>{const yes=el.dataset.route===route.id;el.classList.toggle('active',yes);el.setAttribute('aria-pressed',String(yes));});
 for(const [field,key] of [['name','name'],['subtitle','subtitle'],['sequence','sequence'],['purpose','purpose']])document.getElementById('route-'+field).textContent=route[key];
 document.querySelector('#customer-route-paths .route-browse').setAttribute('d',route.path);
 document.querySelector('#customer-route-paths .route-exit').setAttribute('d',route.exit_path);
 document.getElementById('route-browse-label').textContent=route.browse_label;
 document.getElementById('route-exit-label').textContent=route.exit_label;
 document.querySelectorAll('#customer-map .station').forEach(el=>el.classList.toggle('route-stop',route.stops.includes(Number(el.dataset.id))));
 document.getElementById('journey-table').innerHTML=route.steps.map((s,i)=>`<tr><td><b>${i+1} · ${esc(s.title)}</b><span class="journey-stations">${s.stations.length?s.stations.map(n=>`<button type="button" class="stand-link" data-jump="${n}">${n}</button>`).join(''):`<b>${esc(s.place_label||'캐셔 · 13번 옆')}</b>`}</span></td><td>${esc(s.feeling)}</td><td>${esc(s.action)}</td><td>${esc(s.display)}</td><td>${esc(s.next_action)}</td></tr>`).join('');
}
function scenarioAsset(value){return `${value}${value.includes('?')?'&':'?'}v=20261016-v14`;}
function shapePoint(x,y){return MolynkZoning.mapPoint(data.layout,x,y);}
function sectorPath(x,y,r,a,b){
 const [px,py]=shapePoint(x,y),[sx,sy]=shapePoint(x+r*Math.cos(a*Math.PI/180),y+r*Math.sin(a*Math.PI/180)),[ex,ey]=shapePoint(x+r*Math.cos(b*Math.PI/180),y+r*Math.sin(b*Math.PI/180));
 const radius=r*data.layout.geometry.scale;
 return `M${px} ${py} L${sx} ${sy} A${radius} ${radius} 0 ${b-a>180?1:0} 1 ${ex} ${ey} Z`;
}
function syncMapGeometry(){
 for(const map of document.querySelectorAll('#floor-map,#customer-map')){
  for(const s of data.stations){
   const group=map.querySelector(`.station[data-id="${s.n}"]`),shape=group.querySelector('.station-shape');
   const [x,y]=data.layout.positions[s.n],color=colors[s.zone];
   const sector=data.layout.geometry.sectors.find(v=>v.n===s.n),rect=data.layout.geometry.rectangles[s.n];
   if(sector)shape.setAttribute('d',sectorPath(...sector.apex,1,...sector.angles));
   if(rect){const [rx,ry]=shapePoint(rect[0],rect[1]);for(const [attr,value] of Object.entries({x:rx,y:ry,width:rect[2]*data.layout.geometry.scale,height:rect[3]*data.layout.geometry.scale}))shape.setAttribute(attr,value);}
   shape.setAttribute('fill',color);if(shape.hasAttribute('stroke'))shape.setAttribute('stroke',color);
   const pin=group.querySelector('.pin');pin.setAttribute('cx',x);pin.setAttribute('cy',y);pin.setAttribute('fill',color);
   const number=group.querySelector('.pin-number');number.setAttribute('x',x);number.setAttribute('y',y+6);
   const bg=group.querySelector('.map-icon-bg'),photo=group.querySelector('.map-product');
   if(bg){bg.setAttribute('x',x-15);bg.setAttribute('y',y-49);}
   if(photo){photo.setAttribute('x',x-15);photo.setAttribute('y',y-49);photo.setAttribute('href',products[s.representative_key].image);}
   group.setAttribute('aria-label',`${s.n}번 ${s.role}: ${s.keys.map(k=>products[k].name).join(', ')}`);
   group.querySelector('title').textContent=`${s.location} · ${s.change}`;
   let label=group.querySelector('.product-zone-label');
   if(!label){label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('class','product-zone-label');group.append(label);}
   label.setAttribute('x',x+(s.map_label?.dx??([5,6,7,10,11].includes(s.n)?-24:0)));
   label.setAttribute('y',y+(s.map_label?.dy??([5,6,7,10,11].includes(s.n)?5:32)));
   label.setAttribute('text-anchor',s.map_label?.anchor??([5,6,7,10,11].includes(s.n)?'end':'middle'));
   label.textContent=s.short_label;
  }
  map.querySelector('.event-zone').toggleAttribute('hidden',!data.scenario.hoop);
  map.querySelector('.leisure-zone').toggleAttribute('hidden',data.scenario.hoop||Boolean(data.scenario.corner_is_retail));
 }
}
function renderPlacementTable(){
 document.getElementById('summary-table').innerHTML=data.stations.map(s=>`<tr data-row="${s.n}"><td><button type="button" class="stand-link" data-jump="${s.n}" aria-label="${s.n}번 매대 자세히 보기">${s.n}</button></td><td><b>${esc(s.zone)} · ${esc(s.role)}</b><small>${esc(s.location)}</small><small>${s.keys.map(k=>esc(products[k].name)).join(' · ')}</small></td><td>${esc(quantityLabel(s))}</td><td>${countLabel(s.samples,s.conditional_samples)}</td><td>${s.n<=4?'캐셔에서 포장 전달':countLabel(s.purchase,s.conditional_purchase,'포장')}</td><td>${esc(s.stock_note)}</td></tr>`).join('');
}
function renderProductZoning(){
 document.querySelector('.scenario-product-label').textContent=data.scenario.label+' · 40개 상품군';
 document.getElementById('product-zone-groups').innerHTML=data.product_groups.map(group=>{
  const productsHTML=group.keys.map(key=>{
   const p=products[key];
   const sample=data.stations.filter(s=>group.stations.includes(s.n)).reduce((sum,s)=>sum+(s.sample_by_key?.[key]||0),0);
   const purchase=p.purchase_at==='캐셔'?'포장 전달: 캐셔':`구매 ${countLabel(p.purchase,p.conditional_purchase,'포장')}`;
   const restock=p.buffer||p.conditional_buffer?`${/^\d+$/.test(String(p.buffer_at))?p.buffer_at+'번 하부':p.buffer_at} · ${countLabel(p.buffer,p.conditional_buffer,'포장')}`:'창고에서 필요 시 보충';
   return `<li><button type="button" class="zone-product-photo" data-image="${esc(p.key)}" aria-label="${esc(p.name)} 이미지 확대"><img src="${esc(p.image)}" alt="${esc(p.name)}" width="70" height="70" loading="lazy"></button><div><b>${esc(p.name)}</b><small>전시·체험 ${countLabel(sample,p.conditional_samples)} · ${esc(purchase)}</small><small>보충: ${esc(restock)}</small></div></li>`;
  }).join('');
  return `<article class="product-zone-card"><div class="product-zone-title"><h3>${esc(group.title)}</h3><span>${group.stations.map(n=>`<button type="button" class="stand-link" data-jump="${n}">${n}</button>`).join('')}</span></div><p>${esc(group.purpose)}</p><ul>${productsHTML}</ul></article>`;
 }).join('');
}
function renderStockHubs(){
 document.getElementById('stock-hubs').innerHTML=data.buffers.map(h=>{
  const satelliteStations=[...new Set(h.satellite_keys.map(k=>products[k].station))];
  return `<article class="hub"><h3><button type="button" class="stand-link" data-jump="${h.n}">${h.n}</button> 하부 · 목표 상한 ${h.own+h.satellite+h.conditional}판매포장</h3><p class="own"><b>자체 상품 먼저</b><br>${h.own}포장${h.conditional?' + 확인 후 '+h.conditional+'판매단위':''}<br><small>${h.own_keys.map(k=>esc(products[k].name)).join(' · ')}</small></p><p class="satellite"><b>남는 구획에 위성 보충분</b><br>${h.satellite?`${h.satellite}포장 · ${satelliteStations.join('·')}번 보충`:'위성 보충분 없음'}</p><p class="caption">목표 상한이며 실제 수납 수용량은 아닙니다. 위성분이 맞지 않으면 창고에서 바로 보충합니다.</p></article>`;
 }).join('');
 document.getElementById('warehouse-buffer').innerHTML=`<h3>창고 직접 보충</h3><p>${data.warehouse_buffer_keys.map(k=>{const p=products[k];return `${esc(p.name)} · ${countLabel(p.buffer,p.conditional_buffer,'포장')} → ${p.station}번`;}).join('<br>')}</p><p class="caption">7번 Tonki 보충분은 창고에서 디자인별로 관리하고, 13번 하부는 13번 자체 상품을 우선합니다.</p>`;
}
function renderRepresentativeNotes(){
 document.getElementById('representative-notes').innerHTML=data.stations.map(s=>{const p=products[s.representative_key];return `<button class="representative-note" type="button" data-jump="${s.n}"><img src="${esc(p.image)}" width="240" height="240" alt="${esc(p.name)}" loading="lazy"><span><b>${s.n} · ${esc(p.name)}</b><small>${esc(s.location)}<br>${esc(s.change)}</small></span></button>`;}).join('');
}
function renderRouteMenu(){
 const tabs=document.querySelector('.route-tabs');
 tabs.innerHTML=data.journey.routes.map(r=>`<button type="button" data-route="${esc(r.id)}" aria-pressed="false">${esc(r.name)}</button>`).join('');
 document.getElementById('scenario-flow-heading').textContent=data.scenario.flow_heading;
 document.getElementById('scenario-flow-intro').textContent=data.scenario.flow_intro;
}
function applyScenario(id,updateURL=true){
 data=MolynkZoning.forScenario(baseData,id);products=data.products;currentScenario=data.scenarioId;
 document.querySelectorAll('[data-scenario]').forEach(button=>{const active=button.dataset.scenario===currentScenario;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
 document.getElementById('scenario-intro').textContent=data.scenario.intro;
 document.getElementById('approved-title').textContent=data.scenario.title;
 document.getElementById('scenario-corner-title').textContent=data.scenario.corner_title;
 document.getElementById('scenario-corner-copy').textContent=data.scenario.corner_copy;
 document.getElementById('scenario-flow-title').textContent=data.scenario.flow_title;
 document.getElementById('scenario-flow-copy').textContent=data.scenario.flow_copy;
 const image=document.getElementById('scenario-image');image.src=scenarioAsset(data.scenario.image);image.alt=data.scenario.title+' · 기존 기둥·외벽 보존, 13개 매대 배치';
 document.querySelectorAll('[data-scenario-asset]').forEach(link=>{
  const type=link.dataset.scenarioAsset;
  const value=type==='placement'?data.paths[currentScenario]:data.scenario[type];
  link.href=scenarioAsset(value);
 });
 if(updateURL)history.replaceState(null,'',MolynkZoning.shareURL(location.href,currentScenario));
 if(mapDialog.open)mapDialog.close();if(dialog.open)dialog.close();
 syncMapGeometry();renderQueuePlan();renderScenarioOperations();renderPlacementTable();renderProductZoning();renderStockHubs();renderRepresentativeNotes();renderRouteMenu();
 document.getElementById('map-card').classList.toggle('products-mode',mode==='products');
 select(selected,false);selectRoute(activeRoute);
 document.querySelectorAll('[data-queue-link]').forEach(link=>link.hidden=!data.queue.enabled);
 document.title='몰링크 조닝 · '+data.scenario.label;
}

function renderQueuePlan(){
 const queue=data.queue,enabled=Boolean(queue?.enabled);
 const section=document.getElementById('event-queue');section.hidden=!enabled;
 for(const map of document.querySelectorAll('#floor-map,#customer-map')){
  map.querySelector('.queue-overlay')?.remove();
  map.setAttribute('viewBox',enabled?'0 -30 965 855':'0 0 965 825');
  map.setAttribute('aria-label',data.scenario.map_caption);
  if(!enabled)continue;
  const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');
  group.setAttribute('class','queue-overlay');group.setAttribute('pointer-events','none');
  const add=(name,attrs,content)=>{const e=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(content)e.textContent=content;group.append(e);return e;};
  const label=(x,y,content,size=11)=>{const [lx,ly]=shapePoint(x,y);add('text',{x:lx,y:ly,fill:'#9c621b','font-size':size,'text-anchor':'middle'},content);};
  const scale=data.layout.geometry.scale;
  add('title',{},'외벽 파티션 옆에 붙여 대기하며 기존 구획 네모 안에 한 발 이상 들어오도록 안내합니다.');
  for(const person of queue.illustrative_people){
   const [cx,cy]=shapePoint(person.x,person.body_y);
   add('circle',{cx,cy,r:16,fill:'#bd7925','fill-opacity':.12,stroke:'#bd7925','stroke-width':1.2});
   for(const foot of person.feet){
    const [px,py]=shapePoint(person.x+foot.dx-.035,foot.y-.09);
    add('rect',{x:px,y:py,width:.07*scale,height:.18*scale,rx:2,fill:'#bd7925',stroke:'white','stroke-width':.5});
   }
  }
  const [ex,ey]=shapePoint(...queue.front_point),[tx,ty]=shapePoint(...queue.tail_point);
  add('path',{d:'M'+tx+' '+ty+' L'+ex+' '+ey+' l7 -4 m-7 4 l7 4',fill:'none',stroke:'#bd7925','stroke-width':1.8});
  label(4.8,-.66,'구획 네모 안에 한 발 이상 · 파티션 옆 한 줄',10);
  label(queue.front_point[0]-.28,queue.front_point[1]+.03,'줄 앞',10);
  label(4.8,.56,'12·13번 뒤 외벽 파티션',10);
  map.append(group);
 }
 if(!enabled)return;
 const image=section.querySelector('img');image.src=scenarioAsset(queue.image);
 section.querySelector('[data-queue-image]').href=scenarioAsset(queue.image);
 section.querySelector('[data-queue-pdf]').href=scenarioAsset(queue.pdf);
}

function renderScenarioOperations(){
 document.getElementById('scenario-slices-title').textContent=data.scenario.slices_title;
 document.getElementById('scenario-slices-copy').textContent=data.scenario.slices_copy;
 document.querySelectorAll('[data-scenario-change]').forEach(card=>{
  const station=data.stations.find(s=>s.n===Number(card.dataset.scenarioChange));
  card.querySelector('p').textContent=station.change;
 });
 document.querySelectorAll('[data-scenario-exit] p').forEach(p=>{
  p.textContent=data.scenario.hoop
   ?'5·6·7번은 앞쪽 조각 매대 모음에, 10·11번은 캐셔 쪽에 배치합니다. 구매 고객은 결제 후, 관람 고객은 캐셔를 거치지 않고 기존 주출구로 나갑니다.'
   :'앞쪽에는 5·6번, 기존 골대 코너에는 7번을 둡니다. 10·11번과 기존 주출구는 유지하고 골대는 창고에 보관합니다.';
 });
 for(const map of document.querySelectorAll('#floor-map,#customer-map')){
  map.querySelector('.equipment-storage')?.remove();
  const storage=data.equipment_storage;if(!storage)continue;
  const [x,y]=shapePoint(...storage.point),ns='http://www.w3.org/2000/svg';
  const group=document.createElementNS(ns,'g');group.setAttribute('class','equipment-storage');group.setAttribute('pointer-events','none');
  const add=(name,attrs,text)=>{const e=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attrs))e.setAttribute(key,value);if(text)e.textContent=text;group.append(e);};
  add('title',{},storage.note);
  add('rect',{x:x-86,y:y-31,width:172,height:68,rx:9,fill:'#fff7ed','fill-opacity':.96,stroke:'#bd7925','stroke-dasharray':'5 4'});
  add('text',{x,y:y-8,'text-anchor':'middle','font-size':15,fill:'#995f20','font-weight':700},'미니 골대 · 창고 보관');
  add('text',{x,y:y+14,'text-anchor':'middle','font-size':11,fill:'#826b53'},'출입문·직원 동선 비우기');
  add('text',{x,y:y+29,'text-anchor':'middle','font-size':10,fill:'#826b53'},'보관 위치는 현장 조정');
  map.append(group);
 }
}

applyScenario(currentScenario,false);
loadLocation();
