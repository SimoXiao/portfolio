(() => {
  'use strict';
  const WIDTH = 600;
  // The rounded shell's resting silhouette spans 638 logical canvas pixels
  // after perspective. Fit that contour, not the 600px invisible model box.
  const SHELF_PROJECTION_WIDTH = 638;
  const THICKNESS = 51.992;
  const DURATION = 760;
  const EASE = 'cubic-bezier(.22,.72,.18,1)';
  const FRONT = 'perspective(3000px) translate3d(0,0,0) rotateX(-90deg) rotateY(0deg) rotateZ(0deg)';
  const safe = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (number) => String(number).padStart(2, '0');
  const metricMarkup = (value) => {
    const text = String(value || '');
    const match = text.match(/^([+-]?\d+(?:\.\d+)?)([^\d\s]+)$/);
    return match ? `${safe(match[1])}<span class="back-metric-unit">${safe(match[2])}</span>` : safe(text);
  };

  class CassetteScene {
    constructor(items, shelf, dialog, host) {
      this.items = items;
      this.shelf = shelf;
      this.dialog = dialog;
      this.host = host;
      this.models = new Map();
      this.activeId = null;
      this.phase = 'shelf';
      this.revision = 0;
      this.flights = new Set();
      this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
      this.idleRaf = 0;
      this.lastIdleStep = 0;
      this.idleModels = new Set();
      this.visibleSlots = new Set();
      this.hostVisible = false;
      this.idleSteps = 0;
      this.idlePaints = 0;
      this.idleCursor = 0;
      this.paperCache = null;
      this.paperCacheKey = '';
      this.render();
      this.resize = new ResizeObserver(() => this.fit());
      this.resize.observe(shelf);
      this.resize.observe(host);
      const paperShelf = document.querySelector('#paper-shelf');
      if (paperShelf) this.resize.observe(paperShelf);
      const playerBar = document.querySelector('.archive-player');
      if (playerBar) this.resize.observe(playerBar);
      window.addEventListener('resize', () => this.fit(), { passive: true });
      // Observe the stable layout boxes, never the drifting actor. No idle
      // callback remains queued behind a modal or an entirely offscreen shelf.
      this.idleVisibility = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
          if (entry.target === this.host) this.hostVisible = visible;
          else if (visible) this.visibleSlots.add(entry.target);
          else this.visibleSlots.delete(entry.target);
        });
        this.startIdle();
      });
      this.models.forEach((model) => { if (!model.paper) this.idleVisibility.observe(model.slot); });
      this.idleVisibility.observe(this.host);
      this.idleState = new MutationObserver(() => this.startIdle());
      this.idleState.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-layout'] });
      [this.dialog, document.querySelector('#image-dialog'), document.querySelector('#access-dialog')].filter(Boolean).forEach((dialog) => {
        this.idleState.observe(dialog, { attributes: true, attributeFilter: ['open'] });
      });
      document.addEventListener('visibilitychange', () => this.startIdle());
      this.reduce.addEventListener('change', () => {
        if (this.reduce.matches) this.models.forEach((model) => {
          if (model.paper) return;
          model.poseAnimation?.cancel();
          model.poseAnimation = null;
          model.previewing = false;
          model.slot.classList.remove('is-unfolded');
          this.cancelTurntableDrag?.();
          this.resetIdleModel(model, true);
        });
        this.startIdle();
      });
      Object.defineProperty(window, 'CassetteMotion', { configurable: true, value: Object.freeze({
        snapshot: () => Object.freeze({ phase: this.phase, running: Boolean(this.idleRaf), maxFps: 30,
          reduced: this.reduce.matches, hidden: document.hidden, steps: this.idleSteps, paints: this.idlePaints,
          active: Object.freeze([...this.idleModels].map((model) => model.item.id)),
          turntables: Object.freeze([...this.models.values()].filter(m=>!m.paper).map(m=>Object.freeze({id:m.item.id,yaw:m.spinYaw,targetYaw:m.spinTargetYaw,pitch:m.spinPitch,dragging:m.dragging360,frontSide:m.item.side||'A',side:((m.spinYaw%360+360)%360>=90&&(m.spinYaw%360+360)%360<270)?(m.item.side==='B'?'A':'B'):(m.item.side||'A')}))) })
      }) });
      this.startIdle();
    }

    headDetails() {
      const points = [[25.76, 0], [296.24, 0], [322, 58], [0, 58]];
      const edges = points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        const dx = next[0] - point[0];
        const dy = next[1] - point[1];
        const length = Math.hypot(dx, dy) + .2;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return `<span class="head-edge" style="left:${139 + point[0]}px;top:${314.275 + point[1]}px;width:${length}px;transform:rotateZ(${angle}deg) rotateX(90deg)"></span>`;
      }).join('');
      return `${edges}<span class="case-head"><span class="head-port"></span><span class="head-port"></span><span class="head-port"></span></span>`;
    }

    curvedEdges() {
      const radius = 14;
      const segments = 8;
      const length = 2 * radius * Math.sin(Math.PI / 4 / segments) + .8;
      const corners = [
        { x: radius, z: 190.6375 - radius, start: -90 },
        { x: 600 - radius, z: 190.6375 - radius, start: 0 },
        { x: 600 - radius, z: -190.6375 + radius, start: 90 },
        { x: radius, z: -190.6375 + radius, start: 180 }
      ];
      return corners.map((corner) => Array.from({ length: segments }, (_, index) => {
        const angle = corner.start + (index + .5) * 90 / segments;
        const radians = angle * Math.PI / 180;
        const x = corner.x + radius * Math.sin(radians);
        const z = corner.z + radius * Math.cos(radians);
        return `<span class="shell-curve" style="left:${x - length / 2}px;width:${length}px;transform:translateZ(${z}px) rotateY(${angle}deg)"></span>`;
      }).join('')).join('');
    }

    markup(item, index) {
      const side = item.side || 'A';
      const id = pad(index + 1);
      return `<div class="cassette-object" data-object="${item.id}" data-material="${item.material}" data-track="${index % 4}" data-side="${side}" role="img" aria-label="${safe(item.name)}，${safe(item.subtitle)}，实体卡带"><span class="tape-solid"><span class="tape-spine"><span class="spine-number">${id} / SIDE ${side}</span><span class="spine-name">${safe(item.name)}</span><span class="spine-mark">C90<small>SIMO ARCHIVE</small></span></span><span class="tape-top"><span class="shell-rim"></span><span class="shell-rib"></span><span class="case-label"><span class="label-topline"><span>SIMO / DESIGN RECORDINGS</span><span class="label-bias">BIAS NORMAL · EQ 120μs</span><span class="label-side-pill">SIDE ${side}</span></span><span class="label-header-rule"></span><span class="label-title">${safe(item.name)}</span><span class="label-track-box"><small>TRACK</small><span class="label-track">${id}</span></span><span class="label-subtitle">${safe(item.subtitle)}</span><span class="label-rule"></span><span class="label-bottomline"><span>${item.date ? safe(item.date) : 'PERSONAL COLLECTION'}</span><span class="label-stereo">STEREO · ARCHIVE MASTER</span><span>HIGH FIDELITY / C90</span></span></span><span class="case-window"><span class="tape-line"></span><span class="spool spool-left"><span class="hub"></span></span><span class="window-scale" aria-hidden="true"><i></i><span>100</span><span>50</span><span>0</span></span><span class="spool spool-right"><span class="hub"></span></span></span><i class="case-screw screw-1"></i><i class="case-screw screw-2"></i><i class="case-screw screw-3"></i><i class="case-screw screw-4"></i>${this.headDetails()}<span class="head-pin left"></span><span class="head-pin right"></span><span class="shell-serial">SIMO / ${id}</span></span><span class="tape-end"></span><span class="tape-left"></span><span class="tape-bottom">${this.headDetails()}</span><span class="tape-back"></span>${this.curvedEdges()}</span></div>`;
    }

    render() {
      this.shelf.innerHTML = this.items.map((item, index) => {
        if (item.id === 'about' && window.PaperPortrait) return `<section class="tape-button paper-button" data-kind="paper" data-tape="${index}" aria-label="个人介绍折页" aria-current="false" role="group">${window.PaperPortrait.markup(item, window.PORTFOLIO_DATA.author)}</section>`;
        return `<button type="button" class="tape-button" data-kind="cassette" data-tape="${index}" aria-label="打开${safe(item.name)}" aria-pressed="false">${this.markup(item, index)}</button>`;
      }).join('');
      const slots = [...this.shelf.children];
      this.items.forEach((item, index) => {
        const slot = slots[index];
        const root = slot.firstElementChild;
        const solid = root.querySelector('.tape-solid');
        const paper = item.id === 'about' && window.PaperPortrait;
        const height = paper ? window.PaperPortrait.baseHeight : THICKNESS;
        const angle = 2.2 + index * 1.15;
        const home = paper ? window.PaperPortrait.poses.home : `perspective(3000px) translate3d(0,0,0) rotateX(${-angle}deg) rotateY(0deg) rotateZ(0deg)`;
        const hover = paper ? window.PaperPortrait.poses.hover : 'perspective(3000px) translate3d(0,-8px,38px) rotateX(-76deg) rotateY(-3deg) rotateZ(-1.2deg)';
        const lifted = `perspective(3000px) translate3d(0,-8px,48px) rotateX(${-angle - 7}deg) rotateY(-2deg) rotateZ(-.5deg)`;
        const front = paper ? window.PaperPortrait.poses.front : FRONT;
        root.style.height = `${height}px`;
        solid.style.height = `${height}px`;
        solid.style.width = `${WIDTH}px`;
        if (paper) solid.removeAttribute('data-object');
        this.setSolidTransform({ solid }, home);
        if (paper) window.PaperPortrait.setState(root, 'folded', true);
        const driftSeed = {
          fx1: 0.58 + ((index * 0.13) % 0.22),
          fx2: 0.91 + ((index * 0.19) % 0.27),
          fy1: 0.64 + ((index * 0.17) % 0.21),
          fy2: 1.03 + ((index * 0.23) % 0.25),
          fz1: 0.52 + ((index * 0.15) % 0.19),
          px1: index * 2.17 + 0.4,
          px2: index * 3.71 + 1.9,
          py1: index * 1.63 + 2.8,
          py2: index * 4.13 + 0.7,
          pz1: index * 2.89 + 1.2
        };
        this.models.set(item.id, { item, index, driftSeed, root, solid, slot, height, paper, home, hover, lifted, front, restAngle: angle, hovering: false, previewing: false, poseAnimation: null, settledAt: performance.now() - 900, paperProgress: 0, paperFrame: 0 });
        const entry = this.models.get(item.id);
        entry.spinYaw = entry.spinTargetYaw = 0;
        entry.spinPitch = entry.spinTargetPitch = 0;
        entry.dragging360 = false;
        if (!paper) {
          // Keep a printed reverse in the CSS fallback as well as WebGL.
          const top = solid.querySelector('.tape-top');
          const bottom = solid.querySelector('.tape-bottom');
          bottom.innerHTML = top.innerHTML;
          const side = bottom.querySelector('.label-side-pill');
          if (side) side.textContent = item.side === 'B' ? 'SIDE A' : 'SIDE B';
          const label = bottom.querySelector('.case-label');
          label.querySelector('.label-topline > span').textContent = 'SIMO / ARCHIVE SPECIFICATIONS';
          label.querySelector('.label-bias').textContent = `ROLE · ${(item.role || 'PRODUCT DESIGN').toUpperCase()}`;
          label.querySelector('.label-title').remove();
          label.querySelector('.label-subtitle').remove();
          const metrics = (item.metrics || []).slice(0, 3);
          label.insertAdjacentHTML('beforeend', `<span class="back-metrics">${metrics.map(m => `<span><strong>${metricMarkup(m.value)}</strong><small>${safe(`${m.label || ''} · ${m.note || ''}`)}</small></span>`).join('')}</span>`);
          label.querySelector('.label-track-box small').textContent = 'ARCHIVE P.';
          label.querySelector('.label-track').textContent = String(item.gallery?.length || index + 1).padStart(2, '0');
          label.querySelector('.label-stereo').textContent = `${side.textContent} · REVERSE MASTER`;
          label.querySelector('.label-bottomline > span:last-child').textContent = `TRACK ${pad(index + 1)} / C90`;
          const reversePrint = document.createElement('span');
          reversePrint.className = 'tape-reverse-print';
          reversePrint.dataset.side = item.side === 'B' ? 'A' : 'B';
          reversePrint.innerHTML = bottom.innerHTML;
          bottom.replaceChildren(reversePrint);
        }
        if (!paper && window.CassetteRenderer) window.CassetteRenderer.attach(root, item, index);
      });
      const paperShelf = document.querySelector('#paper-shelf');
      const paperModel = this.models.get('about');
      if (paperShelf && paperModel) paperShelf.append(paperModel.slot);
      this.bindTurntable360();
      this.fit();
    }

    bindTurntable360() {
      let dragState = null;
      let clickIntent = null;
      const consumePointerClick = (event, model, isDetail) => {
        // Keyboard/assistive activation has no pointer gesture to validate.
        if (event.detail === 0) return true;
        const intent = clickIntent;
        clickIntent = null;
        const samePointer = event.pointerId === undefined || event.pointerId === intent?.pointerId;
        if (intent?.valid && samePointer && intent.model === model && intent.isDetail === isDetail) return true;
        model.suppressClickUntil = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      };
      // The cassette itself is the activation target; no separate control row.
      this.host.setAttribute('role', 'button');
      this.host.setAttribute('tabindex', '-1');
      this.host.setAttribute('aria-disabled', 'true');
      this.host.addEventListener('click', (event) => {
        const model = this.models.get(this.activeId);
        if (!model || model.paper || !consumePointerClick(event, model, true)) return;
        if (model.suppressClickUntil && performance.now() < model.suppressClickUntil) {
          model.suppressClickUntil = 0;
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        this.flipTurntable(model);
      });
      this.host.addEventListener('keydown', (event) => {
        if (!['Enter', ' '].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        if (event.repeat) return;
        if (clickIntent) clickIntent.valid = false;
        const model = this.models.get(this.activeId);
        if (model) model.suppressClickUntil = 0;
        this.flipTurntable(model);
      });

      // Capture click after a 360° drag on the shelf so dragging doesn't accidentally open the modal
      this.shelf.addEventListener('click', (event) => {
        const btn = event.target instanceof Element ? event.target.closest('.tape-button[data-kind="cassette"]') : null;
        if (!btn) return;
        const idx = Number(btn.dataset.tape);
        const item = this.items[idx];
        const model = item && this.models.get(item.id);
        if (model && !consumePointerClick(event, model, false)) return;
        if (model?.suppressClickUntil && performance.now() < model.suppressClickUntil) {
          event.stopImmediatePropagation();
          event.preventDefault();
          model.suppressClickUntil = 0;
        }
      }, true);

      const onPointerDown = (event, model, isDetail) => {
        if (!model || model.paper || document.hidden || document.querySelector('#image-dialog[open],#access-dialog[open]') || (event.button !== undefined && event.button !== 0)) return false;
        if (event.isPrimary === false) return;
        clickIntent = { model, isDetail, pointerId: event.pointerId, valid: true };
        // A fresh press is a new intent, not the synthetic click from a prior drag.
        model.suppressClickUntil = 0;
        if (!isDetail && !model.previewing) return;
        dragState = {
          model,
          isDetail,
          pointerType: event.pointerType,
          capture: isDetail ? this.host : model.slot,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          lastTime: performance.now(),
          startYaw: model.spinYaw || 0,
          startPitch: model.spinPitch || 0,
          velocityYaw: 0,
          moved: false,
          lastTickAngle: model.spinYaw || 0
        };
      };

      this.host.addEventListener('pointerdown', (event) => {
        const model = this.models.get(this.activeId);
        if (!model || model.paper || this.phase !== 'detail') return;
        onPointerDown(event, model, true);
      });

      this.shelf.addEventListener('pointerdown', (event) => {
        const btn = event.target instanceof Element ? event.target.closest('.tape-button[data-kind="cassette"]') : null;
        if (!btn) return;
        const idx = Number(btn.dataset.tape);
        const item = this.items[idx];
        const model = item && this.models.get(item.id);
        if (!model || this.phase !== 'shelf') return;
        onPointerDown(event, model, false);
      });

      window.addEventListener('pointermove', (event) => {
        if (!dragState || event.pointerId !== dragState.pointerId) return;
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;
        if (!dragState.moved && dragState.pointerType !== 'mouse' && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx) * 1.1) {
          if (clickIntent) clickIntent.valid = false;
          dragState.model.suppressClickUntil = performance.now() + 360;
          dragState = null;
          return;
        }
        if (!dragState.moved && Math.hypot(dx, dy) > 5) {
          dragState.moved = true;
          if (clickIntent) clickIntent.valid = false;
          dragState.model.dragging360 = true;
          this.host.classList.toggle('is-dragging', dragState.isDetail);
          try { dragState.capture.setPointerCapture(event.pointerId); } catch (_) {}
          dragState.model.poseAnimation?.cancel();
          dragState.model.poseAnimation = null;
          if (!dragState.isDetail) {
            dragState.model.slot.classList.add('is-spinning-360');
          }
        }
        if (!dragState.moved) return;
        if (event.cancelable) event.preventDefault();

        const now = performance.now();
        const dt = Math.max(4, now - dragState.lastTime);
        const stepX = event.clientX - dragState.lastX;
        dragState.velocityYaw = (stepX * 0.85) / dt;
        dragState.lastX = event.clientX;
        dragState.lastY = event.clientY;
        dragState.lastTime = now;

        // 1px horizontal drag = ~0.85° 360-turntable rotation
        const nextYaw = dragState.startYaw + dx * 0.85;
        const nextPitch = Math.max(-22, Math.min(22, -dy * 0.22));
        dragState.model.spinYaw = dragState.model.spinTargetYaw = nextYaw;
        dragState.model.spinPitch = dragState.model.spinTargetPitch = nextPitch;

        // Subtle mechanical ratchet tick every 45° of rotation
        if (Math.abs(nextYaw - dragState.lastTickAngle) >= 45) {
          dragState.lastTickAngle = nextYaw;
          window.ArchiveSound?.tick(Math.abs(Math.round(nextYaw / 45)));
        }
        this.drawTurntable(dragState.model);
        if (dragState.isDetail) this.updateTurntableUI(dragState.model);
        // Reduced motion may synchronously cancel this gesture in startIdle.
        this.startIdle();
      }, { passive: false });

      const endDrag = (event) => {
        if (!dragState || (event && event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;
        const { model, moved, isDetail, velocityYaw, capture, pointerId } = dragState;
        if (event?.type === 'pointercancel' && clickIntent) clickIntent.valid = false;
        dragState = null;
        try { if (capture.hasPointerCapture(pointerId)) capture.releasePointerCapture(pointerId); } catch (_) {}
        model.dragging360 = false;
        this.host.classList.remove('is-dragging');
        model.slot.classList.remove('is-spinning-360');
        if (moved || event?.type === 'pointercancel') model.suppressClickUntil = performance.now() + 360;
        if (moved) {
          // Add gentle throw momentum on release, and relax vertical pitch back to 0
          const throwDegrees = this.reduce.matches || event?.type === 'pointercancel' ? 0 : Math.max(-140, Math.min(140, velocityYaw * 150));
          model.spinTargetYaw = model.spinYaw + throwDegrees;
          model.spinTargetPitch = 0;
          if (this.reduce.matches) { model.spinPitch = 0; this.drawTurntable(model); }
          if (isDetail) this.updateTurntableUI(model);
          else if (!model.hovering) this.hover(model.item.id, false);
          this.startIdle();
        }
      };
      this.cancelTurntableDrag = () => {
        // A route can replace the actor in this same host before mouseup/click.
        if (clickIntent) clickIntent.valid = false;
        endDrag({ type: 'pointercancel' });
      };

      window.addEventListener('pointerup', endDrag, { passive: true });
      window.addEventListener('pointercancel', endDrag, { passive: true });
      window.addEventListener('blur', this.cancelTurntableDrag);
    }

    flipTurntable(model) {
      if (!model || model.paper || this.phase !== 'detail' || !this.dialog.open ||
        model.root.parentElement !== this.host || model.root.classList.contains('is-flying') ||
        this.dialog.matches('.is-closing,.is-transitioning,.is-reading-hidden') ||
        document.hidden || document.querySelector('#image-dialog[open],#access-dialog[open]')) return;
      model.poseAnimation?.cancel();
      model.poseAnimation = null;
      // Queue each click as a half turn, including a rapid second click.
      model.spinTargetYaw = (Math.round(model.spinTargetYaw / 180) + 1) * 180;
      model.spinTargetPitch = 0;
      window.ArchiveSound?.cassetteHover(model.index || 0, true);
      if (this.reduce.matches) {
        model.spinYaw = model.spinTargetYaw;
        model.spinPitch = 0;
        this.drawTurntable(model);
      }
      this.updateTurntableUI(model);
      this.startIdle();
    }

    updateTurntableUI(model) {
      if (!model) return;
      const enabled = !model.paper && this.phase === 'detail' && this.dialog.open && model.root.parentElement === this.host;
      this.host.tabIndex = enabled ? 0 : -1;
      this.host.setAttribute('aria-disabled', String(!enabled));
      if (model.paper) return;
      const norm = ((model.spinYaw % 360) + 360) % 360;
      const reversed = norm >= 90 && norm < 270;
      const side = reversed ? (model.item.side === 'B' ? 'A' : 'B') : (model.item.side || 'A');
      const other = side === 'A' ? 'B' : 'A';
      const label = `${model.item.name}，当前 ${side} 面；点击翻到 ${other} 面，或左右拖拽旋转`;
      if (this.host.getAttribute('aria-label') !== label) this.host.setAttribute('aria-label', label);
      this.host.dataset.visibleSide = side;
    }

    setSolidTransform(model, transform) {
      delete model.solid.dataset.animating;
      model.solid.__directTransform = transform;
      model.solid.style.transform = transform;
      window.CassetteRenderer?.wake?.();
    }

    spinPose(model, detail = model.root.parentElement === this.host) {
      const pitch = model.spinPitch || 0;
      const yaw = model.spinYaw || 0;
      return detail
        ? `perspective(3000px) translate3d(0,0,0) rotateX(${-90 + pitch}deg) rotateY(0deg) rotateZ(${yaw}deg)`
        : `perspective(3000px) translate3d(0,-8px,38px) rotateX(${-76 + pitch}deg) rotateY(-3deg) rotateZ(${-1.2 + yaw}deg)`;
    }

    drawTurntable(model) {
      if (model.paper || !['shelf', 'detail'].includes(this.phase) || model.root.classList.contains('is-flying')) return;
      this.setSolidTransform(model, this.spinPose(model));
      model.idleApplied = true;
    }

    resetTurntable(model) {
      model.spinYaw = model.spinTargetYaw = model.spinPitch = model.spinTargetPitch = 0;
      model.dragging360 = false;
      model.suppressClickUntil = 0;
      model.slot.classList.remove('is-spinning-360');
      if (model.item.id === this.activeId) this.updateTurntableUI(model);
    }

    fit() {
      this.paperCache = null;
      this.models.forEach((model) => {
        if (!model.root.classList.contains('is-flying')) {
          const parent = model.root.parentElement;
          const width = parent === this.host ? parent.clientWidth : model.slot.clientWidth;
          const measure = parent === this.host || model.paper ? WIDTH : SHELF_PROJECTION_WIDTH;
          model.root.style.setProperty('--display-scale', width / measure);
        }
      });
      this.updatePaperScroll();
    }

    paperScrollMetrics(model) {
      const scroll = window.scrollY;
      const viewportTop = Math.max(0, window.visualViewport?.offsetTop || 0);
      const viewportBottom = Math.min(innerHeight, viewportTop + (window.visualViewport?.height || innerHeight));
      const cacheKey = `${innerWidth}/${innerHeight}/${viewportTop}/${viewportBottom}`;
      if (!this.paperCache || this.paperCacheKey !== cacheKey) {
        const range = document.querySelector('#paper-scroll-range');
        const rangeBox = range?.getBoundingClientRect();
        const rangeTop = scroll + (rangeBox?.top ?? model.slot.getBoundingClientRect().top);
        const sticky = range?.querySelector('.paper-sticky');
        const stickyStyle = sticky && getComputedStyle(sticky);
        const safeTop = viewportTop + (parseFloat(stickyStyle?.top) || 0);
        const playerTop = document.querySelector('.archive-player')?.getBoundingClientRect().top ?? viewportBottom;
        const safeBottom = Math.max(safeTop + 1, Math.min(viewportBottom, playerTop));
        const usableHeight = safeBottom - safeTop;
        const paperTop = rangeTop + (parseFloat(stickyStyle?.paddingTop) || 0);
        const tapes = [...this.models.values()].filter((entry) => !entry.paper);
        const last = tapes[tapes.length - 1]?.slot.getBoundingClientRect();
        const previous = tapes[tapes.length - 2]?.slot.getBoundingClientRect();
        const pitch = last && previous ? Math.max(1, last.top - previous.top) : usableHeight * .15;
        const lastCentre = last ? scroll + last.top + last.height / 2 : paperTop;
        const start = Math.max(pitch * .5, paperTop - (safeTop + usableHeight * .72), lastCentre - (safeTop + usableHeight * .5));
        const end = rangeTop + Math.max(0, (range?.offsetHeight || innerHeight * 2) - innerHeight);
        this.paperCache = { start, end, travel: Math.max(1, end - start), visible: model.slot.offsetWidth > 0 };
        this.paperCacheKey = cacheKey;
      }
      const { start, end, travel } = this.paperCache;
      const distance = scroll - start;
      // Scroll positions round to CSS pixels while the print frame can end on
      // a fraction. Treat the last pixel as a fully closed/open paper stop.
      const fraction = distance <= 1 ? 0 : distance >= travel - 1 ? 1 : distance / travel;
      // Hinge geometry itself eases into its first fold. A monotonic lead-in
      // makes that release visible before pinning, without changing either end.
      const progress = this.reduce.matches ? 1 : 1 - (1 - fraction) * (1 - fraction);
      return { progress, fraction, start, end };
    }

    paperData(model, name, value) {
      const text = value.toFixed(4);
      if (model.root.dataset[name] !== text) model.root.dataset[name] = text;
    }

    updatePaperScroll() {
      const model = this.models.get('about');
      if (!model?.paper || model.root.parentElement !== model.slot || this.activeId === 'about') return;
      if (document.body.dataset.layout === 'index') return;
      if (!this.paperCache) {
        const box = model.slot.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) return;
      } else if (!this.paperCache.visible) return;
      const { progress, fraction, start, end } = this.paperScrollMetrics(model);
      // Raw is the fold target before the 65ms follower; visual is what is
      // actually painted. The cue and optional haptics consume this contract.
      this.paperData(model, 'paperRawProgress', progress);
      this.paperData(model, 'paperScrollFraction', fraction);
      this.paperData(model, 'paperUnfoldStart', start);
      this.paperData(model, 'paperUnfoldEnd', end);
      if (progress === model.paperTarget && model.lastPaperScroll !== undefined) return;
      model.paperTarget = progress;
      if (model.lastPaperScroll === undefined || this.reduce.matches) {
        cancelAnimationFrame(model.paperFrame);
        model.paperFrame = 0;
        model.lastPaperScroll = model.paperProgress = progress;
        window.PaperPortrait.setProgress(model.root, progress, true);
        this.paperData(model, 'paperVisualProgress', progress);
        this.paperPose(model);
        return;
      }
      if (model.paperFrame) return;
      let previous = performance.now();
      const step = (now) => {
        model.paperFrame = 0;
        const dt = Math.min(40, Math.max(1, now - previous));
        previous = now;
        const distance = model.paperTarget - model.paperProgress;
        const next = Math.abs(distance) < .0002 ? model.paperTarget : model.paperProgress + distance * (1 - Math.exp(-dt / 65));
        model.lastPaperScroll = model.paperProgress = next;
        window.PaperPortrait.setProgress(model.root, next, true);
        this.paperData(model, 'paperVisualProgress', next);
        this.paperPose(model);
        if (next !== model.paperTarget) model.paperFrame = requestAnimationFrame(step);
      };
      model.paperFrame = requestAnimationFrame(step);
    }

    paperPose(model) {
      const tilt = this.reduce.matches ? { x: 0, y: 0 } : (this.paperTilt || { x: 0, y: 0 });
      model.solid.style.transform = `perspective(3000px) translate3d(0,0,0) rotateX(${-tilt.y * .75}deg) rotateY(${tilt.x * 1.1}deg) rotateZ(${tilt.x * .12}deg)`;
    }

    paperPointer(x, y) {
      const model = this.models.get('about');
      if (!model?.paper || this.reduce.matches || this.activeId) return;
      const box = model.slot.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight) return;
      this.paperTilt = this.paperTilt || { x: 0, y: 0, targetX: 0, targetY: 0, frame: 0 };
      const tilt = this.paperTilt;
      tilt.targetX = Math.max(-1, Math.min(1, x));
      tilt.targetY = Math.max(-1, Math.min(1, y));
      if (tilt.frame) return;
      const step = () => {
        tilt.frame = 0;
        if (this.activeId || this.reduce.matches) return;
        tilt.x += (tilt.targetX - tilt.x) * .12;
        tilt.y += (tilt.targetY - tilt.y) * .12;
        this.paperPose(model);
        if (Math.abs(tilt.x - tilt.targetX) + Math.abs(tilt.y - tilt.targetY) > .004) tilt.frame = requestAnimationFrame(step);
      };
      tilt.frame = requestAnimationFrame(step);
    }

    freeze(model) {
      const transform = getComputedStyle(model.solid).transform;
      delete model.solid.__directTransform;
      delete model.solid.dataset.animating;
      model.solid.style.transform = transform;
      model.poseAnimation?.cancel();
      model.poseAnimation = null;
      return transform;
    }

    hover(id, hovering) {
      const model = this.models.get(id);
      if (!model) return;
      model.hovering = hovering;
      if (model.dragging360 && !hovering) return;
      if (this.activeId === id || model.root.parentElement !== model.slot) return;
      if (model.paper) { if (!hovering) this.paperPointer(0, 0); return; }
      const preview = hovering && !this.reduce.matches;
      if (preview === model.previewing) return;
      model.previewing = preview;
      window.ArchiveSound?.cassetteHover(model.index || 0, preview);
      const from = this.freeze(model);
      model.idleApplied = false;
      this.clearIdleShadow(model);
      if (!preview) this.resetTurntable(model);
      const to = preview ? this.spinPose(model, false) : model.home;
      model.slot.classList.toggle('is-unfolded', preview);
      this.setSolidTransform(model, to);
      if (!this.reduce.matches) {
        const matrix = new DOMMatrix(from);
        const atRest = Math.abs(Math.atan2(matrix.m23, matrix.m22) * 180 / Math.PI + model.restAngle) < 3;
        const frames = preview && atRest ? [
          { transform: from, offset: 0, easing: 'cubic-bezier(.3,0,.3,1)' },
          { transform: model.lifted, offset: .16, easing: EASE },
          { transform: to, offset: 1 }
        ] : [{ transform: from, easing: EASE }, { transform: to }];
        delete model.solid.__directTransform;
        model.solid.dataset.animating = '1';
        const anim = model.solid.animate(frames, { duration: preview ? 660 : 540, easing: 'linear' });
        model.poseAnimation = anim;
        window.CassetteRenderer?.wake?.();
        anim.finished.then(() => {
          if (model.poseAnimation === anim) {
            model.poseAnimation = null;
            this.setSolidTransform(model, to);
            model.settledAt = performance.now();
            this.startIdle();
          }
        }).catch(() => {});
      }
      this.startIdle();
    }

    startIdle() {
      const available = !this.reduce.matches && !document.hidden && !document.body.classList.contains('is-booting') &&
        !document.querySelector('#image-dialog[open],#access-dialog[open]');
      if (!available) this.cancelTurntableDrag?.();
      const next = new Set();
      if (available) this.models.forEach((model) => {
        if (model.paper || model.poseAnimation || model.root.classList.contains('is-flying')) return;
        if (this.phase === 'shelf' && !this.dialog.open && document.body.dataset.layout !== 'index' &&
          model.root.parentElement === model.slot && this.visibleSlots.has(model.slot)) next.add(model);
        if (this.phase === 'detail' && this.dialog.open && this.hostVisible &&
          model.item.id === this.activeId && model.root.parentElement === this.host) next.add(model);
      });
      this.idleModels.forEach((model) => { if (!next.has(model)) this.resetIdleModel(model); });
      next.forEach((model) => { if (!this.idleModels.has(model)) model.settledAt = performance.now(); });
      this.idleModels = next;
      if (!next.size) {
        cancelAnimationFrame(this.idleRaf);
        this.idleRaf = 0;
        return;
      }
      if (this.idleRaf) return;
      const step = (now) => {
        this.idleRaf = 0;
        if (!this.idleModels.size) return;
        if (now - this.lastIdleStep >= 1000 / 30) {
          this.lastIdleStep = now;
          this.idleSteps += 1;
          this.updateIdleFloat(now);
        }
        this.idleRaf = requestAnimationFrame(step);
      };
      this.idleRaf = requestAnimationFrame(step);
    }

    clearIdleShadow(model) {
      model.slot.style.removeProperty('--idle-shadow-scale');
      model.slot.style.removeProperty('--idle-shadow-opacity');
    }

    resetIdleModel(model, force = false) {
      this.clearIdleShadow(model);
      // An opening/closing flight already sampled this displayed matrix.
      // Its own pose animation is the sole writer until the actor is mounted.
      if ((force || model.idleApplied) && !model.poseAnimation && !model.root.classList.contains('is-flying') &&
        !(['opening', 'closing'].includes(this.phase) && model.item.id === this.activeId)) {
        this.setSolidTransform(model, model.root.parentElement === this.host ? this.spinPose(model, true) : model.previewing ? this.spinPose(model, false) : model.home);
      }
      model.idleApplied = false;
    }

    updateIdleFloat(now) {
      // Slightly slower, calmer breathing pace (~13-16s cycle) while keeping visible amplitude
      const t = now * 0.00060;
      const resting = [];

      this.idleModels.forEach((model) => {
        if (model.paper || model.poseAnimation || model.root.classList.contains('is-flying')) return;
        const s = model.driftSeed;
        if (!s) return;
        const rawRamp = Math.min(1, Math.max(0, (now - (model.settledAt || 0)) / 1200));
        const env = rawRamp * rawRamp * (3 - 2 * rawRamp);
        if (!model.dragging360) {
          model.spinYaw += (model.spinTargetYaw - model.spinYaw) * .16;
          model.spinPitch += (model.spinTargetPitch - model.spinPitch) * .18;
          if (Math.abs(model.spinTargetYaw - model.spinYaw) < .05) model.spinYaw = model.spinTargetYaw;
          if (Math.abs(model.spinTargetPitch - model.spinPitch) < .05) model.spinPitch = model.spinTargetPitch;
        }
        const spinYaw = model.spinYaw || 0, spinPitch = model.spinPitch || 0;
        if (model.item.id === this.activeId) this.updateTurntableUI(model);
        if (env < 0.01 && Math.abs(spinYaw) + Math.abs(spinPitch) < .001 && !model.dragging360) return;

        // Non-repeating multi-harmonic slow random drift per cassette
        const driftX = (Math.sin(t * s.fx1 + s.px1) * 0.72 + Math.cos(t * s.fx2 + s.px2) * 0.28);
        const driftY = (Math.sin(t * s.fy1 + s.py1) * 0.70 + Math.sin(t * s.fy2 + s.py2) * 0.30);
        const driftZ = (Math.cos(t * s.fz1 + s.pz1) * 0.74 + Math.sin(t * s.fx1 * 0.85 + s.py1) * 0.26);

        if (this.phase === 'detail' && this.activeId === model.item.id && model.root.parentElement === this.host) {
          model.idleApplied = true;
          this.idlePaints += 1;
          const dx = (driftX * 1.15) * env;
          const dy = (driftY * 2.25) * env;
          const rx = -90 + spinPitch + (driftZ * 0.82) * env;
          const ry = (driftX * 1.08) * env;
          const rz = spinYaw + (driftY * 0.26) * env;
          this.setSolidTransform(model, `perspective(3000px) translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`);
          return;
        }

        if (this.phase === 'shelf' && model.root.parentElement === model.slot) {
          if (model.previewing) {
            model.idleApplied = true;
            this.idlePaints += 1;
            const dx = (driftX * 1.05) * env;
            const dy = -8 + (driftY * 2.05) * env;
            const dz = 38 + (driftZ * 2.6) * env;
            const rx = -76 + spinPitch + (driftZ * 0.72) * env;
            const ry = -3 + (driftX * 0.96) * env;
            const rz = -1.2 + spinYaw + (driftY * 0.24) * env;
            this.setSolidTransform(model, `perspective(3000px) translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,${dz.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`);
          } else {
            resting.push({ model, env, driftX, driftY, driftZ });
          }
        }
      });

      if (resting.length) {
        const batch = Math.min(2, resting.length);
        for (let offset = 0; offset < batch; offset++) {
          const { model, env, driftX, driftY, driftZ } = resting[(this.idleCursor + offset) % resting.length];
          model.idleApplied = true;
          this.idlePaints += 1;
          const dx = (driftX * 1.25) * env;
          const dy = (driftY * 2.45) * env;
          const dz = (driftZ * 3.2) * env;
          const rx = -model.restAngle + (driftY * 0.86) * env;
          const ry = (driftX * 1.15) * env;
          const rz = (driftZ * 0.28) * env;
          this.setSolidTransform(model, `perspective(3000px) translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,${dz.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg)`);
          const shadowScale = 1 - (dy / 24) * 0.14;
          const shadowOpacity = 1 + (dy / 18) * 0.18;
          model.slot.style.setProperty('--idle-shadow-scale', shadowScale.toFixed(3));
          model.slot.style.setProperty('--idle-shadow-opacity', shadowOpacity.toFixed(3));
        }
        this.idleCursor = (this.idleCursor + batch) % resting.length;
      }
    }

    cancelFlights() {
      this.cancelTurntableDrag?.();
      // Capture the actual in-flight matrices before cancelling, including a
      // partially completed hover, so a reversal begins at the displayed pose.
      this.models.forEach((model) => {
        if (model.root.classList.contains('is-flying')) model.root.style.transform = getComputedStyle(model.root).transform;
        this.freeze(model);
      });
      this.flights.forEach((animation) => animation.cancel());
      this.flights.clear();
    }

    mountHome(model) {
      model.root.classList.remove('is-flying');
      model.root.style.removeProperty('transform');
      model.root.style.removeProperty('opacity');
      model.slot.append(model.root);
      model.slot.style.removeProperty('height');
      model.slot.removeAttribute('data-away');
      this.resetTurntable(model);
      this.setSolidTransform(model, model.hovering && !this.reduce.matches ? model.hover : model.home);
      model.idleApplied = false;
      this.clearIdleShadow(model);
      model.settledAt = performance.now();
      if (model.paper) window.PaperPortrait.setProgress(model.root, model.paperProgress, true);
      model.root.style.setProperty('--display-scale', model.slot.clientWidth / (model.paper ? WIDTH : SHELF_PROJECTION_WIDTH));
    }

    mountFront(model) {
      model.root.classList.remove('is-flying');
      model.root.style.removeProperty('transform');
      model.root.style.removeProperty('opacity');
      this.host.append(model.root);
      this.resetTurntable(model);
      this.updateTurntableUI(model);
      this.setSolidTransform(model, model.front);
      model.idleApplied = false;
      this.clearIdleShadow(model);
      model.settledAt = performance.now();
      if (model.paper) window.PaperPortrait.setState(model.root, 'open', true);
      model.root.style.setProperty('--display-scale', this.host.clientWidth / WIDTH);
    }

    frame(element) {
      const box = element.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2, scale: box.width / WIDTH, visible: box.width > 1 && box.bottom > 0 && box.top < innerHeight };
    }

    transform(frame, model) {
      return `translate3d(${frame.x - WIDTH / 2}px,${frame.y - model.height / 2}px,0) scale(${frame.scale})`;
    }

    async flight(model, destination, pose, { fallback = false } = {}) {
      let start = this.frame(model.root);
      const solidStart = this.freeze(model);
      if (fallback) start = { ...destination, scale: destination.scale * .96 };
      model.root.classList.add('is-flying');
      model.root.style.transform = this.transform(start, model);
      this.dialog.append(model.root);
      window.CassetteRenderer?.wake?.();
      if (this.reduce.matches) {
        model.root.style.transform = this.transform(destination, model);
        this.setSolidTransform(model, pose);
        return;
      }
      const moving = model.root.animate([
        { transform: this.transform(start, model) }, { transform: this.transform(destination, model) }
      ], { duration: fallback ? 410 : DURATION, easing: EASE, fill: 'forwards' });
      const turning = model.solid.animate([
        { transform: fallback ? pose : solidStart }, { transform: pose }
      ], { duration: fallback ? 410 : DURATION, easing: EASE, fill: 'forwards' });
      this.flights.add(moving); this.flights.add(turning);
      if (fallback) {
        const fading = model.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'both' });
        this.flights.add(fading);
      }
      await Promise.allSettled([moving.finished, turning.finished]);
    }

    async open(id, { fromShelf = true } = {}) {
      const revision = ++this.revision;
      this.cancelFlights();
      const model = this.models.get(id);
      if (model) {
        if (model.paper) window.ArchiveSound?.paperRustle(0.12);
        else window.ArchiveSound?.deckInsert(model.index || 0);
      }
      const previous = this.activeId ? this.models.get(this.activeId) : null;
      const continuing = previous === model;
      if (previous && previous !== model) {
        previous.hovering = previous.previewing = false;
        previous.slot.classList.remove('is-unfolded');
        this.mountHome(previous);
      }
      this.activeId = id;
      this.phase = 'opening';
      this.startIdle();
      // Preserve the exact expanded row while its actor travels into detail.
      // This also covers clicks halfway through a hover flip.
      model.slot.style.height = `${model.slot.getBoundingClientRect().height}px`;
      model.slot.setAttribute('data-away', 'true');
      const destination = this.frame(this.host);
      const source = this.frame(model.root);
      if (model.paper) window.PaperPortrait.setState(model.root, 'open', this.reduce.matches);
      await this.flight(model, destination, model.front, { fallback: !continuing && (!fromShelf || !source.visible) });
      if (revision !== this.revision) return false;
      this.setSolidTransform(model, model.front);
      model.root.style.transform = this.transform(destination, model);
      this.flights.forEach((animation) => animation.cancel()); this.flights.clear();
      this.mountFront(model);
      this.phase = 'detail';
      this.updateTurntableUI(model);
      this.startIdle();
      return true;
    }

    async close() {
      const revision = ++this.revision;
      this.cancelFlights();
      const model = this.models.get(this.activeId);
      if (!model) return true;
      if (model.paper) window.ArchiveSound?.paperRustle(-0.12);
      else window.ArchiveSound?.deckEject();
      this.phase = 'closing';
      this.updateTurntableUI(model);
      this.startIdle();
      // Resolve layout reflow under the dialog before computing the landing
      // point; an early reversal must not land at an intermediate slot height.
      this.models.forEach((entry) => {
        if (entry.paper) return;
        entry.hovering = entry.previewing = false;
        entry.slot.classList.remove('is-unfolded');
        entry.slot.style.removeProperty('height');
        entry.slot.getAnimations().forEach((animation) => { try { animation.finish(); } catch (_) {} });
      });
      const destination = this.frame(model.slot);
      if (!model.paper) destination.scale *= WIDTH / SHELF_PROJECTION_WIDTH;
      const pose = model.hovering ? model.hover : model.home;
      if (model.paper) window.PaperPortrait.setProgress(model.root, model.paperProgress, this.reduce.matches);
      if (destination.visible && destination.scale > 0) {
        await this.flight(model, destination, pose);
      } else if (!this.reduce.matches) {
        const fade = model.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 230, fill: 'forwards' });
        this.flights.add(fade);
        await Promise.allSettled([fade.finished]);
      }
      if (revision !== this.revision) return false;
      this.flights.forEach((animation) => animation.cancel()); this.flights.clear();
      this.mountHome(model);
      this.activeId = null;
      this.phase = 'shelf';
      this.startIdle();
      return true;
    }
  }
  window.CassetteScene = CassetteScene;
})();
