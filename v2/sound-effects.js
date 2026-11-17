/* Zero-asset Web Audio mechanical micro-acoustics for the cassette & paper archive. */
(() => {
  'use strict';

  const STORAGE_KEY = 'simo-archive-sfx-enabled';
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  let ctx = null;
  let masterOut = null;
  let noiseBuffer = null;
  let pinkBuffer = null;
  let enabled = true;
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved === '0') enabled = false;
  } catch (_) {}

  let lastHoverSoundAt = 0;
  let lastTickAt = 0;
  let lastPaperSoundAt = 0;
  let lastPaperProgress = null;
  let activated = false;
  let audioRevision = 0;
  const activeSources = new Set();
  const stats = { contexts: 0, sources: 0, skipped: 0 };
  const mayPlay = () => !document.hidden && (activated || navigator.userActivation?.hasBeenActive);
  function stopSources() {
    for (const source of activeSources) { try { source.stop(); } catch (_) {} }
  }
  function trackSource(source, nodes) {
    stats.sources++;
    activeSources.add(source);
    source.addEventListener('ended', () => {
      activeSources.delete(source);
      for (const node of [source, ...nodes]) { try { node.disconnect(); } catch (_) {} }
    }, { once: true });
  }

  function getAudioGraph() {
    if (!enabled || !mayPlay()) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
        stats.contexts++;
      } catch (_) {
        return null;
      }
    }
    if (!masterOut && ctx) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 10;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.001;
      comp.release.value = 0.08;
      const gain = ctx.createGain();
      gain.gain.value = 4.65; // 150% of the imported master output.
      comp.connect(gain);
      gain.connect(ctx.destination);
      masterOut = comp;
    }
    if (!noiseBuffer && ctx) {
      const length = Math.floor(ctx.sampleRate * 0.35);
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      pinkBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const white = noiseBuffer.getChannelData(0);
      const pink = pinkBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        white[i] = w;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        pink[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.12;
        b6 = w * 0.115926;
      }
    }
    return ctx;
  }

  function withAudio(callback) {
    if (!enabled || !mayPlay()) { stats.skipped++; return; }
    const audio = getAudioGraph();
    if (!audio) return;
    const revision = audioRevision;
    const requestedAt = performance.now();
    const run = () => {
      if (enabled && mayPlay() && revision === audioRevision &&
          audio.state === 'running' && performance.now() - requestedAt < 180) callback(audio);
      else stats.skipped++;
    };
    if (audio.state === 'running') run();
    else audio.resume().then(run).catch(() => {});
  }

  function unlockAudio(event) {
    if (!event.isTrusted || document.hidden) return;
    activated = true;
    if (!enabled) return;
    const audio = getAudioGraph();
    if (audio?.state === 'suspended') audio.resume().catch(() => {});
  }
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('click', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);
  window.addEventListener('touchstart', unlockAudio, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    audioRevision++;
    stopSources();
    if (ctx?.state === 'running') ctx.suspend().catch(() => {});
  });

  function playNoiseBurst(audio, {
    time = audio.currentTime,
    duration = 0.018,
    freq = 1800,
    q = 3.0,
    type = 'bandpass',
    gain = 0.03,
    pink = false,
    attack = 0.0015,
    pan = 0
  }) {
    const src = audio.createBufferSource();
    src.buffer = pink ? pinkBuffer : noiseBuffer;
    const filter = audio.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.setValueAtTime(q, time);

    const env = audio.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    src.connect(filter);
    if (audio.createStereoPanner && pan !== 0) {
      const panner = audio.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), time);
      filter.connect(panner);
      panner.connect(env);
    } else {
      filter.connect(env);
    }
    env.connect(masterOut || audio.destination);
    trackSource(src, [filter, env]);
    src.start(time, Math.random() * 0.12, duration + 0.01);
    src.stop(time + duration + 0.012);
  }

  function playBodyPulse(audio, {
    time = audio.currentTime,
    startFreq = 240,
    endFreq = 88,
    duration = 0.026,
    gain = 0.032,
    type = 'triangle',
    pan = 0
  }) {
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, endFreq), time + duration);

    const env = audio.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    if (audio.createStereoPanner && pan !== 0) {
      const panner = audio.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), time);
      osc.connect(panner);
      panner.connect(env);
    } else {
      osc.connect(env);
    }
    env.connect(masterOut || audio.destination);
    trackSource(osc, [env]);
    osc.start(time);
    osc.stop(time + duration + 0.005);
  }

  const sfx = {
    get enabled() { return enabled; },

    cassetteHover(index = 0, unfolding = true) {
      const nowMs = performance.now();
      if (nowMs - lastHoverSoundAt < 45) return;
      lastHoverSoundAt = nowMs;
      withAudio((audio) => {
        const t = audio.currentTime;
        const pitchShift = 1 + (index % 4) * 0.055;

        if (unfolding) {
          playBodyPulse(audio, {
            time: t,
            startFreq: 255 * pitchShift,
            endFreq: 98 * pitchShift,
            duration: 0.030,
            gain: 0.24
          });
          playNoiseBurst(audio, {
            time: t,
            duration: 0.016,
            freq: 2100 * pitchShift,
            q: 2.2,
            gain: 0.22
          });
          playNoiseBurst(audio, {
            time: t + 0.07,
            duration: 0.055,
            freq: 1150 * pitchShift,
            q: 1.4,
            gain: 0.11,
            pink: true,
            attack: 0.012
          });
          playNoiseBurst(audio, {
            time: t + 0.14,
            duration: 0.011,
            freq: 2800 * pitchShift,
            q: 2.8,
            gain: 0.13
          });
        } else {
          playBodyPulse(audio, {
            time: t,
            startFreq: 175 * pitchShift,
            endFreq: 76 * pitchShift,
            duration: 0.026,
            gain: 0.15
          });
          playNoiseBurst(audio, {
            time: t,
            duration: 0.012,
            freq: 1400 * pitchShift,
            q: 2.0,
            gain: 0.12
          });
        }
      });
    },

    deckInsert(index = 0) {
      withAudio((audio) => {
        const t = audio.currentTime;
        const pitch = 1 + (index % 4) * 0.035;

        playBodyPulse(audio, { time: t, startFreq: 315 * pitch, endFreq: 118, duration: 0.032, gain: 0.28 });
        playNoiseBurst(audio, { time: t, duration: 0.016, freq: 2400 * pitch, q: 2.2, gain: 0.25 });

        playNoiseBurst(audio, {
          time: t + 0.085,
          duration: 0.20,
          freq: 680,
          q: 1.1,
          gain: 0.10,
          pink: true,
          attack: 0.045
        });

        playBodyPulse(audio, { time: t + 0.43, startFreq: 175, endFreq: 64, duration: 0.042, gain: 0.27 });
        playNoiseBurst(audio, { time: t + 0.43, duration: 0.018, freq: 1750, q: 2.0, gain: 0.22 });
        playNoiseBurst(audio, { time: t + 0.47, duration: 0.012, freq: 3050, q: 2.8, gain: 0.20 });
      });
    },

    deckEject() {
      withAudio((audio) => {
        const t = audio.currentTime;
        playNoiseBurst(audio, { time: t, duration: 0.014, freq: 2600, q: 2.5, gain: 0.22 });
        playBodyPulse(audio, { time: t + 0.01, startFreq: 235, endFreq: 102, duration: 0.030, gain: 0.22 });

        playBodyPulse(audio, { time: t + 0.45, startFreq: 148, endFreq: 58, duration: 0.044, gain: 0.24 });
        playNoiseBurst(audio, { time: t + 0.452, duration: 0.015, freq: 1350, q: 2.0, gain: 0.15 });
      });
    },

    tick(variant = 0) {
      const nowMs = performance.now();
      if (nowMs - lastTickAt < 32) return;
      lastTickAt = nowMs;
      withAudio((audio) => {
        const t = audio.currentTime;
        const shift = 1 + (variant % 5) * 0.045;
        playNoiseBurst(audio, { time: t, duration: 0.010, freq: 2900 * shift, q: 2.8, gain: 0.19 });
        playBodyPulse(audio, { time: t, startFreq: 350 * shift, endFreq: 140, duration: 0.018, gain: 0.16 });
      });
    },

    cdHover(index = 0, opening = true) {
      const nowMs = performance.now();
      if (nowMs - lastHoverSoundAt < 50) return;
      lastHoverSoundAt = nowMs;
      withAudio((audio) => {
        const t = audio.currentTime;
        const pitch = 1 + (index % 3) * 0.05;
        if (opening) {
          playNoiseBurst(audio, { time: t, duration: 0.014, freq: 3400 * pitch, q: 3.1, gain: 0.18 });
          playBodyPulse(audio, { time: t, startFreq: 310 * pitch, endFreq: 128 * pitch, duration: 0.024, gain: 0.16 });
          playNoiseBurst(audio, { time: t + 0.05, duration: 0.032, freq: 1850 * pitch, q: 1.8, gain: 0.08, pink: true, attack: 0.008 });
        } else {
          playNoiseBurst(audio, { time: t, duration: 0.012, freq: 2300 * pitch, q: 2.6, gain: 0.11 });
          playBodyPulse(audio, { time: t + 0.006, startFreq: 195 * pitch, endFreq: 92 * pitch, duration: 0.020, gain: 0.11 });
        }
      });
    },

    cdCaseSnap(index = 0, cased = true) {
      withAudio((audio) => {
        const t = audio.currentTime;
        const pitch = 1 + (index % 3) * 0.04;
        if (cased) {
          playNoiseBurst(audio, { time: t, duration: 0.018, freq: 2600 * pitch, q: 2.2, gain: 0.18 });
          playBodyPulse(audio, { time: t + 0.04, startFreq: 340 * pitch, endFreq: 122, duration: 0.030, gain: 0.25 });
          playNoiseBurst(audio, { time: t + 0.045, duration: 0.013, freq: 3550 * pitch, q: 3.2, gain: 0.24 });
        } else {
          playNoiseBurst(audio, { time: t, duration: 0.015, freq: 3100 * pitch, q: 2.8, gain: 0.19 });
          playBodyPulse(audio, { time: t + 0.012, startFreq: 220 * pitch, endFreq: 96, duration: 0.026, gain: 0.19 });
        }
      });
    },

    cdOpen(index = 0) {
      withAudio((audio) => {
        const t = audio.currentTime;
        const pitch = 1 + (index % 3) * 0.04;
        playNoiseBurst(audio, { time: t, duration: 0.016, freq: 3300 * pitch, q: 2.9, gain: 0.22 });
        playBodyPulse(audio, { time: t, startFreq: 295 * pitch, endFreq: 112, duration: 0.028, gain: 0.22 });
        playNoiseBurst(audio, { time: t + 0.075, duration: 0.14, freq: 1450, q: 1.4, gain: 0.08, pink: true, attack: 0.03 });
      });
    },

    cdClose() {
      withAudio((audio) => {
        const t = audio.currentTime;
        playNoiseBurst(audio, { time: t, duration: 0.014, freq: 2800, q: 2.6, gain: 0.18 });
        playBodyPulse(audio, { time: t + 0.01, startFreq: 215, endFreq: 86, duration: 0.028, gain: 0.19 });
      });
    },

    paperRustle(progressDelta = 0.05) {
      const nowMs = performance.now();
      if (nowMs - lastPaperSoundAt < 95) return;
      lastPaperSoundAt = nowMs;
      withAudio((audio) => {
        const t = audio.currentTime;
        const speed = Math.min(1, Math.abs(progressDelta) * 14);
        const direction = progressDelta >= 0 ? 1 : 0.88;
        playNoiseBurst(audio, {
          time: t,
          duration: 0.08,
          freq: (1250 + speed * 420) * direction,
          q: 1.3,
          gain: 0.10 + speed * 0.10,
          pink: true,
          attack: 0.016
        });
        playNoiseBurst(audio, {
          time: t + 0.01,
          duration: 0.055,
          freq: 3000 * direction,
          q: 1.8,
          gain: 0.06 + speed * 0.06,
          attack: 0.012
        });
      });
    },

    paperTap() {
      withAudio((audio) => {
        const t = audio.currentTime;
        playBodyPulse(audio, { time: t, startFreq: 195, endFreq: 72, duration: 0.028, gain: 0.18 });
        playNoiseBurst(audio, {
          time: t,
          duration: 0.036,
          freq: 1650,
          q: 1.5,
          gain: 0.11,
          pink: true,
          attack: 0.004
        });
      });
    },

    mp3Click(playing = true) {
      withAudio((audio) => {
        const t = audio.currentTime;
        playBodyPulse(audio, {
          time: t,
          startFreq: playing ? 360 : 250,
          endFreq: playing ? 150 : 108,
          duration: 0.024,
          gain: 0.24
        });
        playNoiseBurst(audio, {
          time: t,
          duration: 0.011,
          freq: playing ? 3400 : 2400,
          q: 3.0,
          gain: 0.22
        });
      });
    },

    mp3TrackSwitch(index = 0) {
      withAudio((audio) => {
        const t = audio.currentTime;
        const shift = 1 + (index % 4) * 0.05;
        playNoiseBurst(audio, { time: t, duration: 0.010, freq: 3100 * shift, q: 2.8, gain: 0.18 });
        playBodyPulse(audio, { time: t + 0.004, startFreq: 310 * shift, endFreq: 132 * shift, duration: 0.020, gain: 0.16 });
      });
    },

    mp3CapSnap(opened = true) {
      withAudio((audio) => {
        const t = audio.currentTime;
        if (opened) {
          playNoiseBurst(audio, { time: t, duration: 0.018, freq: 2100, q: 2.0, gain: 0.22 });
          playBodyPulse(audio, { time: t + 0.006, startFreq: 240, endFreq: 380, duration: 0.032, gain: 0.20 });
        } else {
          playBodyPulse(audio, { time: t, startFreq: 340, endFreq: 120, duration: 0.026, gain: 0.26 });
          playNoiseBurst(audio, { time: t + 0.012, duration: 0.012, freq: 3400, q: 3.1, gain: 0.24 });
        }
      });
    },

    mp3Clack(intensity = 0.5) {
      const nowMs = performance.now();
      if (nowMs - lastTickAt < 55) return;
      lastTickAt = nowMs;
      const amp = Math.max(0.18, Math.min(1, intensity));
      withAudio((audio) => {
        const t = audio.currentTime;
        const pitch = 0.94 + Math.random() * 0.12;
        playBodyPulse(audio, {
          time: t,
          startFreq: 540 * pitch,
          endFreq: 180 * pitch,
          duration: 0.022,
          gain: 0.24 * amp
        });
        playNoiseBurst(audio, {
          time: t,
          duration: 0.009,
          freq: 3600 * pitch,
          q: 3.2,
          gain: 0.26 * amp
        });
      });
    },

    toggleConfirm(turningOn = true) {
      const audio = getAudioGraph();
      if (!audio) return;
      const run = () => {
        if (!mayPlay() || audio.state !== 'running') return;
        const t = audio.currentTime;
        if (turningOn) {
          playBodyPulse(audio, { time: t, startFreq: 280, endFreq: 135, duration: 0.026, gain: 0.24 });
          playNoiseBurst(audio, { time: t, duration: 0.012, freq: 2450, q: 2.5, gain: 0.20 });
          playNoiseBurst(audio, { time: t + 0.048, duration: 0.012, freq: 3350, q: 2.8, gain: 0.22 });
        } else {
          playBodyPulse(audio, { time: t, startFreq: 185, endFreq: 80, duration: 0.028, gain: 0.20 });
        }
      };
      if (audio.state === 'running') run();
      else audio.resume().then(run).catch(() => {});
    }
  };

  window.ArchiveSound = sfx;

  function mountToggle() {
    const edition = document.querySelector('.brand-lockup .brand-edition');
    const glyph = edition?.querySelector('.archive-signal');
    if (!edition || !glyph || edition.querySelector('.sound-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sound-toggle';
    const update = () => {
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', enabled ? '关闭机械微音效' : '开启机械微音效');
      button.title = enabled ? '机械微音效：点击静音' : '机械微音效：点击开启';
    };
    button.append(glyph);
    edition.append(button);
    update();
    button.addEventListener('click', event => {
      event.stopPropagation();
      audioRevision++;
      stopSources();
      if (enabled) {
        sfx.toggleConfirm(false);
        enabled = false;
      } else {
        enabled = true;
        sfx.toggleConfirm(true);
      }
      try { sessionStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (_) {}
      update();
    });
  }

  function bindGlobalMicroSounds() {
    mountToggle();
    document.querySelectorAll('#shelf-index button').forEach((button, index) => {
      button.addEventListener('pointerenter', event => {
        if (event.isTrusted && event.pointerType !== 'touch') sfx.tick(index);
      });
    });
    document.addEventListener('pointerdown', event => {
      if (event.isTrusted && event.target instanceof Element &&
          event.target.closest('.paper-object .paper-surface')) sfx.paperTap();
    }, true);
    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!event.isTrusted || !target || target.closest('.sound-toggle')) return;
      if (target.closest('#shelf-prev, #shelf-next, #story-prev, #story-next, #image-prev, #image-next') ||
          target.closest('[data-player="previous"], [data-player="next"], [data-player="queue"]') ||
          target.closest('.view-switch button, #story-index button, .header-nav a, #image-zoom, #image-close, .slide-button')) {
        sfx.tick(1);
      }
    }, true);
    window.addEventListener('scroll', () => {
      const paper = document.querySelector('#paper-shelf .paper-object');
      if (!paper || document.querySelector('#story-dialog[open], #access-dialog[open]')) return;
      const progress = Number(paper.dataset.paperVisualProgress);
      if (!Number.isFinite(progress)) return;
      if (lastPaperProgress !== null) {
        const delta = progress - lastPaperProgress;
        if (Math.abs(delta) > .028 && progress > .01 && progress < .99) {
          sfx.paperRustle(delta);
          lastPaperProgress = progress;
        } else if (progress <= .005 || progress >= .995) lastPaperProgress = progress;
      } else lastPaperProgress = progress;
    }, { passive: true });
  }

  sfx.diagnostics = () => ({ ...stats, enabled, activated, state: ctx?.state || 'not-created', active: activeSources.size });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindGlobalMicroSounds, { once: true });
  else bindGlobalMicroSounds();
})();

