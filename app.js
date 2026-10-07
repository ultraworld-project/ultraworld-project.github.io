(() => {
  'use strict';
  const videos = [...document.querySelectorAll('video')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const userPaused = new WeakSet();
  const automaticPauses = new WeakSet();
  let motionPaused = reducedMotion.matches;

  function pause(video) {
    if (!video.paused) {
      automaticPauses.add(video);
      video.pause();
    }
  }
  function playIfVisible(video) {
    if (video.dataset.visible !== 'true' || video.closest('[hidden]') || document.hidden || motionPaused || userPaused.has(video)) return;
    video.play()?.catch(() => {});
  }
  document.querySelectorAll('.operation-group').forEach(group => {
    const slides = [...group.querySelectorAll('.experiment-clip')];
    if (slides.length < 2) return;
    const label = group.querySelector('h3').textContent;
    const stage = document.createElement('div');
    stage.className = 'case-carousel';
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-roledescription', 'carousel');
    stage.setAttribute('aria-label', `${label} examples`);
    group.append(stage);
    slides.forEach((slide, index) => {
      slide.hidden = index !== 0;
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${index + 1} of ${slides.length}`);
      stage.append(slide);
    });
    const previous = document.createElement('button');
    const next = document.createElement('button');
    for (const [button, direction, path] of [[previous, 'previous', 'm14 6-6 6 6 6'], [next, 'next', 'm10 6 6 6-6 6']]) {
      button.type = 'button';
      button.className = `carousel-arrow carousel-${direction}`;
      button.setAttribute('aria-label', `${direction === 'previous' ? 'Previous' : 'Next'} ${label} example`);
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
      stage.append(button);
    }
    const pagination = document.createElement('div');
    pagination.className = 'carousel-dots';
    pagination.setAttribute('role', 'group');
    pagination.setAttribute('aria-label', `${label} example selection`);
    const dots = slides.map((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Show ${label} example ${index + 1}`);
      dot.setAttribute('aria-pressed', String(index === 0));
      dot.addEventListener('click', () => select(index));
      pagination.append(dot);
      return dot;
    });
    group.append(pagination);
    const status = document.createElement('p');
    status.className = 'sr-only';
    status.setAttribute('aria-live', 'polite');
    group.append(status);
    let current = 0;
    function select(index) {
      const selected = (index + slides.length) % slides.length;
      if (selected === current) return;
      const outgoing = slides[current].querySelector('video');
      outgoing.dataset.visible = 'false';
      pause(outgoing);
      slides[current].hidden = true;
      current = selected;
      slides[current].hidden = false;
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
      status.textContent = `${label}: ${current + 1} of ${slides.length}`;
      // IntersectionObserver starts the newly visible clip and keeps hidden clips paused.
    }
    previous.addEventListener('click', () => select(current - 1));
    next.addEventListener('click', () => select(current + 1));
  });
  for (const video of videos) {
    video.addEventListener('pause', () => {
      if (automaticPauses.has(video)) automaticPauses.delete(video);
      else userPaused.add(video);
    });
    video.addEventListener('play', () => userPaused.delete(video));
  }
  const observer = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      target.dataset.visible = String(isIntersecting);
      if (isIntersecting) playIfVisible(target);
      else pause(target);
    }
  }, {threshold: 0.15});
  videos.forEach(video => observer.observe(video));

  reducedMotion.addEventListener('change', event => {
    motionPaused = event.matches;
    if (motionPaused) videos.forEach(pause);
  });
  document.addEventListener('visibilitychange', () => {
    videos.forEach(video => document.hidden ? pause(video) : playIfVisible(video));
  });
  document.querySelector('#copy-citation').addEventListener('click', async () => {
    const citation = document.querySelector('#bibtex').textContent;
    const status = document.querySelector('#copy-status');
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(citation);
      else {
        const field = document.createElement('textarea');
        field.value = citation;
        field.style.cssText = 'position:fixed;left:-9999px';
        document.body.append(field); field.select();
        const copied = document.execCommand('copy'); field.remove();
        if (!copied) throw new Error('Copy unavailable');
      }
      status.textContent = 'Citation copied to clipboard.';
      document.querySelector('#copy-citation').focus();
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#bibtex'));
      selection.removeAllRanges(); selection.addRange(range);
      status.textContent = 'Citation selected. Press Ctrl+C (or Command+C) to copy.';
    }
  });
})();
