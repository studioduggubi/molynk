// RGB and alpha share one H.264 frame to remain synchronized on mobile browsers.
(() => {
  const hero = document.querySelector('.figma-hero');
  if (!hero) return;
  const viewport = hero.querySelector('.poster-viewport');
  const artboard = hero.querySelector('.figma-artboard');
  const video = document.getElementById('hero-film');
  const canvas = document.getElementById('cake-alpha-canvas');
  const toggle = document.getElementById('hero-film-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const review = new URLSearchParams(location.search).has('review');
  let userPaused = false, visible = true, renderer = null, framePending = false, failed = false;
  function resize() { artboard.style.setProperty('--poster-scale', viewport.clientWidth / 1080); }
  new ResizeObserver(resize).observe(viewport); resize();
  function syncButton() {
    toggle.textContent = video.paused ? '회전 재생 ▷' : '회전 멈춤 Ⅱ';
    toggle.setAttribute('aria-label', video.paused ? '케이크 영상 재생' : '케이크 영상 일시정지');
    toggle.setAttribute('aria-pressed', String(video.paused));
  }
  function createRenderer() {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL unavailable');
    const shader = (kind, source) => {
      const s = gl.createShader(kind); gl.shaderSource(s,source); gl.compileShader(s);
      if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error('Shader unavailable');
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position; varying vec2 uv; void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.0,1.0);}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float; varying vec2 uv; uniform sampler2D frame; void main(){vec3 rgb=texture2D(frame,vec2(uv.x*0.5,uv.y)).rgb;float a=texture2D(frame,vec2(0.5+uv.x*0.5,uv.y)).r;a=smoothstep(0.015,0.985,a);gl_FragColor=vec4(rgb*a,a);}'));
    gl.linkProgram(program); if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Program unavailable');
    gl.useProgram(program);
    const buffer = gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.uniform1i(gl.getUniformLocation(program,'frame'),0);
    canvas.width=video.videoWidth/2;canvas.height=video.videoHeight;gl.viewport(0,0,canvas.width,canvas.height);
    return () => {
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,video);
      gl.drawArrays(gl.TRIANGLES,0,6);
      canvas.closest('.transparent-cake').classList.add('has-alpha');
    };
  }
  function paint() {
    if (failed || video.readyState < 2) return;
    try { if (!renderer) renderer=createRenderer(); renderer(); }
    catch { failed=true;video.pause();toggle.hidden=true;canvas.closest('.transparent-cake').classList.remove('has-alpha'); }
  }
  function nextFrame() {
    if(framePending || failed || video.paused) return;
    framePending=true;
    const update=()=>{framePending=false;paint();nextFrame();};
    if(video.requestVideoFrameCallback) video.requestVideoFrameCallback(update);
    else requestAnimationFrame(update);
  }
  function playback() {
    if(userPaused || !visible || document.hidden || reduced.matches || review || failed) video.pause();
    else video.play().catch(syncButton);
  }
  toggle.addEventListener('click',()=>{
    if(video.paused){userPaused=false;video.play().catch(syncButton);}
    else {userPaused=true;video.pause();}
  });
  video.addEventListener('loadeddata',()=>{paint();playback();});
  video.addEventListener('play',()=>{syncButton();nextFrame();});
  video.addEventListener('pause',syncButton);
  video.addEventListener('seeked',paint);
  video.addEventListener('error',()=>{failed=true;toggle.hidden=true;});
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;playback();},{threshold:.08}).observe(hero);
  document.addEventListener('visibilitychange',playback);
  reduced.addEventListener('change',()=>{playback();updateScroll();});
  playback();syncButton();
  // Spring-following layers: fixed geometry, no zoom, no wheel interception.
  const depths={logo:-32,tag:-24,cake:14,title:-10};
  const layers=[...hero.querySelectorAll('[data-parallax]')];
  let target=0,position=0,velocity=0,raf=0,last=0;
  function tick(now){
    const dt=Math.min((now-last)/1000||1/60,1/30);last=now;
    velocity+=((target-position)*150-velocity*25)*dt;position+=velocity*dt;
    layers.forEach(el=>el.style.transform=`translate3d(0,${(position*depths[el.dataset.parallax]).toFixed(3)}px,0)`);
    if(Math.abs(target-position)>.0002||Math.abs(velocity)>.002)raf=requestAnimationFrame(tick);else raf=0;
  }
  function updateScroll(){
    target=reduced.matches||review?0:Math.max(0,Math.min(1,-hero.getBoundingClientRect().top/viewport.clientHeight));
    if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}
  }
  addEventListener('scroll',updateScroll,{passive:true});
  if(!reduced.matches&&!review)layers.forEach((el,i)=>{
    const inner=document.createElement('div');inner.className='poster-entrance';
    while(el.firstChild)inner.append(el.firstChild);el.append(inner);
    inner.animate([{opacity:0,transform:'translateY(45px)'},{opacity:1,transform:'translateY(-4px)',offset:.72},{opacity:1,transform:'translateY(0)'}],{duration:1050,delay:i*75,easing:'cubic-bezier(.22,.7,.24,1)',fill:'backwards'});
  });
})();
