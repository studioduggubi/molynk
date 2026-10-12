(() => {
  const gallery = document.querySelector('.campaign-gallery');
  if (!gallery) return;
  const viewport = gallery.querySelector('.campaign-viewport');
  const track = gallery.querySelector('.campaign-track');
  const slides = [...track.children];
  const dots = [...gallery.querySelectorAll('.campaign-dot')];
  const toggle = gallery.querySelector('.campaign-toggle');
  const status = gallery.querySelector('.campaign-status');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const review = new URLSearchParams(location.search).has('review');
  const count = slides.length;
  // End clones keep the last-to-first motion moving in the same direction.
  [slides[count - 1], slides[0]].forEach((slide, i) => {
    const clone = slide.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelector('img').alt = '';
    i ? track.append(clone) : track.prepend(clone);
  });
  let position = 1, timer, settleTimer, visible = false, hovered = false;
  let paused = reduce.matches || review, moving = false, pointer = null;
  const index = () => (position - 1 + count) % count;
  function paint(animate = false, dx = 0) {
    track.style.transition = animate && !reduce.matches ? 'transform 720ms cubic-bezier(.22,.75,.2,1)' : 'none';
    track.style.transform = `translate3d(calc(${-position * 100}% + ${dx}px),0,0)`;
  }
  function schedule() {
    clearTimeout(timer);
    if (visible && !paused && !hovered && !pointer && !moving && !document.hidden && !gallery.contains(document.activeElement)) {
      timer = setTimeout(() => go(position + 1), 4200);
    }
  }
  function settle() {
    clearTimeout(settleTimer);
    if (position === 0) position = count;
    if (position === count + 1) position = 1;
    paint();
    moving = false;
    schedule();
  }
  function go(next, manual = false) {
    if (moving) return;
    clearTimeout(timer);
    position = next;
    moving = true;
    paint(true);
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index())));
    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== index())));
    if (manual) status.textContent = `사진 ${index() + 1} / ${count}`;
    settleTimer = setTimeout(settle, reduce.matches ? 0 : 780);
  }
  track.addEventListener('transitionend', event => {
    if (event.target === track && event.propertyName === 'transform') settle();
  });
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i + 1, true)));
  function showToggle() {
    toggle.setAttribute('aria-label', paused ? '사진 자동 넘김 재생' : '사진 자동 넘김 일시정지');
    toggle.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
  }
  toggle.addEventListener('click', () => { paused = !paused; showToggle(); schedule(); });
  gallery.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = true; schedule(); } });
  gallery.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  gallery.addEventListener('focusin', () => clearTimeout(timer));
  gallery.addEventListener('focusout', () => setTimeout(schedule, 0));
  gallery.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); go(position + (e.key === 'ArrowRight' ? 1 : -1), true);
    }
  });
  viewport.addEventListener('pointerdown', e => {
    if (moving || !e.isPrimary || e.button !== 0) return;
    pointer = { id:e.pointerId, x:e.clientX, y:e.clientY, dx:0, axis:null };
    viewport.setPointerCapture(e.pointerId);
    clearTimeout(timer);
  });
  viewport.addEventListener('pointermove', e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    if (!pointer.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) pointer.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (pointer.axis === 'x') { pointer.dx = dx; paint(false, dx * .85); }
  });
  function release(e) {
    if (!pointer || pointer.id !== e.pointerId) return;
    const dx = pointer.dx;
    pointer = null;
    if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
    if (e.type !== 'pointercancel' && Math.abs(dx) > Math.min(60, viewport.clientWidth * .16)) go(position + (dx < 0 ? 1 : -1), true);
    else { paint(true); schedule(); }
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  document.addEventListener('visibilitychange', schedule);
  reduce.addEventListener('change', () => { if (reduce.matches) { paused = true; showToggle(); settle(); } });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
    if (visible) track.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
    schedule();
  }, { threshold:.25 }).observe(gallery);
  slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== 0)));
  paint(); showToggle(); gallery.classList.add('is-ready');
})();
