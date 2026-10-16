(function(root){
'use strict';
const room={width:3.54,length:8.585,wallHeight:2,outerWidth:3.6,outerLength:8.665,door:{y:.665,width:.775,height:1.96},curve:{x:3.54,y:4.3175,r:1.9975},source:'MARTINJUNE · MOLYNK POPUP 20261013.pdf · p.2 REVISED 1009'};
const fixed=[
 {id:'divider',x:1.56,y:0,w:.07,d:2.4,h:1.2,label:'기존 지지 구조'},
 {id:'post-top',x:1.45,y:1.08,w:.26,d:.26,h:2,label:'기존 소기둥'},
 {id:'post-bottom',x:1.08,y:8.27,w:.26,d:.26,h:2,label:'기존 소기둥'},
 {id:'brace-bottom',x:0,y:8.34,w:1.08,d:.07,h:1.2,label:'기존 지지 구조'},
 {id:'column',x:2.44,y:3.76,w:1.06,d:1.12,h:2.4,label:'기존 기둥'}
];
const racks=[
 {id:'A1',x:1.74,y:.04,w:1.5,d:.7,long:'x',kind:'cake',label:'케이크 · 1·2·4번'},
 {id:'A2',x:2.80,y:.82,w:.7,d:1.45,long:'y',kind:'cake',label:'케이크 예비'},
 {id:'A3',x:.04,y:5.60,w:.7,d:1.5,long:'y',kind:'cake',label:'케이크 예비'},
 {id:'A4',x:1.55,y:7.84,w:1.5,d:.7,long:'x',kind:'cake',label:'케이크 예비'},
 {id:'A5',x:.04,y:3.02,w:.5,d:1.5,long:'y',kind:'cake',label:'얕은 선반 · 케이크'},
 {id:'B1',x:.04,y:.04,w:1.5,d:.6,long:'x',kind:'other',label:'기타 상품 · 피킹'},
 {id:'B2',x:2.80,y:6.45,w:.7,d:1.3,long:'y',kind:'other',label:'기타 상품 · 예비'}
].map(r=>({...r,h:1.95}));
const zones={table:{x:.04,y:1.75,w:.55,d:1.2,h:.85},hoop:{x:.04,y:7.15,w:1.05,d:1.05,h:1.8},path:[[0,1.1],[.95,1.1],[.95,2.7],[1.02,3.8],[1.05,4.8],[1.10,5.6],[1.65,6.6],[1.85,7.4]]};
const defaults={boxW:600,boxD:400,boxH:400,count:200,showBoxes:true,showStructure:true,storeHoop:true,reserveOther:true};
function pack(r,config){
 const a=config.boxW/1000,b=config.boxD/1000,h=config.boxH/1000;
 const w=r.w-.08,d=r.d-.06,usableHeight=r.h-.12,step=h+.05;
 const fits=(x,y)=>[Math.max(0,Math.floor((w+1e-8)/x)),Math.max(0,Math.floor((d+1e-8)/y))];
 const normal=fits(a,b),turned=fits(b,a);const rotated=turned[0]*turned[1]>normal[0]*normal[1];
 const [nx,ny]=rotated?turned:normal,levels=Math.max(0,Math.min(12,Math.floor((usableHeight+.05+1e-8)/step)));
 return {nx,ny,levels,rotated,bw:rotated?b:a,bd:rotated?a:b,bh:h,step,capacity:nx*ny*levels};
}
function calculate(config={}){
 const c={...defaults,...config};
 for(const name of ['boxW','boxD','boxH'])if(!Number.isFinite(c[name])||c[name]<100||c[name]>1500)throw Error('박스 치수는 100~1,500mm 범위로 입력해주세요.');
 if(!Number.isInteger(c.count)||c.count<0||c.count>5000)throw Error('박스 수는 0~5,000의 정수로 입력해주세요.');
 let remaining=c.count;const allocation=racks.map(r=>{
  const p=pack(r,c),reserved=c.reserveOther&&r.kind==='other';
  const placed=reserved?0:Math.min(remaining,p.capacity);remaining-=placed;
  return {...r,...p,reserved,placed};
 });
 const cakeCapacity=allocation.filter(r=>!r.reserved).reduce((s,r)=>s+r.capacity,0);
 return {config:c,racks:allocation,cakeCapacity,placed:c.count-remaining,overflow:remaining,otherCapacity:allocation.filter(r=>r.reserved).reduce((s,r)=>s+r.capacity,0),cakeVolume:c.count*c.boxW*c.boxD*c.boxH/1e9,floorArea:room.width*room.length,grossArea:room.outerWidth*room.outerLength,minAisle:room.curve.x-room.curve.r-(.04+.5)};
}
function intersects(a,b){return a.x<b.x+b.w-1e-8&&a.x+a.w>b.x+1e-8&&a.y<b.y+b.d-1e-8&&a.y+a.d>b.y+1e-8;}
function hitsCurve(r){const c=room.curve;const x=Math.max(r.x,Math.min(c.x,r.x+r.w)),y=Math.max(r.y,Math.min(c.y,r.y+r.d));return Math.hypot(x-c.x,y-c.y)<c.r-1e-8;}
const api={room,fixed,racks,zones,defaults,pack,calculate,intersects,hitsCurve};if(typeof module!=='undefined')module.exports=api;else root.WarehouseModel=api;
})(typeof window==='undefined'?globalThis:window);
