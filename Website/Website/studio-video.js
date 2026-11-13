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
  const videoColor = document.querySelector('[data-video-color]');
  const videoRatio = document.querySelector('[data-video-ratio]');
  const MAX_SECONDS = 12;
  const FPS = 30;
  const QUARTER_SECONDS = 0.5;
  const DEFAULT_LOGO = 'assets/logo/m-sharing-drum-logo.svg';
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

  const parseMusicXml = async (file) => {
    if (!file || file.name.toLowerCase().endsWith('.mxl')) return null;
    const source = await file.text();
    const document = new DOMParser().parseFromString(source, 'application/xml');
    if (document.querySelector('parsererror')) throw new Error('MusicXML file could not be parsed.');
    const measures = [...document.querySelectorAll('measure')];
    if (!measures.length) throw new Error('MusicXML does not contain any measures.');
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
    return hits.length ? hits : null;
  };

  const getHits = async () => {
    const file = musicXmlInput?.files?.[0];
    if (!file) return { hits: defaultPattern(), source: 'default drum pattern' };
    const parsed = await parseMusicXml(file);
    return parsed ? { hits: parsed, source: file.name } : { hits: defaultPattern(), source: `${file.name} · default pattern fallback` };
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

  function drawPerformance(ctx, at, hits, duration, settings) {
    const { width, height } = settings.size;
    const palette = getPalette(settings.color);
    const canvas = ctx.canvas;
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

    ctx.fillStyle = settings.titleOneColor;
    ctx.font = `700 ${Math.round(settings.titleOneSize * scale)}px Inter, system-ui, sans-serif`;
    ctx.fillText(settings.titleOne, Math.round(32 * scale), Math.round(45 * scale));
    ctx.fillStyle = settings.titleTwoColor;
    ctx.font = `${Math.round(settings.titleTwoSize * scale)}px Inter, system-ui, sans-serif`;
    ctx.fillText(settings.titleTwo, Math.round(34 * scale), Math.round(70 * scale));
    ctx.fillStyle = '#f20d3d';
    ctx.font = `600 ${Math.round(10 * scale)}px Inter, system-ui, sans-serif`;
    ctx.fillText(`${settings.brand} · ${settings.model.toUpperCase()} · ${settings.notation.toUpperCase()}`, Math.round(34 * scale), Math.round(90 * scale));
    if (settings.countEnabled) {
      ctx.fillStyle = palette.muted;
      ctx.fillText(`COUNT ${settings.countVoice === 'numeric' ? '1 2 3 4' : 'ONE TWO THREE FOUR'} · ${settings.countVolume}%`, Math.round(34 * scale), Math.round(107 * scale));
    }

    if (settings.logoImage?.complete && settings.logoImage.naturalWidth > 0) {
      const logoHeight = Math.round(42 * scale);
      const logoWidth = Math.min(Math.round(100 * scale), Math.round(logoHeight * (settings.logoImage.naturalWidth / settings.logoImage.naturalHeight)));
      ctx.drawImage(settings.logoImage, width - logoWidth - Math.round(26 * scale), Math.round(24 * scale), logoWidth, logoHeight);
    }

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
      const { hits, source } = await getHits();
      const duration = Math.max(1, Math.min(MAX_SECONDS, Math.max(...hits.map((hit) => hit.at), 3.5) + 0.5));
      setStatus(`Preparing ${source} · ${settings.ratio} · 0%`);
      const result = await engine.render({
        width: settings.size.width,
        height: settings.size.height,
        fps: FPS,
        segments: [{ seconds: duration, draw: (ctx, at) => drawPerformance(ctx, at, hits, duration, settings) }],
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
  [titleOne, titleOneColor, titleOneSize, titleTwo, titleTwoColor, titleTwoSize, drumBrand, drumModel, notationView, soundModel, soundVolume, countVoiceEnabled, countVoice, countVolume, videoColor, videoRatio].forEach((control) => {
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
