(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  if (selectedTool !== 'guitar') return;

  const engine = window.VideoEngine;
  const guitar = window.GuitarEngine;
  const controls = document.querySelector('[data-guitar-controls]');
  const photoSelect = document.querySelector('[data-guitar-photo]');
  const aspectSelect = document.querySelector('[data-guitar-aspect]');
  const pickingSelect = document.querySelector('[data-guitar-picking]');
  const handLegendInput = document.querySelector('[data-guitar-hand-legend]');
  const musicXmlInput = document.querySelector('[data-guitar-musicxml-input]');
  const musicXmlName = document.querySelector('[data-guitar-musicxml-name]');
  const summaryLabel = document.querySelector('[data-guitar-summary]');
  const recordButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const stage = document.querySelector('[data-video-stage]');
  const FPS = 30;
  // The pictures the Guitar Engine measured, and the names it knows them by.
  const PHOTO_FILES = {
    'acoustic-drawn': 'assets/guitar/acoustic-drawn.svg',
    'classical-drawn': 'assets/guitar/classical-drawn.svg',
    'electric-drawn': 'assets/guitar/electric-drawn.svg',
    'strat-drawn': 'assets/guitar/strat-drawn.svg',
  };
  // The parts this page draws, in the order the Guitar layout stacks them.
  const PARTS = ['instrument', 'notation', 'title'];

  let isRendering = false;
  let cancelRequested = false;
  let videoUrl = null;
  const imageCache = new Map();

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  if (controls) controls.hidden = false;
  document.querySelector('[data-studio-settings]')?.setAttribute('hidden', '');
  document.querySelector('.drum-pad-grid')?.setAttribute('hidden', '');
  document.querySelector('.tempo-row')?.setAttribute('hidden', '');
  const title = document.querySelector('[data-studio-title]');
  if (title) title.textContent = 'Guitar Studio';
  const pageTitle = document.querySelector('title');
  if (pageTitle) pageTitle.textContent = 'Guitar Studio — M Sharing';
  if (recordButton) {
    recordButton.textContent = 'Generate Guitar Video';
    recordButton.setAttribute('aria-label', 'Render guitar video');
  }

  if (!engine || !guitar || !controls || !photoSelect || !aspectSelect || !recordButton ||
      !status || !video || !stage || !download) {
    if (recordButton) recordButton.disabled = true;
    setStatus('Guitar Engine or Video Engine is not available on this page.');
    return;
  }

  for (const name of Object.keys(PHOTO_FILES)) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name.replace('-drawn', '').replace(/^./, (c) => c.toUpperCase());
    photoSelect.append(option);
  }

  const loadNotationEngine = () => engine.loadNotationEngine();

  /** A picture, decoded once. A shape pointing at a file that will not load draws nothing. */
  const loadImage = (href) => {
    if (imageCache.has(href)) return imageCache.get(href);
    const promise = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = href;
    });
    imageCache.set(href, promise);
    return promise;
  };

  function readSettings() {
    const photo = photoSelect.value;
    const aspect = aspectSelect.value;
    const picking = pickingSelect?.value === 'fingers' ? 'fingers' : 'pick';
    const handLegend = handLegendInput?.checked === true;
    if (!PHOTO_FILES[photo]) throw new RangeError('Choose a guitar picture.');
    const size = engine.sizeFor(aspect);
    return {
      photo,
      aspect,
      picking,
      handLegend,
      ...size,
      instrument: 'guitar',
      size,
      // The page has no Notation View control, so the sheet is the
      // landscape page the other video pages default to.
      notation: 'landscape',
      color: 'black',
    };
  }

  /**
   * The notes, straight out of the file's own tablature.
   *
   * A `<string>`/`<fret>` pair is a PLACE, and that is the whole point of
   * the picture -- so a note without one is dropped rather than given a
   * guessed position from its pitch. An invented fingering shown
   * confidently is worse than a neck with one fewer mark on it.
   */
  function readTabNotes(parsed, api, timeline) {
    const notes = [];
    for (const part of parsed.score.parts) {
      for (const measure of part.measures) {
        const offset = timeline.offsets.get(measure.number) ?? 0;
        for (const voice of measure.voices) {
          let cursor = 0;
          for (const event of voice.events) {
            const startTick = event.startTick ?? cursor;
            cursor = startTick + event.duration.ticks;
            const written = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
            for (const note of written) {
              if (!Number.isFinite(note.stringNumber) || !Number.isFinite(note.fret)) continue;
              notes.push({
                string: note.stringNumber,
                fret: note.fret,
                startSeconds: api.tickToSeconds(timeline.tempoMap, offset + startTick),
                endSeconds: api.tickToSeconds(timeline.tempoMap, offset + startTick + event.duration.ticks),
                ...(note.fingering !== undefined ? { finger: note.fingering } : {}),
              });
            }
          }
        }
      }
    }
    notes.sort((left, right) => left.startSeconds - right.startSeconds || left.string - right.string);
    return { notes, endSeconds: timeline.endSeconds };
  }

  /** The two hands' marks, from the notes the score gave a stroke for. */
  function readPicks(notes) {
    const picks = [];
    const grouped = new Map();
    for (const note of notes) {
      const key = note.startSeconds.toFixed(4);
      const list = grouped.get(key) ?? [];
      list.push(note);
      grouped.set(key, list);
    }
    for (const [, group] of grouped) {
      if (group.length < 2) continue;
      picks.push({ direction: 'down', strings: group.map((note) => note.string), age: 0 });
    }
    return picks;
  }

  /** The shape list for one frame, painted onto the canvas. */
  function paintShapes(ctx, shapes, images) {
    for (const shape of shapes) {
      const paint = shape.fill;
      ctx.save();
      if (shape.opacity !== undefined) ctx.globalAlpha = shape.opacity;
      if (shape.kind === 'image') {
        const image = images.get(shape.href);
        if (image) ctx.drawImage(image, shape.x, shape.y, shape.width, shape.height);
        ctx.restore();
        continue;
      }
      const gradient = typeof paint === 'string' ? null : paint;
      if (typeof paint === 'string' && paint !== 'none') {
        ctx.fillStyle = paint;
      } else if (gradient?.kind === 'linear') {
        const fill = ctx.createLinearGradient(gradient.x1, gradient.y1, gradient.x2, gradient.y2);
        for (const stop of gradient.stops) fill.addColorStop(stop.offset, stop.color);
        ctx.fillStyle = fill;
      } else if (gradient?.kind === 'radial') {
        const fill = ctx.createRadialGradient(gradient.cx, gradient.cy, 0, gradient.cx, gradient.cy, gradient.r);
        for (const stop of gradient.stops) fill.addColorStop(stop.offset, stop.color);
        ctx.fillStyle = fill;
      } else {
        ctx.fillStyle = 'none';
      }
      if (shape.stroke !== undefined) {
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth ?? 1;
      }
      if (shape.kind === 'rect') {
        if (shape.radius > 0) {
          ctx.beginPath();
          ctx.roundRect(shape.x, shape.y, shape.width, shape.height, shape.radius);
          if (typeof paint === 'string' && paint !== 'none') ctx.fill();
          if (shape.stroke !== undefined) ctx.stroke();
        } else {
          if (typeof paint === 'string' && paint !== 'none') ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
          if (shape.stroke !== undefined) ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
      } else if (shape.kind === 'circle') {
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, shape.width / 2, 0, Math.PI * 2);
        if (typeof paint === 'string' && paint !== 'none') ctx.fill();
        if (shape.stroke !== undefined) ctx.stroke();
      } else if (shape.kind === 'path' && shape.d) {
        const path = new Path2D(shape.d);
        if (typeof paint === 'string' && paint !== 'none') ctx.fill(path);
        if (shape.stroke !== undefined) ctx.stroke(path);
      } else if (shape.kind === 'text') {
        ctx.font = `${shape.fontWeight ?? 400} ${shape.fontSize ?? 12}px Inter, system-ui, sans-serif`;
        ctx.textAlign = shape.align ?? 'center';
        ctx.textBaseline = shape.baseline === 'middle' ? 'middle' : shape.baseline === 'top' ? 'top' : 'alphabetic';
        if (typeof paint === 'string' && paint !== 'none') ctx.fillText(shape.text ?? '', shape.x, shape.y);
      }
      ctx.restore();
    }
  }

  async function renderGuitar() {
    if (isRendering) {
      cancelRequested = true;
      recordButton.disabled = true;
      recordButton.textContent = 'Cancelling…';
      setStatus('Cancelling guitar video render…');
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
    recordButton.setAttribute('aria-label', 'Cancel guitar video render');
    controls.querySelectorAll('input, select').forEach((control) => { control.disabled = true; });
    if (placeholder) placeholder.hidden = true;
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }

    try {
      const file = musicXmlInput?.files?.[0];
      if (!file) throw new Error('Choose a MusicXML file with tablature (string and fret) first.');
      setStatus('Reading the tablature…');
      const api = await loadNotationEngine();
      const parsed = api.parseMusicXml(await engine.readScoreText(file));
      const timeline = engine.scoreTimeline(parsed, api);
      const { notes, endSeconds } = readTabNotes(parsed, api, timeline);
      if (notes.length === 0) {
        throw new Error('This score carries no tablature positions, so there is nothing to draw on the neck.');
      }

      const photo = guitar.photoNamed(settings.photo, PHOTO_FILES[settings.photo]);
      if (!photo) throw new Error(`No measurements for the guitar picture "${settings.photo}".`);
      const images = new Map();
      const picture = await loadImage(photo.href);
      if (!picture) throw new Error(`The guitar picture could not be loaded: ${photo.href}`);
      images.set(photo.href, picture);

      /**
       * The Instrument part: the neck the notes are played on. The
       * stage is asked for the box the Video Engine laid out, so the
       * picture is drawn at the size it is actually shown at.
       */
      const drawNeck = (ctx, rect, at) => {
        ctx.fillStyle = palette.background;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.save();
        ctx.translate(rect.x, rect.y);
        ctx.beginPath();
        ctx.rect(0, 0, rect.width, rect.height);
        ctx.clip();
        // The band is the box of what is DRAWN, so the stage's first drawn
        // pixel is lifted to the band's top edge instead of being centred.
        const fit = Math.min(1, rect.height / contentHeight);
        ctx.translate((rect.width - stageWidth * fit) / 2, -inkTop * fit);
        if (fit < 1) ctx.scale(fit, fit);
        const active = picks.find((pick) => Math.abs(pick.startSeconds - at) < 0.08);
        const shapes = guitar.stageShapes({
          width: stageWidth,
          height: stageHeight,
          seconds: at,
          notes,
          photo,
          picking: settings.picking,
          handLegend: settings.handLegend,
          fadeTo: palette.background,
          ...(active ? { pick: { ...active, age: Math.min(1, Math.abs(at - active.startSeconds) / 0.16) } } : {}),
        });
        paintShapes(ctx, shapes, images);
        ctx.restore();
      };

      // The Plan's length rule, with no cap of the page's own: the score's
      // own length, then the Thank You clip the engine owns.
      const lastEnd = Math.max(...notes.map((note) => note.endSeconds));
      const seconds = Math.max(1, endSeconds, lastEnd);
      const picks = readPicks(notes);
      if (summaryLabel) {
        const bars = Math.max(1, Math.round(seconds / 2));
        summaryLabel.textContent = `${notes.length} notes · ${bars} bar${bars === 1 ? '' : 's'} · ${seconds.toFixed(2)} sec`;
      }

      const palette = engine.paletteFor(settings.color);
      const meta = engine.scoreMeta(parsed);

      // The instrument band is pinned to the picture's own height, so the
      // photograph is never floating in a box it does not fill. The
      // notation and title bands divide what is left in the shares the
      // layout declares.
      const probe = engine.layoutFor('guitar', {
        width: settings.width,
        height: settings.height,
        parts: PARTS,
      });
      const stageWidth = Math.max(1, Math.round(settings.width - probe.pad * 2));
      const stageHeight = Math.max(1, Math.round(guitar.stageHeightFor(stageWidth, photo, {
        handLegend: settings.handLegend,
      })));
      // The stage hangs the picture by its strings, so the guitar reaches
      // past the stage's own box. The band holds what is DRAWN, or the
      // body is cut by the band it was given.
      const probeShapes = guitar.stageShapes({
        width: stageWidth,
        height: stageHeight,
        seconds: 0,
        notes,
        photo,
        picking: settings.picking,
        handLegend: settings.handLegend,
        fadeTo: palette.background,
      });
      const inkTop = Math.min(...probeShapes.map((shape) => shape.y ?? 0));
      const inkBottom = Math.max(...probeShapes.map((shape) => (shape.y ?? 0) + (shape.height ?? 0)));
      const contentHeight = Math.max(1, inkBottom - inkTop);
      const free = settings.height - probe.pad * 2;
      settings.shares = { instrument: Math.min(1, contentHeight / Math.max(1, free)) };

      setStatus('Laying out the notation…');
      const notation = await engine.prepareNotationFor(file, settings, PARTS);
      if (notation?.error) throw new Error(`The notation could not be prepared: ${notation.error}`);

      const segments = [{
          seconds,
          draw: (ctx, at) => {
            // The parts paint their own boxes; the gaps between them and
            // the frame's own edge belong to the page.
            ctx.fillStyle = palette.background;
            ctx.fillRect(0, 0, settings.width, settings.height);
            return engine.composeFrame(ctx, {
              instrument: 'guitar',
              width: settings.width,
              height: settings.height,
              shares: settings.shares,
              parts: {
                title: (target, rect) => engine.drawTitlePart(target, rect, at, meta, palette, {
                  brand: 'M Sharing',
                  model: 'guitar',
                  titleOne: parsed.score?.title || file.name,
                  titleTwo: `${notes.length} notes · ${settings.aspect}`,
                }),
                notation: (target, rect) => engine.drawNotationPart(target, rect, at, notation),
                instrument: (target, rect) => drawNeck(target, rect, at),
              },
            });
          },
        }];
      const ending = await engine.thankYouSegment(settings.width, settings.height, { instrument: 'guitar', color: settings.color });
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
        setStatus('Guitar video render cancelled. Change settings or try again.');
        return;
      }

      videoUrl = URL.createObjectURL(result.blob);
      video.src = videoUrl;
      video.hidden = false;
      video.load();
      download.href = videoUrl;
      download.download = `guitar-${settings.photo}-${settings.aspect}.${result.extension}`;
      download.hidden = false;
      if (placeholder) placeholder.hidden = true;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      // The Guitar Engine makes no sound of its own, so the file is silent
      // unless the Thank You clip brought its own.
      const sound = ending ? 'Thank You ending' : 'no Thank You clip';
      setStatus(`Rendered ${result.frames} frames · ${seconds.toFixed(2)} sec · ${result.container.toUpperCase()} · ${sound}`);
    } catch (error) {
      setStatus(`Guitar video render failed: ${error.message || error}`);
      if (placeholder) placeholder.hidden = false;
    } finally {
      isRendering = false;
      recordButton.disabled = false;
      recordButton.textContent = 'Generate Guitar Video';
      recordButton.setAttribute('aria-label', 'Render guitar video');
      controls.querySelectorAll('input, select').forEach((control) => { control.disabled = false; });
      cancelRequested = false;
    }
  }

  musicXmlInput?.addEventListener('change', () => {
    const file = musicXmlInput.files?.[0];
    if (musicXmlName) musicXmlName.textContent = file ? file.name : 'No file selected';
    if (file) setStatus(`MusicXML selected: ${file.name}.`);
  });

  recordButton.addEventListener('click', () => { void renderGuitar(); });
  setStatus('Choose a MusicXML file with tablature, then generate the video.');
  window.addEventListener('pagehide', () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, { once: true });
})();
