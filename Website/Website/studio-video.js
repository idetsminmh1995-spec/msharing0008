(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const engine = window.VideoEngine;
  const recordButton = document.querySelector('[data-studio-record]');
  const status = document.querySelector('[data-studio-status]');
  const pads = [...document.querySelectorAll('[data-drum-pad]')];
  const video = document.querySelector('[data-video-output]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const timeLabel = document.querySelector('[data-video-time]');
  const stage = document.querySelector('[data-video-stage]');
  const MAX_CAPTURE_SECONDS = 12;
  const WIDTH = 640;
  const HEIGHT = 360;
  const LANES = [
    { id: 'kick', label: 'KICK', y: 165, color: '#ff7b55' },
    { id: 'snare', label: 'SNARE', y: 225, color: '#ffcf5a' },
    { id: 'hihat', label: 'HI-HAT', y: 285, color: '#78a8ff' },
  ];

  let isRecording = false;
  let isRendering = false;
  let cancelRequested = false;
  let recordingStartedAt = 0;
  let capturedHits = [];
  let recordingTimer = 0;
  let objectUrl = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };
  const setButtonLabel = (label) => {
    if (recordButton) recordButton.lastChild.textContent = ` ${label}`;
  };

  if (!engine || !recordButton || !status || !stage || !video || !download) {
    setStatus('Video Engine is not available on this page.');
    if (recordButton) recordButton.disabled = true;
    return;
  }

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  if (selectedTool !== 'drums') {
    setStatus('Visual video export is currently available only in Drum Studio. Other instrument adapters are not implemented yet.');
    recordButton.disabled = true;
    pads.forEach((pad) => { pad.disabled = true; });
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

  function drawPerformance(ctx, at, hits, duration) {
    const canvas = ctx.canvas;
    ctx.fillStyle = '#080d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(canvas.width * 0.72, 45, 4, canvas.width * 0.72, 45, 250);
    glow.addColorStop(0, 'rgba(242, 13, 61, 0.20)');
    glow.addColorStop(1, 'rgba(242, 13, 61, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, 180);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 22px Inter, system-ui, sans-serif';
    ctx.fillText('DRUM PERFORMANCE', 32, 48);
    ctx.fillStyle = '#91a0b5';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText('VISUAL PREVIEW · NO AUDIO', 34, 70);

    const left = 112;
    const right = canvas.width - 30;
    const width = right - left;
    const gridStep = Math.max(1, Math.ceil(duration / 8));
    ctx.lineWidth = 1;
    for (let second = 0; second <= duration; second += gridStep) {
      const x = left + (second / duration) * width;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.beginPath();
      ctx.moveTo(x, 105);
      ctx.lineTo(x, 318);
      ctx.stroke();
      ctx.fillStyle = '#91a0b5';
      ctx.font = '10px monospace';
      ctx.fillText(`${second}s`, x + 3, 96);
    }

    for (const lane of LANES) {
      ctx.fillStyle = '#91a0b5';
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      ctx.fillText(lane.label, 32, lane.y + 4);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.beginPath();
      ctx.moveTo(left, lane.y);
      ctx.lineTo(right, lane.y);
      ctx.stroke();
    }

    for (const hit of hits) {
      const lane = LANES.find((candidate) => candidate.id === hit.type);
      if (!lane) continue;
      const x = left + (Math.min(hit.at, duration) / duration) * width;
      const active = Math.abs(at - hit.at) < 0.12;
      ctx.beginPath();
      ctx.fillStyle = lane.color;
      ctx.globalAlpha = active ? 1 : 0.78;
      ctx.arc(x, lane.y, active ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (active) {
        ctx.beginPath();
        ctx.strokeStyle = lane.color;
        ctx.globalAlpha = 0.4;
        ctx.arc(x, lane.y, 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    const playheadX = left + Math.min(1, at / duration) * width;
    ctx.strokeStyle = '#f20d3d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 105);
    ctx.lineTo(playheadX, 318);
    ctx.stroke();
    ctx.fillStyle = '#91a0b5';
    ctx.font = '11px monospace';
    ctx.fillText(`${at.toFixed(1)} / ${duration.toFixed(1)} sec`, 32, 340);
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
    recordingStartedAt = performance.now();
    pads.forEach((pad) => { pad.disabled = false; });
    setButtonLabel('Stop & render');
    recordButton.setAttribute('aria-label', 'Stop recording and render video');
    setStatus('Recording visual performance · tap the drum pads');
    recordingTimer = window.setTimeout(stopCapture, MAX_CAPTURE_SECONDS * 1000);
  }

  async function stopCapture() {
    if (!isRecording || isRendering) return;
    isRecording = false;
    window.clearTimeout(recordingTimer);
    if (capturedHits.length === 0) {
      setButtonLabel('Start recording');
      recordButton.setAttribute('aria-label', 'Start recording');
      setStatus('No drum hits were captured. Start again and tap one or more pads.');
      return;
    }

    const duration = Math.max(1, Math.min(MAX_CAPTURE_SECONDS, (performance.now() - recordingStartedAt) / 1000));
    const hits = capturedHits.map((item) => ({ ...item, at: Math.min(item.at, duration) }));
    cancelRequested = false;
    isRendering = true;
    recordButton.disabled = false;
    pads.forEach((pad) => { pad.disabled = true; });
    setButtonLabel('Cancel render');
    recordButton.setAttribute('aria-label', 'Cancel video render');
    if (placeholder) placeholder.hidden = true;
    setStatus('Rendering visual preview · 0%');

    try {
      const result = await engine.render({
        width: WIDTH,
        height: HEIGHT,
        fps: 30,
        segments: [{
          seconds: duration,
          draw: (ctx, at) => drawPerformance(ctx, at, hits, duration),
        }],
        onProgress: (progress, phase) => {
          if (!cancelRequested) setStatus(`${phase} · ${Math.round(progress * 100)}%`);
        },
        shouldStop: () => cancelRequested,
      });

      if (cancelRequested || result.cancelled) {
        setStatus('Video render cancelled. Start a new recording to try again.');
        return;
      }

      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(result.blob);
      video.src = objectUrl;
      video.hidden = false;
      video.load();
      download.href = objectUrl;
      download.download = `drum-visual-performance.${result.extension}`;
      download.hidden = false;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      stage.classList.remove('is-playing');
      updatePlaybackControls();
      const silentLabel = result.audioCodec ? `${result.audioCodec} audio` : 'silent visual preview';
      setStatus(`Rendered ${result.frames} frames · ${result.seconds.toFixed(1)} sec · ${result.container.toUpperCase()} · ${silentLabel}`);
    } catch (error) {
      setStatus(`Video render failed: ${error.message || error}`);
    } finally {
      isRendering = false;
      recordButton.disabled = false;
      setButtonLabel('Start recording');
      recordButton.setAttribute('aria-label', 'Start recording');
      pads.forEach((pad) => { pad.disabled = false; });
      cancelRequested = false;
    }
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
})();
