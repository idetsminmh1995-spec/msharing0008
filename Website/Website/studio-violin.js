(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  // The card is "Strings", and the Plan leaves open whether that means the
  // orchestral family or a fretted one. The only orchestral-string drawing
  // in the repo is the violin, so that is what this adapter draws; a viola
  // or cello would need its own drawing and its own measurements.
  if (selectedTool !== 'violin' && selectedTool !== 'strings') return;

  const engine = window.VideoEngine;
  const controls = document.querySelector('[data-violin-controls]');
  const aspectSelect = document.querySelector('[data-violin-aspect]');
  const musicXmlInput = document.querySelector('[data-violin-musicxml-input]');
  const musicXmlName = document.querySelector('[data-violin-musicxml-name]');
  const summaryLabel = document.querySelector('[data-violin-summary]');
  const recordButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const FPS = 30;
  // One drawing, and it is the same file in all three shapes. A violin is a
  // single tall object rather than a kit filed per crop, so there is no
  // per-shape picture to choose between.
  const DRAWING = 'assets/violin/violin.svg';
  const PARTS = ['notation', 'instrument', 'title'];

  let isRendering = false;
  let cancelRequested = false;
  let videoUrl = null;
  let drawing = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  if (controls) controls.hidden = false;
  document.querySelector('[data-studio-settings]')?.setAttribute('hidden', '');
  document.querySelector('.drum-pad-grid')?.setAttribute('hidden', '');
  document.querySelector('.tempo-row')?.setAttribute('hidden', '');
  const title = document.querySelector('[data-studio-title]');
  if (title) title.textContent = 'Violin Studio';
  const pageTitle = document.querySelector('title');
  if (pageTitle) pageTitle.textContent = 'Violin Studio — M Sharing';
  if (recordButton) {
    recordButton.textContent = 'Generate Violin Video';
    recordButton.setAttribute('aria-label', 'Render violin video');
  }

  if (!engine || !controls || !aspectSelect || !recordButton || !status || !video || !download) {
    if (recordButton) recordButton.disabled = true;
    setStatus('Video Engine is not available on this page.');
    return;
  }

  function readSettings() {
    const aspect = aspectSelect.value;
    const size = engine.sizeFor(aspect);
    return {
      aspect,
      ...size,
      instrument: 'violin',
      size,
      notation: 'page',
      color: 'black',
    };
  }

  /**
   * The drawing, decoded once.
   *
   * Nothing marks this instrument: there is no violin fingering engine, and
   * a violin has no frets for a mark to land on, so the picture is drawn as
   * it is. A file that will not load is an error rather than a silently
   * empty column, because an empty instrument column is the whole failure
   * the user would see.
   */
  const loadDrawing = () => {
    if (drawing) return drawing;
    drawing = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`The violin drawing could not be loaded: ${DRAWING}`));
      image.src = DRAWING;
    });
    return drawing;
  };

  async function renderViolin() {
    if (isRendering) {
      cancelRequested = true;
      recordButton.disabled = true;
      recordButton.textContent = 'Cancelling…';
      setStatus('Cancelling violin video render…');
      return;
    }

    let settings;
    try {
      settings = readSettings();
    } catch (error) {
      setStatus(error.message);
      return;
    }

    isRendering = true;
    cancelRequested = false;
    recordButton.disabled = false;
    recordButton.textContent = 'Cancel render';
    recordButton.setAttribute('aria-label', 'Cancel violin video render');
    controls.querySelectorAll('input, select').forEach((control) => { control.disabled = true; });
    if (placeholder) placeholder.hidden = true;
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }

    try {
      const file = musicXmlInput?.files?.[0];
      if (!file) throw new Error('Choose a MusicXML file first.');
      setStatus('Reading the part…');
      const api = await engine.loadNotationEngine();
      const parsed = api.parseMusicXml(await engine.readScoreText(file));

      const picture = await loadDrawing();
      const score = engine.scoreTimeline(parsed, api);
      const seconds = Math.max(1, score.endSeconds);
      const palette = engine.paletteFor(settings.color);
      const meta = engine.scoreMeta(parsed);

      if (summaryLabel) {
        const bars = Math.max(1, Math.round(seconds / 2));
        summaryLabel.textContent = `${bars} bar${bars === 1 ? '' : 's'} · ${seconds.toFixed(2)} sec · violin drawn, not fingered`;
      }

      /**
       * The violin stands in its column, fitted by height and never
       * stretched: the drawing keeps its own proportions, so the frame gets
       * a smaller violin rather than a wide one.
       */
      const drawViolin = (ctx, rect) => {
        ctx.fillStyle = palette.background;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        const ratio = picture.naturalWidth / picture.naturalHeight;
        if (!(ratio > 0)) return;
        const height = Math.min(rect.height, rect.width / ratio);
        const width = height * ratio;
        ctx.drawImage(
          picture,
          rect.x + (rect.width - width) / 2,
          rect.y + (rect.height - height) / 2,
          width,
          height,
        );
      };

      setStatus('Laying out the notation…');
      const notation = await engine.prepareNotationFor(file, settings, PARTS);
      if (notation?.error) throw new Error(`The notation could not be prepared: ${notation.error}`);

      const segments = [{
        seconds,
        draw: (ctx, at) => {
          ctx.fillStyle = palette.background;
          ctx.fillRect(0, 0, settings.width, settings.height);
          return engine.composeFrame(ctx, {
            instrument: 'violin',
            width: settings.width,
            height: settings.height,
            parts: {
              title: (target, rect) => engine.drawTitlePart(target, rect, at, meta, palette, {
                brand: 'M Sharing',
                model: 'violin',
                titleOne: parsed.score?.title || file.name,
                titleTwo: settings.aspect,
              }),
              notation: (target, rect) => engine.drawNotationPart(target, rect, at, notation),
              instrument: (target, rect) => drawViolin(target, rect),
            },
          });
        },
      }];
      const ending = await engine.thankYouSegment(settings.width, settings.height, { instrument: 'violin', color: settings.color });
      if (ending) segments.push(ending);

      const result = await engine.render({
        width: settings.width,
        height: settings.height,
        fps: FPS,
        segments,
        onProgress: (progress, phase) => {
          if (!cancelRequested) setStatus(`${phase} · ${Math.round(progress * 100)}%`);
        },
        shouldStop: () => cancelRequested,
      });

      if (cancelRequested || result.cancelled) {
        setStatus('Violin video render cancelled. Change settings or try again.');
        return;
      }

      videoUrl = URL.createObjectURL(result.blob);
      video.src = videoUrl;
      video.hidden = false;
      video.load();
      download.href = videoUrl;
      download.download = `violin-${settings.aspect}.${result.extension}`;
      download.hidden = false;
      if (placeholder) placeholder.hidden = true;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      const sound = ending ? 'Thank You ending' : 'no Thank You clip';
      setStatus(`Rendered ${result.frames} frames · ${seconds.toFixed(2)} sec · ${result.container.toUpperCase()} · ${sound}`);
    } catch (error) {
      setStatus(`Violin video render failed: ${error.message || error}`);
      if (placeholder) placeholder.hidden = false;
    } finally {
      isRendering = false;
      recordButton.disabled = false;
      recordButton.textContent = 'Generate Violin Video';
      recordButton.setAttribute('aria-label', 'Render violin video');
      controls.querySelectorAll('input, select').forEach((control) => { control.disabled = false; });
      cancelRequested = false;
    }
  }

  musicXmlInput?.addEventListener('change', () => {
    const file = musicXmlInput.files?.[0];
    if (musicXmlName) musicXmlName.textContent = file ? file.name : 'No file selected';
    if (file) setStatus(`MusicXML selected: ${file.name}.`);
  });

  recordButton.addEventListener('click', () => { void renderViolin(); });
  setStatus('Choose a MusicXML file, then generate the video.');
  window.addEventListener('pagehide', () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, { once: true });
})();
