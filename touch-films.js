(() => {
  const rail = document.querySelector('.touch-films');
  if (!rail) return;
  const originals = [...rail.querySelectorAll('.touch-film')];
  const clone = originals[0].cloneNode(true);
  clone.dataset.clone = 'true';
  clone.setAttribute('aria-hidden', 'true');
  clone.tabIndex = -1;
  rail.append(clone);
  const buttons = [...document.querySelectorAll('.touch-film')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const review = new URLSearchParams(location.search).has('review');
  const states = new Map();
  function load(video) {
    const source = video.querySelector('source');
    if (!source.hasAttribute('src')) { source.src = source.dataset.src; video.load(); }
  }
  function sync(button) {
    const state = states.get(button), video = button.querySelector('video');
    const shouldPlay = state.visible && !document.hidden && !state.paused && (!reduced.matches || state.manual) && !review;
    if (shouldPlay) { load(video); video.play().catch(() => { button.classList.add('is-paused'); }); }
    else video.pause();
  }
  buttons.forEach(button => {
    const video = button.querySelector('video');
    video.muted = true;
    states.set(button, {visible:false, paused:false, manual:false});
    function reflect() {
      button.classList.toggle('is-paused', video.paused);
      button.setAttribute('aria-pressed', String(!video.paused));
      button.setAttribute('aria-label', button.dataset.description + (video.paused ? ' — 재생' : ' — 일시정지'));
    }
    video.addEventListener('play', reflect);
    video.addEventListener('pause', reflect);
    button.addEventListener('click', () => {
      const state = states.get(button);
      state.manual = true;
      state.paused = !video.paused;
      sync(button);
    });
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    const state = states.get(entry.target);
    state.visible = entry.isIntersecting && entry.intersectionRatio >= .55;
    sync(entry.target);
  }), {threshold:[0,.55]});
  buttons.forEach(button => observer.observe(button));
  document.addEventListener('visibilitychange', () => buttons.forEach(sync));
  reduced.addEventListener('change', () => {
    states.forEach(state => { state.manual = false; });
    buttons.forEach(sync);
  });

  let timer, scrollTimer, railVisible = false, touching = false, moving = false;
  let resumeAt = 0;
  const left = button => button.offsetLeft - originals[0].offsetLeft;
  function schedule() {
    clearTimeout(timer);
    if (!railVisible || document.hidden || reduced.matches || review || touching || moving) return;
    timer = setTimeout(advance, Math.max(3000, resumeAt - performance.now()));
  }
  function settle() {
    moving = false;
    if (Math.abs(rail.scrollLeft - left(clone)) < 3) {
      originals[0].querySelector('video').currentTime = clone.querySelector('video').currentTime;
      rail.scrollTo({left:0, behavior:'instant'});
    }
    schedule();
  }
  function advance() {
    let current = 0;
    buttons.forEach((button, i) => {
      if (Math.abs(left(button) - rail.scrollLeft) < Math.abs(left(buttons[current]) - rail.scrollLeft)) current = i;
    });
    moving = true;
    rail.scrollTo({left:left(buttons[Math.min(current + 1, buttons.length - 1)]), behavior:'smooth'});
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(settle, 900);
  }
  rail.addEventListener('scroll', () => {
    clearTimeout(timer);
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(settle, 180);
  }, {passive:true});
  function interact() { resumeAt = performance.now() + 6500; clearTimeout(timer); }
  rail.addEventListener('pointerdown', () => { touching = true; interact(); });
  window.addEventListener('pointerup', () => { if (touching) { touching = false; schedule(); } });
  window.addEventListener('pointercancel', () => { touching = false; schedule(); });
  rail.addEventListener('wheel', () => { interact(); schedule(); }, {passive:true});
  rail.addEventListener('click', () => { interact(); schedule(); });
  rail.addEventListener('keydown', event => {
    interact();
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      rail.scrollBy({left:(originals[0].offsetWidth + 12) * (event.key === 'ArrowRight' ? 1 : -1), behavior:reduced.matches ? 'instant' : 'smooth'});
    }
    schedule();
  });
  new IntersectionObserver(entries => {
    railVisible = entries[0].isIntersecting && entries[0].intersectionRatio >= .5;
    schedule();
  }, {threshold:[0,.5]}).observe(rail);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
})();
