(function(){
  'use strict';
  const Core=window.MolynkWheel,{PRIZES,SEGMENTS}=Core;
  const $=id=>document.getElementById(id),disc=$('wheel-disc'),spinButton=$('spin-button'),centerButton=$('center-button');
  const resultDialog=$('result-dialog'),historyDialog=$('history-dialog'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const KEY='molynk-lucky-spin-v1',SOUND_KEY='molynk-lucky-spin-sound';
  const fresh=()=>({version:1,sequence:0,counts:{cake:0,gelato:0,laugen:0,again:0},history:[],active:null,rotation:0});
  let state=fresh(),busy=false,storageReady=true,audio=null,sound=true,animationFrame=null;
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      if(parsed.version!==1||!Number.isSafeInteger(parsed.sequence)||parsed.sequence<0||!Array.isArray(parsed.history)||!Number.isFinite(parsed.rotation))throw new Error('Invalid saved game');
      for(const key of Object.keys(PRIZES))if(!Number.isSafeInteger(parsed.counts?.[key])||parsed.counts[key]<0)throw new Error('Invalid saved count');
      if(parsed.active&&(!PRIZES[parsed.active.prize]||!Number.isFinite(parsed.active.target)||!Number.isSafeInteger(parsed.active.number)))throw new Error('Invalid saved result');
      if(parsed.history.some(r=>!PRIZES[r.prize]||!Number.isSafeInteger(r.number)||!Number.isFinite(r.at)))throw new Error('Invalid history');
      state=parsed;
    }
    sound=localStorage.getItem(SOUND_KEY)!=='off';
  }catch(error){storageReady=false;$('play-status').textContent='기록을 불러오지 못했어요. 현장 직원에게 알려주세요.';}
  function save(next){
    try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}
    catch(error){$('play-status').textContent='기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해주세요.';return false;}
  }
  function setPhase(phase){
    document.body.dataset.phase=phase;
    const spinning=phase==='spinning';spinButton.disabled=spinning||!storageReady;centerButton.disabled=spinning||!storageReady;
    $('spin-label').textContent=spinning?'두근두근, 돌아가는 중…':phase==='result'?'추첨 결과 보기':'행운 돌리기';
    $('center-label').textContent=spinning?'두근두근…':phase==='result'?'결과 보기':'꾹 눌러봐!';
  }
  function makeWheel(){
    const colors={cake:'#ffe0a0',gelato:'#f7a8c1',laugen:'#d2e6cf',again:'#fbe8ee'};
    const point=(r,angle)=>{const a=(angle-90)*Math.PI/180;return [260+r*Math.cos(a),260+r*Math.sin(a)];};
    const imageFor=s=>s.prize==='gelato'?'assets/gelato.webp':s.index===6?'../prices/images/012.webp':'../prices/images/011.webp';
    const slices=SEGMENTS.map(s=>{
      const start=s.start/10000*360,end=s.end/10000*360,mid=(start+end)/2,p1=point(260,start),p2=point(260,end),center=point(s.prize==='cake'?205:183,mid);
      const color=s.prize==='again'?(s.index%3===0?'#f8d3e1':'#fbe7ee'):colors[s.prize];
      const path=`<path d="M260 260 L${p1.join(' ')} A260 260 0 ${end-start>180?1:0} 1 ${p2.join(' ')} Z" fill="${color}" stroke="#fff9f0" stroke-width="2.5"/>`;
      let label;
      if(s.prize==='cake')label='<text y="-8" font-size="15" fill="#ae773d">✦</text><text y="8" font-size="8.5" font-weight="700" fill="#a6753b">2%</text>';
      else if(s.prize==='again')label='<text y="-7" font-size="19" fill="#c58aa3">♡</text><text y="15" font-size="12" font-weight="600" fill="#b17c94">다음 기회에</text>';
      else if(s.prize==='gelato')label=`<image href="${imageFor(s)}" x="-20" y="-35" width="40" height="49"/><text y="29" font-size="11.5" font-weight="700" fill="#a14c71">젤라토</text>`;
      else label=`<image href="${imageFor(s)}" x="-38" y="-31" width="76" height="48"/><text y="29" font-size="13" font-weight="700" fill="#66815b">라우겐</text>`;
      return path+`<g transform="translate(${center.join(' ')}) rotate(${mid})" text-anchor="middle" font-family="Pretendard,sans-serif">${label}</g>`;
    }).join('');
    $('wheel-svg').innerHTML=slices+'<circle cx="260" cy="260" r="88" fill="#fff1e9" stroke="#fff9ef" stroke-width="3"/>';
    $('wheel-lights').innerHTML=Array.from({length:42},(_,i)=>{const a=i/42*Math.PI*2;return `<i class="wheel-light" style="--x:${Math.cos(a)*46.9}%;--y:${Math.sin(a)*46.9}%"></i>`;}).join('');
  }
  function updateSoundButton(){const b=$('sound-button');b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',sound?'효과음 끄기':'효과음 켜기');b.querySelector('span').textContent=sound?'소리 켜짐':'소리 꺼짐';}
  function initAudio(){
    if(!sound)return;
    try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio??=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch(error){audio=null;}
  }
  function note(frequency,duration=.045,volume=.028,delay=0,type='sine'){
    if(!sound||!audio||audio.state!=='running')return;
    try{const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;osc.type=type;osc.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.005);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+duration+.015);osc.onended=()=>{osc.disconnect();gain.disconnect();};}catch(error){}
  }
  function celebration(won){
    if(won){[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,.2,.045,i*.1));if(navigator.vibrate)navigator.vibrate([40,40,60]);}
    else [659.25,587.33,523.25].forEach((f,i)=>note(f,.13,.025,i*.1));
    if(!won||motion.matches)return;
    const layer=$('confetti-layer');layer.replaceChildren();const palette=['#e986aa','#f5c861','#b7d6b4','#fff3df','#cc80ab'];
    for(let i=0;i<65;i++){const el=document.createElement('i');el.className='confetti';const a=-Math.PI+Math.random()*Math.PI,force=180+Math.random()*400;el.style.setProperty('--dx',Math.cos(a)*force+'px');el.style.setProperty('--dy',(Math.sin(a)*force+360)+'px');el.style.setProperty('--rot',(Math.random()*1000-500)+'deg');el.style.setProperty('--color',palette[i%palette.length]);el.style.animationDelay=Math.random()*.18+'s';layer.append(el);}
    setTimeout(()=>layer.replaceChildren(),2800);
  }
  function showResult(celebrate=false){
    const round=state.active;if(!round)return;const prize=PRIZES[round.prize],won=prize.id!=='again';
    resultDialog.classList.toggle('is-again',!won);$('result-badge').textContent=won?'LUCKY YOU!':'THANK YOU ♡';
    $('result-title').textContent=prize.title;$('result-description').textContent=prize.description;
    const art=$('result-art');art.className='result-art is-'+prize.id;
    const img=$('result-image'),alt=$('result-image-alt');img.hidden=!prize.image;alt.hidden=prize.id!=='laugen';
    if(prize.image){img.src=prize.image;img.alt=prize.id==='laugen'?'말차 라우겐':prize.name;}
    if(prize.id==='laugen'){alt.src='../prices/images/012.webp';alt.alt='허니 라우겐';}
    $('result-heart').hidden=won;$('claim-note').hidden=!won;$('result-round').textContent='참여번호 '+String(round.number).padStart(4,'0');
    if(!resultDialog.open)resultDialog.showModal();
    $('play-status').textContent=won?'당첨을 축하해요! 현장 직원에게 결과를 보여주세요.':'참여해주셔서 감사해요. 직원 확인 후 다음 참여자를 안내해주세요.';
    if(celebrate)celebration(won);
  }
  function finish(){
    busy=false;animationFrame=null;
    const active=state.active;if(!active)return;
    const next={...state,rotation:active.target,active:{...active,phase:'result'}};
    // Even if this second save fails, the already-saved draw remains locked on reload.
    if(!save(next))state=next;
    disc.style.transform=`rotate(${active.target}deg)`;setPhase('result');showResult(true);
  }
  function animate(start,target){
    busy=true;setPhase('spinning');$('play-status').textContent='말랑한 행운을 만나러 가는 중이에요…';
    const began=performance.now(),duration=motion.matches?850:6800;let lastTick=-1,lastTone=0;
    function frame(now){
      const p=Math.min(1,(now-began)/duration),eased=1-Math.pow(1-p,5),angle=start+(target-start)*eased;
      disc.style.transform=`rotate(${angle}deg)`;
      const tick=Math.floor(angle/12);if(tick!==lastTick&&now-lastTone>50){note(850+p*150,.018,.014,0,'triangle');lastTick=tick;lastTone=now;}
      if(p<1)animationFrame=requestAnimationFrame(frame);else finish();
    }
    animationFrame=requestAnimationFrame(frame);
  }
  function play(){
    if(busy||!storageReady)return;
    initAudio();
    if(state.active){showResult(false);return;}
    let draw;try{draw=Core.draw(state.rotation);}catch(error){$('play-status').textContent='추첨을 준비하지 못했어요. 새로고침 후 직원에게 알려주세요.';return;}
    const number=state.sequence+1,round={number,at:Date.now(),prize:draw.prize,segmentIndex:draw.segmentIndex,target:draw.target,phase:'spinning'};
    const next={...state,sequence:number,counts:{...state.counts,[draw.prize]:state.counts[draw.prize]+1},history:[{number,at:round.at,prize:draw.prize},...state.history].slice(0,300),active:round};
    // Save the selected outcome before any animation. Refreshing cannot re-draw it.
    const start=state.rotation;if(!save(next))return;animate(start,draw.target);
  }
  function nextParticipant(){
    if(busy)return;
    if(!save({...state,rotation:Core.modulo(state.rotation),active:null}))return;
    disc.style.transform=`rotate(${state.rotation}deg)`;resultDialog.close();setPhase('idle');
    $('play-status').textContent='직원 안내에 따라 한 번씩 참여해주세요.';spinButton.focus({preventScroll:true});
  }
  const dateFormat=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  function renderHistory(){
    const total=Object.values(state.counts).reduce((a,b)=>a+b,0),wins=total-state.counts.again;
    $('history-totals').innerHTML=`<div class="history-total">전체 참여<strong>${total.toLocaleString('ko-KR')}회</strong></div><div class="history-total">경품 당첨<strong>${wins.toLocaleString('ko-KR')}회</strong></div>`;
    $('history-summary').innerHTML=Object.values(PRIZES).map(p=>`<div class="history-prize">${p.name}<b>${state.counts[p.id]}</b></div>`).join('');
    const list=$('history-list');list.replaceChildren();
    for(const record of state.history.slice(0,20)){
      const li=document.createElement('li'),left=document.createElement('span'),time=document.createElement('small'),right=document.createElement('b');
      left.textContent='참여번호 '+String(record.number).padStart(4,'0');time.textContent=dateFormat.format(record.at);left.append(time);right.textContent=PRIZES[record.prize].name;li.append(left,right);list.append(li);
    }
    if(!state.history.length){const li=document.createElement('li');li.className='empty-history';li.textContent='아직 진행한 추첨이 없어요.';list.append(li);}
    $('csv-button').disabled=!state.history.length;
  }
  function downloadCSV(){
    const esc=v=>'"'+String(v).replaceAll('"','""')+'"';
    const rows=[['참여번호','추첨일시(한국시간)','결과'],...state.history.map(r=>[r.number,dateFormat.format(r.at),PRIZES[r.prize].name])];
    const csv='\ufeff'+rows.map(row=>row.map(esc).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download='molynk-lucky-spin-records.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  makeWheel();updateSoundButton();disc.style.transform=`rotate(${state.rotation}deg)`;setPhase('idle');
  spinButton.addEventListener('click',play);centerButton.addEventListener('click',play);$('next-button').addEventListener('click',nextParticipant);
  $('sound-button').addEventListener('click',()=>{sound=!sound;try{localStorage.setItem(SOUND_KEY,sound?'on':'off');}catch(error){}updateSoundButton();if(sound){initAudio();note(659,.08,.02);}});
  $('history-button').addEventListener('click',()=>{renderHistory();historyDialog.showModal();});$('history-close').addEventListener('click',()=>historyDialog.close());$('csv-button').addEventListener('click',downloadCSV);
  $('history-dialog').addEventListener('click',event=>{if(event.target===historyDialog){const r=historyDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)historyDialog.close();}});
  if(document.fullscreenEnabled){$('fullscreen-button').hidden=false;$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){$('play-status').textContent='이 브라우저에서는 전체 화면 전환이 지원되지 않아요.';}});document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').querySelector('span').textContent=document.fullscreenElement?'화면 복원':'전체 화면';});}
  // Another tab on the same device must not keep an outdated, ready-to-spin state.
  window.addEventListener('storage',event=>{if(event.key===KEY&&!busy)location.reload();});
  if(state.active){disc.style.transform=`rotate(${state.active.target}deg)`;if(state.active.phase!=='result'){const next={...state,rotation:state.active.target,active:{...state.active,phase:'result'}};if(!save(next))state=next;}else state.rotation=state.active.target;setPhase('result');showResult(false);}
})();
