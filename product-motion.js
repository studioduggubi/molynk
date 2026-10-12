(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const profiles = {
    cake: { x: 1.08, y: .84, duration: 950 },
    macaron: { x: 1.13, y: .76, duration: 1050 },
    donut: { x: 1.12, y: .82, duration: 820 },
    sheep: { x: 1.11, y: .78, duration: 1200 },
    'mint-heart': { x: 1.08, y: .85, duration: 800 },
    gelato: { x: 1.1, y: .8, duration: 1000 }
  };
  const controllers = new Map();
  document.querySelectorAll('[data-squishy]').forEach(button => {
    const img = button.querySelector('.squishy-image');
    let motion, held = false, pressedAt = 0, pointerId = null, releaseTimer;
    function animate(frames, options) {
      if (motion) motion.cancel();
      motion = img.animate(frames, options);
    }
    function press() {
      if (held) return;
      clearTimeout(releaseTimer);
      held = true;
      pressedAt = performance.now();
      const p = profiles[button.dataset.squishy];
      const from = getComputedStyle(img).transform;
      img.getAnimations().forEach(animation => animation.cancel());
      const x = reduce.matches ? 1.025 : p.x, y = reduce.matches ? .96 : p.y;
      animate([{ transform: from }, { transform: `scale(${x},${y}) rotate(-1deg)` }],
        { duration: reduce.matches ? 0 : 230, easing: 'cubic-bezier(.18,.7,.3,1)', fill: 'forwards' });
    }
    function release() {
      if (!held) return;
      clearTimeout(releaseTimer);
      const remaining = 145 - (performance.now() - pressedAt);
      if (!reduce.matches && remaining > 0) { releaseTimer = setTimeout(release, remaining); return; }
      held = false; pointerId = null;
      const p = profiles[button.dataset.squishy];
      const from = getComputedStyle(img).transform;
      animate([
        { transform: from, offset: 0 },
        { transform: 'scale(.974,1.042) rotate(.5deg)', offset: .38 },
        { transform: 'scale(1.012,.985) rotate(-.2deg)', offset: .63 },
        { transform: 'scale(.996,1.006)', offset: .81 },
        { transform: 'scale(1,1)', offset: 1 }
      ], { duration: reduce.matches ? 0 : p.duration, easing: 'cubic-bezier(.2,.65,.25,1)', fill: 'forwards' });
    }
    button.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0) return;
      pointerId = e.pointerId;
      press();
    });
    ['pointerup', 'pointercancel'].forEach(type => window.addEventListener(type, e => {
      if (e.pointerId === pointerId) release();
    }, { passive: true }));
    button.addEventListener('pointerleave', release);
    button.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); }
    });
    button.addEventListener('keyup', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); }
    });
    button.addEventListener('blur', release);
    button.addEventListener('click', () => {
      // Assistive technology can dispatch a click with no pointer/key events.
      if (performance.now() - pressedAt > 500 && !held) { press(); setTimeout(release, 180); }
    });
    controllers.set(button, () => { clearTimeout(releaseTimer); held = false; pointerId = null; if (motion) motion.cancel(); });
  });
  const main = document.getElementById('squeeze');
  const mainImg = main.querySelector('img');
  const pickers = [...document.querySelectorAll('[data-product]')];
  let selection = 0;
  pickers.forEach(picker => picker.addEventListener('click', async () => {
    const kind = picker.dataset.product;
    if (kind === main.dataset.squishy) return;
    const token = ++selection;
    const next = new Image();
    next.src = `product-${kind}.png`;
    try { await next.decode(); } catch { return; }
    if (token !== selection) return;
    controllers.get(main)();
    main.dataset.squishy = kind;
    main.setAttribute('aria-label', '선택한 몰링크 제품 눌러보기');
    mainImg.src = next.src;
    mainImg.alt = '선택한 몰링크 스퀴시 제품';
    pickers.forEach(el => el.setAttribute('aria-pressed', String(el === picker)));
    document.getElementById('touch-status').textContent = `제품 ${pickers.indexOf(picker) + 1} 선택됨`;
    if (!reduce.matches) mainImg.animate([
      { opacity: 0, transform: 'translateY(12px)' },
      { opacity: 1, transform: 'translateY(-3px)', offset: .7 },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 550, easing: 'cubic-bezier(.16,1,.3,1)' });
  }));
})();
