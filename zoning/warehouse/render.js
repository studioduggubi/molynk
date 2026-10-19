(function(root){
'use strict';
const M=typeof module!=='undefined'?require('./model.js'):root.WarehouseModel;
function createRenderer(canvas){
 const ctx=canvas.getContext('2d');let hitAreas=[];
 function render(result,view={}){
  const width=view.width||canvas.clientWidth||canvas.width,height=view.height||canvas.clientHeight||canvas.height,dpr=view.dpr||1;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  const yaw=view.yaw??.66,elev=view.elev??.76,cy=Math.cos(yaw),sy=Math.sin(yaw),ce=Math.cos(elev),se=Math.sin(elev),cx=M.room.width/2,cz=M.room.length/2;
  const raw=([x,y,z])=>{x-=cx;y-=cz;const across=x*cy+y*sy,depth=-x*sy+y*cy;return [across,depth*se-z*ce,depth*ce+z*se];};
  const corners=[];for(const x of [-.7,M.room.width+.3])for(const y of [-.4,M.room.length+.5])for(const z of [0,2.4])corners.push(raw([x,y,z]));
  const bounds=[Math.min(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[1]))];
  const scale=Math.min((width-36)/(bounds[1]-bounds[0]),(height-66)/(bounds[3]-bounds[2]))*(view.zoom||1);
  const ox=width/2-(bounds[0]+bounds[1])/2*scale,oy=(height-20)/2-(bounds[2]+bounds[3])/2*scale;
  const project=p=>{const a=raw(p);return [ox+a[0]*scale,oy+a[1]*scale,a[2]];};
  function polygon(points,fill,stroke='#69796e',line=.5,alpha=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}ctx.globalAlpha=1;}
  function line(points,color,width=1,dash=[]){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
  const faceQueue=[],labels=[];
  const tint=(hex,f)=>{const c=hex.slice(1).match(/../g).map(v=>Math.min(255,Math.round(parseInt(v,16)*f)));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');};
  function face(points,color,alpha=1){const ps=points.map(project);faceQueue.push({points:ps,color,alpha,depth:ps.reduce((s,p)=>s+p[2],0)/ps.length});}
  function box(x,y,z,w,d,h,color){
   const a=[x,y,z],b=[x+w,y,z],c=[x+w,y+d,z],e=[x,y+d,z],A=[x,y,z+h],B=[x+w,y,z+h],C=[x+w,y+d,z+h],E=[x,y+d,z+h];
   face([A,B,C,E],tint(color,1.08));
   if(sy>0)face([a,e,E,A],tint(color,.9));else face([b,c,C,B],tint(color,.83));
   if(cy>0)face([e,c,C,E],tint(color,.96));else face([a,b,B,A],tint(color,.88));
  }
  function tag(point,text,color='#38564a',size=11,leader=null){labels.push({point:project(point),text,color,size,leader:leader?project(leader):null});}
  polygon([[0,0,0],[M.room.width,0,0],[M.room.width,M.room.length,0],[0,M.room.length,0]].map(project),'#eae7df','#c9cfc4',1);
  for(let x=.5;x<M.room.width;x+=.5)line([[x,0,.002],[x,M.room.length,.002]].map(project),'#d9dcd2',.5);
  for(let y=.5;y<M.room.length;y+=.5)line([[0,y,.002],[M.room.width,y,.002]].map(project),'#d9dcd2',.5);
  const curve=M.room.curve,arc=[];
  for(let i=0;i<=48;i++){const a=Math.PI/2+i*Math.PI/48;arc.push([curve.x+curve.r*Math.cos(a),curve.y+curve.r*Math.sin(a),.006]);}
  polygon([[curve.x,curve.y-curve.r,.006],...arc].map(project),'#d4d8d5','#b8c2bb',.7);
  const route=M.zones.path.map(p=>project([...p,.018]));line(route,'#84a99a',3,[5,5]);
  const door=M.room.door,doorArc=[];for(let i=0;i<=24;i++){const a=-Math.PI/2+i*Math.PI/48;doorArc.push(project([Math.cos(a)*door.width,door.y+door.width+Math.sin(a)*door.width,.01]));}
  line(doorArc,'#c8a87e',1,[3,3]);line([[0,door.y+door.width,.015],[door.width,door.y+door.width,.015]].map(project),'#ba9164',2);
  if(result.config.showStructure){
   for(let i=0;i<48;i++){
    const p=arc[i],q=arc[i+1],normal=[curve.x+(curve.r+.07)*Math.cos(Math.PI/2+i*Math.PI/48),curve.y+(curve.r+.07)*Math.sin(Math.PI/2+i*Math.PI/48),0];
    face([[p[0],p[1],0],[q[0],q[1],0],[q[0],q[1],.95],[p[0],p[1],.95]],'#768183');
    face([[p[0],p[1],.95],[q[0],q[1],.95],[q[0]+normal[0]-p[0],q[1]+normal[1]-p[1],.95],[normal[0],normal[1],.95]],'#9aa6a0');
   }
   for(const f of M.fixed)box(f.x,f.y,0,f.w,f.d,f.h,'#748080');
   // Low outer walls are a drawing cutaway, not a proposal to remove the partitions.
   box(0,-.06,0,M.room.width,.06,.12,'#bac3b7');box(M.room.width,0,0,.07,M.room.length,.12,'#bac3b7');box(0,M.room.length,0,M.room.width,.08,.12,'#bac3b7');
   box(-.06,0,0,.06,door.y,.12,'#bac3b7');box(-.06,door.y+door.width,0,.06,M.room.length-door.y-door.width,.12,'#bac3b7');
  }
  hitAreas=[];
  for(const r of result.racks){
   const color=r.reserved?'#648e80':'#758e87',p=r;
   if(p.storageType==='racks'){
    for(const dx of [.02,r.w-.05])for(const dy of [.02,r.d-.05])box(r.x+dx,r.y+dy,0,.03,.03,r.h,color);
    const levels=Math.max(1,p.levels);for(let level=0;level<levels;level++){const z=.12+level*p.step;box(r.x,r.y,z-.035,r.w,r.d,.035,r.reserved?'#a3baaa':'#b3c3b5');}
    box(r.x,r.y,r.h-.045,r.w,.025,.045,color);box(r.x,r.y+r.d-.025,r.h-.045,r.w,.025,.045,color);
   }else{
    polygon([[r.x,r.y,.009],[r.x+r.w,r.y,.009],[r.x+r.w,r.y+r.d,.009],[r.x,r.y+r.d,.009]].map(project),r.reserved?'#d0e2d5':'#ead8c5','#bea78c',.8);
   }
   if(result.config.showBoxes){
    for(let k=0;k<r.placed;k++){const perLevel=p.nx*p.ny,level=Math.floor(k/perLevel),row=Math.floor((k%perLevel)/p.nx),col=k%p.nx;
     box(r.x+p.insetX+col*p.bw,r.y+p.insetY+row*p.bd,p.baseZ+level*p.step,p.bw-.006,p.bd-.006,p.bh-(p.storageType==='floor'?.006:0),r.kind==='other'?'#759c91':'#c89b70');
    }
    if(r.reserved){for(let k=0;k<3;k++){const horizontal=r.long==='x',x=r.x+.06+(horizontal?k*.4:0),y=r.y+.06+(horizontal?0:k*.34);box(x,y,p.storageType==='floor'?0:.12,horizontal?.34:.42,horizontal?.38:.28,.22,'#759c91');}}
   }
   if(r.reserved&&p.storageType==='floor'&&r.id==='B2')tag([M.room.width+.45,r.y+.2,.15],'B2 · 기타','#487364',11,[r.x+r.w/2,r.y+r.d/2,.15]);
   else tag([r.x+r.w/2,r.y+r.d/2,(r.reserved&&p.storageType==='floor'?.32:r.h)+.08],r.id,r.reserved?'#487364':'#805c3d',12);
   hitAreas.push({id:r.id,points:[[r.x,r.y,0],[r.x+r.w,r.y,0],[r.x+r.w,r.y+r.d,0],[r.x,r.y+r.d,0]].map(project),anchor:project([r.x+r.w/2,r.y+r.d/2,r.h/2])});
  }
  const t=M.zones.table;for(const dx of [.025,t.w-.055])for(const dy of [.04,t.d-.07])box(t.x+dx,t.y+dy,0,.03,.03,t.h,'#b3848c');box(t.x,t.y,t.h-.04,t.w,t.d,.04,'#e9a0ad');
  for(let k=0;k<3;k++)box(t.x+.05,t.y+.05+k*.35,.03,.35,.28,.28,['#bca5cc','#dda993','#98b4a5'][k]);
  tag([t.x+t.w/2,t.y+t.d/2,t.h+.16],'검수·작업','#9c5968',10);
  const h=M.zones.hoop;box(h.x,h.y,.01,h.w,h.d,.015,'#d6c6df');tag([h.x+h.w/2,h.y+h.d/2,.05],result.config.storeHoop?'골대 보관':'골대 자리 비움','#826494',10);
  if(result.config.storeHoop){box(h.x+.12,h.y+.08,.04,.7,.62,.13,'#8c7a9d');box(h.x+.44,h.y+.3,.17,.05,.05,1.2,'#8c7a9d');box(h.x+.16,h.y+.25,1.35,.65,.035,.42,'#c9b9d5');box(h.x+.37,h.y+.30,1.37,.22,.28,.035,'#a486ab');}
  faceQueue.sort((a,b)=>a.depth-b.depth);for(const f of faceQueue)polygon(f.points,f.color,'#536c5d',.35,f.alpha);
  tag([2.60,4.30,1.05],width<520?'기존 구조':'기존 기둥·곡면 보존','#55615e',10);tag([-.28,1.05,.1],width<520?'문':'기존 문 775','#9a7951',10);
  if(width>=520)tag([M.room.width/2,-.27,0],'내측 계획 3,540mm','#7d887e',10);if(width>=520)tag([M.room.width+.22,M.room.length/2,0],'8,585mm','#7d887e',10);
  for(const label of labels){if(label.leader)line([label.leader,label.point],'#648575',.7);const [x,y]=label.point;ctx.font=`600 ${label.size}px sans-serif`;const size=ctx.measureText(label.text).width;ctx.fillStyle='rgba(255,254,250,.9)';ctx.fillRect(x-size/2-5,y-label.size/2-4,size+10,label.size+8);ctx.fillStyle=label.color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label.text,x,y);}
  return {width,height,faces:faceQueue.length,hitAreas};
 }
 return {render,get hitAreas(){return hitAreas;}};
}
if(typeof module!=='undefined')module.exports={createRenderer};else root.WarehouseRenderer={createRenderer};
})(typeof window==='undefined'?globalThis:window);
