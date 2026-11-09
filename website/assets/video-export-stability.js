/* Shared export stability for instrument video pages. */
(function () {
  const DEFAULT_WIDTHS = Object.freeze({ '16x9': 960, '9x16': 540, '1x1': 720 });

  function aspectOf() {
    const pill = document.querySelector('.ratio-pill.active');
    const label = pill?.textContent?.trim() || '16:9';
    return label === '9:16' ? '9x16' : label === '1:1' ? '1x1' : '16x9';
  }

  function ensurePanel() {
    let panel = document.getElementById('assetGatePanel');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'assetGatePanel';
    panel.className = 'asset-gate-panel';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = '<div class="asset-gate-head"><strong>Asset Gate</strong><span data-gate-summary>Not checked</span></div><div data-gate-list></div><div class="asset-gate-actions"><button class="btn-ghost" type="button" data-copy-report>Copy report</button><button class="btn-ghost" type="button" data-download-report>Download report</button></div>';
    const target = document.querySelector('.generate-btn')?.closest('.card') || document.querySelector('.left');
    target?.append(panel);
    return panel;
  }

  function renderGate(panel, rows, ok) {
    const list = panel.querySelector('[data-gate-list]');
    const summary = panel.querySelector('[data-gate-summary]');
    list.innerHTML = rows.map((row) => `<div class="asset-gate-row"><span class="asset-gate-icon ${row.ok ? 'ok' : 'fail'}">${row.ok ? '✓' : '✗'}</span><span class="asset-gate-label">${row.label}</span><span class="asset-gate-reason">${row.ok ? 'ready' : row.reason}</span></div>`).join('');
    summary.textContent = ok ? 'Ready' : 'Blocked';
    panel.dataset.status = ok ? 'ok' : 'error';
  }

  async function checkAssets(page, frame, report) {
    const rows = [];
    const add = (label, ok, reason = '') => {
      const row = { label, ok, reason };
      rows.push(row);
      if (window.RenderReport) window.RenderReport.addAsset(report, { label, status: ok ? 'ok' : 'error', error: reason });
    };
    const audio = document.getElementById('upload-audio')?.files?.[0];
    if (!audio) add('audio upload', false, 'Upload an audio file first.');
    else {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        await context.decodeAudioData(await audio.arrayBuffer());
        await context.close();
        add('audio upload', true);
      } catch (error) { add('audio upload', false, `Audio decode failed: ${error.message}`); }
    }
    const frameImages = [...frame.querySelectorAll('img')].filter((img) => img.getAttribute('src'));
    for (const img of frameImages) {
      const label = img.alt || img.className || 'frame image';
      try {
        const src = img.currentSrc || img.src;
        if (window.AssetLoader && src && !src.startsWith('data:') && !src.startsWith('blob:')) await window.AssetLoader.loadImage(src, img, label);
        else if (window.AssetLoader) await window.AssetLoader.waitForImage(img, label);
        else if (!(img.complete && img.naturalWidth > 0)) throw new Error('image is not decoded');
        add(label, true);
      } catch (error) { add(label, false, error.message); }
    }
    try {
      await document.fonts?.ready;
      add('fonts', true);
    } catch (error) { add('fonts', false, error.message); }
    return { ok: rows.every((row) => row.ok), rows };
  }

  function pin(frame, aspect, widthMap, onInterrupt) {
    const original = frame.getBoundingClientRect();
    const width = widthMap[aspect] || DEFAULT_WIDTHS[aspect] || 960;
    const height = aspect === '9x16' ? width * 16 / 9 : aspect === '1x1' ? width : width * 9 / 16;
    const placeholder = document.createElement('div');
    Object.assign(placeholder.style, { width: `${original.width}px`, height: `${original.height}px`, flex: '0 0 auto' });
    placeholder.setAttribute('aria-hidden', 'true');
    frame.before(placeholder);
    const prior = frame.getAttribute('style');
    const hadClass = frame.classList.contains('is-exporting');
    let interrupted = null;
    const interrupt = () => { interrupted ||= 'Window resized during export; pinned frame was ' + width + 'px wide.'; onInterrupt?.(interrupted); };
    const visibility = () => { if (document.hidden) { interrupted ||= 'The page became hidden during export.'; onInterrupt?.(interrupted); } };
    window.addEventListener('resize', interrupt);
    document.addEventListener('visibilitychange', visibility);
    window.removeEventListener('resize', window.measurePreviewChrome);
    frame.classList.add('is-exporting');
    Object.assign(frame.style, { position: 'fixed', left: '-100000px', top: '0px', width: `${width}px`, height: `${height}px`, minWidth: `${width}px`, maxWidth: `${width}px`, margin: '0', transform: 'none' });
    const rect = frame.getBoundingClientRect();
    if (Math.abs(rect.width - width) > 1 || Math.abs(rect.height - height) > 1) {
      release();
      throw new Error(`Could not pin the export frame at ${width}×${height}px; browser reported ${Math.round(rect.width)}×${Math.round(rect.height)}px.`);
    }
    function release() {
      window.removeEventListener('resize', interrupt);
      document.removeEventListener('visibilitychange', visibility);
      if (prior === null) frame.removeAttribute('style'); else frame.setAttribute('style', prior);
      if (!hadClass) frame.classList.remove('is-exporting');
      placeholder.remove();
      window.measurePreviewChrome?.();
    }
    return { width, height, rect, get interrupted() { return interrupted; }, assert() { if (interrupted) throw new Error(interrupted); const now = frame.getBoundingClientRect(); if (Math.abs(now.width - rect.width) > 1 || Math.abs(now.height - rect.height) > 1) throw new Error(`Frame size changed during export: expected ${Math.round(rect.width)}×${Math.round(rect.height)}px but got ${Math.round(now.width)}×${Math.round(now.height)}px.`); }, release };
  }

  function create(options) {
    const { page, frame, render, widthMap = DEFAULT_WIDTHS } = options;
    const panel = ensurePanel();
    let active = null;
    let report = null;
    const api = {
      interrupted: () => !!active?.interrupted,
      assert: () => active?.assert(),
      async run() {
        const aspect = aspectOf();
        report = window.RenderReport ? window.RenderReport.create({ page, aspect, canvas: null, pinnedFrame: null, window: { width: innerWidth, height: innerHeight }, devicePixelRatio, userAgent: navigator.userAgent, assetStamp: 'video-export-stability-v1' }) : null;
        const gate = await checkAssets(page, frame, report);
        renderGate(panel, gate.rows, gate.ok);
        if (!gate.ok) {
          const error = new Error(`Asset gate blocked ${page}: ${gate.rows.filter((row) => !row.ok).map((row) => row.label + ' — ' + row.reason).join('; ')}`);
          if (window.RenderReport && report) window.RenderReport.finish(report, { status: 'error', reason: error.message });
          window.__lastRenderReport = report;
          window.setUploadConfirm?.(error.message, false);
          throw error;
        }
        document.body.classList.add('is-rendering');
        frame.classList.add('export-freeze');
        try {
          active = pin(frame, aspect, widthMap, () => {});
          report && (report.meta.pinnedFrame = { width: active.width, height: active.height });
          const result = await render();
          active.assert();
          if (window.RenderReport && report) window.RenderReport.finish(report, { status: 'ok' });
          window.__lastRenderReport = report;
          return result;
        } catch (error) {
          if (window.RenderReport && report) window.RenderReport.finish(report, { status: 'error', reason: error.message });
          window.__lastRenderReport = report;
          throw error;
        } finally {
          active?.release();
          active = null;
          frame.classList.remove('export-freeze');
          document.body.classList.remove('is-rendering');
          window.AssetLoader?.revokeAfterRender();
        }
      },
      report() { return report; },
    };
    panel.querySelector('[data-copy-report]')?.addEventListener('click', async () => { if (report) await navigator.clipboard?.writeText(window.RenderReport.stringify(report)); });
    panel.querySelector('[data-download-report]')?.addEventListener('click', () => { if (report) window.RenderReport.download(report, `${page}-render-report.json`); });
    return Object.freeze(api);
  }

  window.VideoExportStability = Object.freeze({ create, aspectOf });
})();
