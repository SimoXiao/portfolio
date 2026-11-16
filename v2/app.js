(() => {
  'use strict';

  const data = window.PORTFOLIO_DATA;
  const auth = window.PORTFOLIO_AUTH || { enabled: false };
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const pad = (number) => String(number).padStart(2, '0');
  const metricValue = (value) => {
    const match = String(value).match(/^([+-]?\d+(?:\.\d+)?)([^\d\s]+)$/);
    return match ? `${escape(match[1])}<span class="metric-unit">${escape(match[2])}</span>` : escape(value);
  };
  // Only flattened, watermarked publishing derivatives enter the reader.
  // Source artwork stays outside the published asset manifest.
  const pagePath = (number, kind = 'gallery') => `assets/protected/${kind}/page_${pad(number)}.webp`;
  const fullPagePath = (number) => pagePath(number, 'full');
  const projectObject = { project1: 'player', project2: 'swatch', project3: 'toolbox', project4: 'badge' };
  const chapterObjects = { project1: ['player', 'paper'], project2: ['swatch'], project3: ['components'], project4: ['badge'] };
  const microObject = (kind, className = '') => `<span class="micro-object ${className}" data-micro-kind="${kind}" data-micro-entry="once" aria-hidden="true"></span>`;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cassetteColors = ['#aa594e', '#798b71', '#7b96ac', '#4d534b'];
  const mixColor = (from, to, amount) => '#' + [1, 3, 5].map((offset) => Math.round(
    parseInt(from.slice(offset, offset + 2), 16) * (1 - amount) + parseInt(to.slice(offset, offset + 2), 16) * amount
  ).toString(16).padStart(2, '0')).join('');
  const readerTheme = (color) => {
    const [r, g, b] = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255);
    const high = Math.max(r, g, b), low = Math.min(r, g, b), delta = high - low;
    const lightness = (high + low) / 2;
    const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
    const hue = !delta ? 0 : 60 * (high === r ? (g - b) / delta + (g < b ? 6 : 0) : high === g ? (b - r) / delta + 2 : (r - g) / delta + 4);
    // Keep the reader light and quiet; low-chroma charcoal stays near neutral.
    const tint = saturation < .08 ? saturation * 25 : 14;
    const paper = `hsl(${hue.toFixed(1)} ${tint.toFixed(1)}% 93%)`;
    const accent = mixColor(color, '#27372f', .45);
    return { paper, accent, line: `color-mix(in srgb, ${paper} 82%, ${accent})` };
  };
  const items = [
    ...data.projects.map((project, index) => ({
      ...project, name: project.title, code: `SIDE ${project.side} / TRACK ${project.track}`,
      title: project.title,
      color: cassetteColors[index],
      ink: ['#f4ecdc', '#f4ecdc', '#f4ecdc', '#f4ecdc'][index],
      material: ['blue-grey', 'smoke', 'ivory', 'sage'][index],
      pose: [-.7, .5, -.4, .6][index],
      ...readerTheme(cassetteColors[index])
    })),
    { id: 'about', title: '关于我', name: '关于我', subtitle: 'Xu Xiaoqiang / Simo', code: 'PERSONAL NOTES / FOLDOUT 01', color: '#e7dcc4', ink: '#4a483b', material: 'ivory', pose: -.3, paper: '#f0ede5', accent: '#71664e' },

  ];
  const story = $('#story-dialog');
  const lightbox = $('#image-dialog');
  const access = $('#access-dialog');
  let selected = 0;
  let pinnedSelection = false;
  let activeItem = null;
  let opener = null;
  let returnScroll = 0;
  let ownsHistoryEntry = false;
  let imagePages = [];
  let imageIndex = 0;
  let scene;
  let viewRevision = 0;
  let closingPromise = null;
  const readingAnimations = new Set();
  let restoringShelfFocus = false;
  let lastMousePointer = null;
  let restoredPointer = null;
  let animationFrame = 0;
  let authenticated = false;
  const keyboardNavigation = document.documentElement;
  document.addEventListener('keydown', (event) => {
    const textEntry = event.target instanceof Element && event.target.closest('input,textarea,[contenteditable="true"]');
    if (event.key === 'Tab' || (!textEntry && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key))) {
      keyboardNavigation.classList.add('has-keyboard-navigation');
    }
  }, true);
  const usePointerNavigation = () => keyboardNavigation.classList.remove('has-keyboard-navigation');
  document.addEventListener('pointerdown', usePointerNavigation, true);
  document.addEventListener('touchstart', usePointerNavigation, { capture: true, passive: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // Safari can restore a document position after the deferred app has started.
  // Only settle a fresh entry; Back/Forward and real user input keep their place.
  let initialViewPending = performance.getEntriesByType('navigation')[0]?.type !== 'back_forward';
  let initialViewFrame = 0;
  let initialViewTimer = 0;
  let viewportFrame = 0;
  let viewportMeasure = '';

  function select(index, animate = true, pin = false) {
    if (pin) pinnedSelection = true;
    selected = (index + items.length) % items.length;
    const item = items[selected];
    $$('.tape-button').forEach((button, position) => {
      button.classList.toggle('is-preview', position === selected);
      button.setAttribute(button.dataset.kind === 'paper' ? 'aria-current' : 'aria-pressed', String(position === selected));
    });
    $$('#shelf-dots button').forEach((button, position) => button.setAttribute('aria-pressed', String(position === selected)));
    $$('#shelf-index button').forEach((button, position) => button.setAttribute('aria-current', String(position === selected)));
    $('#shelf-counter').textContent = `${pad(selected + 1)} / ${pad(items.length)}`;
    $('#now-code').textContent = item.code;
    $('#now-title').textContent = item.name;
    $('#now-subtitle').textContent = item.subtitle;
    $('#now-open').setAttribute('aria-label', item.id === 'about' ? '查看个人介绍折页' : `打开${item.name}`);
  }

  function renderRack() {
    scene = new window.CassetteScene(items, $('#rack'), story, $('#story-cassette'));
    $('#shelf-dots').innerHTML = items.map((item, index) => `<button type="button" data-select="${index}" aria-label="选择${escape(item.name)}" aria-pressed="${index === selected}"></button>`).join('');
    $('#shelf-index').innerHTML = items.map((item, index) => `<button type="button" data-jump="${index}" aria-label="打开${escape(item.name)}" aria-current="${index === selected}"><span class="index-dash" aria-hidden="true"></span><span class="index-name">${escape(item.name)}</span></button>`).join('');
    $$('.tape-button').forEach((button, index) => {
      const id = items[index].id;
      const previewFromPointer = (event) => {
        if (event.pointerType !== 'touch') {
          // Closing a modal can dispatch pointerenter without a new gesture.
          // Keep the landed cassette still until the pointer actually moves.
          if (restoredPointer) {
            if (Math.abs(event.clientX - restoredPointer.x) + Math.abs(event.clientY - restoredPointer.y) < 2) return;
            restoredPointer = null;
          }
          clearTimeout(button.previewTimer);
          button.previewTimer = setTimeout(() => scene.hover(id, true), 50);
          select(index, true, true);
        }
      };
      button.addEventListener('pointerenter', previewFromPointer);
      button.addEventListener('pointermove', (event) => { if (restoredPointer) previewFromPointer(event); });
      button.addEventListener('pointerleave', () => {
        clearTimeout(button.previewTimer);
        if (!button.matches(':focus-visible')) scene.hover(id, false);
      });
      button.addEventListener('focus', () => {
        if (restoringShelfFocus) { select(index, false, true); return; }
        restoredPointer = null;
        scene.hover(id, button.matches(':focus-visible') || (matchMedia('(hover:hover)').matches && button.matches(':hover')));
        select(index, true, true);
      });
      button.addEventListener('blur', () => scene.hover(id, !restoredPointer && matchMedia('(hover:hover)').matches && button.matches(':hover')));
      button.addEventListener('click', (event) => {
        clearTimeout(button.previewTimer);
        if (id === 'about' && (event.target.closest('a') || window.getSelection()?.toString().trim())) return;
        select(index); openItem(id, button);
      });
    });
    $$('#shelf-dots button').forEach((button, index) => button.addEventListener('click', () => {
      select(index, true, true);
      $$('.tape-button')[index].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    }));
    $$('#shelf-index button').forEach((button, index) => {
      button.addEventListener('pointerenter', () => select(index, true, true));
      button.addEventListener('click', () => openItem(items[index].id, button));
    });
    select(selected, false);
  }

  function renderProjects() {
    $('#project-list').innerHTML = data.projects.map((project) => `<article class="project-row" style="--row-color:${project.color}"><span class="row-number">${project.track}</span><div class="row-media"><img draggable="false" src="${pagePath(project.cover, 'thumbs')}" width="800" height="450" loading="lazy" decoding="async" alt="${escape(project.title)}作品预览"></div><div class="row-body"><span class="row-kicker">SIDE ${project.side} / ${escape(project.subtitle)}</span><h3><a class="row-link" href="#${project.id}" data-open="${project.id}">${escape(project.title)}</a></h3><p>${escape(project.summary)}</p><div class="row-meta"><span>${escape(project.role)}</span><span>${project.metrics[0] ? `${escape(project.metrics[0].value)} ${escape(project.metrics[0].label)} · ${escape(project.metrics[0].note)}` : ''}</span></div></div><span class="row-arrow" aria-hidden="true">↗</span></article>`).join('');
    $('#story-index').innerHTML = items.map((item) => `<button type="button" data-story-item="${item.id}" aria-current="false"><span><span class="index-dash" aria-hidden="true"></span>${escape(item.name)}</span><span aria-hidden="true">↗</span></button>`).join('');
    $$('#story-index button').forEach((button) => button.addEventListener('click', () => openItem(button.dataset.storyItem, button)));
  }

  function figure(page, item) {
    return `<figure class="slide"><button class="slide-button" type="button" data-page="${page}" aria-label="放大查看${escape(item.name)}，第 ${page} 页"><img draggable="false" src="${pagePath(page)}" width="1600" height="900" loading="lazy" decoding="async" alt="${escape(item.name)} · ${escape(item.chapters.find((chapter) => page >= chapter.from && page <= chapter.to)?.title || '设计案例')} · 第 ${page} 页"></button><figcaption><span>${escape(item.name)} / P.${pad(page)}</span></figcaption></figure>`;
  }

  function renderProject(item) {
    const chapters = item.chapters.map((chapter, index) => `<section class="gallery-chapter" id="${item.id}-chapter-${index}" aria-labelledby="${item.id}-heading-${index}"><div class="chapter-heading" data-micro-trigger><span>${pad(index + 1)} / CASE STUDY</span><h3 id="${item.id}-heading-${index}">${escape(chapter.title)}${microObject(chapterObjects[item.id]?.[index] || projectObject[item.id], 'chapter-object-mark')}</h3><span>${chapter.to - chapter.from + 1} PAGES</span></div>${item.gallery.filter((page) => page >= chapter.from && page <= chapter.to).map((page) => figure(page, item)).join('')}</section>`).join('');
    $('#story-body').innerHTML = `<p class="story-subtitle">${escape(item.subtitle)}</p><p class="story-summary">${escape(item.summary)}</p><div class="story-facts"><div><span class="fact-label">MY ROLE</span>${escape(item.role)}</div>${item.date ? `<div><span class="fact-label">PERIOD</span>${escape(item.date)}</div>` : ''}</div><div class="metrics" aria-label="项目成果">${item.metrics.map((metric) => `<div><span class="metric-value">${metricValue(metric.value)}</span><span class="metric-label">${escape(metric.label)}</span><span class="metric-note">${escape(metric.note)}</span></div>`).join('')}</div><div class="case-reading-heading"><h3 class="story-section-heading">完整项目</h3><span>${item.gallery.length} 页 / 全部呈现</span></div><nav class="chapter-nav" aria-label="案例章节">${item.chapters.map((chapter, index) => `<a href="#${item.id}-chapter-${index}" data-chapter="${index}">${escape(chapter.title)} <span aria-hidden="true">↘</span></a>`).join('')}</nav><div class="full-gallery">${chapters}</div>${endNavigation(item)}`;
    $$('[data-chapter]', story).forEach((link) => link.addEventListener('click', (event) => {
      event.preventDefault();
      $(`#${item.id}-chapter-${link.dataset.chapter}`, story)?.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    }));
  }

  function endNavigation(item) {
    const index = items.findIndex((entry) => entry.id === item.id);
    const next = items[(index + 1) % items.length];
    return `<div class="story-end"><button type="button" data-back>← 返回磁带架</button><button type="button" data-open="${next.id}">下一件 / ${escape(next.name)} ↗</button></div>`;
  }

  function experienceMarkup() {
    return data.author.experience.map((entry) => `<div class="experience-item"><span class="period">${escape(entry.period)}</span><h3>${escape(entry.company)}</h3><p>${escape(entry.role)}</p></div>`).join('');
  }

  function renderProfile(item) {
    const author = data.author;
    const contact = `<div class="profile-contact"><a href="mailto:${escape(author.email)}">${escape(author.email)} ↗</a><a href="tel:${escape(author.phone)}">${escape(String(author.phone).replace(/^(\d{3})(\d{4})(\d{4})$/, '$1 $2 $3'))} ↗</a></div>`;
    $('#story-body').innerHTML = item.id === 'about'
      ? `<p class="story-subtitle">${escape(author.role)}</p><p class="profile-name">${escape(author.nameEn)} / ${escape(author.alias)}</p><p class="profile-copy">${escape(author.description)}</p><div class="profile-highlights"><div><strong>${author.years}</strong><span>年互联网设计经验</span></div><div><strong>C → S</strong><span>从产品体验到系统建设</span></div></div><h3 class="story-section-heading">设计能力</h3><div class="tags">${author.skills.map((skill) => `<span>${escape(skill)}</span>`).join('')}</div><h3 class="story-section-heading">日常工具</h3><div class="tags">${author.tools.map((tool) => `<span>${escape(tool)}</span>`).join('')}</div>${contact}${endNavigation(item)}`
      : `<p class="story-subtitle">NetEase & Alibaba</p><p class="profile-copy">从视觉设计出发，逐步走向产品体验、设计系统与团队建设。</p>${experienceMarkup()}<p class="metric-note">经历时间沿用原作品集的记录。</p>${contact}${endNavigation(item)}`;
  }

  function clearReadingAnimations() {
    readingAnimations.forEach((animation) => animation.cancel());
    readingAnimations.clear();
  }

  function animateReading(entering, duration = entering ? 520 : 160) {
    const elements = entering
      ? [$('#story-content'), $('.object-caption', story)]
      : $$('.story-header, .story-index, .reading-progress, .object-small-label, .object-caption, #story-content', story);
    // Sample before cancelling an unfinished entrance; an early return must
    // fade from what is on screen, rather than flashing the reader to opacity 1.
    const previous = elements.map((element) => {
      const current = getComputedStyle(element);
      return { element, opacity: current.opacity, transform: current.transform };
    });
    const objectInner = $('.story-object-inner', story);
    const borderColor = getComputedStyle(objectInner).borderBottomColor;
    clearReadingAnimations();
    if (reducedMotion.matches || duration === 0) return Promise.resolve();
    const animations = previous.map(({ element, opacity, transform }) => element.animate([
      { opacity: entering ? 0 : opacity, transform: entering ? 'translateY(12px)' : transform },
      { opacity: entering ? 1 : 0, transform: entering ? 'translateY(0)' : transform }
    ], { duration, delay: entering ? 100 : 0, fill: entering ? 'backwards' : 'forwards', easing: 'cubic-bezier(.22,.72,.18,1)' }));
    if (!entering) {
      // The narrow reader's full-width separator is on the actor's ancestor.
      // Fade only its border, keeping the shared cassette fully visible.
      animations.push(objectInner.animate([
        { borderBottomColor: borderColor }, { borderBottomColor: 'transparent' }
      ], { duration, fill: 'forwards', easing: 'cubic-bezier(.22,.72,.18,1)' }));
    }
    animations.forEach((animation) => readingAnimations.add(animation));
    return Promise.allSettled(animations.map((animation) => animation.finished));
  }

  function renderStory(item) {
    activeItem = item;
    story.dataset.item = item.id;
    select(items.findIndex((entry) => entry.id === item.id), false);
    story.style.setProperty('--story-paper', item.paper);
    story.style.setProperty('--accent', item.accent);
    story.style.setProperty('--ink', '#2d3530');
    story.style.setProperty('--muted', '#62695f');
    story.style.setProperty('--line', item.line || '#cfd0c5');
    $('#story-title').textContent = item.id === 'about' ? data.author.nameZh : item.name;
    $('#story-title').classList.toggle('has-object-mark', Boolean(projectObject[item.id]));
    $('#story-title').toggleAttribute('data-micro-trigger', Boolean(projectObject[item.id]));
    if (projectObject[item.id]) $('#story-title').insertAdjacentHTML('beforeend', microObject(projectObject[item.id], 'story-object-mark'));
    $('#story-header-label').textContent = item.code;
    $('#story-object-label').textContent = `${item.id === 'about' || item.id === 'experience' ? 'PERSONAL RECORDING' : 'ORIGINAL RECORDING'} / ${pad(selected + 1)}`;
    $('#story-cassette').setAttribute('aria-label', item.id === 'about' ? '徐晓强的个人介绍折页' : `${item.name}，卡带正面视角`);
    $('#object-caption-name').textContent = item.name;
    $('#object-caption-kind').textContent = item.subtitle;
    $$('#story-index button').forEach((button) => button.setAttribute('aria-current', String(button.dataset.storyItem === item.id)));
    if (item.gallery) renderProject(item); else renderProfile(item);
    story.scrollTop = 0;
    $('#reading-progress').style.width = '0%';
    document.title = `${item.name} — Simo`;
    requestAnimationFrame(updateProgress);
  }

  function applyCollectionLayout(layout) {
    document.body.dataset.layout = layout;
    $$('.view-switch [data-layout]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.layout === layout)));
    scene.fit();
  }

  function showCollection(layout = document.body.dataset.layout || 'shelf') {
    const reveal = () => {
      applyCollectionLayout(layout);
      // Leaving the folded profile must clear its route and scroll position.
      // Otherwise scroll anchoring keeps the newly visible directory offscreen.
      history.replaceState({ portfolioLayout: layout }, '', location.pathname + location.search);
      window.scrollTo({ top: 0, behavior: 'instant' });
      scene.updatePaperScroll();
    };
    if (story.open) {
      const closing = closeStory();
      const revision = viewRevision;
      closing.then(() => { if (revision === viewRevision && !story.open) reveal(); });
    } else reveal();
  }

  function revealAbout(route = true, hash = 'about', instant = false) {
    const reveal = () => {
      document.body.dataset.layout = 'shelf';
      $$('.view-switch [data-layout]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.layout === 'shelf')));
      const index = items.findIndex((item) => item.id === 'about');
      select(index, false, true);
      scene.fit();
      const target = $('#paper-scroll-range') || $$('.tape-button')[index];
      const box = target.getBoundingClientRect();
      const top = window.scrollY + box.top + Math.max(0, target.offsetHeight - innerHeight);
      window.scrollTo({ top, behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
      if (instant) scene.updatePaperScroll();
      if (route) history.replaceState(null, '', `#${hash}`);
    };
    if (story.open) {
      // About is part of the native scrolling shelf, rather than a second page.
      history.replaceState(null, '', `#${hash}`);
      const closing = closeStory();
      const revision = viewRevision;
      closing.then(() => { if (revision === viewRevision && !story.open) reveal(); });
    } else reveal();
  }

  function openItem(id, trigger, route = true) {
    const item = items.find((entry) => entry.id === id);
    if (!item || !authenticated) return;
    if (id === 'about') { revealAbout(route); return; }
    const wasOpen = story.open;
    const wasClosing = Boolean(closingPromise);
    if (wasOpen && activeItem?.id === id && !closingPromise && scene.phase !== 'closing') {
      if (scene.phase === 'detail') story.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      return;
    }
    const revision = ++viewRevision;
    closingPromise = null;
    story.classList.remove('is-closing', 'is-reading-hidden');
    story.style.removeProperty('background-color');
    story.classList.add('is-transitioning');
    if (!wasOpen) {
      opener = trigger || document.activeElement;
      returnScroll = window.scrollY;
      document.body.classList.add('story-open');
      story.showModal();
    }
    renderStory(item);
    if (route) {
      if (!wasOpen || wasClosing) {
        // A return has already navigated to the shelf entry. Reopening during
        // its flight needs a fresh entry, rather than replacing that shelf.
        history.pushState({ portfolioView: id, fromShelf: true }, '', `#${id}`);
        ownsHistoryEntry = true;
      } else history.replaceState({ portfolioView: id, fromShelf: ownsHistoryEntry }, '', `#${id}`);
    }
    story.getAnimations().forEach((animation) => animation.cancel());
    // Cover the shelf early in the flight so its tapes and folded profile
    // clear before the project copy becomes readable.
    if (!reducedMotion.matches && !wasOpen) story.animate([
      { backgroundColor: 'rgba(238,237,231,0)' }, { backgroundColor: item.paper }
    ], { duration: 320, easing: 'cubic-bezier(.22,.72,.18,1)' });
    animateReading(true);
    scene.open(id, { fromShelf: !wasOpen && document.body.dataset.layout !== 'index' }).then(() => {
      if (revision === viewRevision) story.classList.remove('is-transitioning');
    });
    if (wasOpen) $('#story-back').focus({ preventScroll: true });
  }

  function closeStory() {
    if (!story.open) return Promise.resolve();
    if (closingPromise) return closingPromise;
    const revision = ++viewRevision;
    if (lightbox.open) lightbox.close();
    const background = getComputedStyle(story).backgroundColor;
    const alpha = background.startsWith('rgba(') ? parseFloat(background.slice(background.lastIndexOf(',') + 1)) : 1;
    // During an early reversal the backdrop may already reveal the shelf.
    // Remove its unfinished chrome immediately instead of drawing ghost text.
    const chromeDuration = reducedMotion.matches || alpha < .999 ? 0 : 160;
    story.classList.add('is-closing', 'is-transitioning');
    story.getAnimations().forEach((animation) => animation.cancel());
    story.style.backgroundColor = background;
    const chromeFinished = animateReading(false, chromeDuration);
    if (!chromeDuration) story.classList.add('is-reading-hidden');
    const flightFinished = scene.close();
    const returning = (async () => {
      try {
        await chromeFinished;
        if (revision !== viewRevision) return false;
        story.classList.add('is-reading-hidden');
        const backgroundAnimation = reducedMotion.matches ? null : story.animate([
          { backgroundColor: background }, { backgroundColor: 'rgba(238,237,231,0)' }
        ], { duration: 760 - chromeDuration, easing: 'cubic-bezier(.22,.72,.18,1)', fill: 'forwards' });
        const [finished] = await Promise.all([
          flightFinished,
          backgroundAnimation ? Promise.allSettled([backgroundAnimation.finished]) : Promise.resolve()
        ]);
        if (!finished || revision !== viewRevision) return false;
        // Close the top layer before cancelling forwards fills. Otherwise the
        // normal reader styles can paint for a frame over the restored shelf.
        restoringShelfFocus = true;
        restoredPointer = lastMousePointer ? { ...lastMousePointer } : null;
        try {
          story.close();
          clearReadingAnimations();
          story.getAnimations().forEach((animation) => animation.cancel());
          story.style.removeProperty('background-color');
          story.classList.remove('is-closing', 'is-transitioning', 'is-reading-hidden');
          document.body.classList.remove('story-open');
          activeItem = null;
          document.title = 'Simo — A Collection of Design';
          window.scrollTo({ top: returnScroll, behavior: 'instant' });
          if (opener?.isConnected && !opener.closest('dialog')) opener.focus({ preventScroll: true });
          ownsHistoryEntry = false;
        } finally { restoringShelfFocus = false; }
        return true;
      } finally {
        if (closingPromise === returning) closingPromise = null;
      }
    })();
    closingPromise = returning;
    return returning;
  }

  function requestClose() {
    if (closingPromise) return closingPromise;
    if (ownsHistoryEntry) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search);
      closeStory();
    }
  }

  function syncRoute() {
    const id = location.hash.slice(1);
    if (['contact', 'experience'].includes(id)) { revealAbout(false, id); return; }
    if (items.some((item) => item.id === id)) {
      ownsHistoryEntry = Boolean(history.state?.fromShelf);
      openItem(id, null, false);
    } else {
      if (['shelf', 'index'].includes(history.state?.portfolioLayout)) applyCollectionLayout(history.state.portfolioLayout);
      closeStory();
    }
  }

  function finishInitialView() {
    initialViewPending = false;
    cancelAnimationFrame(initialViewFrame);
    clearTimeout(initialViewTimer);
    document.documentElement.classList.remove('is-settling-initial-view');
  }

  function settleInitialView() {
    initialViewFrame = 0;
    if (!initialViewPending || !authenticated) return;
    const id = location.hash.slice(1);
    if (['about', 'contact', 'experience'].includes(id)) {
      // Resolve the actual unfolded end after fonts and the mobile viewport fit.
      if (!story.open) revealAbout(false, id, true);
    } else if (!story.open && !items.some((item) => item.id === id)) {
      select(0, false, true);
      window.scrollTo({ top: 0, behavior: 'instant' });
      scene.updatePaperScroll();
    }
  }

  function scheduleInitialView() {
    if (!initialViewPending || !authenticated) return;
    cancelAnimationFrame(initialViewFrame);
    initialViewFrame = requestAnimationFrame(() => {
      initialViewFrame = requestAnimationFrame(settleInitialView);
    });
  }

  function updateViewportCover() {
    viewportFrame = 0;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const measure = `${innerWidth}/${innerHeight}/${viewport?.width}/${viewport?.height}/${viewport?.offsetTop}`;
    const resized = measure !== viewportMeasure;
    viewportMeasure = measure;
    // The document and full-screen reader can rubber-band independently.
    // These values only extend the painted cover; safe-area layout stays in CSS.
    const overscroll = Math.max(0, -window.scrollY, story.open ? -story.scrollTop : 0);
    const values = {
      '--visual-viewport-top': `${Math.max(0, viewport?.offsetTop || 0)}px`,
      '--top-overscroll': `${overscroll}px`
    };
    Object.entries(values).forEach(([name, value]) => {
      if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    });
    if (resized && authenticated && !story.open) scene.updatePaperScroll();
    scheduleInitialView();
  }
  function scheduleViewportCover() {
    if (!viewportFrame) viewportFrame = requestAnimationFrame(updateViewportCover);
  }
  window.addEventListener('load', scheduleInitialView, { once: true });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) finishInitialView();
    else scheduleInitialView();
    scheduleViewportCover();
  });
  window.addEventListener('resize', scheduleViewportCover, { passive: true });
  window.addEventListener('scroll', scheduleViewportCover, { passive: true });
  story.addEventListener('scroll', scheduleViewportCover, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleViewportCover, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleViewportCover, { passive: true });
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach((type) => window.addEventListener(type, () => {
    if (authenticated) finishInitialView();
  }, { passive: true }));
  document.fonts?.ready.then(scheduleInitialView);
  updateViewportCover();

  function updateProgress() {
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => {
      const total = story.scrollHeight - story.clientHeight;
      $('#reading-progress').style.width = `${total > 0 ? Math.min(100, Math.max(0, story.scrollTop / total * 100)) : 0}%`;
    });
  }

  function showImage(page) {
    if (!activeItem?.gallery) return;
    imagePages = activeItem.gallery;
    imageIndex = Math.max(0, imagePages.indexOf(page));
    if (!lightbox.open) lightbox.showModal();
    updateImage();
  }

  function updateImage() {
    const page = imagePages[imageIndex];
    const image = $('#full-image');
    setImageZoom(false);
    image.src = fullPagePath(page);
    image.alt = `${activeItem.name}，第 ${page} 页大图`;
    $('#image-view-title').textContent = `${activeItem.name} / P.${pad(page)}`;
    $('#image-counter').textContent = `${pad(imageIndex + 1)} / ${pad(imagePages.length)}`;
    $('#image-prev').disabled = imageIndex === 0;
    $('#image-next').disabled = imageIndex === imagePages.length - 1;
  }

  function setImageZoom(zoomed, point) {
    const image = $('#full-image');
    const canvas = $('.image-canvas', lightbox);
    const box = image.getBoundingClientRect();
    const x = point && box.width ? (point.clientX - box.left) / box.width : .5;
    const y = point && box.height ? (point.clientY - box.top) / box.height : .5;
    lightbox.classList.toggle('is-zoomed', zoomed);
    $('#image-zoom').setAttribute('aria-pressed', String(zoomed));
    $('#image-zoom').textContent = zoomed ? '适应屏幕 ⤡' : '放大查看 ⤢';
    if (zoomed) {
      lightbox.style.setProperty('--image-native-width', `${image.naturalWidth || 1600}px`);
      requestAnimationFrame(() => {
        canvas.scrollLeft = image.clientWidth * x - canvas.clientWidth / 2;
        canvas.scrollTop = image.clientHeight * y - canvas.clientHeight / 2;
      });
    } else { canvas.scrollLeft = 0; canvas.scrollTop = 0; }
  }

  function stepImage(amount) {
    imageIndex = Math.max(0, Math.min(imagePages.length - 1, imageIndex + amount));
    updateImage();
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open]');
    if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      openItem(link.dataset.open, link);
    }
    if (event.target.closest('[data-back]')) requestClose();
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) showImage(Number(pageButton.dataset.page));
  });
  $$('[data-home], [data-collection]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showCollection(link.hasAttribute('data-home') ? 'shelf' : undefined);
  }));
  $$('.header-nav a[href="#contact"]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault(); revealAbout(true, 'contact');
  }));
  $$('.view-switch [data-layout]').forEach((button) => button.addEventListener('click', () => {
    showCollection(button.dataset.layout);
  }));
  function stepShelf(amount) {
    select(selected + amount, true, true);
    $$('.tape-button')[selected].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
  }
  $('#shelf-prev').addEventListener('click', () => stepShelf(-1));
  $('#shelf-next').addEventListener('click', () => stepShelf(1));
  $('#now-open').addEventListener('click', (event) => openItem(items[selected].id, event.currentTarget));
  $('#story-back').addEventListener('click', requestClose);
  $('#story-prev').addEventListener('click', () => openItem(items[(selected + items.length - 1) % items.length].id));
  $('#story-next').addEventListener('click', () => openItem(items[(selected + 1) % items.length].id));
  story.addEventListener('cancel', (event) => { event.preventDefault(); requestClose(); });
  story.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  window.addEventListener('popstate', () => { finishInitialView(); syncRoute(); });
  window.addEventListener('hashchange', () => { finishInitialView(); syncRoute(); });
  $('#image-close').addEventListener('click', () => lightbox.close());
  $('#image-zoom').addEventListener('click', () => setImageZoom(!lightbox.classList.contains('is-zoomed')));
  $('#full-image').addEventListener('dblclick', (event) => setImageZoom(!lightbox.classList.contains('is-zoomed'), event));
  $('#full-image').addEventListener('load', () => lightbox.style.setProperty('--image-native-width', `${$('#full-image').naturalWidth}px`));
  // Discourage native image saving without cancelling reading, scrolling,
  // pinch zoom, keyboard navigation or the existing lightbox click behavior.
  const protectedImageTarget = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return false;
    if (target.closest('.slide-button, .image-canvas, .row-media')) return true;
    // The directory's stretched row link also covers its thumbnail. Hit-test
    // that media area without suppressing context menus on the row's text.
    const media = target.closest('.project-row')?.querySelector('.row-media');
    if (!media) return false;
    const box = media.getBoundingClientRect();
    return event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom;
  };
  ['contextmenu', 'dragstart'].forEach((type) => document.addEventListener(type, (event) => {
    if (protectedImageTarget(event)) event.preventDefault();
  }, true));
  $('#image-prev').addEventListener('click', () => stepImage(-1));
  $('#image-next').addEventListener('click', () => stepImage(1));
  lightbox.addEventListener('close', () => { setImageZoom(false); $('#full-image').removeAttribute('src'); });
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (lightbox.open && ['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault(); setImageZoom(['+', '='].includes(event.key));
    } else if (lightbox.open && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); stepImage(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (!story.open && event.target.closest('#tape-stage, #shelf-index, .shelf-controls, #now-open') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : selected + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1);
      select(next, true, true);
      const target = event.target.closest('#shelf-index') ? $$('#shelf-index button')[selected] : $$('.tape-button')[selected];
      target.focus({ preventScroll: true });
      $$('.tape-button')[selected].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
    }
  });

  // The shelf is a native vertical document. Track the tape nearest its centre
  // without cancelling wheel or touch scrolling, so returning keeps the context.
  let shelfFrame = 0;
  const updateHeaderShade = () => document.body.classList.toggle('has-page-scroll', window.scrollY > 8);
  updateHeaderShade();
  window.addEventListener('wheel', () => { pinnedSelection = false; }, { passive: true });
  window.addEventListener('touchstart', () => { pinnedSelection = false; }, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (['PageUp', 'PageDown', ' '].includes(event.key) && !event.target.closest('button, input, dialog')) pinnedSelection = false;
  });
  window.addEventListener('scroll', () => {
    updateHeaderShade();
    if (!story.open) scene.updatePaperScroll();
    if (story.open || pinnedSelection || document.body.dataset.layout === 'index') return;
    cancelAnimationFrame(shelfFrame);
    shelfFrame = requestAnimationFrame(() => {
      if (story.open || pinnedSelection || document.body.dataset.layout === 'index') return;
      const centre = window.innerHeight * .53;
      const buttons = $$('.tape-button');
      let nearest = selected;
      let distance = Infinity;
      buttons.forEach((button, index) => {
        const box = button.getBoundingClientRect();
        const delta = Math.abs(box.top + box.height / 2 - centre);
        if (delta < distance) { nearest = index; distance = delta; }
      });
      select(nearest, false);
    });
  }, { passive: true });

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') lastMousePointer = { x: event.clientX, y: event.clientY };
    if (event.pointerType === 'mouse' && !story.open) scene.paperPointer(event.clientX / innerWidth * 2 - 1, event.clientY / innerHeight * 2 - 1);
  }, { passive: true });
  window.addEventListener('pointerout', (event) => { if (!event.relatedTarget) scene.paperPointer(0, 0); }, { passive: true });

  const imageCanvas = $('.image-canvas', lightbox);
  let imageDrag = null;
  imageCanvas.addEventListener('pointerdown', (event) => {
    if (!lightbox.classList.contains('is-zoomed') || event.pointerType !== 'mouse' || event.button !== 0) return;
    imageDrag = { x: event.clientX, y: event.clientY, left: imageCanvas.scrollLeft, top: imageCanvas.scrollTop };
    imageCanvas.setPointerCapture(event.pointerId);
    imageCanvas.classList.add('is-panning');
    event.preventDefault();
  });
  imageCanvas.addEventListener('pointermove', (event) => {
    if (!imageDrag) return;
    imageCanvas.scrollLeft = imageDrag.left + imageDrag.x - event.clientX;
    imageCanvas.scrollTop = imageDrag.top + imageDrag.y - event.clientY;
  });
  const endImageDrag = () => { imageDrag = null; imageCanvas.classList.remove('is-panning'); };
  imageCanvas.addEventListener('pointerup', endImageDrag);
  imageCanvas.addEventListener('pointercancel', endImageDrag);
  imageCanvas.addEventListener('lostpointercapture', endImageDrag);

  function unlock() {
    authenticated = true;
    if (access.open) access.close();
    document.body.classList.remove('is-booting');
    if (initialViewPending) document.documentElement.classList.add('is-settling-initial-view');
    syncRoute();
    settleInitialView();
    scheduleInitialView();
    initialViewTimer = setTimeout(finishInitialView, 1800);
  }
  access.addEventListener('cancel', (event) => event.preventDefault());
  $('#access-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if ($('#access-password').value === auth.password) {
      try { sessionStorage.setItem(auth.storageKey, 'ok'); } catch (_) { /* Private browsing can disable storage. */ }
      $('#access-password').value = '';
      $('#access-error').textContent = '';
      unlock();
    } else {
      $('#access-error').textContent = '密码不正确，请再试一次。';
      $('#access-password').setAttribute('aria-invalid', 'true');
      $('#access-password').setAttribute('aria-describedby', 'access-error');
      $('#access-password').select();
    }
  });
  $('#access-password').addEventListener('input', () => {
    $('#access-error').textContent = '';
    $('#access-password').removeAttribute('aria-invalid');
  });

  renderRack();
  renderProjects();
  let hasSession = false;
  try { hasSession = sessionStorage.getItem(auth.storageKey) === 'ok'; } catch (_) { /* Continue with the gate. */ }
  if (!auth.enabled || hasSession) unlock(); else access.showModal();
})();
