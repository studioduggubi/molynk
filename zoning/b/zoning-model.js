(function(root){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const mapPoint=(layout,x,y)=>[
  layout.geometry.origin[0]+x*layout.geometry.scale,
  layout.geometry.origin[1]+y*layout.geometry.scale
 ];
 function derivePositions(layout){
  const g=layout.geometry,positions={};
  const [cx,cy]=g.ring.center;
  const outer=(g.ring.radii[0]+g.ring.radii[1])/2;
  const inner=(g.ring.radii[1]+g.ring.radii[2])/2;
  for(const [n,offset] of [[1,-outer],[2,-inner],[3,outer],[4,inner]])positions[n]=mapPoint(layout,cx+offset,cy);
  for(const [n,rect] of Object.entries(g.rectangles))positions[n]=mapPoint(layout,rect[0]+rect[2]/2,rect[1]+rect[3]/2);
  for(const sector of g.sectors){
   const angle=(sector.angles[0]+sector.angles[1])*Math.PI/360;
   positions[sector.n]=mapPoint(layout,sector.apex[0]+.65*Math.cos(angle),sector.apex[1]+.65*Math.sin(angle));
  }
  return positions;
 }
 function reconcileProducts(data){
  for(const product of Object.values(data.products)){
   const displays=data.stations.filter(s=>s.keys.includes(product.key)).map(s=>s.n);
   if(!displays.length)throw new Error('진열 매대가 없는 상품: '+product.key);
   product.display_stations=displays;
   if(!displays.includes(Number(product.station)))product.station=displays[0];
   product.purchase_at=displays.every(n=>n<=4)?'캐셔':product.station;
  }
 }
 function deriveBuffers(data){
  const hubs=data.stations.filter(s=>s.n>=8).map(s=>({n:s.n,own:0,satellite:0,conditional:0,own_keys:[],satellite_keys:[]}));
  const warehouse=[];
  for(const p of Object.values(data.products)){
   if(!p.buffer&&!p.conditional_buffer)continue;
   const hub=hubs.find(h=>h.n===Number(p.buffer_at));
   if(!hub){warehouse.push(p.key);continue;}
   const own=p.display_stations.includes(hub.n);
   hub[own?'own':'satellite']+=Number(p.buffer)||0;
   hub.conditional+=Number(p.conditional_buffer)||0;
   hub[own?'own_keys':'satellite_keys'].push(p.key);
  }
  return {hubs,warehouse};
 }
 function productGroups(data){
  const sections=[
   {id:'central',title:'중앙 케이크·젤라또',stations:[1,2,3,4],purpose:'입구에서 발견하고 뒷면에서 체험 · 포장은 캐셔에서 전달'},
   {id:'noj',title:'5번 · NO.J',stations:[5],purpose:'조각 매대 위쪽 · 안쪽을 향해 3종 비교'},
   {id:'small-bread',title:'6번 · 작은 빵',stations:[6],purpose:'조각 매대 가운데 · 대표 샘플과 옵션 포장 선택'},
   {id:'tonki',title:'7번 · Tonki Cafe',stations:[7],purpose:'조각 매대 아래쪽 · 9번·입구 쪽에서 캐릭터 선택'},
   {id:'desserts',title:'8번 · 디저트·과일',stations:[8],purpose:'입구 가까이에서 색과 모양으로 첫 선택'},
   {id:'bread',title:'9번 · 생식빵·토끼빵',stations:[9],purpose:'모양·색상·옵션을 비교하는 빵 구간'},
   {id:'cashier-bread',title:'10번 · 토스트·크루아상·난 빵',stations:[10],purpose:'캐셔 쪽으로 올린 벽면에서 빵 비교 · 6번 보충 연결'},
   {id:'goods',title:'11번 · 키링·아트',stations:[11],purpose:'캐셔 근처에서 결제 전에 추가 상품 선택'},
   {id:'dinosaurs',title:'12번 · 공룡',stations:[12],purpose:'안쪽 전용 구간에서 3형태·2색 비교'},
   {id:'characters',title:'13번 · 파스텔 캐릭터',stations:[13],purpose:'캐셔 옆에서 세 컬렉션 비교 · 하부는 자체 상품 우선'}
  ];
  return sections.map(group=>({...group,...data.scenario.product_group_overrides?.[group.id],keys:[...new Set(group.stations.flatMap(n=>data.stations.find(s=>s.n===n).keys))]}));
 }
 function forScenario(base,id){
  const key=Object.hasOwn(base.scenarios,id)?id:'with-hoop';
  const data=clone(base),scenario=data.scenarios[key];
  data.scenarioId=key;data.scenario=scenario;
  data.event={...data.event,enabled:scenario.hoop,hoop:scenario.hoop?base.event.hoop:null};
  if(scenario.journey)data.journey=clone(scenario.journey);
  if(data.queue)data.queue.enabled=Boolean(scenario.hoop);
  data.equipment_storage=scenario.equipment_storage?clone(scenario.equipment_storage):null;
  for(const s of data.stations)if(scenario.station_overrides?.[s.n])Object.assign(s,scenario.station_overrides[s.n]);
  if(scenario.layout_overrides){
   const changes=clone(scenario.layout_overrides),geometry=data.layout.geometry;
   geometry.rectangles={...geometry.rectangles,...changes.rectangles};
   if(changes.sectors)geometry.sectors=geometry.sectors.map(old=>changes.sectors.find(next=>next.n===old.n)||old);
  }
  data.layout.positions=derivePositions(data.layout);
  reconcileProducts(data);
  const buffers=deriveBuffers(data);data.buffers=buffers.hubs;data.warehouse_buffer_keys=buffers.warehouse;
  data.product_groups=productGroups(data);
  return data;
 }
 function shareURL(href,scenario){
  const url=new URL(href);url.searchParams.set('plan',scenario);return url.href;
 }
 const api={forScenario,derivePositions,deriveBuffers,productGroups,mapPoint,shareURL};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.MolynkZoning=api;
})(typeof window!=='undefined'?window:globalThis);
