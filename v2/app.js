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
  const cdThemes = {
    'talk-player-style': { color: '#465666', paper: '#e6e7e6', tray: '#1e2328', trayEdge: '#3a424b', obiBg: '#dfe4e8', obiInk: '#182028', obiRule: 'rgba(24,32,40,.18)', obiVol: 'VOL.01', obiSpecs: ['39 SLIDES', '13 DEMOS'], obiYear: '2024', tape: '2024.04', stamp: true },
    'tool-color-picker': { color: '#b84b34', paper: '#ece9e4', tray: '#8f2d20', trayEdge: '#b84231', obiBg: '#c95138', obiInk: '#f8f3eb', obiRule: 'rgba(248,243,235,.28)', obiVol: 'VOL.02', obiSpecs: ['PLUGIN + WEB', 'PALETTE KIT'], obiYear: 'WIP', tape: '2025 · WIP', stamp: false },
    'tool-creative-kit': { color: '#3c5a48', tray: '#24392e', trayEdge: '#3c5e4c', obiBg: '#d2dcd0', obiInk: '#17251d', obiRule: 'rgba(23,37,29,.18)', obiVol: 'VOL.03', obiSpecs: ['AI + MOTION', 'DESIGN LAB'], obiYear: 'LAB', tape: 'LAB · 2025', stamp: false }
  };
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
  const explorations = (data.explorations || []).map((entry) => {
    const theme = cdThemes[entry.id] || cdThemes['talk-player-style'];
    const themed = readerTheme(theme.color);
    if (theme.paper) {
      themed.paper = theme.paper;
      themed.line = `color-mix(in srgb, ${theme.paper} 82%, ${themed.accent})`;
    }
    return {
      ...entry,
      name: entry.title,
      cdTheme: theme,
      ...themed
    };
  });
  const allEntries = [...items, ...explorations];
  const explorationSlidePath = (item, page, dir = 'slides') => `${item.mediaBase}/${dir}/${item.slidePrefix || 'slide_'}${pad(page)}.webp`;
  const story = $('#story-dialog');
  const lightbox = $('#image-dialog');
  const access = $('#access-dialog');
  let selected = 0;
  let pinnedSelection = false;
  let activeItem = null;
  let exploreFilter = 'all';
  let exploreSelected = 0;
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
    renderStoryIndex(items);
    renderExplore();
    renderContact();
  }

  function renderContact() {
    const contactEl = $('#contact');
    if (!contactEl) return;
    const author = data.author;
    const formattedPhone = String(author.phone || '').replace(/^(\d{3})(\d{4})(\d{4})$/, '$1 $2 $3');
    const currentExp = author.experience?.[0];
    const roleSummary = currentExp
      ? `${author.role} · ${author.years} 年经验 · ${currentExp.company} ${currentExp.role}`
      : `${author.role} · ${author.years} 年互联网设计经验`;
    contactEl.innerHTML = `
      <div class="contact-sheet">
        <div class="contact-hero" data-micro-trigger>
          <span class="micro-object contact-envelope-hero" data-micro-kind="envelope" data-micro-entry="once" aria-hidden="true"></span>
          <div class="contact-hero-copy">
            <p class="eyebrow">SIDE D / POSITIONING & CONTACT</p>
            <h2 id="contact-title">${escape(author.nameZh)} <span>/ ${escape(author.alias)}</span></h2>
            <p class="contact-role">${escape(roleSummary)}</p>
          </div>
        </div>
        <p class="contact-lead">${escape(author.description)}</p>
        <div class="contact-pillars" aria-label="核心定位方向">
          <span>产品体验重构</span>
          <span>设计系统建设</span>
          <span>视觉与动效</span>
          <span>AI 设计工程</span>
        </div>
        <div class="contact-primary-row">
          <a class="contact-email" href="mailto:${escape(author.email)}">${escape(author.email)} <span aria-hidden="true">↗</span></a>
          <button type="button" class="contact-copy-btn" id="contact-copy-email">复制邮箱</button>
        </div>
        <div class="contact-meta-row">
          <div class="contact-links">
            <a href="tel:${escape(author.phone)}">${escape(formattedPhone)} ↗</a>
            <a href="assets/docs/xu-xiaoqiang-resume.pdf" target="_blank" rel="noopener">完整简历 PDF ↗</a>
            <button type="button" id="contact-open-paper">展开个人折页 ↗</button>
          </div>
          <span class="contact-colophon">© 2025 ${escape(author.nameEn)} / ${escape(author.alias)}</span>
        </div>
      </div>
    `;
    const copyBtn = $('#contact-copy-email', contactEl);
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard?.writeText(author.email);
        copyBtn.textContent = '已复制 ✓';
        copyBtn.classList.add('is-copied');
        window.ArchiveSound?.tick?.(1);
        clearTimeout(copyBtn._timer);
        copyBtn._timer = setTimeout(() => {
          copyBtn.textContent = '复制邮箱';
          copyBtn.classList.remove('is-copied');
        }, 2000);
      } catch (_) {
        copyBtn.textContent = author.email;
      }
    });
    $('#contact-open-paper', contactEl)?.addEventListener('click', () => {
      window.SimoOpenPersonalPaper?.();
    });
  }

  function renderStoryIndex(pool) {
    const key = pool.map((entry) => entry.id).join('|');
    const indexEl = $('#story-index');
    if (indexEl.dataset.poolKey === key) return;
    indexEl.dataset.poolKey = key;
    indexEl.innerHTML = pool.map((entry) => `<button type="button" data-story-item="${entry.id}" aria-current="false"><span><span class="index-dash" aria-hidden="true"></span>${escape(entry.name)}</span><span aria-hidden="true">↗</span></button>`).join('');
    $$('#story-index button', indexEl).forEach((button) => button.addEventListener('click', () => openItem(button.dataset.storyItem, button)));
  }

  function cdJewelMarkup(entry, { includeDiscBack = false } = {}) {
    const theme = entry.cdTheme || cdThemes[entry.id] || cdThemes['talk-player-style'];
    const backList = entry.chapters
      ? entry.chapters.slice(0, 4).map((c, ci) => `<li><span>0${ci + 1}.</span><span>${escape(c.title)}</span></li>`).join('')
      : (entry.tags || []).slice(0, 4).map((t, ti) => `<li><span>0${ti + 1}.</span><span>${escape(t)}</span></li>`).join('');
    const lidStampHtml = theme.stamp
      ? `<span class="jewel-lid-stamp"><span class="stamp-row"><i>K</i><b>KEYNOTE</b></span><small>39 SLIDES</small></span>`
      : '';
    return `
      <span class="jewel-shadow" aria-hidden="true"></span>
      <span class="cd-jewel" aria-hidden="true">
        <span class="jewel-wall jewel-wall-top"></span>
        <span class="jewel-wall jewel-wall-bottom"></span>
        <span class="jewel-wall jewel-wall-left"></span>
        <span class="jewel-wall jewel-wall-right"></span>
        <span class="jewel-back">
          <span class="back-paper">
            <span class="back-head">
              <span>${escape(entry.code)}</span>
              <span>${escape(entry.date || entry.status || '2025')}</span>
            </span>
            <strong class="back-title">${escape(entry.title)}</strong>
            <ol class="back-tracks">${backList}</ol>
            <span class="back-foot">
              <span class="back-pill">${escape(entry.track)}</span>
              <i class="back-barcode"></i>
            </span>
          </span>
        </span>
        <span class="jewel-spine">
          <span>CD-R · ${escape(entry.track)}</span>
        </span>
        <span class="jewel-hinge-pillar"></span>
        <span class="jewel-tray">
          <span class="jewel-clip tl"></span>
          <span class="jewel-clip tr"></span>
          <span class="jewel-clip bl"></span>
          <span class="jewel-clip br"></span>
          <span class="jewel-rail-top"></span>
          <span class="jewel-rail-bottom"></span>
          <span class="jewel-rail-right"></span>
          <span class="jewel-disc">
            <span class="jewel-disc-front">
              <span class="jewel-disc-grooves"></span>
              <span class="jewel-disc-sheen"></span>
            </span>
            <span class="jewel-disc-edge"></span>
            <span class="jewel-disc-back"></span>
          </span>
          <span class="jewel-disc-ring"></span>
          <span class="jewel-rosette"></span>
        </span>
        <span class="jewel-lid">
          <span class="lid-wall lid-wall-top"></span>
          <span class="lid-wall lid-wall-bottom"></span>
          <span class="lid-wall lid-wall-right"></span>
          <span class="lid-wall lid-wall-left"></span>
          <span class="lid-inner-face"></span>
          <span class="jewel-lid-rail top"></span>
          <span class="jewel-lid-rail bottom"></span>
          <span class="jewel-lid-rail right"></span>
          <span class="jewel-obi">
            <span class="obi-head">
              <span class="obi-band"><span>${escape(theme.obiVol)}</span><span>${escape(entry.kind === 'talk' ? 'TALK' : 'TOOL')}</span></span>
              <span class="obi-top">${escape(entry.kindLabel)}</span>
            </span>
            <span class="obi-main">
              <strong class="obi-title">${escape(entry.title)}</strong>
              <span class="obi-sub">${escape(entry.subtitle)}</span>
            </span>
            <span class="obi-specs">
              <span class="obi-spec-lines">
                <span>${escape(theme.obiSpecs?.[0] || '')}</span>
                <span>${escape(theme.obiSpecs?.[1] || '')}</span>
              </span>
              <svg class="obi-target" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.15" />
                <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" stroke-width="1.05" />
                <circle cx="8" cy="8" r="1.05" fill="currentColor" />
              </svg>
            </span>
            <span class="obi-foot">
              <span class="obi-code">${escape(entry.track)}</span>
              <span class="obi-mark">${escape(theme.obiYear)}</span>
            </span>
          </span>
          ${lidStampHtml}
          <span class="jewel-lid-tape">${escape(theme.tape)}</span>
          <span class="jewel-glare"></span>
        </span>
      </span>`;
  }

  function bindCd3d(slot, { cdIndex = 0, hoverSound = true, onClick } = {}) {
    const jewel = $('.cd-jewel', slot);
    const shadow = $('.jewel-shadow', slot);
    let drag = null;
    let yaw = 0;
    let pitch = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let lift = 0;
    let targetLift = 0;
    let dragged = false;
    let lastTickAngle = 0;
    let rafId = 0;
    const apply3d = () => {
      if (!jewel) return;
      const tz = lift * 22;
      const ty = lift * -5;
      const rx = 6 * (1 - lift) + pitch;
      jewel.style.transform = `translate3d(0, ${ty.toFixed(2)}px, ${tz.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg)`;
      if (shadow) {
        const rad = (yaw * Math.PI) / 180;
        const cosY = Math.abs(Math.cos(rad));
        const sx = Math.sin(rad) * -6;
        const sy = lift * 8 + pitch * 0.16;
        const scaleX = (0.28 + 0.72 * cosY) * (1 + lift * 0.02);
        const scaleY = 1 + lift * 0.02;
        shadow.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
      }
    };
    const step3d = () => {
      rafId = 0;
      const ease = drag ? 0.55 : 0.24;
      yaw += (targetYaw - yaw) * ease;
      pitch += (targetPitch - pitch) * ease;
      lift += (targetLift - lift) * ease;
      apply3d();
      const settled = !drag && !slot.classList.contains('is-hovered')
        && Math.abs(targetYaw - yaw) < 0.04
        && Math.abs(targetPitch - pitch) < 0.04
        && Math.abs(targetLift - lift) < 0.01;
      if (settled) {
        yaw = 0; pitch = 0; lift = 0;
        jewel?.classList.remove('is-interactive');
        jewel?.style.removeProperty('transform');
        shadow?.style.removeProperty('transform');
        return;
      }
      if (drag || slot.classList.contains('is-hovered') || Math.abs(targetYaw - yaw) >= 0.04 || Math.abs(targetPitch - pitch) >= 0.04 || Math.abs(targetLift - lift) >= 0.01) {
        rafId = requestAnimationFrame(step3d);
      }
    };
    const schedule3d = () => {
      if (!rafId) rafId = requestAnimationFrame(step3d);
    };
    slot.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      const wasHovered = slot.classList.contains('is-hovered');
      slot.classList.add('is-hovered');
      jewel?.classList.add('is-interactive');
      targetLift = 1;
      if (!wasHovered && hoverSound && (!slot.classList.contains('story-cd-slot') || slot.classList.contains('is-cased'))) {
        window.ArchiveSound?.cdHover?.(cdIndex, true);
      }
      schedule3d();
    });
    slot.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      if (drag) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;
        targetYaw = drag.yaw + dx * 0.9;
        targetPitch = Math.max(-36, Math.min(36, drag.pitch - dy * 0.5));
        if (Math.abs(targetYaw - lastTickAngle) >= 45) {
          lastTickAngle = targetYaw;
          window.ArchiveSound?.tick?.(Math.abs(Math.round(targetYaw / 45)));
        }
        schedule3d();
        return;
      }
      if (!slot.classList.contains('is-hovered')) return;
      const rect = slot.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      const ny = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      targetYaw = nx * 15;
      targetPitch = -ny * 11;
      schedule3d();
    });
    slot.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      drag = { x: event.clientX, y: event.clientY, yaw: targetYaw, pitch: targetPitch, pointerId: event.pointerId, pointerType: event.pointerType };
      lastTickAngle = targetYaw;
      dragged = false;
      targetLift = 1;
      slot.classList.add('is-hovered');
      jewel?.classList.add('is-interactive');
      jewel?.classList.add('is-dragging');
      try { slot.setPointerCapture(event.pointerId); } catch (_) {}
      schedule3d();
    });
    const endDrag = () => {
      if (!drag) return;
      const wasTouch = drag.pointerType === 'touch';
      try { slot.releasePointerCapture(drag.pointerId); } catch (_) {}
      drag = null;
      jewel?.classList.remove('is-dragging');
      if (wasTouch || !slot.matches(':hover')) {
        slot.classList.remove('is-hovered');
        targetYaw = 0; targetPitch = 0; targetLift = 0;
        schedule3d();
      }
    };
    slot.addEventListener('pointerup', endDrag);
    slot.addEventListener('pointercancel', endDrag);
    slot.addEventListener('pointerleave', () => {
      if (drag) return;
      const wasHovered = slot.classList.contains('is-hovered');
      slot.classList.remove('is-hovered');
      if (wasHovered && hoverSound && (!slot.classList.contains('story-cd-slot') || slot.classList.contains('is-cased'))) {
        window.ArchiveSound?.cdHover?.(cdIndex, false);
      }
      targetYaw = 0; targetPitch = 0; targetLift = 0;
      schedule3d();
    });
    slot.addEventListener('blur', () => {
      endDrag();
      slot.classList.remove('is-hovered');
      targetYaw = 0; targetPitch = 0; targetLift = 0;
      schedule3d();
    });
    slot.addEventListener('click', (event) => {
      if (dragged) {
        event.preventDefault();
        event.stopPropagation();
        dragged = false;
        return;
      }
      onClick?.(event);
    });
  }

  function renderStoryCd(item) {
    const host = $('#story-cd');
    if (!host) return;
    const theme = item.cdTheme || cdThemes[item.id] || cdThemes['talk-player-style'];
    const idx = Math.max(0, explorations.findIndex((entry) => entry.id === item.id));
    host.innerHTML = `
      <button type="button"
        class="cd-jewel-slot story-cd-slot"
        data-cd-id="${escape(item.id)}"
        data-cd-index="${idx}"
        aria-pressed="false"
        style="--tray-bg:${theme.tray};--tray-edge:${theme.trayEdge};--obi-bg:${theme.obiBg};--obi-ink:${theme.obiInk};--obi-rule:${theme.obiRule}"
        aria-label="${escape(item.name)}，当前裸盘视角；点击套上保护壳，或左右拖拽旋转">
        ${cdJewelMarkup(item, { includeDiscBack: true })}
      </button>
      <span class="story-cd-cue" aria-hidden="true">点击套上保护壳 · 拖拽 360° 旋转</span>
    `;
    const slot = $('.story-cd-slot', host);
    const cue = $('.story-cd-cue', host);
    const updateCaseState = (cased) => {
      slot.classList.toggle('is-cased', cased);
      slot.setAttribute('aria-pressed', String(cased));
      slot.setAttribute('aria-label', cased
        ? `${item.name}，已套上保护壳；点击取下保护壳，或左右拖拽旋转`
        : `${item.name}，当前裸盘视角；点击套上保护壳，或左右拖拽旋转`);
      if (cue) cue.textContent = cased ? '点击取下保护壳 · 拖拽 360° 旋转' : '点击套上保护壳 · 拖拽 360° 旋转';
    };
    bindCd3d(slot, {
      cdIndex: idx,
      hoverSound: true,
      onClick: () => {
        const next = !slot.classList.contains('is-cased');
        if (!next) slot.classList.remove('is-hovered');
        updateCaseState(next);
        window.ArchiveSound?.cdCaseSnap?.(idx, next);
      }
    });
  }

  function renderExplore() {
    const listEl = $('#explore-list');
    if (!listEl) return;
    const filtered = exploreFilter === 'all' ? explorations : explorations.filter((entry) => entry.kind === exploreFilter);
    const counterEl = $('#explore-counter');
    if (counterEl) counterEl.textContent = `${pad(filtered.length)} / ${pad(explorations.length)}`;
    listEl.className = 'cd-showcase';
    if (!filtered.length) {
      listEl.innerHTML = '';
      return;
    }
    listEl.innerHTML = `
      <div class="cd-desk-grid" role="region" aria-label="探索光盘陈列架">
        ${filtered.map((entry, idx) => {
          const theme = entry.cdTheme || cdThemes[entry.id] || cdThemes['talk-player-style'];
          return `
          <button type="button"
            class="cd-jewel-slot"
            data-cd-id="${escape(entry.id)}"
            data-cd-index="${idx}"
            data-open="${entry.id}"
            style="--tray-bg:${theme.tray};--tray-edge:${theme.trayEdge};--obi-bg:${theme.obiBg};--obi-ink:${theme.obiInk};--obi-rule:${theme.obiRule}"
            aria-label="打开${escape(entry.title)}">
            ${cdJewelMarkup(entry)}
          </button>`;
        }).join('')}
      </div>
    `;
    $$('.cd-jewel-slot', listEl).forEach((row) => bindCd3d(row, {
      cdIndex: Number(row.dataset.cdIndex || 0),
      hoverSound: true
    }));
  }

  function figure(page, item) {
    return `<figure class="slide"><button class="slide-button" type="button" data-page="${page}" aria-label="放大查看${escape(item.name)}，第 ${page} 页"><img draggable="false" src="${pagePath(page)}" width="1600" height="900" loading="lazy" decoding="async" alt="${escape(item.name)} · ${escape(item.chapters.find((chapter) => page >= chapter.from && page <= chapter.to)?.title || '设计案例')} · 第 ${page} 页"></button><figcaption><span>${escape(item.name)} / P.${pad(page)}</span></figcaption></figure>`;
  }

  function talkFigure(page, item, chapterTitle, pptNum, overlays) {
    const hasOverlays = Boolean(overlays?.length);
    const src = hasOverlays ? `${item.mediaBase}/slides/slide_${pad(page)}_frame.webp` : explorationSlidePath(item, page);
    const overlayHtml = overlays?.length
      ? overlays.map((ov) => `<video class="slide-phone-video" style="left:${ov.left};top:${ov.top};width:${ov.width};height:${ov.height}" src="${escape(ov.src)}" autoplay loop muted playsinline preload="metadata"></video>`).join('')
      : '';
    const customSize = item.slideSizes?.[page];
    const w = customSize ? customSize[0] : 1600;
    const h = customSize ? customSize[1] : (item.slideHeight || 900);
    const aspect = customSize ? `${w} / ${h}` : item.slideAspect;
    const btnClass = aspect ? 'slide-button is-native-ratio' : 'slide-button';
    const aspectStyle = aspect ? ` style="--slide-aspect:${aspect}"` : '';
    return `<figure class="slide"><div class="slide-stage${hasOverlays ? ' has-overlays' : ''}">${overlayHtml}<button class="${btnClass}"${aspectStyle} type="button" data-page="${page}" aria-label="放大查看${escape(item.name)}，第 ${pptNum} 页"><img draggable="false" src="${src}" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${escape(item.name)} · ${escape(chapterTitle)} · 第 ${pptNum} 页"></button></div><figcaption><span>${escape(chapterTitle)} / P.${pad(pptNum)}</span></figcaption></figure>`;
  }

  function relatedSection(item) {
    if (!item.related?.length) return '';
    const targets = item.related.map((id) => allEntries.find((entry) => entry.id === id)).filter(Boolean);
    if (!targets.length) return '';
    return `<div class="related-strip"><span class="related-strip-label">RELATED / 关联延伸</span><div class="related-cards">${targets.map((target) => `<button class="related-card" type="button" data-open="${target.id}"><div><span class="related-card-meta">${escape(target.code)} · ${escape(target.kindLabel || target.subtitle)}</span><span class="related-card-title">${escape(target.name)}</span></div><span aria-hidden="true">↗</span></button>`).join('')}</div></div>`;
  }

  function renderProject(item) {
    const chapters = item.chapters.map((chapter, index) => `<section class="gallery-chapter" id="${item.id}-chapter-${index}" aria-labelledby="${item.id}-heading-${index}"><div class="chapter-heading" data-micro-trigger><span>${pad(index + 1)} / CASE STUDY</span><h3 id="${item.id}-heading-${index}">${escape(chapter.title)}${microObject(chapterObjects[item.id]?.[index] || projectObject[item.id], 'chapter-object-mark')}</h3><span>${chapter.to - chapter.from + 1} PAGES</span></div>${item.gallery.filter((page) => page >= chapter.from && page <= chapter.to).map((page) => figure(page, item)).join('')}</section>`).join('');
    $('#story-body').innerHTML = `<p class="story-subtitle">${escape(item.subtitle)}</p><p class="story-summary">${escape(item.summary)}</p><div class="story-facts"><div><span class="fact-label">MY ROLE</span>${escape(item.role)}</div>${item.date ? `<div><span class="fact-label">PERIOD</span>${escape(item.date)}</div>` : ''}</div><div class="metrics" aria-label="项目成果">${item.metrics.map((metric) => `<div><span class="metric-value">${metricValue(metric.value)}</span><span class="metric-label">${escape(metric.label)}</span><span class="metric-note">${escape(metric.note)}</span></div>`).join('')}</div><div class="case-reading-heading"><h3 class="story-section-heading">完整项目</h3><span>${item.gallery.length} 页 / 全部呈现</span></div><nav class="chapter-nav" aria-label="案例章节">${item.chapters.map((chapter, index) => `<a href="#${item.id}-chapter-${index}" data-chapter="${index}">${escape(chapter.title)} <span aria-hidden="true">↘</span></a>`).join('')}</nav><div class="full-gallery">${chapters}</div>${relatedSection(item)}${endNavigation(item)}`;
    $$('[data-chapter]', story).forEach((link) => link.addEventListener('click', (event) => {
      event.preventDefault();
      $(`#${item.id}-chapter-${link.dataset.chapter}`, story)?.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    }));
  }

  function renderExploration(item) {
    if (!item.chapters?.length) {
      const tagsHtml = item.tags?.length ? `<h3 class="story-section-heading">核心能力规划</h3><div class="tags">${item.tags.map((tag) => `<span>${escape(tag)}</span>`).join('')}</div>` : '';
      const linksHtml = item.links?.length
        ? `<div class="profile-contact">${item.links.map((link) => `<a href="${escape(link.url)}" target="_blank" rel="noopener">${escape(link.label)} ↗</a>`).join('')}</div>`
        : `<p class="metric-note">工具入口与实机演示正在整理接入中，可在 <code>data.js</code> 中补充在线地址与演示素材。</p>`;
      $('#story-body').innerHTML = `<p class="story-subtitle">${escape(item.subtitle)}</p><p class="story-summary">${escape(item.summary)}</p><div class="story-facts"><div><span class="fact-label">ROLE</span>${escape(item.role)}</div><div><span class="fact-label">STATUS</span>${escape(item.status || item.date)}</div></div>${tagsHtml}${linksHtml}${relatedSection(item)}${endNavigation(item)}`;
      return;
    }

    const metricsHtml = item.metrics?.length ? `<div class="metrics" aria-label="分享概览">${item.metrics.map((metric) => `<div><span class="metric-value">${metricValue(metric.value)}</span><span class="metric-label">${escape(metric.label)}</span><span class="metric-note">${escape(metric.note)}</span></div>`).join('')}</div>` : '';
    const hasInlineSkills = item.chapters.some((chapter) => chapter.includeSkills);
    const skillsChapterLink = item.skills?.length && !hasInlineSkills ? `<a href="#${item.id}-skills" data-chapter-id="${item.id}-skills">在线工作台 V2 与取色 Skill <span aria-hidden="true">↘</span></a>` : '';
    const chapterNavHtml = `<nav class="chapter-nav" aria-label="内容章节">${item.chapters.map((chapter, index) => `<a href="#${item.id}-chapter-${index}" data-chapter="${index}">${escape(chapter.title)} <span aria-hidden="true">↘</span></a>`).join('')}${skillsChapterLink}</nav>`;
    const defaultBadge = item.kind === 'talk' ? 'KEYNOTE' : 'TOOL SPEC';
    const skillsMarkup = item.skills?.length
      ? `<div class="skill-grid">${item.skills.map((sk) => `<article class="skill-card"><span class="skill-badge">${escape(sk.badge)}</span><h4>${escape(sk.title)}</h4><p>${escape(sk.desc)}</p></article>`).join('')}</div>${item.links?.length ? `<div class="profile-contact">${item.links.map((link) => `<a href="${escape(link.url)}" target="_blank" rel="noopener">${escape(link.label)} ↗</a>`).join('')}</div>` : ''}`
      : '';
    let pptCursor = 0;
    const chaptersHtml = item.chapters.map((chapter, index) => {
      const slidesHtml = (chapter.slides || []).map((page) => {
        pptCursor += 1;
        return talkFigure(page, item, chapter.title, pptCursor, chapter.slideOverlays?.[page]);
      }).join('');
      const specHtml = chapter.specCards?.length
        ? `<div class="spec-cards">${chapter.specCards.map((card) => `<article class="spec-card"><span>${escape(card.kicker)}</span><h4>${escape(card.title)}</h4><p>${escape(card.body)}</p></article>`).join('')}</div>`
        : '';
      const inlineSkillsHtml = chapter.includeSkills ? skillsMarkup : '';
      const chapterBadge = chapter.badge || defaultBadge;
      const slideUnit = item.kind === 'talk' ? 'SLIDES' : 'FIGS';
      const countBadge = chapter.includeSkills && item.skills?.length
        ? `${chapter.slides?.length ? `${chapter.slides.length} ${slideUnit} · ` : ''}${item.skills.length} SKILLS`
        : (chapter.slides?.length ? `${chapter.slides.length} ${slideUnit}` : 'WORKBENCH');
      return `<section class="gallery-chapter" id="${item.id}-chapter-${index}" aria-labelledby="${item.id}-heading-${index}"><div class="chapter-heading"><span>${pad(index + 1)} / ${escape(chapterBadge)}</span><h3 id="${item.id}-heading-${index}">${escape(chapter.title)}</h3><span>${countBadge}</span></div>${chapter.desc ? `<p class="chapter-desc">${escape(chapter.desc)}</p>` : ''}${specHtml}${slidesHtml}${inlineSkillsHtml}</section>`;
    }).join('');
    const skillsHtml = item.skills?.length && !hasInlineSkills
      ? `<section class="gallery-chapter" id="${item.id}-skills" aria-labelledby="${item.id}-skills-heading"><div class="chapter-heading"><span>${pad(item.chapters.length + 1)} / WORKBENCH & SKILL</span><h3 id="${item.id}-skills-heading">在线工作台 V2 与取色 Skill</h3><span>${item.skills.length} SKILLS</span></div><p class="chapter-desc">内置服务端取色能力已封装为内网在线校验台与 3 套可直接调用的 AI Skill（黑胶页调色、封面卡片配色、底层 JSON 批量提取），兼顾 URL / 粘贴 / 上传全链路输入。</p>${skillsMarkup}</section>`
      : '';

    const factFirstLabel = item.kind === 'talk' ? 'OCCASION' : 'ROLE';
    const factSecondLabel = item.kind === 'talk' ? 'DATE' : 'STATUS';
    const factSecondValue = item.kind === 'talk' ? item.date : (item.status || item.date);
    $('#story-body').innerHTML = `<p class="story-subtitle">${escape(item.subtitle)}</p><p class="story-summary">${escape(item.summary)}</p><div class="story-facts"><div><span class="fact-label">${factFirstLabel}</span>${escape(item.role)}</div>${factSecondValue ? `<div><span class="fact-label">${factSecondLabel}</span>${escape(factSecondValue)}</div>` : ''}</div>${metricsHtml}${chapterNavHtml}<div class="full-gallery">${chaptersHtml}${skillsHtml}</div>${relatedSection(item)}${endNavigation(item)}`;

    $$('[data-chapter], [data-chapter-id]', story).forEach((link) => link.addEventListener('click', (event) => {
      event.preventDefault();
      const targetId = link.dataset.chapterId || `${item.id}-chapter-${link.dataset.chapter}`;
      $(`#${targetId}`, story)?.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    }));
  }

  function endNavigation(item) {
    const pool = item.kind ? explorations : items;
    const index = pool.findIndex((entry) => entry.id === item.id);
    const next = pool[(index + 1) % pool.length];
    return `<div class="story-end"><button type="button" data-back>← ${item.kind ? '返回探索' : '返回磁带架'}</button><button type="button" data-open="${next.id}">${item.kind ? '下一张 CD' : '下一件'} / ${escape(next.name)} ↗</button></div>`;
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
      ? [$('#story-content'), $('.object-caption', story), ...(activeItem?.kind ? [$('#story-cd')] : [])]
      : $$('.story-header, .story-index, .reading-progress, .object-small-label, .object-caption, #story-content', story).concat(activeItem?.kind ? [$('#story-cd')] : []);
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
    const isCd = Boolean(item.kind);
    const shelfIndex = items.findIndex((entry) => entry.id === item.id);
    if (shelfIndex >= 0) select(shelfIndex, false);
    renderStoryIndex(isCd ? explorations : items);
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
    $('#story-object-label').textContent = item.kind
      ? `${item.kind === 'talk' ? 'KEYNOTE' : 'DESIGN LAB'} / ${item.track}`
      : `${item.id === 'about' || item.id === 'experience' ? 'PERSONAL RECORDING' : 'ORIGINAL RECORDING'} / ${pad(selected + 1)}`;
    $('#story-back').setAttribute('aria-label', isCd ? '返回探索' : '返回磁带架');
    const storyCassette = $('#story-cassette');
    const storyCd = $('#story-cd');
    storyCassette.hidden = isCd;
    storyCd.hidden = !isCd;
    $('#story-cassette').setAttribute('aria-label', item.id === 'about' ? '徐晓强的个人介绍折页' : `${item.name}，卡带正面视角`);
    if (isCd) renderStoryCd(item);
    else storyCd.innerHTML = '';
    $('#object-caption-name').textContent = item.name;
    $('#object-caption-kind').textContent = item.subtitle;
    $$('#story-index button').forEach((button) => button.setAttribute('aria-current', String(button.dataset.storyItem === item.id)));
    if (item.kind) renderExploration(item);
    else if (item.gallery) renderProject(item);
    else renderProfile(item);
    story.scrollTop = 0;
    lastStoryScrollTop = 0;
    programmaticScrollUntil = performance.now() + 180;
    $('#reading-progress').style.width = '0%';
    document.title = `${item.name} — Simo`;
    requestAnimationFrame(updateProgress);
  }

  function applyCollectionLayout(layout) {
    document.body.dataset.layout = layout;
    $$('.view-switch [data-layout]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.layout === layout)));
    scene.fit();
  }

  const SECTION_FLOW = ['about', 'works', 'explore', 'contact'];
  const DETAIL_PROJECTS = items.filter((entry) => entry.id !== 'about');
  let programmaticScrollUntil = 0;
  let lastObservedScrollY = window.scrollY;
  let lastStoryScrollTop = 0;
  let lastScrollMovedAt = performance.now() - 500;
  const getCurrentSection = () => {
    const section = document.body.dataset.section;
    return ['about', 'explore', 'contact'].includes(section) ? section : 'works';
  };
  function getDetailNeighbours() {
    if (!story.open || !activeItem) return { prev: null, next: null };
    const pool = activeItem.kind ? explorations : DETAIL_PROJECTS;
    const idx = pool.findIndex((entry) => entry.id === activeItem.id);
    if (idx < 0) return { prev: null, next: null };
    return {
      prev: idx > 0 ? pool[idx - 1] : null,
      next: idx < pool.length - 1 ? pool[idx + 1] : null
    };
  }
  function instantScrollTo(top) {
    programmaticScrollUntil = performance.now() + 140;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }
  function getSectionShiftTargets(sectionKey = getCurrentSection()) {
    if (story.open) return [$('#story-content', story), $('.story-object-inner', story)].filter(Boolean);
    if (sectionKey === 'about') return [$('#about .about-stage-only')].filter(Boolean);
    if (sectionKey === 'explore') return [$('#explore .cd-showcase')].filter(Boolean);
    if (sectionKey === 'contact') return [$('#contact .contact-sheet')].filter(Boolean);
    if (document.body.dataset.layout === 'index') return [$('#project-index')].filter(Boolean);
    return [$('#collection .tape-stage'), $('#paper-shelf')].filter(Boolean);
  }
  function animateSectionEnter(sectionKey, direction = 0) {
    const targets = getSectionShiftTargets(sectionKey);
    if (!targets.length || reducedMotion.matches || !direction) return;
    const offset = direction > 0 ? 18 : -18;
    targets.forEach((el) => {
      el.getAnimations().forEach((animation) => animation.cancel());
      if (sectionKey === 'about') {
        el.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.22,.72,.18,1)' });
      } else {
        el.animate([
          { opacity: 0.35, transform: `translate3d(0,${offset}px,0)` },
          { opacity: 1, transform: 'translate3d(0,0,0)' }
        ], { duration: 260, easing: 'cubic-bezier(.22,.72,.18,1)' });
      }
    });
  }

  function showCollection(layout = document.body.dataset.layout || 'shelf', { route = true, scrollToBottom = false, direction = 0 } = {}) {
    const reveal = () => {
      delete document.body.dataset.section;
      applyCollectionLayout(layout);
      // Leaving the folded profile must clear its route and scroll position.
      // Otherwise scroll anchoring keeps the newly visible directory offscreen.
      if (route) history.replaceState({ portfolioLayout: layout }, '', location.pathname + location.search);
      const scrollingEl = document.scrollingElement || document.documentElement;
      const targetTop = scrollToBottom ? Math.max(0, scrollingEl.scrollHeight - window.innerHeight) : 0;
      instantScrollTo(targetTop);
      scene.updatePaperScroll();
      updateHeaderShade();
      animateSectionEnter('works', direction);
    };
    if (story.open) {
      const closing = closeStory();
      const revision = viewRevision;
      closing.then(() => { if (revision === viewRevision && !story.open) reveal(); });
    } else reveal();
  }

  function showExplore(route = true, { scrollToBottom = false, direction = 0 } = {}) {
    const reveal = () => {
      document.body.dataset.section = 'explore';
      if (route) history.replaceState({ portfolioSection: 'explore' }, '', '#explore');
      const scrollingEl = document.scrollingElement || document.documentElement;
      const targetTop = scrollToBottom ? Math.max(0, scrollingEl.scrollHeight - window.innerHeight) : 0;
      instantScrollTo(targetTop);
      updateHeaderShade();
      animateSectionEnter('explore', direction);
    };
    if (story.open) {
      const closing = closeStory();
      const revision = viewRevision;
      closing.then(() => { if (revision === viewRevision && !story.open) reveal(); });
    } else reveal();
  }

  function showAbout(route = true, { direction = 0 } = {}) {
    const reveal = () => {
      document.body.dataset.section = 'about';
      if (route) history.replaceState({ portfolioSection: 'about' }, '', '#about');
      instantScrollTo(0);
      updateHeaderShade();
      animateSectionEnter('about', direction);
    };
    if (story.open) {
      const closing = closeStory();
      const revision = viewRevision;
      closing.then(() => { if (revision === viewRevision && !story.open) reveal(); });
    } else reveal();
  }

  function showContact(route = true, { direction = 0 } = {}) {
    const reveal = () => {
      document.body.dataset.section = 'contact';
      if (route) history.replaceState({ portfolioSection: 'contact' }, '', '#contact');
      instantScrollTo(0);
      updateHeaderShade();
      animateSectionEnter('contact', direction);
      window.ArchiveObjects?.play?.('#contact .micro-object');
    };
    if (story.open) {
      const closing = closeStory();
      const revision = viewRevision;
      closing.then(() => { if (revision === viewRevision && !story.open) reveal(); });
    } else reveal();
  }

  function revealAbout(route = true, hash = 'about', instant = false) {
    const reveal = () => {
      delete document.body.dataset.section;
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
    const item = allEntries.find((entry) => entry.id === id);
    if (!item || !authenticated) return;
    if (id === 'about') {
      if (trigger?.closest?.('#rack, #paper-shelf, #shelf-index, .now-playing, .archive-player')) revealAbout(false);
      else showAbout(route);
      return;
    }
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
      { backgroundColor: 'rgba(232,231,227,0)' }, { backgroundColor: item.paper }
    ], { duration: 320, easing: 'cubic-bezier(.22,.72,.18,1)' });
    animateReading(true);
    if (item.kind) {
      if (scene?.activeId) {
        scene.cancelFlights?.();
        const prevModel = scene.models?.get?.(scene.activeId);
        if (prevModel) scene.mountHome(prevModel);
        scene.activeId = null;
        scene.phase = 'shelf';
      }
      const cdIdx = Math.max(0, explorations.findIndex((entry) => entry.id === item.id));
      if (!wasOpen) window.ArchiveSound?.cdOpen?.(cdIdx);
      else window.ArchiveSound?.cdHover?.(cdIdx, true);
      if (revision === viewRevision) story.classList.remove('is-transitioning');
    } else {
      scene.open(id, { fromShelf: !wasOpen && document.body.dataset.layout !== 'index' }).then(() => {
        if (revision === viewRevision) story.classList.remove('is-transitioning');
      });
    }
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
    if (activeItem?.kind) window.ArchiveSound?.cdClose?.();
    const flightFinished = activeItem?.kind ? Promise.resolve(true) : scene.close();
    const returning = (async () => {
      try {
        await chromeFinished;
        if (revision !== viewRevision) return false;
        story.classList.add('is-reading-hidden');
        const backgroundAnimation = reducedMotion.matches ? null : story.animate([
          { backgroundColor: background }, { backgroundColor: 'rgba(232,231,227,0)' }
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
    if (id === 'experience') { revealAbout(false, id); return; }
    if (id === 'contact') {
      showContact(false);
      return;
    }
    if (id === 'about') {
      showAbout(false);
      return;
    }
    if (id === 'explore') {
      showExplore(false);
      return;
    }
    if (allEntries.some((item) => item.id === id)) {
      const target = allEntries.find((item) => item.id === id);
      if (target?.kind) document.body.dataset.section = 'explore';
      else delete document.body.dataset.section;
      ownsHistoryEntry = Boolean(history.state?.fromShelf);
      openItem(id, null, false);
    } else {
      if (history.state?.portfolioSection === 'contact') { showContact(false); return; }
      if (history.state?.portfolioSection === 'explore') { showExplore(false); return; }
      if (history.state?.portfolioSection === 'about') { showAbout(false); return; }
      delete document.body.dataset.section;
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
    if (id === 'experience') {
      // Resolve the actual unfolded end after fonts and the mobile viewport fit.
      if (!story.open) revealAbout(false, id, true);
    } else if (!story.open && !allEntries.some((item) => item.id === id) && !['explore', 'about', 'contact'].includes(id)) {
      select(0, false, true);
      instantScrollTo(0);
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
    const pages = activeItem?.gallery || (activeItem?.chapters ? activeItem.chapters.flatMap((c) => c.slides || []) : null);
    if (!pages?.length) return;
    imagePages = pages;
    imageIndex = Math.max(0, imagePages.indexOf(page));
    if (!lightbox.open) lightbox.showModal();
    updateImage();
  }

  function updateImage() {
    const page = imagePages[imageIndex];
    const image = $('#full-image');
    setImageZoom(false);
    image.src = activeItem.mediaBase ? explorationSlidePath(activeItem, page) : fullPagePath(page);
    image.alt = `${activeItem.name}，第 ${page} 页大图`;
    $('#image-view-title').textContent = `${activeItem.name} / ${activeItem.kind === 'talk' ? 'SLIDE' : activeItem.mediaBase ? 'FIG.' : 'P.'} ${pad(page)}`;
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
  $$('[data-explore-nav]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showExplore(true);
  }));
  $$('[data-about-nav]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showAbout(true);
  }));
  window.SimoOpenPersonalPaper = () => {
    if (!authenticated) return;
    const fromOtherSection = getCurrentSection() !== 'works';
    history.pushState({ portfolioSection: 'paper', fromMp3: true }, '', '#experience');
    revealAbout(false, 'experience', fromOtherSection);
  };
  $$('[data-explore-filter]').forEach((button) => button.addEventListener('click', () => {
    exploreFilter = button.dataset.exploreFilter;
    $$('[data-explore-filter]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn === button)));
    renderExplore();
  }));
  $$('.header-nav a[href="#contact"]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault(); showContact(true);
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
  $('#story-prev').addEventListener('click', () => {
    if (activeItem?.kind) {
      const idx = Math.max(0, explorations.findIndex((entry) => entry.id === activeItem.id));
      openItem(explorations[(idx + explorations.length - 1) % explorations.length].id);
    } else openItem(items[(selected + items.length - 1) % items.length].id);
  });
  $('#story-next').addEventListener('click', () => {
    if (activeItem?.kind) {
      const idx = Math.max(0, explorations.findIndex((entry) => entry.id === activeItem.id));
      openItem(explorations[(idx + 1) % explorations.length].id);
    } else openItem(items[(selected + 1) % items.length].id);
  });
  story.addEventListener('cancel', (event) => { event.preventDefault(); requestClose(); });
  story.addEventListener('scroll', () => {
    const now = performance.now();
    if (now > programmaticScrollUntil && Math.abs(story.scrollTop - lastStoryScrollTop) >= 1) {
      lastScrollMovedAt = now;
    }
    lastStoryScrollTop = story.scrollTop;
    updateProgress();
  }, { passive: true });
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
  let hasPageScroll = window.scrollY > 8;
  const updateHeaderShade = () => {
    const next = window.scrollY > 8;
    if (next !== hasPageScroll) {
      hasPageScroll = next;
      document.body.classList.toggle('has-page-scroll', next);
    }
  };
  document.body.classList.toggle('has-page-scroll', hasPageScroll);
  updateHeaderShade();
  window.addEventListener('wheel', () => { pinnedSelection = false; }, { passive: true });
  window.addEventListener('touchstart', () => { pinnedSelection = false; }, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (['PageUp', 'PageDown', ' '].includes(event.key) && !event.target.closest('button, input, dialog')) pinnedSelection = false;
  });
  window.addEventListener('scroll', () => {
    const now = performance.now();
    if (now > programmaticScrollUntil && Math.abs(window.scrollY - lastObservedScrollY) >= 1) {
      lastScrollMovedAt = now;
    }
    lastObservedScrollY = window.scrollY;
    if (shelfFrame) return;
    shelfFrame = requestAnimationFrame(() => {
      shelfFrame = 0;
      let nearest = selected;
      if (!story.open && !pinnedSelection && document.body.dataset.layout !== 'index') {
        const centre = window.innerHeight * .53;
        const buttons = $$('.tape-button');
        let distance = Infinity;
        buttons.forEach((button, index) => {
          const box = button.getBoundingClientRect();
          const delta = Math.abs(box.top + box.height / 2 - centre);
          if (delta < distance) { nearest = index; distance = delta; }
        });
      }
      updateHeaderShade();
      if (!story.open) scene.updatePaperScroll();
      if (!story.open && !pinnedSelection && document.body.dataset.layout !== 'index' && nearest !== selected) {
        select(nearest, false);
      }
    });
  }, { passive: true });

  // Four-section vertical flow with tactile boundary damping:
  // about (#1) <-> works (#2, default landing) <-> explore (#3) <-> contact (#4),
  // plus vertical boundary transitions between adjacent detail views inside #story-dialog.
  (() => {
    const mainEl = $('#main-content');
    if (!mainEl) return;
    const cue = document.createElement('div');
    cue.id = 'section-damping-cue';
    cue.className = 'section-damping-cue';
    cue.setAttribute('aria-hidden', 'true');
    cue.innerHTML = '<span class="fold-cue-mouse damping-cue-mouse" aria-hidden="true"><i></i></span><span class="damping-cue-label"></span><span class="damping-cue-bar"><i></i></span>';
    document.body.append(cue);
    const cueLabel = $('.damping-cue-label', cue);
    const cueLabels = {
      'about->works': { dir: 'down', idle: '继续下滑进入「作品」', ready: '即将进入「作品」' },
      'works->about': { dir: 'up', idle: '下拉进入「Intro」', ready: '松开进入「Intro」' },
      'works->explore': { dir: 'down', idle: '继续下滑进入「探索」', ready: '即将进入「探索」' },
      'explore->works': { dir: 'up', idle: '上滑返回「作品」', ready: '即将返回「作品」' },
      'explore->contact': { dir: 'down', idle: '继续下滑进入「联系」', ready: '即将进入「联系」' },
      'contact->explore': { dir: 'up', idle: '上滑返回「探索」', ready: '即将返回「探索」' }
    };
    const WHEEL_THRESHOLD = 420;
    const WHEEL_HOLD_MS = 640;
    const TOUCH_THRESHOLD = 148;
    const BOUNDARY_SETTLE_MS = 280;
    const BURST_DELAY_MS = 115;
    let pullDir = 0;
    let pullAmount = 0;
    let decayTimer = 0;
    let burstTimer = 0;
    let clearTransformTimer = 0;
    let lastSwitchAt = 0;
    let cooldownUntil = 0;
    let inertiaPauseUntil = 0;
    let lastWheelAt = 0;
    let lastThresholdTick = false;
    let isBursting = false;
    let touchState = null;

    const syncCueMount = () => {
      const host = story.open ? story : document.body;
      if (cue.parentElement !== host) host.append(cue);
    };
    new MutationObserver(syncCueMount).observe(story, { attributes: true, attributeFilter: ['open'] });
    syncCueMount();

    const canStep = (dir) => {
      if (story.open) {
        const { prev, next } = getDetailNeighbours();
        return dir < 0 ? Boolean(prev) : Boolean(next);
      }
      const idx = SECTION_FLOW.indexOf(getCurrentSection());
      return idx >= 0 && idx + dir >= 0 && idx + dir < SECTION_FLOW.length;
    };
    const boundaryState = () => {
      const el = story.open ? story : (document.scrollingElement || document.documentElement);
      const scrollTop = story.open ? story.scrollTop : window.scrollY;
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      return {
        scrollTop,
        maxScroll,
        atTop: scrollTop <= 2,
        atBottom: maxScroll <= 2 || scrollTop >= maxScroll - 3
      };
    };
    const isBlocked = () => (
      !authenticated ||
      Boolean(closingPromise) ||
      lightbox.open ||
      access.open ||
      Boolean(document.querySelector('#archive-player-queue:not([hidden])'))
    );
    const is3dDragging = () => Boolean(document.querySelector('.is-dragging, .is-spinning-360'));
    const clearShiftTargets = () => {
      $$('#about .about-stage-only, #collection .tape-stage, #paper-shelf, #project-index, #explore .cd-showcase, #contact .contact-sheet, #story-content, .story-object-inner').forEach((el) => {
        el.style.removeProperty('transform');
        el.style.removeProperty('transition');
      });
    };
    const getCueCopy = (dir) => {
      if (story.open) {
        const { prev, next } = getDetailNeighbours();
        const target = dir > 0 ? next : prev;
        if (!target) return null;
        return dir > 0
          ? { dir: 'down', idle: `继续下滑进入「${target.name}」`, ready: `松开进入「${target.name}」`, wheelReady: `即将进入「${target.name}」` }
          : { dir: 'up', idle: `上滑返回「${target.name}」`, ready: `松开返回「${target.name}」`, wheelReady: `即将返回「${target.name}」` };
      }
      const current = getCurrentSection();
      const next = SECTION_FLOW[SECTION_FLOW.indexOf(current) + dir];
      return cueLabels[`${current}->${next}`] || null;
    };
    const renderDamping = (dir, ratio, animateRelease = false, viaWheel = false) => {
      syncCueMount();
      const targets = getSectionShiftTargets();
      const clamped = Math.max(0, Math.min(1, ratio));
      const visualRatio = Math.pow(clamped, 1.15);
      if (clamped <= 0.005 || !dir) {
        cue.classList.remove('is-visible', 'is-bursting');
        cue.dataset.ready = 'false';
        cue.style.setProperty('--damping-progress', '0');
        cue.style.setProperty('--damping-dir', '1');
        clearTimeout(clearTransformTimer);
        if (animateRelease && !reducedMotion.matches && targets.length) {
          targets.forEach((el) => {
            el.style.transition = 'transform 260ms cubic-bezier(.22,.72,.18,1)';
            el.style.transform = 'translate3d(0,0,0)';
          });
          clearTransformTimer = setTimeout(clearShiftTargets, 270);
        } else {
          clearShiftTargets();
        }
        lastThresholdTick = false;
        return;
      }
      const copy = getCueCopy(dir);
      if (!copy) return;
      const ready = visualRatio >= 0.88;
      cue.classList.remove('is-bursting');
      cue.dataset.direction = copy.dir;
      cue.dataset.ready = String(ready);
      cueLabel.textContent = ready ? (viaWheel && copy.wheelReady ? copy.wheelReady : copy.ready) : copy.idle;
      cue.style.setProperty('--damping-progress', visualRatio.toFixed(3));
      cue.style.setProperty('--damping-dir', String(dir > 0 ? 1 : -1));
      cue.classList.add('is-visible');
      if (ready && !lastThresholdTick) {
        lastThresholdTick = true;
        window.ArchiveSound?.tick?.(dir > 0 ? 2 : 0);
      } else if (!ready) {
        lastThresholdTick = false;
      }
      if (!reducedMotion.matches && targets.length) {
        clearTimeout(clearTransformTimer);
        const easedShift = 28 * (1 - Math.exp(-visualRatio * 2.1)) / (1 - Math.exp(-2.1));
        const shift = (dir > 0 ? -easedShift : easedShift).toFixed(2);
        targets.forEach((el) => {
          el.style.transition = 'none';
          el.style.transform = `translate3d(0,${shift}px,0)`;
        });
      }
    };
    const resetDamping = (animate = true) => {
      clearTimeout(decayTimer);
      clearTimeout(burstTimer);
      isBursting = false;
      pullDir = 0;
      pullAmount = 0;
      renderDamping(0, 0, animate);
    };
    const commitSectionStep = (dir) => {
      if (story.open) {
        const { prev, next } = getDetailNeighbours();
        const targetItem = dir > 0 ? next : prev;
        if (!targetItem) { resetDamping(true); return; }
        resetDamping(false);
        const now = performance.now();
        lastSwitchAt = now;
        cooldownUntil = now + 980;
        inertiaPauseUntil = now + 360;
        programmaticScrollUntil = now + 200;
        if (typeof navigator.vibrate === 'function' && navigator.userActivation?.hasBeenActive) {
          try { navigator.vibrate(8); } catch (_) {}
        }
        window.ArchiveSound?.tick?.(dir > 0 ? 3 : 1);
        openItem(targetItem.id);
        return;
      }
      const current = getCurrentSection();
      const idx = SECTION_FLOW.indexOf(current);
      const target = SECTION_FLOW[idx + dir];
      if (!target) { resetDamping(true); return; }
      resetDamping(false);
      const now = performance.now();
      lastSwitchAt = now;
      cooldownUntil = now + 980;
      inertiaPauseUntil = now + 360;
      pinnedSelection = false;
      if (typeof navigator.vibrate === 'function' && navigator.userActivation?.hasBeenActive) {
        try { navigator.vibrate(8); } catch (_) {}
      }
      window.ArchiveSound?.tick?.(dir > 0 ? 3 : 1);
      if (target === 'about') {
        showAbout(true, { direction: dir });
      } else if (target === 'works') {
        const layout = document.body.dataset.layout || 'shelf';
        showCollection(layout, { route: true, scrollToBottom: dir < 0, direction: dir });
      } else if (target === 'explore') {
        showExplore(true, { scrollToBottom: dir < 0, direction: dir });
      } else if (target === 'contact') {
        showContact(true, { direction: dir });
      }
    };
    const triggerBurstAndCommit = (dir, viaWheel = false) => {
      if (isBursting) return;
      if (!canStep(dir)) { resetDamping(true); return; }
      clearTimeout(decayTimer);
      clearTimeout(burstTimer);
      const now = performance.now();
      lastSwitchAt = now;
      cooldownUntil = now + 1020;
      inertiaPauseUntil = now + 380;
      if (reducedMotion.matches) {
        commitSectionStep(dir);
        return;
      }
      isBursting = true;
      renderDamping(dir, 1, false, viaWheel);
      cue.classList.add('is-bursting');
      const targets = getSectionShiftTargets();
      targets.forEach((el) => {
        el.style.transition = 'transform 120ms cubic-bezier(.22,.72,.18,1)';
        el.style.transform = 'translate3d(0,0,0)';
      });
      window.ArchiveSound?.tick?.(dir > 0 ? 3 : 1);
      if (typeof navigator.vibrate === 'function' && navigator.userActivation?.hasBeenActive) {
        try { navigator.vibrate(8); } catch (_) {}
      }
      burstTimer = setTimeout(() => {
        isBursting = false;
        commitSectionStep(dir);
      }, BURST_DELAY_MS);
    };

    window.addEventListener('wheel', (event) => {
      const now = performance.now();
      const gapSinceWheel = now - lastWheelAt;
      lastWheelAt = now;
      if (isBursting || now < cooldownUntil) {
        if (gapSinceWheel < 160 && now - lastSwitchAt < 1350) {
          inertiaPauseUntil = Math.min(lastSwitchAt + 1350, now + 180);
        }
        return;
      }
      if (now < inertiaPauseUntil) {
        if (gapSinceWheel < 160 && now - lastSwitchAt < 1350) {
          inertiaPauseUntil = Math.min(lastSwitchAt + 1350, now + 180);
          return;
        }
      }
      const rawDeltaY = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaMode === 2 ? event.deltaY * 120 : event.deltaY;
      if (isBlocked() || is3dDragging() || Math.abs(rawDeltaY) <= Math.abs(event.deltaX) || Math.abs(rawDeltaY) < 1) return;
      const dir = rawDeltaY > 0 ? 1 : -1;
      if (!canStep(dir)) {
        if (pullAmount > 0) resetDamping(true);
        return;
      }
      const { maxScroll, atTop, atBottom } = boundaryState();
      const atEdge = dir < 0 ? atTop : atBottom;
      if (!atEdge) {
        if (pullAmount > 0) resetDamping(true);
        return;
      }
      if (maxScroll > 4 && now - lastScrollMovedAt < BOUNDARY_SETTLE_MS) {
        if (pullAmount > 0) resetDamping(true);
        return;
      }
      if (pullDir !== dir) {
        pullDir = dir;
        pullAmount = 0;
      }
      const step = Math.min(48, Math.abs(rawDeltaY));
      pullAmount += step;
      const ratio = pullAmount / WHEEL_THRESHOLD;
      renderDamping(dir, ratio, false, true);
      clearTimeout(decayTimer);
      if (pullAmount >= WHEEL_THRESHOLD) {
        triggerBurstAndCommit(dir, true);
      } else {
        decayTimer = setTimeout(() => resetDamping(true), WHEEL_HOLD_MS);
      }
    }, { passive: true });

    document.addEventListener('touchstart', (event) => {
      if (!event.isTrusted || event.touches.length !== 1 || isBlocked() || is3dDragging()) {
        touchState = null;
        return;
      }
      const pt = event.touches[0];
      const { atTop, atBottom } = boundaryState();
      touchState = {
        id: pt.identifier,
        startX: pt.clientX,
        startY: pt.clientY,
        lastY: pt.clientY,
        startAtTop: atTop,
        startAtBottom: atBottom,
        topAnchorY: atTop ? pt.clientY : null,
        bottomAnchorY: atBottom ? pt.clientY : null,
        activeDir: 0,
        pull: 0
      };
    }, { passive: true });

    document.addEventListener('touchmove', (event) => {
      if (!touchState || event.touches.length !== 1 || isBlocked()) {
        if (touchState) { touchState = null; resetDamping(true); }
        return;
      }
      if (performance.now() < cooldownUntil || is3dDragging()) {
        touchState = null;
        resetDamping(true);
        return;
      }
      const pt = [...event.touches].find((item) => item.identifier === touchState.id);
      if (!pt) { touchState = null; resetDamping(true); return; }
      const dx = pt.clientX - touchState.startX;
      const dy = pt.clientY - touchState.startY;
      const stepDy = pt.clientY - touchState.lastY;
      touchState.lastY = pt.clientY;
      if (!touchState.activeDir && Math.abs(dx) > Math.abs(dy) * 1.15 && Math.abs(dx) > 10) {
        touchState = null;
        return;
      }
      const { atTop, atBottom } = boundaryState();
      if (atTop && touchState.topAnchorY === null && stepDy >= 0) touchState.topAnchorY = pt.clientY;
      if (atBottom && touchState.bottomAnchorY === null && stepDy <= 0) touchState.bottomAnchorY = pt.clientY;
      const topPull = atTop && touchState.topAnchorY !== null ? pt.clientY - touchState.topAnchorY : 0;
      const bottomPull = atBottom && touchState.bottomAnchorY !== null ? touchState.bottomAnchorY - pt.clientY : 0;
      if (atTop && topPull > 4 && canStep(-1)) {
        touchState.activeDir = -1;
        touchState.pull = Math.max(0, topPull - 4);
      } else if (atBottom && bottomPull > 4 && canStep(1)) {
        touchState.activeDir = 1;
        touchState.pull = Math.max(0, bottomPull - 4);
      } else if (touchState.activeDir) {
        const currentPull = touchState.activeDir < 0 ? topPull - 4 : bottomPull - 4;
        if (currentPull <= 0) {
          touchState.activeDir = 0;
          touchState.pull = 0;
          resetDamping(true);
          return;
        }
        touchState.pull = currentPull;
      }
      if (touchState.activeDir) {
        if (event.cancelable) event.preventDefault();
        renderDamping(touchState.activeDir, touchState.pull / TOUCH_THRESHOLD, false, false);
      }
    }, { passive: false });

    const finishTouch = (event) => {
      if (!touchState) return;
      const { activeDir, pull } = touchState;
      touchState = null;
      if (activeDir && event.type === 'touchend' && pull >= TOUCH_THRESHOLD) {
        triggerBurstAndCommit(activeDir, false);
      } else if (activeDir) {
        resetDamping(true);
      }
    };
    document.addEventListener('touchend', finishTouch, { passive: true });
    document.addEventListener('touchcancel', finishTouch, { passive: true });
    window.SimoSectionFlow = { current: getCurrentSection, step: commitSectionStep };
  })();

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
