(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const engine = window.VideoEngine;
  const recordButton = document.querySelector('[data-studio-record]');
  const generateButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const pads = [...document.querySelectorAll('[data-drum-pad]')];
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
  const titleOne = document.querySelector('[data-title-one]');
  const titleTwo = document.querySelector('[data-title-two]');
  const drumSelection = document.querySelector('[data-drum-selection]');
  const notationView = document.querySelector('[data-notation-view]');
  const soundModel = document.querySelector('[data-sound-model]');
  const countVoice = document.querySelector('[data-count-voice]');
  const videoColor = document.querySelector('[data-video-color]');
  const videoColorValue = document.querySelector('[data-video-color-value]');
  const videoRatio = document.querySelector('[data-video-ratio]');
  const MAX_CAPTURE_SECONDS = 12;
  const FPS = 30;
  const RATIO_SIZES = {
    '16:9': { width: 640, height: 360 },
    '1:1': { width: 512, height: 512 },
    '9:16': { width: 360, height: 640 },
  };
  const LANES = [
    { id: 'kick', label: 'KICK', y: 0.46, color: '#ff7b55' },
    { id: 'snare', label: 'SNARE', y: 0.64, color: '#ffcf5a' },
    { id: 'hihat', label: 'HI-HAT', y: 0.82, color: '#78a8ff' },
  ];

  let isRecording = false;
  let isRendering = false;
  let cancelRequested = false;
  let recordingStartedAt = 0;
  let capturedDuration = 0;
  let capturedHits = [];
  let recordingTimer = 0;
  let objectUrl = null;
  let logoImage = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const setButtonLabel = (label) => {
    if (recordButton) recordButton.lastChild.textContent = ` ${label}`;
  };

  const getSize = () => RATIO_SIZES[videoRatio?.value] || RATIO_SIZES['16:9'];

  const getSettings = () => ({
    musicXmlName: musicXmlInput?.files?.[0]?.name || '',
    logoImage,
    titleOne: titleOne?.value.trim() || 'DRUM PERFORMANCE',
    titleTwo: titleTwo?.value.trim() || 'VISUAL PREVIEW · NO AUDIO',
    drum: drumSelection?.value || 'full',
    notation: notationView?.value || 'roll',
    soundModel: soundModel?.value || 'visual',
    countVoice: countVoice?.value.trim() || '',
    color: videoColor?.value || '#f20d3d',
    ratio: videoRatio?.value || '16:9',
    size: getSize(),
  });

  const hexToRgba = (hex, alpha) => {
    const clean = String(hex).replace('#', '');
    const value = clean.length === 3 ? clean.split('').map((part) => part + part).join('') : clean;
    const red = Number.parseInt(value.slice(0, 2), 16) || 242;
    const green = Number.parseInt(value.slice(2, 4), 16) || 13;
    const blue = Number.parseInt(value.slice(4, 6), 16) || 61;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const syncPadAvailability = () => {
    const selected = drumSelection?.value || 'full';
    pads.forEach((pad) => {
      pad.disabled = isRendering || (selected !== 'full' && selected !== pad.dataset.drumPad);
      pad.classList.toggle('is-muted', selected !== 'full' && selected !== pad.dataset.drumPad);
    });
  };

  const syncSettingsPreview = () => {
    const settings = getSettings();
    if (videoColorValue) videoColorValue.value = settings.color.toUpperCase();
    if (formatLabel) formatLabel.textContent = `${settings.ratio} · ${settings.size.width}×${settings.size.height}`;
    syncPadAvailability();
  };

  if (!engine || !recordButton || !generateButton || !status || !stage || !video || !download) {
    setStatus('Video Engine or Studio controls are not available on this page.');
    if (recordButton) recordButton.disabled = true;
    if (generateButton) generateButton.disabled = true;
    return;
  }

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  if (selectedTool !== 'drums') {
    setStatus('Visual video export is currently available only in Drum Studio. Other instrument adapters are not implemented yet.');
    recordButton.disabled = true;
    generateButton.disabled = true;
    pads.forEach((pad) => { pad.disabled = true; });
    settingsForm?.querySelectorAll('input,select').forEach((control) => { control.disabled = true; });
    return;
  }

  function hit(pad) {
    const type = pad.dataset.drumPad;
    if (isRecording) {
      const at = Math.min(MAX_CAPTURE_SECONDS, (performance.now() - recordingStartedAt) / 1000);
      capturedHits.push({ type, at });
      setStatus(`Recording visual performance · ${capturedHits.length} hit${capturedHits.length === 1 ? '' : 's'}`);
    }
    pad.classList.add('is-hit');
    window.setTimeout(() => pad.classList.remove('is-hit'), 120);
  }

  pads.forEach((pad) => pad.addEventListener('click', () => hit(pad)));

  function drawPerformance(ctx, at, hits, duration, settings) {
    const { width, height } = settings.size;
    const canvas = ctx.canvas;
    const scale = Math.max(0.72, Math.min(1.18, Math.min(width / 640, height / 360)));
    const left = Math.max(78, Math.round(width * 0.175));
    const right = width - Math.max(22, Math.round(width * 0.05));
    const trackWidth = Math.max(1, right - left);
    const lanePositions = LANES.map((lane) => ({ ...lane, y: Math.round(height * lane.y) }));
    const titleSize = Math.round(22 * scale);

    ctx.fillStyle = '#080d16';
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * 0.72, height * 0.12, 4, width * 0.72, height * 0.12, Math.max(180, width * 0.4));
    glow.addColorStop(0, hexToRgba(settings.color, 0.24));
    glow.addColorStop(1, hexToRgba(settings.color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height * 0.55);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${titleSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(settings.titleOne, Math.round(32 * scale), Math.round(45 * scale));
    ctx.fillStyle = '#91a0b5';
    ctx.font = `${Math.round(11 * scale)}px Inter, system-ui, sans-serif`;
    ctx.fillText(settings.titleTwo, Math.round(34 * scale), Math.round(67 * scale));
    ctx.fillStyle = settings.color;
    ctx.font = `600 ${Math.round(10 * scale)}px Inter, system-ui, sans-serif`;
    ctx.fillText(`${settings.notation.toUpperCase()} · ${settings.ratio}`, Math.round(34 * scale), Math.round(87 * scale));
    if (settings.countVoice) {
      ctx.fillStyle = '#c5cedb';
      ctx.fillText(`COUNT: ${settings.countVoice}`, Math.round(34 * scale), Math.round(104 * scale));
    }

    if (settings.logoImage?.complete && settings.logoImage.naturalWidth > 0) {
      const logoHeight = Math.round(42 * scale);
      const logoWidth = Math.min(Math.round(100 * scale), Math.round(logoHeight * (settings.logoImage.naturalWidth / settings.logoImage.naturalHeight)));
      ctx.drawImage(settings.logoImage, width - logoWidth - Math.round(26 * scale), Math.round(24 * scale), logoWidth, logoHeight);
    }

    const gridStart = Math.round(height * 0.3);
    const gridEnd = Math.round(height * 0.86);
    if (settings.notation !== 'minimal') {
      const gridStep = Math.max(1, Math.ceil(duration / (settings.notation === 'standard' ? 4 : 8)));
      ctx.font = `${Math.max(9, Math.round(10 * scale))}px monospace`;
      for (let second = 0; second <= duration; second += gridStep) {
        const x = left + (second / duration) * trackWidth;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.beginPath();
        ctx.moveTo(x, gridStart);
        ctx.lineTo(x, gridEnd);
        ctx.stroke();
        ctx.fillStyle = '#91a0b5';
        ctx.fillText(`${second}s`, x + 3, gridStart - 9);
      }
    }

    for (const lane of lanePositions) {
      ctx.fillStyle = '#91a0b5';
      ctx.font = `600 ${Math.max(9, Math.round(10 * scale))}px Inter, system-ui, sans-serif`;
      ctx.fillText(lane.label, Math.round(32 * scale), lane.y + Math.round(4 * scale));
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.beginPath();
      ctx.moveTo(left, lane.y);
      ctx.lineTo(right, lane.y);
      ctx.stroke();
    }

    for (const hitEvent of hits) {
      const lane = lanePositions.find((candidate) => candidate.id === hitEvent.type);
      if (!lane) continue;
      const x = left + (Math.min(hitEvent.at, duration) / duration) * trackWidth;
      const active = Math.abs(at - hitEvent.at) < 0.12;
      ctx.beginPath();
      ctx.fillStyle = lane.color;
      ctx.globalAlpha = active ? 1 : 0.78;
      ctx.arc(x, lane.y, active ? Math.round(8 * scale) : Math.round(5 * scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (active) {
        ctx.beginPath();
        ctx.strokeStyle = lane.color;
        ctx.globalAlpha = 0.4;
        ctx.arc(x, lane.y, Math.round(15 * scale), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    const playheadX = left + Math.min(1, at / duration) * trackWidth;
    ctx.strokeStyle = settings.color;
    ctx.lineWidth = Math.max(1, Math.round(2 * scale));
    ctx.beginPath();
    ctx.moveTo(playheadX, gridStart);
    ctx.lineTo(playheadX, gridEnd);
    ctx.stroke();
    ctx.fillStyle = '#91a0b5';
    ctx.font = `${Math.max(10, Math.round(11 * scale))}px monospace`;
    ctx.fillText(`${at.toFixed(1)} / ${duration.toFixed(1)} sec`, Math.round(32 * scale), height - Math.round(20 * scale));
  }

  function updatePlaybackControls() {
    if (!video || !timeline || !timeLabel) return;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    timeline.max = String(duration || 1);
    timeline.value = String(Math.min(video.currentTime || 0, duration || 0));
    timeLabel.textContent = formatStudioTime(video.currentTime || 0);
  }

  function formatStudioTime(value) {
    const seconds = Math.max(0, Math.floor(value));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function startCapture() {
    isRecording = true;
    capturedHits = [];
    capturedDuration = 0;
    recordingStartedAt = performance.now();
    syncPadAvailability();
    setButtonLabel('Stop & render');
    recordButton.setAttribute('aria-label', 'Stop recording and render video');
    generateButton.disabled = true;
    setStatus('Recording visual performance · tap the selected drum pads');
    recordingTimer = window.setTimeout(stopCapture, MAX_CAPTURE_SECONDS * 1000);
  }

  async function renderCapturedVideo() {
    if (isRecording || isRendering) return;
    if (capturedHits.length === 0) {
      setStatus('No drum hits were captured. Start recording and tap one or more pads first.');
      return;
    }

    const settings = getSettings();
    const duration = Math.max(1, Math.min(MAX_CAPTURE_SECONDS, capturedDuration || 1));
    const hits = capturedHits.map((item) => ({ ...item, at: Math.min(item.at, duration) }));
    cancelRequested = false;
    isRendering = true;
    recordButton.disabled = false;
    generateButton.disabled = true;
    syncPadAvailability();
    setButtonLabel('Cancel render');
    recordButton.setAttribute('aria-label', 'Cancel video render');
    if (placeholder) placeholder.hidden = true;
    setStatus(`Rendering ${settings.ratio} visual preview · 0%`);

    try {
      const result = await engine.render({
        width: settings.size.width,
        height: settings.size.height,
        fps: FPS,
        segments: [{
          seconds: duration,
          draw: (ctx, at) => drawPerformance(ctx, at, hits, duration, settings),
        }],
        onProgress: (progress, phase) => {
          if (!cancelRequested) setStatus(`${phase} · ${Math.round(progress * 100)}%`);
        },
        shouldStop: () => cancelRequested,
      });

      if (cancelRequested || result.cancelled) {
        setStatus('Video render cancelled. Adjust the settings or generate again.');
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
      stage.classList.remove('is-playing');
      updatePlaybackControls();
      const soundLabel = settings.soundModel === 'visual' ? 'silent visual preview' : `${settings.soundModel} selected · audio adapter pending`;
      setStatus(`Rendered ${result.frames} frames · ${result.seconds.toFixed(1)} sec · ${result.container.toUpperCase()} · ${soundLabel}`);
    } catch (error) {
      setStatus(`Video render failed: ${error.message || error}`);
    } finally {
      isRendering = false;
      recordButton.disabled = false;
      generateButton.disabled = false;
      setButtonLabel('Start recording');
      recordButton.setAttribute('aria-label', 'Start recording');
      syncPadAvailability();
      cancelRequested = false;
    }
  }

  async function stopCapture() {
    if (!isRecording || isRendering) return;
    isRecording = false;
    window.clearTimeout(recordingTimer);
    capturedDuration = Math.max(1, Math.min(MAX_CAPTURE_SECONDS, (performance.now() - recordingStartedAt) / 1000));
    syncPadAvailability();
    if (capturedHits.length === 0) {
      setButtonLabel('Start recording');
      recordButton.setAttribute('aria-label', 'Start recording');
      generateButton.disabled = false;
      setStatus('No drum hits were captured. Start again and tap one or more pads.');
      return;
    }
    await renderCapturedVideo();
  }

  recordButton.addEventListener('click', () => {
    if (isRendering) {
      cancelRequested = true;
      recordButton.disabled = true;
      setButtonLabel('Cancelling…');
      setStatus('Cancelling video render…');
      return;
    }
    if (isRecording) {
      void stopCapture();
      return;
    }
    startCapture();
  });

  generateButton.addEventListener('click', () => {
    void renderCapturedVideo();
  });

  playButton?.addEventListener('click', async () => {
    if (video.paused) {
      await video.play();
      playButton.textContent = '❚❚';
      playButton.setAttribute('aria-label', 'Pause video');
      stage.classList.add('is-playing');
    } else {
      video.pause();
      playButton.textContent = '▶';
      playButton.setAttribute('aria-label', 'Play video');
      stage.classList.remove('is-playing');
    }
  });

  timeline?.addEventListener('input', () => {
    video.currentTime = Number(timeline.value) || 0;
    updatePlaybackControls();
  });

  fullscreenButton?.addEventListener('click', () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (stage.requestFullscreen) {
      void stage.requestFullscreen();
    }
  });

  settingsForm?.addEventListener('submit', (event) => event.preventDefault());
  [titleOne, titleTwo, countVoice, videoColor, videoRatio, drumSelection, notationView, soundModel].forEach((control) => {
    control?.addEventListener('input', syncSettingsPreview);
    control?.addEventListener('change', syncSettingsPreview);
  });

  musicXmlInput?.addEventListener('change', () => {
    const file = musicXmlInput.files?.[0];
    if (musicXmlName) musicXmlName.textContent = file ? file.name : 'No file selected';
    if (file) setStatus(`MusicXML selected: ${file.name}. Record the drum performance to generate a preview.`);
  });

  logoInput?.addEventListener('change', () => {
    const file = logoInput.files?.[0];
    if (logoName) logoName.textContent = file ? file.name : 'No logo selected';
    if (!file) {
      logoImage = null;
      return;
    }
    const object = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      logoImage = image;
      URL.revokeObjectURL(object);
      setStatus(`Logo selected: ${file.name}. It will be included in the next generated video.`);
    };
    image.onerror = () => {
      logoImage = null;
      URL.revokeObjectURL(object);
      setStatus('The selected logo could not be loaded. Please choose a PNG, JPG, WebP, or SVG image.');
    };
    image.src = object;
  });

  video.addEventListener('loadedmetadata', updatePlaybackControls);
  video.addEventListener('timeupdate', updatePlaybackControls);
  video.addEventListener('ended', () => {
    if (playButton) {
      playButton.textContent = '▶';
      playButton.setAttribute('aria-label', 'Play video');
    }
    stage.classList.remove('is-playing');
  });

  window.addEventListener('pagehide', () => {
    window.clearTimeout(recordingTimer);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, { once: true });

  syncSettingsPreview();
})();
