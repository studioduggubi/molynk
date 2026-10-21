(() => {
  'use strict';
  const scripts = {
    hello: {situation:'처음 방문한 손님께', text:'몰링크는 프리미엄 스퀴시, 말랑이 브랜드예요.\n이쪽 체험용 제품을 한번 눌러보세요.', tip:'인사한 뒤, 체험용 제품을 가리켜주세요.'},
    detail: {situation:'제품에 관심을 보이는 손님께', text:'케이크의 크림과 리본까지 섬세하게 표현돼 있어요.\n가까이서 디테일도 살펴보세요.', tip:'실제 제품에서 소개하는 부분을 함께 보여주세요.'},
    care: {situation:'사용 연령이나 관리법을 물으시면', text:'사용 연령과 관리 방법을 확인해드릴게요.\n이 제품의 포장에 적힌 안내를 함께 봐주세요.', tip:'해당 제품의 국내 표시사항을 기준으로 안내해요.'},
    check: {situation:'바로 답하기 어려운 질문을 받으면', text:'정확한 내용을 확인해서 안내드릴게요.\n잠시만 기다려주세요.', tip:'담당자에게 확인한 뒤 손님께 다시 안내해주세요.'}
  };
  let selected = 'hello';
  const byId = id => document.getElementById(id);
  const text = byId('script-text');
  const status = byId('copy-status');
  const copyButton = byId('copy-script');
  for (const button of document.querySelectorAll('[data-script]')) {
    button.addEventListener('click', () => {
      selected = button.dataset.script;
      for (const tab of document.querySelectorAll('[data-script]')) tab.setAttribute('aria-pressed', String(tab === button));
      const script = scripts[selected];
      text.textContent = script.text;
      text.style.whiteSpace = 'pre-line';
      byId('script-situation').textContent = script.situation;
      byId('script-tip').textContent = script.tip;
      status.textContent = '';
    });
  }
  copyButton.addEventListener('click', async () => {
    if (copyButton.disabled) return;
    copyButton.disabled = true;
    const value = scripts[selected].text;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      status.textContent = '멘트를 복사했어요.';
    } catch {
      const selection = window.getSelection?.();
      if (selection && document.createRange) {
        const range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      status.textContent = '멘트를 길게 누르거나 선택해서 복사해주세요.';
    } finally {
      copyButton.disabled = false;
    }
  });

  const checks = [...document.querySelectorAll('input[name="practice"]')];
  function updatePractice() {
    const count = checks.filter(input => input.checked).length;
    byId('practice-count').textContent = `${count} / ${checks.length}`;
    byId('practice-message').textContent = count === checks.length
      ? '브랜드 소개 연습 완료! 다음은 팀장님과 현장 위치를 확인해요.'
      : count === 0 ? '하나씩 해보면, 첫 안내가 더 편해져요.' : '좋아요. 남은 항목도 직접 해보세요.';
    document.querySelector('.ready-status').classList.toggle('complete', count === checks.length);
  }
  checks.forEach(input => input.addEventListener('change', updatePractice));
  updatePractice();

  const dialog = byId('photo-dialog');
  let opener = null;
  for (const button of document.querySelectorAll('[data-photo]')) {
    button.addEventListener('click', () => {
      const image = byId('dialog-photo');
      image.src = button.dataset.photo;
      image.alt = button.dataset.photoAlt;
      byId('photo-caption').textContent = button.dataset.photoCaption;
      if (typeof dialog.showModal === 'function') {
        opener = button;
        dialog.showModal();
      } else {
        window.open(button.dataset.photo, '_blank', 'noopener');
      }
    });
  }
  byId('close-photo').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus());

  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.site-header nav a')];
    const observer = new IntersectionObserver(entries => {
      const active = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      for (const link of links) {
        if (link.getAttribute('href') === '#' + active.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }, {rootMargin:'-100px 0px -35% 0px', threshold:[0,.1,.3]});
    for (const id of ['brand','talk','ready']) observer.observe(byId(id));
  }
})();
