/* A project transport, using the archive's existing controls as the state bridge. */
(() => {
  'use strict';
  if (document.querySelector('.archive-player')) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const story = $('#story-dialog');
  const bridge = $('.now-playing');
  const shelfIndex = $('#shelf-index');
  if (!story || !bridge || !shelfIndex) return;

  const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const pad = (value) => String(value).padStart(2, '0');
  const svg = (content, viewBox = '0 0 24 24') => `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${content}</svg>`;
  const icons = {
    previous: svg('<path d="M6 5v14M18 5 9 12l9 7Z"/>'),
    next: svg('<path d="M18 5v14M6 5l9 7-9 7Z"/>'),
    open: svg('<path d="m9 5 11 7-11 7Z"/>'),
    back: svg('<path d="M19 12H5m6-6-6 6 6 6"/>'),
    queue: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/>'),
    arrow: svg('<path d="M6 18 18 6M7 6h11v11"/>')
  };

  const home = document.createComment('archive-player home');
  document.body.append(home);
  const player = document.createElement('footer');
  player.className = 'archive-player';
  player.setAttribute('aria-label', '作品浏览控制');
  player.innerHTML = `
    <div class="archive-player-progress" role="progressbar" aria-label="页面阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
    <div class="archive-player-frame">
      <button class="archive-player-current" type="button" data-player="open" aria-label="打开当前作品">
        <span class="archive-player-art" aria-hidden="true"><img src="assets/thumbs/cassette-icon.webp" width="68" height="48" alt="" decoding="async"><span class="archive-player-profile"><span class="profile-avatar"></span><span class="profile-lines"></span></span></span>
        <span class="archive-player-info"><span class="archive-player-title"></span><span class="archive-player-subline"><span class="archive-player-counter"></span><span class="archive-player-subtitle"></span></span></span>
      </button>
      <div class="archive-player-transport" role="group" aria-label="切换与打开作品">
        <button class="archive-player-button archive-player-step" type="button" data-player="previous" aria-label="预览上一个条目">${icons.previous}</button>
        <button class="archive-player-button archive-player-open" type="button" data-player="open" aria-label="打开当前作品">${icons.open}</button>
        <button class="archive-player-button archive-player-step" type="button" data-player="next" aria-label="预览下一个条目">${icons.next}</button>
      </div>
      <div class="archive-player-status">
        <span class="archive-player-reading"><span class="archive-player-reading-label">阅读</span><span class="archive-player-percent" aria-hidden="true">00%</span></span>
        <button class="archive-player-button archive-player-queue-toggle" type="button" data-player="queue" aria-label="打开作品目录" aria-haspopup="menu" aria-controls="archive-player-queue" aria-expanded="false">${icons.queue}</button>
      </div>
      <div id="archive-player-queue" class="archive-player-queue" hidden><div class="archive-player-queue-heading"><span>作品目录</span><span class="archive-player-queue-count"></span></div><div class="archive-player-queue-list" role="menu" aria-label="选择并打开作品"></div><p class="archive-player-queue-note">选择条目，展开阅读 <span aria-hidden="true">↗</span></p></div>
    </div>`;
  home.after(player);
  const current = $('.archive-player-current', player);
  const art = $('.archive-player-art', player);
  const title = $('.archive-player-title', player);
  const subtitle = $('.archive-player-subtitle', player);
  const counter = $('.archive-player-counter', player);
  const openButton = $('.archive-player-open', player);
  const toggle = $('.archive-player-queue-toggle', player);
  const queue = $('.archive-player-queue', player);
  const queueList = $('.archive-player-queue-list', player);
  const progress = $('.archive-player-progress', player);
  const percent = $('.archive-player-percent', player);
  let queueSignature = '';
  let stateFrame = 0;
  let progressFrame = 0;
  let wasInStory = false;
  let savedShelfFocus = null;

  function isQueueOpen() { return !queue.hidden; }
  function closeQueue(restoreFocus = false) {
    if (!isQueueOpen()) return;
    queue.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '打开作品目录');
    if (restoreFocus) toggle.focus({ preventScroll: true });
  }
  function openQueue(focusFirst = false) {
    queue.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '收起作品目录');
    if (focusFirst) ($('[aria-checked="true"]', queueList) || $('button', queueList))?.focus();
  }
  function sourceButtons() { return $$('button[data-jump]', shelfIndex); }

  function updateProgress() {
    progressFrame = 0;
    const reader = story.open;
    const scrollRoot = reader ? story : document.scrollingElement;
    const range = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
    const value = range > 0 ? Math.max(0, Math.min(100, scrollRoot.scrollTop / range * 100)) : 0;
    const whole = Math.round(value);
    player.style.setProperty('--archive-reading-progress', `${value.toFixed(2)}%`);
    percent.textContent = `${pad(whole)}%`;
    progress.setAttribute('aria-valuenow', String(whole));
    progress.setAttribute('aria-label', reader ? '当前项目阅读进度' : '页面阅读进度');
  }
  function scheduleProgress() {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  }
  function sync() {
    stateFrame = 0;
    const reader = story.open;
    if (reader !== wasInStory) {
      closeQueue();
      if (reader) {
        if (player.contains(document.activeElement)) savedShelfFocus = document.activeElement;
        story.append(player);
      } else {
        home.after(player);
        if (savedShelfFocus?.isConnected && !$('#image-dialog')?.open) {
          const target = savedShelfFocus;
          requestAnimationFrame(() => target.focus({ preventScroll: true }));
        }
        savedShelfFocus = null;
      }
      wasInStory = reader;
    }
    player.classList.toggle('is-reader', reader);
    const name = $('#now-title')?.textContent.trim() || '设计档案';
    const detail = $('#now-subtitle')?.textContent.trim() || '';
    title.textContent = name;
    subtitle.textContent = detail;
    counter.textContent = $('#shelf-counter')?.textContent.trim() || '';
    current.setAttribute('aria-label', reader ? `返回磁带架，当前作品：${name}` : `打开${name}`);
    current.title = reader ? '返回磁带架' : `打开${name}`;
    openButton.setAttribute('aria-label', reader ? '返回磁带架' : $('#now-open')?.getAttribute('aria-label') || `打开${name}`);
    openButton.title = reader ? '返回磁带架' : `打开${name}`;
    openButton.innerHTML = reader ? icons.back : icons.open;
    $('[data-player="previous"]', player).setAttribute('aria-label', reader ? '打开上一个条目' : '预览上一个条目');
    $('[data-player="next"]', player).setAttribute('aria-label', reader ? '打开下一个条目' : '预览下一个条目');
    const sources = sourceButtons();
    const selected = sources.findIndex((button) => button.getAttribute('aria-current') === 'true');
    art.classList.toggle('is-paper', selected === sources.length - 1);
    const signature = sources.map((button) => $('.index-name', button)?.textContent || button.getAttribute('aria-label') || '').join('|');
    if (signature !== queueSignature) {
      queueSignature = signature;
      queueList.innerHTML = sources.map((button, index) => {
        const itemName = $('.index-name', button)?.textContent.trim() || button.getAttribute('aria-label') || '';
        return `<button type="button" class="archive-player-queue-item" role="menuitemradio" aria-checked="false" data-player-index="${index}"><span class="archive-player-queue-number">${pad(index + 1)}</span><span class="archive-player-queue-name">${escape(itemName)}</span><span class="archive-player-queue-arrow">${icons.arrow}</span></button>`;
      }).join('');
      $('.archive-player-queue-count', player).textContent = `${pad(sources.length)} ITEMS`;
    }
    $$('[data-player-index]', queueList).forEach((button, index) => button.setAttribute('aria-checked', String(index === selected)));
    scheduleProgress();
  }
  function scheduleSync() { if (!stateFrame) stateFrame = requestAnimationFrame(sync); }

  player.addEventListener('click', (event) => {
    const queueItem = event.target.closest('[data-player-index]');
    if (queueItem) {
      const source = sourceButtons()[Number(queueItem.dataset.playerIndex)];
      closeQueue(true);
      if (!story.open) savedShelfFocus = toggle;
      source?.click();
      return;
    }
    const action = event.target.closest('[data-player]')?.dataset.player;
    if (!action) return;
    if (action === 'queue') { if (isQueueOpen()) closeQueue(); else openQueue(event.detail === 0); return; }
    closeQueue();
    if (action === 'open') {
      if (!story.open) savedShelfFocus = event.target.closest('button');
      $(story.open ? '#story-back' : '#now-open')?.click();
    } else $(story.open ? (action === 'previous' ? '#story-prev' : '#story-next') : (action === 'previous' ? '#shelf-prev' : '#shelf-next'))?.click();
  });
  player.addEventListener('keydown', (event) => {
    if (event.target === toggle && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault(); openQueue(true); return;
    }
    if (!event.target.closest('.archive-player-queue-list')) return;
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const buttons = $$('button', queueList);
    const active = buttons.indexOf(document.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (active + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index]?.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isQueueOpen()) {
      event.preventDefault(); event.stopPropagation(); closeQueue(true);
    }
  }, true);
  document.addEventListener('pointerdown', (event) => {
    if (isQueueOpen() && !queue.contains(event.target) && !toggle.contains(event.target)) closeQueue();
  }, true);
  player.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (isQueueOpen() && !player.contains(document.activeElement)) closeQueue(); });
  });
  new MutationObserver(scheduleSync).observe(bridge, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label'] });
  new MutationObserver(scheduleSync).observe(shelfIndex, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-current'] });
  new MutationObserver(scheduleSync).observe(story, { attributes: true, attributeFilter: ['open'] });
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress, { passive: true });
  story.addEventListener('scroll', scheduleProgress, { passive: true });
  if (window.ResizeObserver) {
    const resize = new ResizeObserver(scheduleProgress);
    resize.observe($('#main-content'));
    resize.observe($('#story-body'));
  }
  sync();
})();
