(function(root){
  'use strict';
  const PRIZES=Object.freeze({
    cake:Object.freeze({id:'cake',name:'케이크',probability:2,title:'케이크 당첨!',description:'오늘의 커다란 행운이 찾아왔어요.',image:'assets/cake.webp'}),
    gelato:Object.freeze({id:'gelato',name:'젤라토',probability:10,title:'젤라토 당첨!',description:'달콤한 비주얼의 말랑이를 만나보세요.',image:'assets/gelato.webp'}),
    laugen:Object.freeze({id:'laugen',name:'라우겐',probability:30,title:'라우겐 당첨!',description:'말차 라우겐 또는 허니 라우겐 중 1개를 골라주세요.',image:'../prices/images/011.webp'}),
    again:Object.freeze({id:'again',name:'다음 기회에',probability:58,title:'아쉽지만, 다음 기회에!',description:'함께 돌려주셔서 감사해요. 오늘도 말랑한 하루 보내세요.',image:null})
  });
  const layout=[['cake',2],['again',10],['laugen',10],['again',10],['gelato',5],['again',9],['laugen',10],['again',10],['gelato',5],['again',9],['laugen',10],['again',10]];
  let cursor=0;
  const SEGMENTS=Object.freeze(layout.map(([prize,weight],index)=>{
    const segment=Object.freeze({index,prize,weight,start:cursor,end:cursor+weight*100});cursor=segment.end;return segment;
  }));
  if(cursor!==10000)throw new Error('Invalid wheel total');
  for(const prize of Object.values(PRIZES))if(SEGMENTS.filter(s=>s.prize===prize.id).reduce((sum,s)=>sum+s.weight,0)!==prize.probability)throw new Error('Invalid prize probability');
  const modulo=(n,m=360)=>((n%m)+m)%m;
  function segmentForTicket(ticket){
    if(!Number.isInteger(ticket)||ticket<0||ticket>=10000)throw new RangeError('Invalid draw ticket');
    return SEGMENTS.find(s=>ticket>=s.start&&ticket<s.end);
  }
  function secureInteger(max,source=root.crypto){
    if(!Number.isSafeInteger(max)||max<1||max>4294967296||!source?.getRandomValues)throw new Error('Random source unavailable');
    const limit=Math.floor(4294967296/max)*max,array=new Uint32Array(1);
    do{source.getRandomValues(array);}while(array[0]>=limit);
    return array[0]%max;
  }
  function landingRotation(current,segment,position=.5,laps=7){
    if(!Number.isFinite(current)||!Number.isFinite(position)||position<0||position>1||!Number.isInteger(laps)||laps<1)throw new RangeError('Invalid spin');
    // Land inside the selected wedge, leaving a margin from either boundary.
    const angle=(segment.start+(segment.end-segment.start)*(.2+.6*position))/10000*360;
    return current+laps*360+modulo(-angle-modulo(current));
  }
  function draw(current=0,source=root.crypto){
    const ticket=secureInteger(10000,source),segment=segmentForTicket(ticket);
    const position=secureInteger(1000000,source)/1000000,laps=6+secureInteger(3,source);
    return {ticket,segmentIndex:segment.index,prize:segment.prize,target:landingRotation(current,segment,position,laps)};
  }
  function segmentAtPointer(rotation){return segmentForTicket(Math.min(9999,Math.floor(modulo(-rotation)/360*10000)));}
  const api=Object.freeze({PRIZES,SEGMENTS,modulo,segmentForTicket,secureInteger,landingRotation,segmentAtPointer,draw});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MolynkWheel=api;
})(typeof window!=='undefined'?window:globalThis);
