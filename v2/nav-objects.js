/* Keep the existing navigation anchors and their handlers; add small objects. */
(() => {
  'use strict';
  const nav = document.querySelector('.header-nav');
  if (!nav || nav.classList.contains('has-micro-nav')) return;
  const definitions = [
    { selector: '[data-collection]', key: 'works', label: '作品', kind: 'cassette', variant: 'navigation' },
    { selector: '[data-explore-nav]', key: 'explore', label: '探索', kind: 'explore', variant: 'navigation' },
    { selector: '[data-about-nav], [data-open="about"]', key: 'about', label: '关于', kind: 'paper', variant: 'navigation' },
    { selector: '[href="#contact"]', key: 'contact', label: '联系', kind: 'envelope' }
  ];
  const entries = definitions.map((definition) => {
    const anchor = nav.querySelector(definition.selector);
    if (!anchor) return null;
    const object = document.createElement('span');
    object.className = 'micro-object';
    object.dataset.microKind = definition.kind;
    if (definition.variant) object.dataset.microVariant = definition.variant;
    if (definition.kind === 'explore') object.dataset.microEntry = 'once';
    object.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'nav-object-label';
    label.textContent = definition.label;
    anchor.replaceChildren(object, label);
    anchor.dataset.microTrigger = '';
    anchor.dataset.navSection = definition.key;
    return { ...definition, anchor };
  }).filter(Boolean);
  nav.classList.add('has-micro-nav');

  let frame = 0;
  let intent = null;
  let intentTimer = 0;
  const about = document.querySelector('#about-foldout');
  const story = document.querySelector('#story-dialog');

  function mark(key) {
    entries.forEach(({ anchor, key: candidate }) => {
      const current = candidate === key;
      anchor.classList.toggle('is-current', current);
      if (current) anchor.setAttribute('aria-current', 'location');
      else anchor.removeAttribute('aria-current');
    });
  }
  function update() {
    frame = 0;
    if (story?.open) {
      mark(document.body.dataset.section === 'explore' ? 'explore' : 'works');
      return;
    }
    if (document.body.dataset.section === 'explore') {
      mark('explore');
      return;
    }
    if (document.body.dataset.section === 'about') {
      mark('about');
      return;
    }
    const box = about?.getBoundingClientRect();
    const atAbout = box && box.top <= innerHeight * .35 && box.bottom > 144;
    if (intent && performance.now() < intent.until) {
      const arrived = intent.key === 'works' ? !atAbout && scrollY < 30 : intent.key === 'contact' ? atAbout : false;
      if (arrived) intent = null;
      else { mark(intent.key); return; }
    } else intent = null;
    mark(atAbout ? (location.hash === '#contact' ? 'contact' : 'about') : 'works');
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function signalIntent(key) {
    intent = { key, until: performance.now() + 1800 };
    clearTimeout(intentTimer);
    intentTimer = setTimeout(schedule, 1850);
    mark(key);
    schedule();
  }
  entries.forEach(({ anchor, key }) => anchor.addEventListener('click', () => signalIntent(key)));
  // Manual scrolling takes precedence over a previous navigation click.
  const releaseIntent = () => { intent = null; schedule(); };
  window.addEventListener('wheel', releaseIntent, { passive: true });
  window.addEventListener('touchstart', releaseIntent, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  if (story) new MutationObserver(schedule).observe(story, { attributes: true, attributeFilter: ['open'] });
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-section'] });
  const initial = location.hash === '#explore' ? 'explore' : location.hash === '#contact' ? 'contact' : location.hash === '#about' ? 'about' : null;
  if (initial) signalIntent(initial); else update();
})();
