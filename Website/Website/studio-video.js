(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const engine = window.VideoEngine;
  const generateButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const fullscreenButton = document.querySelector('[data-video-fullscreen]');
  const timeLabel = document.querySelector('[data-video-time]');
  const stage = document.querySelector('[data-video-stage]');
  const formatLabel = document.querySelector('[data-video-format]');
  const settingsForm = document.querySelector('[data-studio-settings]');
  const musicXmlInput = document.querySelector('[data-musicxml-input]');
  const musicXmlName = document.querySelector('[data-musicxml-name]');
  const logoInput = document.querySelector('[data-logo-input]');
  const logoName = document.querySelector('[data-logo-name]');
  const logoPreview = document.querySelector('[data-logo-preview]');
  const titleOne = document.querySelector('[data-title-one]');
  const titleOneColor = document.querySelector('[data-title-one-color]');
  const titleOneSize = document.querySelector('[data-title-one-size]');
  const titleTwo = document.querySelector('[data-title-two]');
  const titleTwoColor = document.querySelector('[data-title-two-color]');
  const titleTwoSize = document.querySelector('[data-title-two-size]');
  const drumBrand = document.querySelector('[data-drum-brand]');
  const drumModel = document.querySelector('[data-drum-model]');
  const notationView = document.querySelector('[data-notation-view]');
  const soundModel = document.querySelector('[data-sound-model]');
  const soundVolume = document.querySelector('[data-sound-volume]');
  const soundVolumeValue = document.querySelector('[data-sound-volume-value]');
  const countVoiceEnabled = document.querySelector('[data-count-voice-enabled]');
  const countVoice = document.querySelector('[data-count-voice]');
  const countVolume = document.querySelector('[data-count-volume]');
  const countVolumeValue = document.querySelector('[data-count-volume-value]');
  const countDisplay = document.querySelector('[data-count-display]');
  const videoColor = document.querySelector('[data-video-color]');
  const videoRatio = document.querySelector('[data-video-ratio]');
  const MAX_SECONDS = 12;
  const FPS = 30;
  const QUARTER_SECONDS = 0.5;
  const DEFAULT_LOGO = 'assets/logo/m-sharing-drum-logo.svg';
  const DEFAULT_META = { beats: 4, beatType: 4, bpm: 120, key: '' };
  // The circle of fifths, written out: a key is what its `<fifths>` says it is,
  // and there is no formula here that beats a table somebody can read.
  const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const MINOR_KEYS = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
  const RATIO_SIZES = {
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
  };
  const LANES = [
    { id: 'kick', label: 'KICK', y: 0.46, color: '#ff7b55' },
    { id: 'snare', label: 'SNARE', y: 0.64, color: '#ffcf5a' },
    { id: 'hihat', label: 'HI-HAT', y: 0.82, color: '#78a8ff' },
  ];

  let isRendering = false;
  let cancelRequested = false;
  let objectUrl = null;
  let logoImage = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const getSize = () => RATIO_SIZES[videoRatio?.value] || RATIO_SIZES['16:9'];

  const getSettings = () => ({
    titleOne: titleOne?.value.trim() || 'DRUM PERFORMANCE',
    titleOneColor: titleOneColor?.value || '#f8fafc',
    titleOneSize: Number(titleOneSize?.value) || 22,
    titleTwo: titleTwo?.value.trim() || 'VISUAL PREVIEW',
    titleTwoColor: titleTwoColor?.value || '#91a0b5',
    titleTwoSize: Number(titleTwoSize?.value) || 11,
    brand: drumBrand?.value.trim() || 'M Sharing',
    model: drumModel?.value || 'custom',
    notation: notationView?.value || 'landscape',
    soundModel: soundModel?.value || 'visual',
    soundVolume: Number(soundVolume?.value) || 0,
    countEnabled: countVoiceEnabled?.value === 'on',
    countVoice: countVoice?.value || 'one-two',
    countVolume: Number(countVolume?.value) || 0,
    countDisplay: countDisplay?.value || 'beats',
    color: videoColor?.value || 'black',
    ratio: videoRatio?.value || '16:9',
    size: getSize(),
    logoImage,
    musicXmlName: musicXmlInput?.files?.[0]?.name || '',
  });

  const hexToRgba = (hex, alpha) => {
    const clean = String(hex).replace('#', '');
    const value = clean.length === 3 ? clean.split('').map((part) => part + part).join('') : clean;
    const red = Number.parseInt(value.slice(0, 2), 16) || 242;
    const green = Number.parseInt(value.slice(2, 4), 16) || 13;
    const blue = Number.parseInt(value.slice(4, 6), 16) || 61;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const getPalette = (color) => color === 'white'
    ? { background: '#f7f9fc', text: '#111827', muted: '#64748b', grid: 'rgba(15,23,42,.16)', line: 'rgba(15,23,42,.24)' }
    : { background: '#080d16', text: '#f8fafc', muted: '#91a0b5', grid: 'rgba(148,163,184,.16)', line: 'rgba(148,163,184,.22)' };

  const syncControlState = () => {
    const settings = getSettings();
    if (formatLabel) formatLabel.textContent = `${settings.ratio} · ${settings.size.width}×${settings.size.height}`;
    if (soundVolumeValue) soundVolumeValue.value = `${settings.soundVolume}%`;
    if (countVolumeValue) countVolumeValue.value = `${settings.countVolume}%`;
    const countOn = settings.countEnabled;
    if (countVoice) countVoice.disabled = !countOn;
    if (countVolume) countVolume.disabled = !countOn;
    if (logoPreview && !logoInput?.files?.[0]) logoPreview.src = DEFAULT_LOGO;
  };

  const defaultPattern = () => [
    { type: 'kick', at: 0 }, { type: 'hihat', at: 0 },
    { type: 'snare', at: 0.5 }, { type: 'hihat', at: 0.5 },
    { type: 'kick', at: 1 }, { type: 'hihat', at: 1 },
    { type: 'snare', at: 1.5 }, { type: 'hihat', at: 1.5 },
    { type: 'kick', at: 2 }, { type: 'hihat', at: 2 },
    { type: 'snare', at: 2.5 }, { type: 'hihat', at: 2.5 },
    { type: 'kick', at: 3 }, { type: 'hihat', at: 3 },
    { type: 'snare', at: 3.5 }, { type: 'hihat', at: 3.5 },
  ];

  const drumTypeFromNote = (note) => {
    const step = note.querySelector('unpitched display-step')?.textContent?.trim().toUpperCase();
    const octave = Number(note.querySelector('unpitched display-octave')?.textContent);
    if (step === 'C' || (step === 'B' && octave <= 3)) return 'kick';
    if (step === 'D' || step === 'E') return 'snare';
    return 'hihat';
  };

  const keyName = (fifths, mode) => {
    const table = String(mode).toLowerCase() === 'minor' ? MINOR_KEYS : MAJOR_KEYS;
    const index = Number(fifths) + 7;
    return table[index] ?? '';
  };

  /** Metre, tempo and key as the file states them; the first value wins. */
  const readMeta = (document) => {
    const meta = { ...DEFAULT_META };
    const attributes = document.querySelector('attributes');
    const beats = Number(attributes?.querySelector('time beats')?.textContent);
    const beatType = Number(attributes?.querySelector('time beat-type')?.textContent);
    if (Number.isFinite(beats) && beats > 0) meta.beats = beats;
    if (Number.isFinite(beatType) && beatType > 0) meta.beatType = beatType;
    const fifths = attributes?.querySelector('key fifths')?.textContent;
    if (fifths !== undefined && fifths !== null && fifths.trim() !== '') {
      meta.key = keyName(Number(fifths), attributes.querySelector('key mode')?.textContent);
    }
    const perMinute = Number(document.querySelector('sound[tempo]')?.getAttribute('tempo'));
    const metronome = Number(document.querySelector('metronome per-minute')?.textContent);
    const bpm = Number.isFinite(perMinute) && perMinute > 0 ? perMinute : metronome;
    if (Number.isFinite(bpm) && bpm > 0) meta.bpm = Math.round(bpm);
    return meta;
  };

  const parseMusicXml = async (file) => {
    if (!file || file.name.toLowerCase().endsWith('.mxl')) return null;
    const source = await file.text();
    const document = new DOMParser().parseFromString(source, 'application/xml');
    if (document.querySelector('parsererror')) throw new Error('MusicXML file could not be parsed.');
    const measures = [...document.querySelectorAll('measure')];
    if (!measures.length) throw new Error('MusicXML does not contain any measures.');
    const meta = readMeta(document);
    const hits = [];
    let absoluteQuarter = 0;
    let divisions = 1;
    for (const measure of measures) {
      const divisionNode = measure.querySelector('attributes divisions');
      if (divisionNode) divisions = Math.max(1, Number(divisionNode.textContent) || 1);
      let cursor = absoluteQuarter;
      for (const note of [...measure.children].filter((child) => child.tagName.toLowerCase() === 'note')) {
        const duration = Math.max(0, Number(note.querySelector(':scope > duration')?.textContent) || 0) / divisions;
        const isChord = Boolean(note.querySelector(':scope > chord'));
        if (!note.querySelector(':scope > rest')) hits.push({ type: drumTypeFromNote(note), at: cursor * QUARTER_SECONDS });
        if (!isChord) cursor += duration;
      }
      absoluteQuarter = Math.max(absoluteQuarter, cursor);
    }
    return hits.length ? { hits, meta } : null;
  };

  const getHits = async () => {
    const file = musicXmlInput?.files?.[0];
    if (!file) return { hits: defaultPattern(), meta: DEFAULT_META, source: 'default drum pattern' };
    const parsed = await parseMusicXml(file);
    return parsed
      ? { ...parsed, source: file.name }
      : { hits: defaultPattern(), meta: DEFAULT_META, source: `${file.name} · default pattern fallback` };
  };

  if (!engine || !generateButton || !status || !stage || !video || !download) {
    setStatus('Video Engine or Studio controls are not available on this page.');
    if (generateButton) generateButton.disabled = true;
    return;
  }

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  // Metronome and Guitar have adapters of their own; a tool with no adapter
  // must never fall through to the drum branch and render a drum video.
  if (selectedTool === 'metronome' || selectedTool === 'guitar') return;
  if (selectedTool !== 'drums') {
    setStatus('Visual video export is currently available in Drum, Metronome and Guitar Studio. Other instrument adapters are not implemented yet.');
    generateButton.disabled = true;
    settingsForm?.querySelectorAll('input,select').forEach((control) => { control.disabled = true; });
    return;
  }

  /**
   * A small metronome whose arm swings with the beat.
   *
   * The Plan asks for the beat to be visible in the Title / Info band
   * without adding a click: the arm is drawn from `at` and the tempo, so
   * the same second of the video always shows the same frame.
   */
  function drawMetronomeIcon(ctx, x, y, size, at, bpm, color) {
    const beatSeconds = 60 / Math.max(1, bpm);
    const position = at / beatSeconds;
    const phase = position - Math.floor(position);
    const swing = Math.sin(phase * Math.PI) * 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, size * 0.5);
    ctx.lineTo(-size * 0.18, -size * 0.5);
    ctx.lineTo(size * 0.18, -size * 0.5);
    ctx.lineTo(size * 0.34, size * 0.5);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, size * 0.12);
    ctx.lineTo(swing * size * 0.5, -size * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(swing * size * 0.5, -size * 0.62, Math.max(1, size * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // The notation engine is a 2 MB bundle that only a score needs, so it is
  // fetched when a MusicXML file is first rendered rather than on every
  // Studio visit. The version key must track notation-editor.html's own.
  const NOTATION_ENGINE_SRC = 'assets/notation-engine.js?v=de5f363a73f7';
  const BRAVURA_SRC = 'assets/fonts/Bravura.woff2?v=1.482';
  const NOTATION_PX_PER_SPACE = 20;
  // A cursor one staff tall plus its ledger room -- the engine's own
  // cursor is a glyph of about this size.
  const CURSOR_SPACES = 4.5;
  // Page shapes the Notation View control offers, in staff spaces (A4 is
  // 30 x 42, which is the engine's own default sheet).
  const PAGE_SHAPES = {
    landscape: [42, 30],
    portrait: [30, 42],
    square: [30, 30],
  };

  let notationEnginePromise = null;
  let bravuraBase64 = null;
  let notation = null;

  const loadNotationEngine = () => {
    if (window.NotationEngine) return Promise.resolve(window.NotationEngine);
    if (notationEnginePromise) return notationEnginePromise;
    notationEnginePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = NOTATION_ENGINE_SRC;
      script.onload = () => (window.NotationEngine
        ? resolve(window.NotationEngine)
        : reject(new Error('The notation engine loaded without its API.')));
      script.onerror = () => reject(new Error('The notation engine could not be loaded.'));
      document.head.appendChild(script);
    });
    return notationEnginePromise;
  };

  /** Bravura travels inside the SVG: an <img> has no access to page fonts. */
  const loadBravura = async () => {
    if (bravuraBase64) return bravuraBase64;
    const response = await fetch(BRAVURA_SRC);
    if (!response.ok) throw new Error('The Bravura music font could not be loaded.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    bravuraBase64 = btoa(binary);
    return bravuraBase64;
  };

  const decodeSvg = (markup) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The notation SVG could not be decoded.')); };
    image.src = url;
  });

  /**
   * The Notation part: one engine render per video, decoded once, then
   * drawn per frame. `page` lays the score on a sheet whose shape follows
   * the part's own rectangle; `scroll` (Horizontal) is one long system.
   */
  const prepareNotation = async (file, settings, rect) => {
    if (!file || file.name.toLowerCase().endsWith('.mxl')) return null;
    const api = await loadNotationEngine();
    const mode = settings.notation === 'horizontal' ? 'scroll' : 'page';
    const config = {
      layout: { mode, pxPerStaffSpace: NOTATION_PX_PER_SPACE },
      colors: { ink: '#101828', background: '#ffffff' },
    };
    if (mode === 'page') {
      // The chosen page shape, in staff spaces -- the same A4 proportions
      // the engine defaults to, turned or squared as the user asked.
      const [pageWidth, pageHeight] = PAGE_SHAPES[settings.notation] || PAGE_SHAPES.landscape;
      config.page = {
        pageWidth,
        pageHeight,
        marginTop: 1.6,
        marginBottom: 1.6,
        marginLeft: 1.4,
        marginRight: 1.4,
      };
    }
    const parsed = api.parseMusicXml(await file.text());
    const rendered = api.renderParsedMusicXml(parsed, { config });
    const document = api.exportSvg(rendered.svg, {
      title: settings.titleOne,
      fonts: [{ family: 'Bravura', base64: await loadBravura(), format: 'woff2' }],
    });
    const image = await decodeSvg(document);
    const [, , viewBoxWidth, viewBoxHeight] = (rendered.svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/) || [])
      .slice(1).map(Number);
    const viewBox = { width: viewBoxWidth, height: viewBoxHeight };
    const ink = measureInk(image);
    const systemYs = [...new Set(rendered.playback.measureNumbersInOrder
      .map((number) => rendered.playback.placementByMeasureNumber.get(number).systemY))]
      .sort((left, right) => left - right);
    return {
      api,
      mode,
      playback: rendered.playback,
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      systemYs,
      viewBox,
      ink,
      cursor: api.resolveConfig().cursor,
      seconds: rendered.playback.performance?.totalSeconds ?? 0,
    };
  };

  /**
   * The drawn extent of a rendered score, in image pixels. A page carries
   * margins and a scroll system carries room for lyrics, so fitting the
   * raw image would leave the staff a fraction of the part.
   */
  const measureInk = (image) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width;
    let top = canvas.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const offset = (y * canvas.width + x) * 4;
        const dark = data[offset] < 160 && data[offset + 1] < 160 && data[offset + 2] < 160;
        if (!dark || data[offset + 3] < 32) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    canvas.width = 0;
    canvas.height = 0;
    if (right < 0) return { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  };

  /**
   * The Notation part's rectangle for this frame, taken from the same
   * layout the engine will draw with -- so the sheet is prepared at the
   * shape it is actually shown in, without the page duplicating the shares.
   */
  const prepareNotationFor = async (file, settings) => {
    // The same three parts drawPerformance composes, so the sheet is
    // prepared at the shape it is actually shown in.
    const layout = engine.layoutFor(selectedTool, {
      width: settings.size.width,
      height: settings.size.height,
      parts: ['title', 'notation', 'instrument'],
    });
    const rect = layout.rects.notation;
    if (!rect) return null;
    try {
      return await prepareNotation(file, settings, rect);
    } catch (error) {
      setStatus(`Notation could not be prepared: ${error.message || error}`);
      return null;
    }
  };

  function drawNotationPart(ctx, rect, at, state) {
    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (!state) {
      ctx.fillStyle = '#8b95a7';
      ctx.font = `600 ${Math.max(10, Math.round(rect.height * 0.07))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Notation needs a MusicXML score', rect.width / 2, rect.height / 2);
      ctx.restore();
      return;
    }

    const { api, ink, viewBox } = state;
    const tick = api.secondsToTick(state.playback.tempoMap, at);
    // The SVG is one staff space per viewBox unit; the image is that times
    // its own scale, so both the ink box and the cursor can be placed in
    // the units the engine measured them in.
    const imageSpace = state.image.naturalWidth / viewBox.width;
    const inkHeight = ink.height / imageSpace;

    if (state.mode === 'scroll') {
      // Horizontal: the system slides left under a marker that stays put.
      const pxPerSpace = (rect.height * 0.9) / inkHeight;
      const placement = api.computeCursorPlacement(state.playback, tick, {
        mode: 'notationMoves',
        viewportWidth: rect.width / pxPerSpace,
      });
      const originX = placement.notationTranslateX * pxPerSpace;
      const originY = (rect.height - inkHeight * pxPerSpace) / 2 - (ink.y / imageSpace) * pxPerSpace;
      ctx.drawImage(state.image, originX, originY,
        state.image.naturalWidth * (pxPerSpace / imageSpace),
        state.image.naturalHeight * (pxPerSpace / imageSpace));
      drawCursor(ctx, state, placement.markerX * pxPerSpace,
        originY + placement.systemY * pxPerSpace, CURSOR_SPACES * pxPerSpace, pxPerSpace);
      ctx.restore();
      return;
    }

    // Page: the sheet is as wide as the part and slides bottom to top, one
    // system at a time -- the Plan's own wording for this view.
    const pxPerSpace = (rect.width * 0.98) / viewBox.width;
    const placement = api.computeCursorPlacement(state.playback, tick, { mode: 'cursorMoves' });
    const sheetHeight = state.image.naturalHeight * (pxPerSpace / imageSpace);
    const originX = (rect.width - viewBox.width * pxPerSpace) / 2;
    const systemTop = placement.systemY * pxPerSpace;
    const originY = sheetHeight <= rect.height
      ? (rect.height - sheetHeight) / 2
      : Math.min(0, Math.max(rect.height - sheetHeight, rect.height * 0.4 - systemTop));
    ctx.drawImage(state.image, originX, originY,
      state.image.naturalWidth * (pxPerSpace / imageSpace), sheetHeight);
    drawCursor(ctx, state, originX + placement.markerX * pxPerSpace,
      originY + systemTop, CURSOR_SPACES * pxPerSpace, pxPerSpace);
    ctx.restore();
  }

  /** The engine's cursor config, drawn as a bar rather than a re-decoded glyph. */
  const drawCursor = (ctx, state, x, top, height, pxPerSpace) => {
    ctx.save();
    ctx.globalAlpha = state.cursor.opacity ?? 0.85;
    ctx.fillStyle = state.cursor.color;
    ctx.fillRect(x - (state.cursor.thickness * pxPerSpace) / 2, top,
      Math.max(1.5, state.cursor.thickness * pxPerSpace), height);
    ctx.restore();
  };

  /**
   * Title / Info: logo on the left, Title 1 beside it, Title 2 under it,
   * and the metre, tempo, key and beat on the same row.
   */
  function drawTitlePart(ctx, rect, at, meta, settings, palette) {
    const scale = Math.max(0.5, Math.min(1.15, rect.height / 150));
    ctx.save();
    ctx.translate(rect.x, rect.y);
    drawInfoBand(ctx, { at, meta, settings, palette, scale });
    ctx.restore();
  }

  function drawInfoBand(ctx, { at, meta, settings, palette, scale }) {
    const pad = Math.round(24 * scale);
    const top = Math.round(10 * scale);
    const leftEdge = pad;
    const logoSize = Math.round(56 * scale);
    let textX = leftEdge;

    if (settings.logoImage?.complete && settings.logoImage.naturalWidth > 0) {
      const ratio = settings.logoImage.naturalWidth / settings.logoImage.naturalHeight;
      const logoWidth = Math.min(Math.round(logoSize * 1.9), Math.round(logoSize * ratio));
      ctx.drawImage(settings.logoImage, leftEdge, top + Math.round(4 * scale), logoWidth, logoSize);
      textX = leftEdge + logoWidth + Math.round(18 * scale);
    }

    ctx.fillStyle = settings.titleOneColor;
    ctx.font = `700 ${Math.round(settings.titleOneSize * scale)}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(settings.titleOne, textX, top + Math.round(28 * scale));
    ctx.fillStyle = settings.titleTwoColor;
    ctx.font = `${Math.round(settings.titleTwoSize * scale)}px Inter, system-ui, sans-serif`;
    ctx.fillText(settings.titleTwo, textX + Math.round(2 * scale), top + Math.round(52 * scale));

    const statsY = top + Math.round(78 * scale);
    const statSize = Math.max(10, Math.round(13 * scale));
    const gap = Math.round(26 * scale);
    const metronome = `${meta.beats}/${meta.beatType}`;
    const items = [metronome, `${meta.bpm} BPM`];
    if (meta.key) items.push(`Key ${meta.key}`);

    ctx.font = `600 ${statSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#f20d3d';
    let cursorX = leftEdge;
    for (const item of items) {
      ctx.fillText(item, cursorX, statsY);
      cursorX += ctx.measureText(item).width + gap;
    }

    drawMetronomeIcon(ctx, cursorX + Math.round(6 * scale), statsY - Math.round(statSize * 0.35), Math.round(statSize * 1.15), at, meta.bpm, palette.muted);

    ctx.fillStyle = palette.muted;
    ctx.font = `600 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
    ctx.fillText(`${settings.brand} · ${settings.model.toUpperCase()} · ${settings.notation.toUpperCase()}`, leftEdge, statsY + Math.round(20 * scale));

    if (settings.countEnabled) {
      drawCountRow(ctx, { at, meta, settings, palette, scale, pad: leftEdge, y: statsY + Math.round(40 * scale) });
    }
  }

  /**
   * The count as the video prints it: `1, 2, 3, 4` or its eighth/sixteenth
   * subdivision. The Plan keeps this display separate from the Count Voice
   * SOUND, so this only ever changes what is written on the frame.
   */
  const countTokens = (display, beats) => {
    const subdivisions = display === 'sixteenths' ? ['e', '&', 'a'] : display === 'eighths' ? ['&'] : [];
    const tokens = [];
    for (let beat = 1; beat <= beats; beat += 1) {
      tokens.push(String(beat));
      for (const subdivision of subdivisions) tokens.push(subdivision);
    }
    return tokens;
  };

  /** The token the frame is currently sitting on, or -1 when counting is off. */
  const currentCountToken = (tokens, display, meta, at) => {
    const perBeat = display === 'sixteenths' ? 4 : display === 'eighths' ? 2 : 1;
    const beatSeconds = (60 / Math.max(1, meta.bpm)) * (4 / Math.max(1, meta.beatType));
    const position = at / beatSeconds;
    const beatIndex = Math.floor(position) % Math.max(1, meta.beats);
    const within = position - Math.floor(position);
    return beatIndex * perBeat + Math.min(perBeat - 1, Math.floor(within * perBeat));
  };

  function drawCountRow(ctx, { at, meta, settings, palette, scale, pad, y }) {
    const tokens = countTokens(settings.countDisplay, meta.beats);
    const active = currentCountToken(tokens, settings.countDisplay, meta, at);
    const size = Math.max(9, Math.round(10 * scale));
    ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    let x = pad;
    const gap = Math.round(5 * scale);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      ctx.fillStyle = index === active ? '#f20d3d' : palette.muted;
      ctx.fillText(token, x, y);
      x += ctx.measureText(token).width + gap;
    }
  }

  /** The instrument part: the drum lanes the performance is read from. */
  function drawInstrumentPart(ctx, rect, at, hits, duration, settings, palette) {
    const scale = Math.max(0.6, Math.min(1.2, Math.min(rect.width / 640, rect.height / 360)));
    const labelWidth = Math.round(78 * scale);
    const left = rect.x + labelWidth;
    const right = rect.x + rect.width - Math.round(16 * scale);
    const trackWidth = Math.max(1, right - left);
    const lanePositions = LANES.map((lane, index) => ({
      ...lane,
      y: Math.round(rect.y + rect.height * (0.2 + index * 0.3)),
    }));

    const gridStep = Math.max(1, Math.ceil(duration / 8));
    ctx.font = `${Math.max(9, Math.round(10 * scale))}px monospace`;
    for (let second = 0; second <= duration; second += gridStep) {
      const x = left + (second / duration) * trackWidth;
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(x, rect.y + Math.round(6 * scale));
      ctx.lineTo(x, rect.y + rect.height - Math.round(6 * scale));
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.fillText(`${second}s`, x + 3, rect.y + Math.round(18 * scale));
    }
    for (const lane of lanePositions) {
      ctx.fillStyle = palette.muted;
      ctx.font = `600 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
      ctx.fillText(lane.label, rect.x + Math.round(10 * scale), lane.y + Math.round(4 * scale));
      ctx.strokeStyle = palette.line;
      ctx.beginPath();
      ctx.moveTo(left, lane.y);
      ctx.lineTo(right, lane.y);
      ctx.stroke();
    }
    for (const hit of hits) {
      const lane = lanePositions.find((candidate) => candidate.id === hit.type);
      if (!lane) continue;
      const x = left + (Math.min(hit.at, duration) / duration) * trackWidth;
      const active = Math.abs(at - hit.at) < 0.12;
      ctx.beginPath();
      ctx.fillStyle = lane.color;
      ctx.globalAlpha = active ? 1 : 0.78;
      ctx.arc(x, lane.y, active ? Math.round(8 * scale) : Math.round(5 * scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const playheadX = left + Math.min(1, at / duration) * trackWidth;
    ctx.strokeStyle = '#f20d3d';
    ctx.lineWidth = Math.max(1, Math.round(2 * scale));
    ctx.beginPath();
    ctx.moveTo(playheadX, rect.y + Math.round(6 * scale));
    ctx.lineTo(playheadX, rect.y + rect.height - Math.round(6 * scale));
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = palette.muted;
    ctx.font = `${Math.max(10, Math.round(11 * scale))}px monospace`;
    ctx.fillText(`${at.toFixed(1)} / ${duration.toFixed(1)} sec`, rect.x + Math.round(10 * scale), rect.y + rect.height - Math.round(10 * scale));
  }

  async function drawPerformance(ctx, at, hits, duration, settings, meta) {
    const { width, height } = settings.size;
    const palette = getPalette(settings.color);

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * 0.72, height * 0.12, 4, width * 0.72, height * 0.12, Math.max(180, width * 0.4));
    glow.addColorStop(0, hexToRgba('#f20d3d', settings.color === 'white' ? 0.1 : 0.24));
    glow.addColorStop(1, hexToRgba('#f20d3d', 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height * 0.55);

    await engine.composeFrame(ctx, {
      instrument: selectedTool,
      width,
      height,
      parts: {
        title: (target, rect) => drawTitlePart(target, rect, at, meta, settings, palette),
        notation: (target, rect) => drawNotationPart(target, rect, at, notation),
        instrument: (target, rect) => drawInstrumentPart(target, rect, at, hits, duration, settings, palette),
      },
    });
  }

  function updatePlaybackControls() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (timeline) {
      timeline.max = String(duration || 1);
      timeline.value = String(Math.min(video.currentTime || 0, duration || 0));
    }
    if (timeLabel) timeLabel.textContent = formatTime(video.currentTime || 0);
  }

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(value));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  async function generateVideo() {
    if (isRendering) {
      cancelRequested = true;
      setStatus('Cancelling video render…');
      return;
    }
    const settings = getSettings();
    isRendering = true;
    cancelRequested = false;
    generateButton.disabled = true;
    generateButton.textContent = 'Generating…';
    if (placeholder) placeholder.hidden = true;
    try {
      const { hits, meta, source } = await getHits();
      const duration = Math.max(1, Math.min(MAX_SECONDS, Math.max(...hits.map((hit) => hit.at), 3.5) + 0.5));
      setStatus(`Preparing ${source} · ${settings.ratio} · 0%`);
      notation = await prepareNotationFor(musicXmlInput?.files?.[0], settings);
      const result = await engine.render({
        width: settings.size.width,
        height: settings.size.height,
        fps: FPS,
        segments: [{ seconds: duration, draw: (ctx, at) => drawPerformance(ctx, at, hits, duration, settings, meta) }],
        onProgress: (progress, phase) => { if (!cancelRequested) setStatus(`${phase} · ${Math.round(progress * 100)}%`); },
        shouldStop: () => cancelRequested,
      });
      if (cancelRequested || result.cancelled) {
        setStatus('Video render cancelled. Adjust the settings and generate again.');
        return;
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(result.blob);
      video.src = objectUrl;
      video.hidden = false;
      video.load();
      download.href = objectUrl;
      download.download = `msharing-${settings.ratio.replace(':', 'x')}-drum.${result.extension}`;
      download.hidden = false;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      updatePlaybackControls();
      const audioNote = settings.soundModel === 'visual' ? 'silent visual video' : `${settings.soundModel} selected · audio adapter pending`;
      setStatus(`Rendered ${result.frames} frames · ${settings.ratio} · ${audioNote}`);
    } catch (error) {
      setStatus(`Video render failed: ${error.message || error}`);
    } finally {
      isRendering = false;
      generateButton.disabled = false;
      generateButton.textContent = 'Generate Video';
      cancelRequested = false;
    }
  }

  generateButton.addEventListener('click', () => { void generateVideo(); });
  playButton?.addEventListener('click', async () => {
    if (video.paused) {
      await video.play();
      playButton.textContent = '❚❚';
      stage.classList.add('is-playing');
    } else {
      video.pause();
      playButton.textContent = '▶';
      stage.classList.remove('is-playing');
    }
  });
  timeline?.addEventListener('input', () => { video.currentTime = Number(timeline.value) || 0; updatePlaybackControls(); });
  fullscreenButton?.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (stage.requestFullscreen) void stage.requestFullscreen();
  });
  settingsForm?.addEventListener('submit', (event) => event.preventDefault());
  [titleOne, titleOneColor, titleOneSize, titleTwo, titleTwoColor, titleTwoSize, drumBrand, drumModel, notationView, soundModel, soundVolume, countVoiceEnabled, countVoice, countVolume, countDisplay, videoColor, videoRatio].forEach((control) => {
    control?.addEventListener('input', syncControlState);
    control?.addEventListener('change', syncControlState);
  });
  musicXmlInput?.addEventListener('change', () => {
    const file = musicXmlInput.files?.[0];
    if (musicXmlName) musicXmlName.textContent = file ? file.name : 'No file selected';
    setStatus(file ? `MusicXML selected: ${file.name}. Ready to generate.` : 'Choose a MusicXML file or use the default drum pattern.');
  });
  logoInput?.addEventListener('change', () => {
    const file = logoInput.files?.[0];
    if (!file) {
      logoImage = new Image();
      logoImage.src = DEFAULT_LOGO;
      if (logoName) logoName.textContent = 'Default M Sharing Drum Logo';
      if (logoPreview) logoPreview.src = DEFAULT_LOGO;
      return;
    }
    const object = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      logoImage = image;
      if (logoPreview) logoPreview.src = object;
      if (logoName) logoName.textContent = file.name;
      setStatus(`Logo selected: ${file.name}. Ready to generate.`);
    };
    image.onerror = () => { URL.revokeObjectURL(object); setStatus('The selected logo could not be loaded.'); };
    image.src = object;
  });
  video.addEventListener('loadedmetadata', updatePlaybackControls);
  video.addEventListener('timeupdate', updatePlaybackControls);
  video.addEventListener('ended', () => { if (playButton) playButton.textContent = '▶'; stage.classList.remove('is-playing'); });
  window.addEventListener('pagehide', () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, { once: true });

  logoImage = new Image();
  logoImage.src = DEFAULT_LOGO;
  syncControlState();
})();
