(() => {
  'use strict';

  function mountAboutSection() {
    const container = document.querySelector('#about');
    if (!container) return;

    container.innerHTML = `
      <h2 id="about-title" class="sr-only">Intro — 悬挂式 3D MP3 播放器展示</h2>
      <div class="about-stage-only">
        <div class="mp3-canvas-wrap" id="mp3-canvas-wrap">
          <canvas id="mp3-cluster-canvas" aria-label="三台悬挂式 3D MP3 播放器，可拖拽碰撞甩动并 360 度旋转查看"></canvas>
          <div class="mp3-fallback" aria-hidden="true">
            <span class="mp3-fallback-pill is-charcoal"></span>
            <span class="mp3-fallback-pill"></span>
            <span class="mp3-fallback-pill is-green"></span>
          </div>
        </div>

        <div class="mp3-controls-bar">
          <span class="mp3-cue-text">拖拽 3D 碰撞甩动 · 点击「个人介绍」方屏跳转折页 · 点击圆键播放</span>
          <div class="mp3-action-row" role="group" aria-label="MP3 互动控制">
            <button type="button" class="mp3-pill-btn" id="mp3-ctrl-knock">拨动碰撞</button>
            <button type="button" class="mp3-pill-btn" id="mp3-ctrl-flip" aria-pressed="false">翻转背面</button>
            <button type="button" class="mp3-pill-btn" id="mp3-ctrl-play" aria-pressed="true">暂停</button>
          </div>
        </div>
      </div>
    `;

    const wrap = container.querySelector('#mp3-canvas-wrap');
    const canvas = container.querySelector('#mp3-cluster-canvas');
    const ctrlPlay = container.querySelector('#mp3-ctrl-play');
    const ctrlFlip = container.querySelector('#mp3-ctrl-flip');
    const ctrlKnock = container.querySelector('#mp3-ctrl-knock');

    const cluster = window.Mp3ClusterRenderer?.create(canvas, null, {
      onPlayChange(playing) {
        ctrlPlay.textContent = playing ? '暂停' : '播放';
        ctrlPlay.setAttribute('aria-pressed', String(playing));
      },
      onOpenUnit(unitIndex, themeId) {
        if (unitIndex === 1 || themeId === 'cobalt') {
          window.SimoOpenPersonalPaper?.();
        }
      }
    });

    if (!cluster) wrap.classList.add('is-fallback');

    ctrlPlay.addEventListener('click', () => {
      if (!cluster) return;
      cluster.setPlaying(!cluster.isPlaying, true);
    });
    ctrlKnock.addEventListener('click', () => cluster?.pulseCollision(1.9));
    ctrlFlip.addEventListener('click', () => {
      if (!cluster) return;
      cluster.flipAll();
      ctrlFlip.setAttribute('aria-pressed', String(cluster.flippedBack));
      ctrlFlip.textContent = cluster.flippedBack ? '翻回正面' : '翻转背面';
    });

    let hasEnteredAbout = false;
    const onSectionChange = () => {
      if (!cluster) return;
      const inAbout = document.body.dataset.section === 'about';
      if (!inAbout) {
        hasEnteredAbout = false;
        cluster.stop();
        return;
      }
      const active = !document.hidden && !document.querySelector('dialog[open]');
      if (!active) {
        cluster.stop();
        return;
      }
      cluster.resize();
      if (!hasEnteredAbout) {
        hasEnteredAbout = true;
        cluster.entranceSwing();
      } else {
        cluster.start();
      }
    };

    if (window.ResizeObserver) {
      new ResizeObserver(() => cluster?.resize()).observe(wrap);
    }
    new MutationObserver(onSectionChange).observe(document.body, { attributes: true, attributeFilter: ['data-section'] });
    document.querySelectorAll('dialog').forEach((dlg) => {
      new MutationObserver(onSectionChange).observe(dlg, { attributes: true, attributeFilter: ['open'] });
    });
    window.addEventListener('focus', () => {
      if (document.body.dataset.section === 'about' && !document.hidden && !document.querySelector('dialog[open]')) {
        cluster?.start?.();
      }
    });
    document.addEventListener('visibilitychange', onSectionChange);
    window.Mp3AboutCluster = cluster;
    onSectionChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAboutSection, { once: true });
  } else {
    mountAboutSection();
  }
})();
