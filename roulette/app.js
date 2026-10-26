(function(){
  'use strict';
  const Core=window.MolynkWheel,{PRIZES,SEGMENTS}=Core;
  const $=id=>document.getElementById(id),disc=$('wheel-disc'),spinButton=$('spin-button'),centerButton=$('center-button');
  const resultDialog=$('result-dialog'),historyDialog=$('history-dialog'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const KEY='molynk-lucky-spin-v1',SOUND_KEY='molynk-lucky-spin-sound';
  const fresh=()=>({version:1,layoutVersion:Core.LAYOUT_VERSION,sequence:0,counts:{cake:0,gelato:0,laugen:0,again:0},history:[],active:null,rotation:0});
  let state=fresh(),busy=false,storageReady=true,audio=null,audioOutput=null,sound=true,animationFrame=null,celebrationTimer=null;
  const soundSources=new Set();
  let media=null,mediaActive=false,mediaTesting=false,mediaAttempt=0,soundReady=false,soundFailed=false;
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      if(parsed.version!==1||!Number.isSafeInteger(parsed.sequence)||parsed.sequence<0||!Array.isArray(parsed.history)||!Number.isFinite(parsed.rotation))throw new Error('Invalid saved game');
      for(const key of Object.keys(PRIZES))if(!Number.isSafeInteger(parsed.counts?.[key])||parsed.counts[key]<0)throw new Error('Invalid saved count');
      if(parsed.active&&(!PRIZES[parsed.active.prize]||!Number.isFinite(parsed.active.target)||!Number.isSafeInteger(parsed.active.number)))throw new Error('Invalid saved result');
      if(parsed.history.some(r=>!PRIZES[r.prize]||!Number.isSafeInteger(r.number)||!Number.isFinite(r.at)))throw new Error('Invalid history');
      if(parsed.layoutVersion!==Core.LAYOUT_VERSION){
        // Keep a previously drawn prize intact when upgrading the wheel's appearance.
        if(parsed.active){
          const segment=SEGMENTS.find(s=>s.prize===parsed.active.prize);
          parsed.rotation=Core.modulo(Core.landingRotation(0,segment,.5,1));
          parsed.active={...parsed.active,target:parsed.rotation,segmentIndex:segment.index};
        }else parsed.rotation=0;
        parsed.layoutVersion=Core.LAYOUT_VERSION;
        localStorage.setItem(KEY,JSON.stringify(parsed));
      }
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
    const colors={cake:'url(#cake-gold)',gelato:'#f7a8c1',laugen:'#d2e6cf',again:'#fbe8ee'};
    const point=(r,angle)=>{const a=(angle-90)*Math.PI/180;return [260+r*Math.cos(a),260+r*Math.sin(a)];};
    const imageFor=s=>s.prize==='gelato'?'assets/gelato.webp':s.index===5?'assets/honey-laugen.webp':'assets/matcha-laugen.webp';
    const slices=SEGMENTS.map(s=>{
      const start=s.start/10000*360,end=s.end/10000*360,mid=(start+end)/2,p1=point(260,start),p2=point(260,end),center=point(s.prize==='cake'?205:183,mid);
      const color=s.prize==='again'?(s.index%3===0?'#f8d3e1':'#fbe7ee'):colors[s.prize];
      const path=`<path class="${s.prize==='cake'?'cake-jackpot-wedge':'prize-wedge'}" d="M260 260 L${p1.join(' ')} A260 260 0 ${end-start>180?1:0} 1 ${p2.join(' ')} Z" fill="${color}" stroke="${s.prize==='cake'?'#ffd46b':'#fff9f0'}" stroke-width="${s.prize==='cake'?4:2.5}"/>`;
      let label;
      if(s.prize==='cake')label=`<text y="-15" font-size="23" fill="#ffd778">✦</text><text y="13" font-size="14" font-weight="800" fill="#ffffff">${PRIZES.cake.probability}%</text>`;
      else if(s.prize==='again'&&s.weight<12)label='<text y="5" font-size="27" font-weight="800" fill="#975c76">꽝</text>';
      else if(s.prize==='again')label='<text y="-15" font-size="38" fill="#b47691">♡</text><text y="28" font-size="27" font-weight="800" fill="#975c76">다음 기회에</text>';
      else if(s.prize==='gelato')label=`<image href="${imageFor(s)}" x="-83" y="-78" width="166" height="166"/><rect x="-53" y="36" width="106" height="39" rx="14" fill="#fff9f3" fill-opacity=".94"/><text y="64" font-size="27" font-weight="800" fill="#983b60">젤라토</text>`;
      else label=`<image href="${imageFor(s)}" x="-82" y="-94" width="164" height="154" preserveAspectRatio="xMidYMid meet"/><rect x="-54" y="35" width="108" height="40" rx="14" fill="#fbfff7" fill-opacity=".95"/><text y="64" font-size="27" font-weight="800" fill="#4e6b43">라우겐</text>`;
      return path+`<g transform="translate(${center.join(' ')}) rotate(${mid})" text-anchor="middle" font-family="Paperlogy,Pretendard,sans-serif">${label}</g>`;
    }).join('');
    $('wheel-svg').innerHTML='<defs><linearGradient id="cake-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#68123b"/><stop offset=".5" stop-color="#31051f"/><stop offset="1" stop-color="#17091e"/></linearGradient></defs>'+slices+'<circle cx="260" cy="260" r="101" fill="#31051f" stroke="#ffd778" stroke-width="3"/>';
    $('wheel-lights').innerHTML=Array.from({length:42},(_,i)=>{const a=i/42*Math.PI*2;return `<i class="wheel-light" style="--x:${Math.cos(a)*46.9}%;--y:${Math.sin(a)*46.9}%"></i>`;}).join('');
  }
  function updateSoundButton(){
    const b=$('sound-button');b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',sound?'효과음 끄기':'효과음 켜기');
    b.querySelector('span').textContent=!sound?'소리 꺼짐':soundFailed?'소리 확인 필요':soundReady?'소리 켜짐':'소리 준비';
    $('sound-test-button').querySelector('span').textContent=mediaTesting?'테스트 끄기':'소리 테스트';
    $('sound-test-button').disabled=busy;
  }
  function playbackSession(){try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(error){}}
  function stopMedia(){
    mediaAttempt++;mediaActive=false;mediaTesting=false;
    if(media)try{media.pause();media.currentTime=0;}catch(error){}
    updateSoundButton();
  }
  function startMedia(prizeId,preview=false){
    if(!sound)return;
    stopMedia();stopSounds();playbackSession();
    const attempt=mediaAttempt;
    try{
      if(!media){
        media=document.createElement('audio');media.preload='auto';media.setAttribute('playsinline','');
        media.addEventListener('ended',()=>{mediaActive=false;mediaTesting=false;updateSoundButton();});
        media.addEventListener('error',()=>{if(mediaActive)mediaFailure(mediaAttempt);});
      }
      // play() runs inside the original tap. Ticks and the result are a single track,
      // so Safari never has to authorize a new playback after the wheel stops.
      const src=prizeId==='cake'?'assets/spin-cake.mp3':prizeId==='again'?'assets/spin-again.mp3':'assets/spin-win.mp3';
      if(media.getAttribute('src')!==src){media.src=src;media.load();}
      media.currentTime=preview?6.8:motion.matches?5.95:0;media.muted=false;media.volume=1;
      mediaActive=true;mediaTesting=preview;soundFailed=false;updateSoundButton();
      const started=media.play();
      Promise.resolve(started).then(()=>{
        if(attempt!==mediaAttempt)return;
        soundReady=true;soundFailed=false;updateSoundButton();
        if(preview)$('play-status').textContent='축하음 테스트 중이에요. 안 들리면 기기 볼륨과 블루투스 연결을 확인해주세요.';
      }).catch(()=>mediaFailure(attempt));
    }catch(error){mediaFailure(attempt);}
  }
  function mediaFailure(attempt){
    if(attempt!==mediaAttempt)return;
    mediaActive=false;mediaTesting=false;soundReady=false;soundFailed=true;updateSoundButton();
    $('play-status').textContent='소리를 시작하지 못했어요. 위의 소리 테스트를 눌러주세요.';
    initAudio();
  }
  function testSound(){
    if(busy)return;
    if(mediaTesting){stopMedia();stopSounds();return;}
    sound=true;try{localStorage.setItem(SOUND_KEY,'on');}catch(error){}
    clearCelebration();initAudio();startMedia('cake',true);
  }
  function initAudio(){
    if(!sound)return;
    playbackSession();
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      if(!audio){
        audio=new Audio();audioOutput=audio.createGain();audioOutput.gain.value=1.15;
        // Dense, punchy celebration mix, with a bounded final output on tablet speakers.
        const compressor=audio.createDynamicsCompressor();
        compressor.threshold.value=-14;compressor.knee.value=8;compressor.ratio.value=8;compressor.attack.value=.002;compressor.release.value=.12;
        const makeup=audio.createGain(),ceiling=audio.createWaveShaper(),curve=new Float32Array(2049);
        makeup.gain.value=1.9;
        for(let i=0;i<curve.length;i++)curve[i]=.94*Math.tanh(1.8*(i/(curve.length-1)*2-1));
        ceiling.curve=curve;ceiling.oversample='none';
        audioOutput.connect(compressor);compressor.connect(makeup);makeup.connect(ceiling);ceiling.connect(audio.destination);
      }
      if(audio.state==='suspended'||audio.state==='interrupted')audio.resume().catch(()=>{if(!mediaActive){soundFailed=true;updateSoundButton();}});
    }catch(error){audio=null;audioOutput=null;}
  }
  function stopSounds(){
    for(const source of soundSources)try{source.stop();}catch(error){}
    soundSources.clear();
  }
  function note(frequency,duration=.045,volume=.028,delay=0,type='sine'){
    if(!sound||mediaActive||!audio||audio.state!=='running')return;
    try{
      const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;
      osc.type=type;osc.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(volume,start+.005);gain.gain.exponentialRampToValueAtTime(volume*.65,start+duration*.55);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(gain);gain.connect(audioOutput);soundSources.add(osc);
      osc.onended=()=>{soundSources.delete(osc);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+duration+.015);
    }catch(error){}
  }
  function noiseHit(delay,duration,volume,frequency,type='lowpass'){
    if(!sound||mediaActive||!audio||audio.state!=='running')return;
    try{
      const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),samples=buffer.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
      const source=audio.createBufferSource(),gain=audio.createGain(),filter=audio.createBiquadFilter(),start=audio.currentTime+delay;
      source.buffer=buffer;filter.type=type;filter.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      source.connect(filter);filter.connect(gain);gain.connect(audioOutput);soundSources.add(source);
      source.onended=()=>{soundSources.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start(start);source.stop(start+duration);
    }catch(error){}
  }
  function impact(delay=0){
    if(!sound||mediaActive||!audio||audio.state!=='running')return;
    // Pitch-dropping body plus a higher knock that remains audible on an iPad.
    for(const [high,low,volume] of [[190,55,.5],[420,110,.16]])try{
      const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;
      osc.type='sine';osc.frequency.setValueAtTime(high,start);osc.frequency.exponentialRampToValueAtTime(low,start+.22);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+.5);
      osc.connect(gain);gain.connect(audioOutput);soundSources.add(osc);
      osc.onended=()=>{soundSources.delete(osc);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+.52);
    }catch(error){}
    noiseHit(delay,.55,.55,3200);
  }
  function clearCelebration(keepMedia=false){
    if(celebrationTimer!==null){clearTimeout(celebrationTimer);celebrationTimer=null;}
    stopSounds();
    if(!keepMedia)stopMedia();
    $('confetti-layer').replaceChildren();
  }
  function celebration(prizeId){
    clearCelebration(true);
    const won=prizeId!=='again',jackpot=prizeId==='cake';
    if(!won){[659.25,587.33,523.25].forEach((f,i)=>note(f,.13,.025,i*.1));return;}
    // Synthesized locally: impact, drum rolls, brass-like fanfare, cymbals and fireworks.
    // Every prize gets the full celebration; cake adds an extended jackpot finale.
    for(let i=0;i<12;i++)noiseHit(.04+i*.04,.1,.08+i*.008,1600,'highpass');
    for(let i=0;i<14;i++)noiseHit(2.58+i*.04,.1,.07+i*.008,1600,'highpass');
    const melody=[[392,.56,.12],[392,.72,.12],[392,.88,.12],[523.25,1.04,.30],[659.25,1.44,.24],[783.99,1.76,.48],[659.25,2.32,.24],[783.99,2.64,.24],[1046.5,3.2,1.3]];
    melody.forEach(([f,delay,duration])=>{note(f,duration,.28,delay,'triangle');note(f,duration,.11,delay,'sawtooth');note(f*2,duration,.055,delay,'sine');});
    const chords=[[1.04,.35,[261.63,329.63,392]],[1.44,.65,[349.23,440,523.25]],[2.32,.65,[293.66,392,493.88]],[3.2,1.4,[261.63,329.63,392,523.25]]];
    chords.forEach(([delay,duration,frequencies])=>frequencies.forEach(f=>note(f,duration,.1,delay,'triangle')));
    [[130.81,1.04],[174.61,1.44],[196,2.32],[130.81,3.2]].forEach(([f,delay])=>note(f,.4,.22,delay,'triangle'));
    [0,1.04,1.76,3.2,3.64,4.08].forEach(delay=>impact(delay));
    [0,1.04,3.2,4.08].forEach(delay=>noiseHit(delay,.9,.22,1000,'highpass'));
    [1046.5,1318.51,1567.98,2093,1567.98,2093,2637.02,3135.96].forEach((f,i)=>note(f,.45,.075,3.5+i*.14,'sine'));
    if(jackpot){
      [[523.25,4.8,.16],[659.25,5,.16],[783.99,5.2,.16],[1046.5,5.45,1.5]].forEach(([f,delay,duration])=>{
        note(f,duration,.28,delay,'triangle');note(f,duration,.11,delay,'sawtooth');note(f*2,duration,.055,delay,'sine');
      });
      [261.63,329.63,392,523.25].forEach(f=>note(f,1.5,.1,5.45,'triangle'));
      [4.8,5.45,6.05].forEach(delay=>impact(delay));noiseHit(5.45,1.2,.22,1000,'highpass');
      [1046.5,1318.51,1567.98,2093,2637.02,3135.96].forEach((f,i)=>note(f,.45,.075,5.8+i*.18,'sine'));
    }
    if(navigator.vibrate)navigator.vibrate([70,60,70,60,140]);
    celebrationTimer=setTimeout(()=>clearCelebration(),jackpot?8300:6200);
    if(motion.matches)return;
    const layer=$('confetti-layer'),palette=jackpot?['#ffd56b','#fff4c6','#e9ad32','#ffffff','#ffc24b','#ffe9a0']:['#f36d9e','#ffd56b','#b4d3a1','#fff4c6','#cc88df','#ff9abb'];
    layer.dataset.prize=prizeId;
    // The layer lives inside the modal's top layer, so fireworks stay visible above its backdrop.
    for(let i=0;i<(jackpot?200:160);i++){
      const el=document.createElement('i'),side=i%2===0?-1:1,angle=-Math.PI/2-side*(.25+Math.random()*.85),force=280+Math.random()*430;
      el.className='confetti celebration-confetti';el.style.left=side<0?'8%':'92%';el.style.top='76%';
      el.style.setProperty('--dx',Math.cos(angle)*force+'px');el.style.setProperty('--dy',Math.sin(angle)*force+'px');el.style.setProperty('--rot',(Math.random()*1500-750)+'deg');el.style.setProperty('--color',palette[i%palette.length]);
      el.style.animationDelay=((jackpot&&i>=100?4.65:0)+Math.random()*.65)+'s';layer.append(el);
    }
    const bursts=[[20,26,0],[79,23,1.04],[52,14,1.76],[28,61,3.2],[78,58,4.08]];
    if(jackpot)bursts.push([22,28,4.8],[78,24,5.45],[50,42,6.05]);
    for(const [x,y,delay] of bursts){
      const ring=document.createElement('i');ring.className='firework-ring';ring.style.left=x+'%';ring.style.top=y+'%';ring.style.animationDelay=delay+'s';layer.append(ring);
      if(jackpot){ring.style.borderColor='#ffd56b';ring.style.boxShadow='0 0 24px #ffd56b';}
      const sparkCount=jackpot?24:20;
      for(let i=0;i<sparkCount;i++){
        const spark=document.createElement('i'),angle=i/sparkCount*Math.PI*2,distance=(jackpot?90:65)+Math.random()*80;
        spark.className='firework-spark';spark.style.left=x+'%';spark.style.top=y+'%';spark.style.setProperty('--fx',Math.cos(angle)*distance+'px');spark.style.setProperty('--fy',Math.sin(angle)*distance+'px');spark.style.setProperty('--color',palette[i%palette.length]);spark.style.animationDelay=delay+'s';layer.append(spark);
      }
    }
  }
  function showResult(celebrate=false){
    const round=state.active;if(!round)return;const prize=PRIZES[round.prize],won=prize.id!=='again';
    resultDialog.classList.toggle('is-again',!won);$('result-badge').textContent=prize.id==='cake'?'JACKPOT!':won?'LUCKY YOU!':'THANK YOU ♡';
    $('result-title').textContent=prize.title;$('result-description').textContent=prize.description;
    const probability=Number.isFinite(round.probability)?round.probability:prize.probability;
    $('result-probability').textContent=(Number.isFinite(round.probability)?'':'현재 ')+(won?'당첨 확률 ':'해당 결과 확률 ')+probability+'%';
    const art=$('result-art');art.className='result-art is-'+prize.id;
    const img=$('result-image'),alt=$('result-image-alt');img.hidden=!prize.image;alt.hidden=prize.id!=='laugen';
    if(prize.image){img.src=prize.image;img.alt=prize.id==='laugen'?'말차 라우겐':prize.name;}
    if(prize.id==='laugen'){alt.src='assets/honey-laugen.webp';alt.alt='허니 라우겐';}
    $('result-heart').hidden=won;$('claim-note').hidden=!won;$('result-round').textContent='참여번호 '+String(round.number).padStart(4,'0');
    if(!resultDialog.open)resultDialog.showModal();
    $('play-status').textContent=won?'당첨을 축하해요! 현장 직원에게 결과를 보여주세요.':'참여해주셔서 감사해요. 직원 확인 후 다음 참여자를 안내해주세요.';
    if(celebrate)celebration(prize.id);
  }
  function finish(){
    busy=false;animationFrame=null;
    updateSoundButton();
    // Loading delays or enabling sound mid-spin must not postpone the result sound.
    if(mediaActive&&!mediaTesting&&media)try{if(media.currentTime<6.8)media.currentTime=6.8;}catch(error){}
    const active=state.active;if(!active)return;
    const next={...state,rotation:active.target,active:{...active,phase:'result'}};
    // Even if this second save fails, the already-saved draw remains locked on reload.
    if(!save(next))state=next;
    disc.style.transform=`rotate(${active.target}deg)`;setPhase('result');showResult(true);
  }
  function animate(start,target){
    busy=true;setPhase('spinning');$('play-status').textContent='말랑한 행운을 만나러 가는 중이에요…';
    updateSoundButton();
    const began=performance.now(),duration=motion.matches?850:6800;let lastTick=-1,lastTone=0;
    function frame(now){
      const p=Math.min(1,(now-began)/duration),eased=1-Math.pow(1-p,5),angle=start+(target-start)*eased;
      disc.style.transform=`rotate(${angle}deg)`;
      const tick=Math.floor(angle/12);if(tick!==lastTick&&now-lastTone>50){note(850+p*150,.026,.065,0,'triangle');lastTick=tick;lastTone=now;}
      if(p<1)animationFrame=requestAnimationFrame(frame);else finish();
    }
    animationFrame=requestAnimationFrame(frame);
  }
  function play(){
    if(busy||!storageReady)return;
    initAudio();
    if(state.active){showResult(false);return;}
    let draw;try{draw=Core.draw(state.rotation);}catch(error){$('play-status').textContent='추첨을 준비하지 못했어요. 새로고침 후 직원에게 알려주세요.';return;}
    const number=state.sequence+1,round={number,at:Date.now(),prize:draw.prize,probability:PRIZES[draw.prize].probability,segmentIndex:draw.segmentIndex,target:draw.target,phase:'spinning'};
    const next={...state,sequence:number,counts:{...state.counts,[draw.prize]:state.counts[draw.prize]+1},history:[{number,at:round.at,prize:draw.prize},...state.history].slice(0,300),active:round};
    // Save the selected outcome before any animation. Refreshing cannot re-draw it.
    const start=state.rotation;if(!save(next))return;startMedia(draw.prize);animate(start,draw.target);
  }
  function nextParticipant(){
    if(busy)return;
    if(!save({...state,rotation:Core.modulo(state.rotation),active:null}))return;
    clearCelebration();
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
  const rateLabels={cake:['cake-probability','center-probability','cake-caption-probability'],gelato:['gelato-probability'],laugen:['laugen-probability'],again:['again-probability']};
  for(const [prize,ids] of Object.entries(rateLabels))for(const id of ids)$(id).textContent=PRIZES[prize].probability+'%';
  makeWheel();updateSoundButton();disc.style.transform=`rotate(${state.rotation}deg)`;setPhase('idle');
  spinButton.addEventListener('click',play);centerButton.addEventListener('click',play);$('next-button').addEventListener('click',nextParticipant);
  $('sound-button').addEventListener('click',()=>{
    sound=!sound;try{localStorage.setItem(SOUND_KEY,sound?'on':'off');}catch(error){}
    if(sound){initAudio();if(busy)startMedia(state.active.prize);else testSound();}else{stopMedia();stopSounds();}
    updateSoundButton();
  });
  $('sound-test-button').addEventListener('click',testSound);
  $('history-button').addEventListener('click',()=>{renderHistory();historyDialog.showModal();});$('history-close').addEventListener('click',()=>historyDialog.close());$('csv-button').addEventListener('click',downloadCSV);
  $('history-dialog').addEventListener('click',event=>{if(event.target===historyDialog){const r=historyDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)historyDialog.close();}});
  if(document.fullscreenEnabled){$('fullscreen-button').hidden=false;$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){$('play-status').textContent='이 브라우저에서는 전체 화면 전환이 지원되지 않아요.';}});document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').querySelector('span').textContent=document.fullscreenElement?'화면 복원':'전체 화면';});}
  // Another tab on the same device must not keep an outdated, ready-to-spin state.
  window.addEventListener('storage',event=>{if(event.key===KEY&&!busy)location.reload();});
  if(state.active){disc.style.transform=`rotate(${state.active.target}deg)`;if(state.active.phase!=='result'){const next={...state,rotation:state.active.target,active:{...state.active,phase:'result'}};if(!save(next))state=next;}else state.rotation=state.active.target;setPhase('result');showResult(false);}
})();
