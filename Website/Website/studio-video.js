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
  if (selectedTool === 'metronome') return;
  if (selectedTool !== 'drums') {
    setStatus('Visual video export is currently available only in Drum Studio. Other instrument adapters are not implemented yet.');
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

  /**
   * Title / Info: logo on the left, Title 1 beside it, Title 2 under it,
   * and the metre, tempo, key and beat on the same row.
   */
  function drawInfoBand(ctx, { at, meta, settings, palette, scale }) {
    const pad = Math.round(32 * scale);
    const top = Math.round(14 * scale);
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

    const secondary = [`${settings.brand} · ${settings.model.toUpperCase()} · ${settings.notation.toUpperCase()}`];
    ctx.fillStyle = palette.muted;
    ctx.font = `600 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
    ctx.fillText(secondary.join(' · '), leftEdge, statsY + Math.round(20 * scale));

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

  function drawPerformance(ctx, at, hits, duration, settings, meta) {
    const { width, height } = settings.size;
    const palette = getPalette(settings.color);
    const scale = Math.max(0.72, Math.min(1.18, Math.min(width / 640, height / 360)));
    const left = Math.max(78, Math.round(width * 0.175));
    const right = width - Math.max(22, Math.round(width * 0.05));
    const trackWidth = Math.max(1, right - left);
    const lanePositions = LANES.map((lane) => ({ ...lane, y: Math.round(height * lane.y) }));

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * 0.72, height * 0.12, 4, width * 0.72, height * 0.12, Math.max(180, width * 0.4));
    glow.addColorStop(0, hexToRgba('#f20d3d', settings.color === 'white' ? 0.1 : 0.24));
    glow.addColorStop(1, hexToRgba('#f20d3d', 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height * 0.55);

    drawInfoBand(ctx, { at, meta, settings, palette, scale });

    const gridStart = Math.round(height * 0.3);
    const gridEnd = Math.round(height * 0.86);
    const gridStep = Math.max(1, Math.ceil(duration / (settings.notation === 'square' ? 4 : 8)));
    ctx.font = `${Math.max(9, Math.round(10 * scale))}px monospace`;
    for (let second = 0; second <= duration; second += gridStep) {
      const x = left + (second / duration) * trackWidth;
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(x, gridStart);
      ctx.lineTo(x, gridEnd);
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.fillText(`${second}s`, x + 3, gridStart - 9);
    }
    for (const lane of lanePositions) {
      ctx.fillStyle = palette.muted;
      ctx.font = `600 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
      ctx.fillText(lane.label, Math.round(32 * scale), lane.y + Math.round(4 * scale));
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
    ctx.moveTo(playheadX, gridStart);
    ctx.lineTo(playheadX, gridEnd);
    ctx.stroke();
    ctx.fillStyle = palette.muted;
    ctx.font = `${Math.max(10, Math.round(11 * scale))}px monospace`;
    ctx.fillText(`${at.toFixed(1)} / ${duration.toFixed(1)} sec`, Math.round(32 * scale), height - Math.round(20 * scale));
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
