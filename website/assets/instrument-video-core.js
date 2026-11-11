/* Shared MusicXML -> notation preview -> VideoEngine export for the remaining instruments. */
(function () {
  const config = window.INSTRUMENT_VIDEO_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const frame = $('videoFrame');
  const notationContainer = $('notationContainer');
  const uploadScore = $('upload-musicxml');
  const uploadAudio = $('upload-audio');
  const audio = $('audioPlayer');
  const playBtn = $('playBtn');
  const generateBtn = $('generateBtn');
  const cancelBtn = $('cancelBtn');
  const downloadBtn = $('downloadBtn');
  const progress = $('genProgress');
  const fill = $('genFill');
  const label = $('genLabel');
  const confirm = $('confirmMsg');
  const scoreStatus = $('scoreStatus');
  const notationImageHolder = { image: null, key: '' };
  const CAPTURE_FPS = 30;
  const HOLD_SECONDS = 1;
  let parsed = null;
  let rendered = null;
  let audioUrl = null;
  let downloadUrl = null;
  let recording = null;
  let cancelled = false;
  let notationImage = null;
  let notationImageKey = '';
  let gate;

  document.title = `MusicNote — ${config.name} Video Create`;
  $('pageTitle').textContent = `${config.name} Video Create`;
  $('videoTitle').textContent = `${config.name} Video`;
  $('activeCrumb').textContent = config.name;
  $('engineName').textContent = `${config.name} Performance Engine`;
  $('instrumentGlyph').textContent = config.glyph || '♪';

  function setMessage(text, ok = false) {
    confirm.textContent = text;
    confirm.dataset.ok = ok ? 'true' : 'false';
  }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }
  function currentAspect() {
    const active = document.querySelector('.ratio-pill.active');
    const value = active?.dataset.value || '16x9';
    return value;
  }
  function currentStyle() {
    return document.querySelector('input[name="style"]:checked')?.value || 'black';
  }
  function scoreStats() {
    const perf = rendered?.playback?.performance;
    const tempo = rendered?.playback?.tempoMap?.segments?.[0]?.microsecondsPerQuarter;
    const bpm = tempo > 0 ? Math.round(60000000 / tempo) : null;
    const first = parsed?.attributes?.[0];
    $('statBpm').textContent = bpm ? String(bpm) : '—';
    $('statTime').textContent = first ? `${first.timeNumerator}/${first.timeDenominator}` : '—';
    $('statDuration').textContent = audio.duration > 0 ? formatTime(audio.duration) : '—';
    $('tempoChip').textContent = bpm ? `${bpm} BPM` : 'Score ready';
  }
  function updateTransport() {
    const duration = audio.duration;
    $('timeDisplay').textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
    $('scrubFill').style.width = duration > 0 ? `${(audio.currentTime / duration) * 100}%` : '0%';
    playBtn.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
    $('playIcon').innerHTML = audio.paused ? '<path d="M8 5v14l11-7z"/>' : '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';
  }
  function updateReady() {
    const ready = Boolean(rendered && audio.src && audio.duration > 0);
    generateBtn.disabled = !ready || Boolean(recording);
    generateBtn.textContent = ready ? 'Generate Video' : 'Generate Video — upload MusicXML and audio';
    playBtn.disabled = !audio.src;
  }
  function cleanSvgForImage() {
    const svg = notationContainer.querySelector('svg');
    if (!svg) return null;
    const clone = svg.cloneNode(true);
    clone.querySelectorAll('.playback-cursor').forEach((node) => node.remove());
    clone.removeAttribute('style');
    return new XMLSerializer().serializeToString(clone);
  }
  async function loadBravura() {
    const response = await fetch('../../assets/fonts/Bravura.woff2?v=1.482');
    if (!response.ok) throw new Error(`Bravura font request failed (${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  async function refreshNotationImage() {
    const markup = cleanSvgForImage();
    if (!markup) { notationImage = null; notationImageKey = ''; return; }
    const key = `${markup.length}|${currentStyle()}`;
    if (key === notationImageKey && notationImage) return;
    const standalone = NotationEngine.exportSvg(markup, {
      omitXmlDeclaration: true,
      fonts: [{ family: 'Bravura', base64: await loadBravura(), format: 'woff2' }],
    });
    const url = URL.createObjectURL(new Blob([standalone], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      notationImage = image;
      notationImageKey = key;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function renderScore(xmlText, fileName) {
    try {
      parsed = NotationEngine.parseMusicXml(xmlText);
      rendered = NotationEngine.renderParsedMusicXml(parsed, { config: { layout: { fitSystemHeight: true } } });
      notationContainer.innerHTML = rendered.svg;
      const svg = notationContainer.querySelector('svg');
      svg?.removeAttribute('width');
      svg?.removeAttribute('height');
      scoreStatus.textContent = `${fileName} loaded`; 
      setMessage(`✓ ${fileName} — notation ready. Upload audio to enable video export.`, true);
      scoreStats();
      gate?.set('source', 'ok', `${fileName} parsed`);
      gate?.set('score', 'ok', 'notation SVG ready');
      updateReady();
    } catch (error) {
      parsed = null;
      rendered = null;
      notationContainer.textContent = 'Could not render this MusicXML file.';
      setMessage(`Could not parse “${fileName}”.`, false);
      gate?.set('source', 'failed', error.message);
      gate?.set('score', 'failed', error.message);
      updateReady();
    }
  }
  uploadScore.addEventListener('change', () => {
    const file = uploadScore.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (/\.mxl$/i.test(file.name)) {
          const result = NotationEngine.unzipMxl(new Uint8Array(reader.result), window.DOMParser);
          if (!result.xmlText) throw new Error(result.diagnostics?.[0]?.message || 'Could not unzip MXL.');
          renderScore(result.xmlText, file.name);
        } else renderScore(new TextDecoder().decode(new Uint8Array(reader.result)), file.name);
      } catch (error) {
        setMessage(`Could not read “${file.name}” as MusicXML/MXL.`, false);
        gate?.set('source', 'failed', error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });
  uploadAudio.addEventListener('change', () => {
    const file = uploadAudio.files?.[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(file);
    audio.src = audioUrl;
    audio.load();
    gate?.set('audio', 'checking', 'loading audio');
  });
  audio.addEventListener('loadedmetadata', () => {
    scoreStats();
    setMessage(`✓ Audio loaded — ${formatTime(audio.duration)}. MusicXML and audio are ready for preview/export.`, true);
    gate?.set('audio', 'ok', `${formatTime(audio.duration)} audio ready`);
    updateReady();
  });
  audio.addEventListener('error', () => {
    gate?.set('audio', 'failed', 'browser could not decode this audio file');
    setMessage('The audio file could not be decoded by this browser.', false);
    updateReady();
  });
  audio.addEventListener('timeupdate', updateTransport);
  audio.addEventListener('ended', updateTransport);
  playBtn.addEventListener('click', async () => {
    if (audio.paused) await audio.play(); else audio.pause();
    updateTransport();
  });
  $('scrubBar').addEventListener('click', (event) => {
    if (!(audio.duration > 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * audio.duration;
  });
  document.querySelectorAll('.ratio-pill').forEach((pill) => pill.addEventListener('click', () => {
    document.querySelectorAll('.ratio-pill').forEach((item) => item.classList.remove('active'));
    pill.classList.add('active');
    notationImageKey = '';
  }));
  document.querySelectorAll('input[name="style"]').forEach((input) => input.addEventListener('change', () => { notationImageKey = ''; }));
  function drawText(ctx, text, x, y, size, color, weight = 700) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Sora, sans-serif`;
    ctx.fillText(text, x, y);
  }
  function drawFrame(ctx, canvas) {
    const black = currentStyle() === 'black';
    ctx.fillStyle = black ? '#17110e' : '#faf7f3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ink = black ? '#ffffff' : '#1e1512';
    drawText(ctx, $('title1').value || `${config.name} Performance`, 42, 54, 28, ink, 800);
    drawText(ctx, $('title2').value || 'MusicNote', 42, 82, 16, black ? '#f5caca' : '#8a7c74', 600);
    ctx.fillStyle = '#c81e2c';
    ctx.fillRect(canvas.width - 178, 28, 136, 42);
    drawText(ctx, $('tempoChip').textContent, canvas.width - 164, 55, 14, '#ffffff', 800);
    const stageTop = 112;
    const stageHeight = canvas.height - 164;
    ctx.fillStyle = black ? '#261c18' : '#ffffff';
    ctx.fillRect(28, stageTop, canvas.width - 56, stageHeight);
    ctx.fillStyle = '#c81e2c';
    ctx.fillRect(28, stageTop, 9, stageHeight);
    drawText(ctx, config.name.toUpperCase(), 54, stageTop + 42, 18, black ? '#f5caca' : '#c81e2c', 800);
    drawText(ctx, $('instrumentGlyph').textContent, 58, stageTop + 118, 92, black ? '#f5caca' : '#c81e2c', 400);
    if (notationImage) {
      const maxW = canvas.width - 250;
      const maxH = stageHeight - 52;
      const ratio = Math.min(maxW / notationImage.naturalWidth, maxH / notationImage.naturalHeight);
      const w = notationImage.naturalWidth * ratio;
      const h = notationImage.naturalHeight * ratio;
      ctx.drawImage(notationImage, canvas.width - w - 52, stageTop + (stageHeight - h) / 2, w, h);
    }
    ctx.fillStyle = black ? '#f5caca' : '#8a7c74';
    ctx.font = '600 13px Manrope, sans-serif';
    ctx.fillText('Notation Engine', 42, canvas.height - 42);
    ctx.fillText(`${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`, canvas.width - 164, canvas.height - 42);
  }
  function setGenerating(on) {
    generateBtn.disabled = on;
    progress.hidden = !on;
    if (on) fill.style.width = '0%';
    document.body.classList.toggle('is-rendering', on);
  }
  function offerDownload(blob, extension) {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(blob);
    downloadBtn.hidden = false;
    downloadBtn.textContent = `Download Video (${(blob.size / 1048576).toFixed(1)} MB)`;
    downloadBtn.onclick = () => { const link = document.createElement('a'); link.href = downloadUrl; link.download = `${config.slug}-video.${extension}`; link.click(); };
  }
  async function generateVideo() {
    if (!rendered || !(audio.duration > 0)) return;
    audio.pause(); audio.currentTime = 0;
    cancelled = false;
    recording = { cancel: () => { cancelled = true; } };
    setGenerating(true);
    gate.start();
    gate.set('source', 'ok', 'MusicXML parsed');
    gate.set('audio', 'ok', 'source audio ready');
    try {
      label.textContent = 'Preparing notation…';
      await refreshNotationImage();
      if (!notationImage) throw new Error('Notation SVG could not be rasterised.');
      gate.set('score', 'ok', 'embedded Bravura notation image ready');
      const rect = frame.getBoundingClientRect();
      const shortSide = Math.max(1, Math.min(rect.width, rect.height));
      const scale = 1080 / shortSide;
      const even = (value) => Math.max(2, Math.round(value / 2) * 2);
      const width = even(rect.width * scale);
      const height = even(rect.height * scale);
      gate.set('scene', 'ok', `${width}×${height} frame ready`);
      const offline = new OfflineAudioContext(2, Math.max(1, Math.ceil(audio.duration * 48000)), 48000);
      const decoded = await offline.decodeAudioData(await uploadAudio.files[0].arrayBuffer());
      const source = offline.createBufferSource();
      source.buffer = decoded; source.connect(offline.destination); source.start(0);
      const takeAudio = await offline.startRendering();
      gate.set('audio', 'ok', 'audio mix rendered');
      gate.assertReady();
      const canvas = document.createElement('canvas');
      const segments = [
        { seconds: HOLD_SECONDS, draw: (ctx) => drawFrame(ctx, canvas) },
        { seconds: audio.duration, audio: takeAudio, draw: (ctx, at) => { audio.currentTime = Math.min(at, audio.duration); drawFrame(ctx, canvas); } },
      ];
      const result = await VideoEngine.render({
        width, height, fps: CAPTURE_FPS, segments,
        onProgress: (fraction, name) => { fill.style.width = `${Math.round(fraction * 100)}%`; label.textContent = `${name}… ${Math.round(fraction * 100)}%`; },
        shouldStop: () => cancelled,
      });
      if (!result) throw new Error('This browser cannot encode video.');
      offerDownload(result.blob, result.extension);
      setMessage(`Video ready — ${formatTime(audio.duration)} of ${config.name} notation exported.`, true);
    } catch (error) {
      gate.failPending(error);
      setMessage(`Video export stopped: ${error.message}`, false);
    } finally {
      recording = null;
      setGenerating(false);
      updateReady();
      audio.currentTime = 0;
      updateTransport();
    }
  }
  generateBtn.addEventListener('click', generateVideo);
  cancelBtn.addEventListener('click', () => recording?.cancel());
  gate = window.VideoAssetGate?.create({
    page: config.slug,
    groups: [
      { id: 'source', label: 'MusicXML source', required: true },
      { id: 'score', label: 'Notation SVG', required: true },
      { id: 'audio', label: 'Audio mix', required: true },
      { id: 'scene', label: 'Video frame', required: true },
    ],
    anchor: $('costLine'),
    reportName: `${config.slug}-asset-report.json`,
  });
  gate?.start();
  gate?.set('source', 'idle', 'upload a MusicXML/MXL file');
  gate?.set('score', 'idle', 'waiting for notation');
  gate?.set('audio', 'idle', 'upload an audio file');
  gate?.set('scene', 'idle', 'waiting for export');
  updateTransport();
  updateReady();
})();