/* Optional paper motion shares the existing fold geometry, not the audio graph. */
(() => {
  'use strict';

  function bindPaperBreeze() {
    const shelf = document.querySelector('#paper-shelf');
    const root = shelf?.querySelector('.paper-object');
    const panels = root ? [...root.querySelectorAll('.paper-panel')] : [];
    if (!shelf || !root || panels.length !== 5 || !window.PaperPortrait) return;
    const shades = [...root.querySelectorAll('.paper-fold-shade')];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = value => Math.max(0, Math.min(1, value));
    const smooth = value => value * value * (3 - 2 * value);
    const FULL_PROGRESS = .9999;
    const DEADZONE_PX = 185;
    const panelHeight = window.PaperPortrait.baseHeight / panels.length;

    const shadow = document.createElement('span');
    shadow.className = 'paper-breeze-ambient-shadow';
    shadow.setAttribute('aria-hidden', 'true');
    const egg = document.createElement('div');
    egg.className = 'paper-easter-egg';
    egg.setAttribute('aria-hidden', 'true');
    const note = document.createElement('span');
    note.textContent = '有幸，彩蛋被你找到了🎊';
    egg.append(note);
    shelf.prepend(shadow, egg);

    let visible = false;
    let frame = 0;
    let lastStep = 0;
    let applied = false;
    let unfoldedSince = 0;
    let previousProgress = -1;
    let previousRaw = -1;
    let settledAt = performance.now();
    let overscrollAccum = 0;
    let overscrollLift = 0;
    let eggReveal = 0;
    let lastInputAt = 0;
    let lastScrollY = window.scrollY;
    let lastScrollMoveAt = performance.now();
    let lastWheelAt = 0;
    let previousWheelDelta = 0;
    let unfoldingStream = true;
    let armedAtBottom = false;
    let touchY = null;
    let touchStartedAtBottom = false;
    let lastPullSoundAt = 0;

    const progress = () => Number(root.dataset.paperVisualProgress || 0);
    const rawProgress = () => Number(root.dataset.paperRawProgress || 0);
    const fullyOpen = () => progress() >= FULL_PROGRESS && rawProgress() >= FULL_PROGRESS;
    function available() {
      return visible && root.isConnected && shelf.contains(root) && !root.classList.contains('is-flying') &&
        !reduce.matches && !document.hidden && !document.body.classList.contains('is-booting') &&
        document.body.dataset.layout !== 'index' && !document.querySelector('dialog[open]') && fullyOpen();
    }
    function settled(now) {
      return Math.abs(progress() - rawProgress()) < .0003 && now - settledAt > 150;
    }
    function atBottom(now = performance.now()) {
      const bottom = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      return available() && settled(now) && window.scrollY >= bottom - 8;
    }
    function clearEffects() {
      eggReveal = 0;
      shelf.style.setProperty('--breeze-shadow-lift', '0');
      shelf.style.setProperty('--breeze-shadow-y', '8px');
      shelf.style.setProperty('--breeze-shadow-opacity', '0');
      shelf.style.setProperty('--egg-reveal', '0');
      egg.setAttribute('aria-hidden', 'true');
    }
    function restoreFold() {
      if (!applied) return;
      applied = false;
      if (root.isConnected && shelf.contains(root) && !root.classList.contains('is-flying')) {
        window.PaperPortrait.setProgress(root, progress(), true);
      }
    }
    function pause() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastStep = 0;
      unfoldedSince = 0;
      overscrollAccum = overscrollLift = 0;
      armedAtBottom = false;
      unfoldingStream = true;
      touchY = null;
      touchStartedAtBottom = false;
      restoreFold();
      clearEffects();
    }
    function syncMotion() {
      const next = progress();
      const raw = rawProgress();
      if (next !== previousProgress || raw !== previousRaw) {
        previousProgress = next;
        previousRaw = raw;
        settledAt = performance.now();
      }
      if (!available()) { pause(); return; }
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function pushOverscroll(delta, isTouch) {
      const now = performance.now();
      const previousWheelAt = lastWheelAt;
      const previousDelta = previousWheelDelta;
      if (!isTouch && Math.abs(delta) > .8) {
        lastWheelAt = now;
        previousWheelDelta = Math.abs(delta);
      }
      if (!atBottom(now)) {
        armedAtBottom = false;
        unfoldingStream = true;
        return;
      }
      if (isTouch) {
        if (!touchStartedAtBottom) return;
        armedAtBottom = true;
      } else if (!armedAtBottom) {
        const freshStream = now - previousWheelAt > 300 && now - lastScrollMoveAt > 260;
        const freshAcceleration = unfoldingStream && previousDelta <= 8 &&
          delta >= Math.max(28, previousDelta * 2.8 + 18) && now - lastScrollMoveAt > 180;
        if (!freshStream && !freshAcceleration) return;
        unfoldingStream = false;
        armedAtBottom = true;
      }
      if (delta > 0) {
        const wasOverDeadzone = overscrollAccum >= DEADZONE_PX;
        overscrollAccum = Math.min(760, overscrollAccum + delta * .95);
        lastInputAt = now;
        if (!wasOverDeadzone && overscrollAccum >= DEADZONE_PX && now - lastPullSoundAt > 420) {
          lastPullSoundAt = now;
          window.ArchiveSound?.paperRustle(.16);
        }
      } else if (delta < 0) {
        overscrollAccum = Math.max(0, overscrollAccum + delta * 1.4);
      }
    }

    function tick(now) {
      frame = 0;
      if (!available()) { pause(); return; }
      const activePull = overscrollLift > .001 || overscrollAccum > 0;
      const interval = activePull ? 20 : 32;
      if (now - lastStep < interval) { frame = requestAnimationFrame(tick); return; }
      const dt = Math.min(60, Math.max(10, lastStep ? now - lastStep : interval));
      lastStep = now;
      if (!settled(now)) {
        restoreFold();
        clearEffects();
        frame = requestAnimationFrame(tick);
        return;
      }
      if (!atBottom(now)) {
        overscrollAccum = overscrollLift = 0;
        armedAtBottom = false;
        unfoldingStream = true;
      } else if (!armedAtBottom && now - lastScrollMoveAt > 320 && now - lastWheelAt > 320) {
        armedAtBottom = true;
        unfoldingStream = false;
      }
      if (now - lastInputAt > 110) {
        overscrollAccum *= Math.exp(-dt / (overscrollLift > .12 ? 650 : 110));
        if (overscrollAccum < 1) overscrollAccum = 0;
      }
      const targetPull = Math.tanh(Math.max(0, overscrollAccum - DEADZONE_PX) / 260);
      overscrollLift += (targetPull - overscrollLift) * (1 - Math.exp(-dt / 85));
      if (overscrollLift < .001 && targetPull === 0) overscrollLift = 0;

      if (!unfoldedSince) unfoldedSince = now;
      const weight = smooth(clamp((now - unfoldedSince) / 800));
      const base = window.PaperPortrait.geometry(progress()).rotations;
      const t = now * .00075;
      const gust = .35 + .65 * Math.pow(Math.sin(t * .52 + .7) * .5 + .5, 1.4);
      const pull = overscrollLift;
      const w1 = Math.sin(t * 1.1 - .4) * 1.4 * gust * weight;
      const w2 = Math.sin(t * 1.1 - 1.0) * 2.2 * gust * weight;
      const w3 = Math.sin(t * 1.1 - 1.6) * 3.2 * gust * weight;
      const w4 = (2.2 + (Math.sin(t * 1.15 - 2.1) * .5 + .5) * 5.2 * gust) * weight;
      const deltas = [0, w1 + pull * 2.5, -w1 * .7 + w2 + pull * 9.5,
        -w2 * .6 + w3 + pull * 24.0, w4 + pull * 46.0];
      panels.forEach((panel, index) => {
        const angle = base[index] + deltas[index];
        panel.style.transform = `rotateX(${angle.toFixed(3)}deg)`;
        panel.style.setProperty('--paper-hinge-angle', `${angle.toFixed(3)}deg`);
        const shade = index ? Math.min(.065, .14 * Math.sin(Math.abs(angle) * Math.PI / 180)) : 0;
        panel.style.setProperty('--paper-fold-light', (shade * .65).toFixed(4));
        if (shades[index]) shades[index].style.opacity = shade.toFixed(4);
      });
      applied = true;

      let cumulativeAngle = 0;
      let yRise = 0;
      for (let index = 1; index < panels.length; index++) {
        cumulativeAngle += base[index] + deltas[index];
        yRise += panelHeight * (1 - Math.cos(cumulativeAngle * Math.PI / 180));
      }
      const scale = parseFloat(root.style.getPropertyValue('--display-scale')) || 1;
      eggReveal = smooth(clamp((pull - .16) / .36));
      shelf.style.setProperty('--paper-scale', scale.toFixed(4));
      shelf.style.setProperty('--breeze-shadow-lift', clamp(w4 / 7.4 * .45 + pull * .75).toFixed(3));
      shelf.style.setProperty('--breeze-shadow-y', `${((10 - yRise * .84) * scale).toFixed(2)}px`);
      shelf.style.setProperty('--breeze-shadow-opacity', Math.max(weight * .75, clamp(pull * 1.6)).toFixed(3));
      shelf.style.setProperty('--egg-reveal', eggReveal.toFixed(3));
      egg.setAttribute('aria-hidden', String(eggReveal < .05));
      frame = requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', () => {
      if (Math.abs(window.scrollY - lastScrollY) > .8) {
        lastScrollY = window.scrollY;
        lastScrollMoveAt = performance.now();
      }
      syncMotion();
    }, { passive: true });
    window.addEventListener('wheel', event => {
      if (!event.isTrusted || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.3) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight * .8 : 1;
      // A single extreme event cannot skip the deadzone or replace native scrolling.
      const delta = Math.sign(event.deltaY) * Math.min(110, Math.abs(event.deltaY) * unit);
      pushOverscroll(delta, false);
    }, { passive: true });
    window.addEventListener('touchstart', event => {
      if (!event.isTrusted || event.touches.length !== 1) { touchY = null; touchStartedAtBottom = false; return; }
      touchY = event.touches[0].clientY;
      touchStartedAtBottom = atBottom();
    }, { passive: true });
    window.addEventListener('touchmove', event => {
      if (!event.isTrusted || touchY === null || event.touches.length !== 1) return;
      const y = event.touches[0].clientY;
      const delta = touchY - y;
      touchY = y;
      if (Math.abs(delta) > .5) pushOverscroll(Math.sign(delta) * Math.min(110, Math.abs(delta) * 1.4), true);
    }, { passive: true });
    const endTouch = () => { touchY = null; touchStartedAtBottom = false; };
    window.addEventListener('touchend', endTouch, { passive: true });
    window.addEventListener('touchcancel', endTouch, { passive: true });

    const state = new MutationObserver(syncMotion);
    state.observe(root, { attributes: true, attributeFilter: ['data-paper-visual-progress', 'data-paper-raw-progress', 'class'] });
    state.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-layout'] });
    document.querySelectorAll('dialog').forEach(dialog => state.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    const intersection = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
      syncMotion();
    });
    intersection.observe(shelf);
    document.addEventListener('visibilitychange', syncMotion);
    reduce.addEventListener('change', syncMotion);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', syncMotion);
    window.addEventListener('resize', syncMotion, { passive: true });
    window.ArchivePaperBreeze = {
      diagnostics: () => ({ active: applied, pending: Boolean(frame), visible, fullyOpen: fullyOpen(),
        armedAtBottom, accumulated: Math.round(overscrollAccum), lift: overscrollLift, eggReveal,
        deadzone: DEADZONE_PX, reducedMotion: reduce.matches })
    };
    syncMotion();
  }

  // Deferred scripts run in the interactive state, before app.js mounts the sheet.
  if (document.readyState === 'complete') bindPaperBreeze();
  else document.addEventListener('DOMContentLoaded', bindPaperBreeze, { once: true });
})();
