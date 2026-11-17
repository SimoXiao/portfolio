/* Fold cue and optional supported-browser touch feedback. */
(() => {
  'use strict';
  const cue = document.createElement('div');
  cue.className = 'fold-scroll-cue';
  cue.setAttribute('aria-hidden', 'true');
  cue.innerHTML = '<span class="fold-cue-mouse"><i></i></span><span class="fold-cue-copy"></span>';
  document.body.append(cue);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  cue.querySelector('.fold-cue-copy').textContent = '上滑滚动展开折页';
  const thresholds = [.32, .72];
  const fired = new Set();
  const pulses = [];
  let frame = 0;
  let lastPulse = -Infinity;
  let touch = null;
  let motionStarted = false;
  let needsFit = true;
  let clearance = 0;

  function rawProgress() {
    // CassetteScene owns the opening point; consume the same fold contract.
    const raw = Number(document.querySelector('#paper-shelf .paper-object')?.dataset.paperRawProgress ?? 0);
    return Math.max(0, Math.min(1, raw));
  }
  function browsingShelf() {
    return document.visibilityState === 'visible' &&
      !document.body.classList.contains('is-booting') &&
      !document.body.classList.contains('story-open') &&
      !document.body.dataset.section &&
      document.body.dataset.layout !== 'index' &&
      !document.querySelector('dialog[open]');
  }
  function visualProgress() {
    return Number(document.querySelector('#paper-shelf .paper-object')?.dataset.paperVisualProgress ?? 0);
  }
  function fitSpace() {
    if (!needsFit || !browsingShelf() || document.querySelector('.rack .is-unfolded')) return;
    const range = document.querySelector('#paper-scroll-range');
    const sticky = range?.querySelector('.paper-sticky');
    const shelf = document.querySelector('#paper-shelf');
    const player = document.querySelector('.archive-player');
    if (!range || !sticky || !shelf || !player || !shelf.clientWidth) return;
    // Measure the folded cover in document space even when the live paper has
    // unfolded or is sticky. Add back our previous row reduction to avoid drift.
    const closedBottom = range.getBoundingClientRect().top + scrollY +
      (parseFloat(getComputedStyle(sticky).paddingTop) || 0) + shelf.clientWidth / 3 + clearance;
    const baselineGap = player.getBoundingClientRect().top - closedBottom;
    const compact = baselineGap < 70;
    cue.dataset.compact = String(compact);
    const gap = 28;
    const needed = gap + cue.getBoundingClientRect().height + 16;
    const next = Math.max(0, Math.min(64, Math.ceil(needed - baselineGap)));
    if (next !== clearance) {
      clearance = next;
      document.documentElement.style.setProperty('--fold-cue-clearance', `${clearance}px`);
    }
    needsFit = false;
  }
  function update() {
    frame = 0;
    fitSpace();
    const cover = document.querySelector('#paper-shelf .paper-surface-1');
    const player = document.querySelector('.archive-player');
    const raw = rawProgress();
    const progress = visualProgress();
    if (raw <= .02) fired.clear();
    const box = cover?.getBoundingClientRect();
    const playerTop = player?.getBoundingClientRect().top ?? innerHeight;
    const cueTop = box ? box.bottom + 28 : 0;
    const visible = browsingShelf() && box && box.width > 0 &&
      box.top > 120 && box.bottom > innerHeight * .25 &&
      cueTop + cue.getBoundingClientRect().height < playerTop - 12 && Math.max(progress, raw) < .05;
    if (visible) {
      cue.style.left = `${box.left + box.width / 2}px`;
      cue.style.top = `${cueTop}px`;
      cue.style.setProperty('--fold-cue-opacity', String(.62 * (1 - Math.max(progress, raw) / .05)));
      if (!motionStarted && !reduce.matches) {
        motionStarted = true;
        cue.dataset.motion = 'on';
        setTimeout(() => { cue.dataset.motion = 'off'; }, 5600);
      }
    }
    cue.classList.toggle('is-visible', Boolean(visible));
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function considerPulse(previous, raw) {
    const now = performance.now();
    if (!touch?.upward || !browsingShelf() || reduce.matches ||
      typeof navigator.vibrate !== 'function' ||
      !navigator.userActivation?.hasBeenActive || now - lastPulse < 350) return;
    const threshold = thresholds.find(point => previous < point && raw >= point && !fired.has(point));
    if (threshold === undefined) return;
    // The duration is deliberately short; the web API cannot set motor strength.
    const accepted = navigator.vibrate(6);
    fired.add(threshold);
    lastPulse = now;
    pulses.push({ threshold, duration: 6, accepted, time: Math.round(now) });
    if (pulses.length > 16) pulses.shift();
  }
  document.addEventListener('touchstart', event => {
    if (!event.isTrusted) return;
    if (event.touches.length !== 1) { touch = null; return; }
    const point = event.touches[0];
    touch = { id: point.identifier, startY: point.clientY, lastY: point.clientY, lastRaw: rawProgress(), upward: false };
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (!event.isTrusted) return;
    const point = [...event.touches].find(item => item.identifier === touch?.id);
    if (!point || event.touches.length !== 1) { touch = null; return; }
    touch.upward = touch.lastY - point.clientY > 0 && touch.startY - point.clientY > 5;
    touch.lastY = point.clientY;
    const raw = rawProgress();
    considerPulse(touch.lastRaw, raw);
    touch.lastRaw = raw;
  }, { passive: true });
  const endTouch = () => { touch = null; };
  document.addEventListener('touchend', endTouch, { passive: true });
  document.addEventListener('touchcancel', endTouch, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  const refit = () => { needsFit = true; schedule(); };
  window.addEventListener('resize', refit, { passive: true });
  window.visualViewport?.addEventListener('resize', refit, { passive: true });
  document.addEventListener('visibilitychange', () => { endTouch(); schedule(); });
  reduce.addEventListener('change', () => { endTouch(); schedule(); });
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-layout', 'data-section'] });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('toggle', schedule));
  const paper = document.querySelector('#paper-shelf .paper-object');
  if (paper) new MutationObserver(schedule).observe(paper, {
    attributes: true, attributeFilter: ['data-paper-raw-progress', 'data-paper-visual-progress']
  });
  const resize = new ResizeObserver(schedule);
  ['.rack', '#paper-shelf', '.archive-player'].forEach(selector => {
    const element = document.querySelector(selector);
    if (element) resize.observe(element);
  });
  // Read-only diagnostics make browser QA possible without a perpetual timer.
  window.SimoFoldCue = {
    snapshot: () => ({ raw: rawProgress(), progress: visualProgress(), visible: cue.classList.contains('is-visible'), pulses: [...pulses], reduced: reduce.matches, compact: cue.dataset.compact === 'true', clearance })
  };
  schedule();
})();
