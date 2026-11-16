(() => {
  'use strict';

  const WIDTH = 600;
  const HEIGHT = 1000;
  const PANEL_HEIGHT = HEIGHT / 5;
  const FOLDED_ANGLE = 178;
  const EASE = 'cubic-bezier(.22,.72,.18,1)';
  const HOME = 'perspective(3000px) translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
  const HOVER = HOME;
  const FRONT = 'perspective(3000px) translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
  const foldHeight = (angle) => PANEL_HEIGHT * (3 + 2 * Math.cos(angle * Math.PI / 180));
  const foldOffset = (angle) => (HEIGHT - foldHeight(angle)) / 2;
  const smooth = (value) => value * value * (3 - 2 * value);
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function geometry(progress = 0) {
    const p = clamp(progress);
    // Release the upper pair just before the lower one. Each pair remains a
    // connected accordion; their cumulative normals return to the printed face.
    const upper = FOLDED_ANGLE * (1 - smooth(clamp(p / .95)));
    const lower = FOLDED_ANGLE * (1 - smooth(clamp((p - .05) / .95)));
    const height = PANEL_HEIGHT * (3 + Math.cos(upper * Math.PI / 180) + Math.cos(lower * Math.PI / 180));
    return { angle: Math.max(upper, lower), height, offset: (HEIGHT - height) / 2, rotations: [0, -upper, upper, -lower, lower], closedEdge: 1 - smooth(clamp(p / .24)) };
  }
  const STATES = {
    folded: { angle: FOLDED_ANGLE, offset: foldOffset(FOLDED_ANGLE), duration: 760, shade: .18 },
    hover: { angle: 168, offset: foldOffset(168), duration: 480, shade: .12 },
    open: { angle: 0, offset: 0, duration: 760, shade: 0 }
  };
  const runs = new WeakMap();
  const safe = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  // The cover stays facing the reader. Every following leaf folds behind it;
  // successive hinge rotations cancel, producing orientations 0,-a,0,-a,0.
  // At 178 degrees the five leaves occupy almost exactly one 200px cover,
  // while a small physical separation prevents coincident paper surfaces.
  const rotation = (index, angle) => index === 0 ? 0 : (index % 2 ? -1 : 1) * angle;
  try {
    CSS.registerProperty({ name: '--paper-fold-offset', syntax: '<length>', inherits: true, initialValue: '0px' });
    CSS.registerProperty({ name: '--paper-hinge-angle', syntax: '<angle>', inherits: true, initialValue: '0deg' });
  } catch (_) { /* Registration is optional; native-scroll updates are direct. */ }

  function markup(item, author) {
    const name = safe(author.nameZh);
    const alias = safe(author.alias);
    const faces = window.PaperContent.faces(author);
    const panel = (index) => {
      if (index === faces.length) return '';
      const angle = rotation(index, STATES.folded.angle);
      const edge = index === 0 ? '<span class="paper-closed-fold" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="paper-fold-contact-shadow" aria-hidden="true"></span>' : '<span class="paper-crease" aria-hidden="true"></span>';
      return `<div class="paper-panel paper-panel-${index + 1}" data-fold="${index}" style="--paper-hinge-angle:${angle}deg;transform:rotateX(${angle}deg)">${edge}<section class="paper-surface paper-surface-${index + 1}">${faces[index]}${index === 0 ? '<span class="paper-cover-lip" aria-hidden="true"></span><button type="button" class="paper-open" aria-label="展开个人档案"></button>' : ''}<span class="paper-fold-shade" aria-hidden="true" style="opacity:${index === 0 ? 0 : STATES.folded.shade}"></span></section><span class="paper-reverse" aria-hidden="true"></span>${panel(index + 1)}</div>`;
    };
    return `<div class="cassette-object paper-object" data-object="about" data-paper-state="folded" style="--paper-fold-offset:${STATES.folded.offset}px;--paper-closed-edge:1" role="group" aria-label="${name} ${alias}，五折个人介绍海报"><div class="tape-solid" data-object="about"><div class="paper-assembly" style="transform:translate3d(0,${STATES.folded.offset}px,0)">${panel(0)}</div></div></div>`;
  }

  function setState(root, state, immediate = false) {
    if (!root?.classList.contains('paper-object')) return;
    const settings = typeof state === 'object' ? state : (STATES[state] || STATES.folded);
    const targetState = typeof state === 'object' ? state.key : (STATES[state] ? state : 'folded');
    const previous = runs.get(root);
    if (previous?.state === targetState && !immediate) return;
    const assembly = root.querySelector('.paper-assembly');
    const panels = [...root.querySelectorAll('.paper-panel')];
    const surfaces = [...root.querySelectorAll('.paper-surface')];
    const shades = [...root.querySelectorAll('.paper-fold-shade')];
    if (!assembly || panels.length !== 5) return;

    // Sample every hinge before cancelling any animation. Rapid reversals then
    // continue from the displayed fold, while the scene owns the outer flight.
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animated = !immediate && !reduce;
    const turns = settings.rotations || panels.map((_, index) => rotation(index, settings.angle));
    root.style.setProperty('--paper-closed-edge', String(settings.closedEdge ?? (settings.angle >= 174 ? 1 : 0)));
    const shadeValues = turns.map((turn, index) => index ? .2 * Math.sin(Math.abs(turn) * Math.PI / 360) : 0);
    // Native scroll has no active per-leaf animation: write directly without
    // forced computed-style reads on every hinge, shade and offset.
    if (!animated) {
      previous?.animations.forEach((animation) => animation.cancel());
      runs.set(root, { state: targetState, animations: [] });
      root.dataset.paperState = targetState;
      root.style.setProperty('--paper-fold-offset', `${settings.offset}px`);
      assembly.style.transform = `translate3d(0,${settings.offset}px,0)`;
      panels.forEach((panel, index) => {
        panel.style.transform = `rotateX(${turns[index]}deg)`;
        panel.style.setProperty('--paper-hinge-angle', `${turns[index]}deg`);
        panel.style.setProperty('--paper-fold-light', String(shadeValues[index]));
        surfaces[index].inert = index > 0 && settings.angle >= 90;
        shades[index].style.opacity = shadeValues[index];
      });
      return Promise.resolve();
    }
    const start = {
      assembly: getComputedStyle(assembly).transform,
      offset: getComputedStyle(root).getPropertyValue('--paper-fold-offset').trim() || '0px',
      panels: panels.map((panel) => getComputedStyle(panel).transform),
      hinges: panels.map((panel) => getComputedStyle(panel).getPropertyValue('--paper-hinge-angle')),
      shades: shades.map((shade) => getComputedStyle(shade).opacity)
    };
    previous?.animations.forEach((animation) => animation.cancel());
    const record = { state: targetState, animations: [] };
    runs.set(root, record);
    root.dataset.paperState = targetState;
    // Buried/back-facing leaves must not expose invisible contact links to
    // keyboard focus or pointer hit testing. At less than 90° the accordion is
    // monotonic down the page, with every printed leaf facing the reader.
    surfaces.forEach((surface, index) => { surface.inert = index > 0 && settings.angle >= 90; });
    const move = (element, property, from, to) => {
      if (property.startsWith('--')) element.style.setProperty(property, to);
      else element.style[property] = to;
      if (animated && from !== to) {
        const animation = element.animate([{ [property]: from }, { [property]: to }], {
          duration: settings.duration, easing: EASE
        });
        record.animations.push(animation);
      }
    };
    move(root, '--paper-fold-offset', start.offset, `${settings.offset}px`);
    move(assembly, 'transform', start.assembly, `translate3d(0,${settings.offset}px,0)`);
    panels.forEach((panel, index) => {
      move(panel, 'transform', start.panels[index], `rotateX(${turns[index]}deg)`);
      move(panel, '--paper-hinge-angle', start.hinges[index], `${turns[index]}deg`);
      panel.style.setProperty('--paper-fold-light', String(shadeValues[index]));
    });
    shades.forEach((shade, index) => move(shade, 'opacity', start.shades[index], String(shadeValues[index])));
    return Promise.allSettled(record.animations.map((animation) => animation.finished));
  }

  function setProgress(root, amount, immediate = true) {
    const progress = clamp(amount);
    const shape = geometry(progress);
    return setState(root, {
      key: `scroll-${progress.toFixed(4)}`,
      ...shape,
      duration: 450,
      shade: .18 * (1 - progress)
    }, immediate);
  }

  window.PaperPortrait = {
    baseHeight: HEIGHT,
    foldedHeight: foldHeight(FOLDED_ANGLE),
    geometry,
    markup,
    setState,
    setProgress,
    poses: { home: HOME, hover: HOVER, front: FRONT }
  };
})();
