(() => {
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
})();
