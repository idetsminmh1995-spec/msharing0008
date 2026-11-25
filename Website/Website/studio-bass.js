(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  if (selectedTool !== 'bass') return;

  const engine = window.VideoEngine;
  const guitar = window.GuitarEngine;
  const controls = document.querySelector('[data-bass-controls]');
  const photoSelect = document.querySelector('[data-bass-photo]');
  const aspectSelect = document.querySelector('[data-bass-aspect]');
  const musicXmlInput = document.querySelector('[data-bass-musicxml-input]');
  const musicXmlName = document.querySelector('[data-bass-musicxml-name]');
  const summaryLabel = document.querySelector('[data-bass-summary]');
  const recordButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const FPS = 30;
  // The two basses the Guitar Engine measured. Both are FOUR-string
  // drawings, which is why this page offers no five-string choice.
  const PHOTO_FILES = {
    'jazz-drawn': 'assets/bass/jazz-drawn.svg',
    'precision-drawn': 'assets/bass/precision-drawn.svg',
  };
  const PARTS = ['instrument', 'notation', 'title'];
  /**
   * Standard four-string tuning, lowest string first, as MIDI numbers.
   * MusicXML numbers strings the other way round -- string 1 is the
   * highest -- so `openPitch()` does the flip in one place.
   */
  const TUNING = [28, 33, 38, 43];
  const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

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
  if (title) title.textContent = 'Bass Studio';
  const pageTitle = document.querySelector('title');
  if (pageTitle) pageTitle.textContent = 'Bass Studio — M Sharing';
  if (recordButton) {
    recordButton.textContent = 'Generate Bass Video';
    recordButton.setAttribute('aria-label', 'Render bass video');
  }

  if (!engine || !guitar || !controls || !photoSelect || !aspectSelect || !recordButton ||
      !status || !video || !download) {
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

  /** The open pitch of a MusicXML string number, or undefined off the neck. */
  const openPitch = (stringNumber) => TUNING[TUNING.length - stringNumber];

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
    if (!PHOTO_FILES[photo]) throw new RangeError('Choose a bass picture.');
    const size = engine.sizeFor(aspect);
    return {
      photo,
      aspect,
      ...size,
      instrument: 'bass',
      size,
      notation: 'landscape',
      color: 'black',
    };
  }

  /**
   * Where a pitch sits on a four-string neck.
   *
   * A pitch alone does not say which string played it, so this is the
   * one place the page decides something the file did not. The rule is
   * the lowest fret that reaches the note -- first position, where a
   * bass line lives -- and it is unique: the four strings are a fourth
   * apart, so no pitch is the same fret on two of them. A caller that
   * has the file's own tab never reaches here.
   */
  function positionOf(midi, frets) {
    let best;
    for (let stringNumber = 1; stringNumber <= TUNING.length; stringNumber += 1) {
      const fret = midi - openPitch(stringNumber);
      if (fret < 0 || fret > frets) continue;
      if (best === undefined || fret < best.fret) best = { string: stringNumber, fret };
    }
    return best;
  }

  /**
   * The notes the neck draws, in the score's own time.
   *
   * The file's tablature wins when it has one -- a `<string>`/`<fret>`
   * pair is a place somebody wrote down. Without it the pitch is placed
   * by `positionOf`, and `from` says so, because a position this page
   * worked out is not the same claim as one the file made.
   */
  function readBassNotes(parsed, api, score, frets) {
    const notes = [];
    let fromTab = 0;
    let fromPitch = 0;
    let dropped = 0;
    for (const part of parsed.score.parts) {
      for (const measure of part.measures) {
        const offset = score.offsets.get(measure.number) ?? 0;
        for (const voice of measure.voices) {
          let cursor = 0;
          for (const event of voice.events) {
            const startTick = event.startTick ?? cursor;
            cursor = startTick + event.duration.ticks;
            const written = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
            for (const note of written) {
              if (note.pitch?.kind !== 'pitched') continue;
              const midi = (note.pitch.octave + 1) * 12 + SEMITONES[note.pitch.step] + (note.pitch.alter ?? 0);
              if (!Number.isInteger(midi) || midi < 0 || midi > 127) continue;
              let place;
              let source;
              if (Number.isFinite(note.stringNumber) && Number.isFinite(note.fret)) {
                place = { string: note.stringNumber, fret: note.fret };
                source = 'tab';
              } else {
                place = positionOf(midi, frets);
                source = 'pitch';
              }
              if (place === undefined) { dropped += 1; continue; }
              if (source === 'tab') fromTab += 1; else fromPitch += 1;
              notes.push({
                string: place.string,
                fret: place.fret,
                midi,
                startSeconds: api.tickToSeconds(score.tempoMap, offset + startTick),
                endSeconds: api.tickToSeconds(score.tempoMap, offset + startTick + event.duration.ticks),
              });
            }
          }
        }
      }
    }
    notes.sort((left, right) => left.startSeconds - right.startSeconds || left.string - right.string);
    return { notes, fromTab, fromPitch, dropped };
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

  async function renderBass() {
    if (isRendering) {
      cancelRequested = true;
      recordButton.disabled = true;
      recordButton.textContent = 'Cancelling…';
      setStatus('Cancelling bass video render…');
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
    recordButton.setAttribute('aria-label', 'Cancel bass video render');
    controls.querySelectorAll('input, select').forEach((control) => { control.disabled = true; });
    if (placeholder) placeholder.hidden = true;
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }

    try {
      const file = musicXmlInput?.files?.[0];
      if (!file) throw new Error('Choose a MusicXML file first.');
      setStatus('Reading the part…');
      const api = await engine.loadNotationEngine();
      const parsed = api.parseMusicXml(await engine.readScoreText(file));

      const photo = guitar.photoNamed(settings.photo, PHOTO_FILES[settings.photo]);
      if (!photo) throw new Error(`No measurements for the bass picture "${settings.photo}".`);
      const frets = guitar.photoFretCount(photo);
      const images = new Map();
      const picture = await loadImage(photo.href);
      if (!picture) throw new Error(`The bass picture could not be loaded: ${photo.href}`);
      images.set(photo.href, picture);

      const score = engine.scoreTimeline(parsed, api);
      const { notes, fromTab, fromPitch, dropped } = readBassNotes(parsed, api, score, frets);
      if (notes.length === 0) {
        throw new Error(
          `No note in this score fits a ${TUNING.length}-string bass with ${frets} frets, so there is nothing to draw on the neck.`,
        );
      }

      const drawNeck = (ctx, rect, at) => {
        ctx.fillStyle = palette.background;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.save();
        ctx.translate(rect.x, rect.y);
        ctx.beginPath();
        ctx.rect(0, 0, rect.width, rect.height);
        ctx.clip();
        const fit = Math.min(1, rect.height / contentHeight);
        ctx.translate((rect.width - stageWidth * fit) / 2, -inkTop * fit);
        if (fit < 1) ctx.scale(fit, fit);
        const shapes = guitar.stageShapes({
          width: stageWidth,
          height: stageHeight,
          seconds: at,
          notes,
          photo,
          strings: TUNING.length,
          handLegend: false,
          fadeTo: palette.background,
        });
        paintShapes(ctx, shapes, images);
        ctx.restore();
      };

      const lastEnd = Math.max(...notes.map((note) => note.endSeconds));
      const seconds = Math.max(1, score.endSeconds, lastEnd);
      if (summaryLabel) {
        const bars = Math.max(1, Math.round(seconds / 2));
        const placed = fromTab > 0 && fromPitch > 0
          ? `${fromTab} from tab, ${fromPitch} by pitch`
          : fromTab > 0 ? 'from the file’s tablature' : 'placed by pitch';
        const missed = dropped > 0 ? ` · ${dropped} off the neck` : '';
        summaryLabel.textContent = `${notes.length} notes · ${bars} bar${bars === 1 ? '' : 's'} · ${seconds.toFixed(2)} sec · ${placed}${missed}`;
      }

      const palette = engine.paletteFor(settings.color);
      const meta = engine.scoreMeta(parsed);

      const probe = engine.layoutFor('bass', {
        width: settings.width,
        height: settings.height,
        parts: PARTS,
      });
      const stageWidth = Math.max(1, Math.round(settings.width - probe.pad * 2));
      const stageHeight = Math.max(1, Math.round(guitar.stageHeightFor(stageWidth, photo, {
        handLegend: false,
      })));
      const probeShapes = guitar.stageShapes({
        width: stageWidth,
        height: stageHeight,
        seconds: 0,
        notes,
        photo,
        strings: TUNING.length,
        handLegend: false,
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
          ctx.fillStyle = palette.background;
          ctx.fillRect(0, 0, settings.width, settings.height);
          return engine.composeFrame(ctx, {
            instrument: 'bass',
            width: settings.width,
            height: settings.height,
            shares: settings.shares,
            parts: {
              title: (target, rect) => engine.drawTitlePart(target, rect, at, meta, palette, {
                brand: 'M Sharing',
                model: 'bass',
                titleOne: parsed.score?.title || file.name,
                titleTwo: `${notes.length} notes · ${settings.aspect}`,
              }),
              notation: (target, rect) => engine.drawNotationPart(target, rect, at, notation),
              instrument: (target, rect) => drawNeck(target, rect, at),
            },
          });
        },
      }];
      const ending = await engine.thankYouSegment(settings.width, settings.height, { instrument: 'bass', color: settings.color });
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
        setStatus('Bass video render cancelled. Change settings or try again.');
        return;
      }

      videoUrl = URL.createObjectURL(result.blob);
      video.src = videoUrl;
      video.hidden = false;
      video.load();
      download.href = videoUrl;
      download.download = `bass-${settings.photo}-${settings.aspect}.${result.extension}`;
      download.hidden = false;
      if (placeholder) placeholder.hidden = true;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      // The Guitar Engine makes no sound of its own, so the file is silent
      // unless the Thank You clip brought its own.
      const sound = ending ? 'Thank You ending' : 'no Thank You clip';
      setStatus(`Rendered ${result.frames} frames · ${seconds.toFixed(2)} sec · ${result.container.toUpperCase()} · ${sound}`);
    } catch (error) {
      setStatus(`Bass video render failed: ${error.message || error}`);
      if (placeholder) placeholder.hidden = false;
    } finally {
      isRendering = false;
      recordButton.disabled = false;
      recordButton.textContent = 'Generate Bass Video';
      recordButton.setAttribute('aria-label', 'Render bass video');
      controls.querySelectorAll('input, select').forEach((control) => { control.disabled = false; });
      cancelRequested = false;
    }
  }

  musicXmlInput?.addEventListener('change', () => {
    const file = musicXmlInput.files?.[0];
    if (musicXmlName) musicXmlName.textContent = file ? file.name : 'No file selected';
    if (file) setStatus(`MusicXML selected: ${file.name}.`);
  });

  recordButton.addEventListener('click', () => { void renderBass(); });
  setStatus('Choose a MusicXML file, then generate the video.');
  window.addEventListener('pagehide', () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, { once: true });
})();
