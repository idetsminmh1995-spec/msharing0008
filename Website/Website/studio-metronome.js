(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  if (selectedTool !== 'metronome') return;

  const engine = window.VideoEngine;
  const metronome = window.MetronomeDesigns;
  const controls = document.querySelector('[data-metronome-controls]');
  const designSelect = document.querySelector('[data-metronome-design]');
  const aspectSelect = document.querySelector('[data-metronome-aspect]');
  const bpmInput = document.querySelector('[data-metronome-bpm]');
  const barsInput = document.querySelector('[data-metronome-bars]');
  const numeratorInput = document.querySelector('[data-metronome-numerator]');
  const denominatorSelect = document.querySelector('[data-metronome-denominator]');
  const durationLabel = document.querySelector('[data-metronome-duration]');
  const recordButton = document.querySelector('[data-studio-generate]') || document.querySelector('[data-studio-record]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const imagePreview = document.querySelector('[data-metronome-preview]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const stage = document.querySelector('[data-video-stage]');
  const MAX_EXPORT_SECONDS = 12;
  const FPS = 30;
  const DIMENSIONS = {
    '16x9': { width: 1280, height: 720 },
    '9x16': { width: 720, height: 1280 },
    '1x1': { width: 720, height: 720 },
  };

  let isRendering = false;
  let cancelRequested = false;
  let videoUrl = null;
  let previewUrl = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  const setButtonLabel = (label) => {
    if (recordButton) recordButton.textContent = label;
  };

  if (controls) controls.hidden = false;
  document.querySelector('[data-studio-settings]')?.setAttribute('hidden', '');
  document.querySelector('.drum-pad-grid')?.setAttribute('hidden', '');
  document.querySelector('.tempo-row')?.setAttribute('hidden', '');
  const title = document.querySelector('[data-studio-title]');
  if (title) title.textContent = 'Metronome Studio';
  const pageTitle = document.querySelector('title');
  if (pageTitle) pageTitle.textContent = 'Metronome Studio — M Sharing';
  if (recordButton) {
    recordButton.textContent = 'Generate Metronome Video';
    recordButton.setAttribute('aria-label', 'Render metronome video');
  }

  if (!engine || !metronome || !controls || !designSelect || !aspectSelect || !bpmInput ||
      !barsInput || !numeratorInput || !denominatorSelect || !recordButton || !status ||
      !video || !stage || !download || !imagePreview) {
    if (recordButton) recordButton.disabled = true;
    if (status) setStatus('Metronome Engine or Video Engine is not available on this page.');
    return;
  }

  for (const design of metronome.listDesigns()) {
    const option = document.createElement('option');
    option.value = design.id;
    option.textContent = `${design.name} · ${design.look}`;
    designSelect.append(option);
  }

  function readSettings() {
    const bpm = Number(bpmInput.value);
    const bars = Number(barsInput.value);
    const numerator = Number(numeratorInput.value);
    const denominator = Number(denominatorSelect.value);
    const design = designSelect.value;
    const aspect = aspectSelect.value;
    if (!Number.isInteger(bpm) || bpm < 30 || bpm > 240) throw new RangeError('Tempo must be an integer from 30 to 240 BPM.');
    if (!Number.isInteger(bars) || bars < 1 || bars > 16) throw new RangeError('Bars must be an integer from 1 to 16.');
    if (!Number.isInteger(numerator) || numerator < 1 || numerator > 12) throw new RangeError('Beats per bar must be an integer from 1 to 12.');
    if (![2, 4, 8, 16].includes(denominator)) throw new RangeError('Choose a supported beat unit.');
    if (!DIMENSIONS[aspect]) throw new RangeError('Choose a supported video orientation.');
    const beatSeconds = (60 * 4) / (bpm * denominator);
    const totalBeats = bars * numerator;
    const seconds = beatSeconds * totalBeats;
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_EXPORT_SECONDS) {
      throw new RangeError(`Choose settings that keep the video at or below ${MAX_EXPORT_SECONDS} seconds.`);
    }
    return { bpm, bars, numerator, denominator, design, aspect, beatSeconds, totalBeats, seconds, ...DIMENSIONS[aspect] };
  }

  function frameAt(settings, atSeconds) {
    const safeTime = Math.min(Math.max(0, atSeconds), Math.max(0, settings.seconds - 1e-7));
    const beatPosition = safeTime / settings.beatSeconds;
    const completedBeats = Math.floor(beatPosition);
    return {
      beat: (completedBeats % settings.numerator) + 1,
      beatsPerBar: settings.numerator,
      phase: beatPosition - completedBeats,
      bar: Math.floor(completedBeats / settings.numerator) + 1,
      bpm: settings.bpm,
      timeSignature: { numerator: settings.numerator, denominator: settings.denominator },
    };
  }

  function settingsAsSvg(settings) {
    return metronome.renderMetronomeFrame({
      design: settings.design,
      aspect: settings.aspect,
      frame: frameAt(settings, 0),
      title: '',
      subtitle: '',
    });
  }

  async function drawSvgFrame(ctx, svg) {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function createClickTrack(settings) {
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) throw new Error('This browser cannot create the metronome click track. Try a current version of Chrome, Edge, Safari, or Firefox.');
    const sampleRate = 48000;
    const sampleCount = Math.ceil(settings.seconds * sampleRate);
    const context = new OfflineContext(1, sampleCount, sampleRate);
    for (let index = 0; index < settings.totalBeats; index += 1) {
      const at = index * settings.beatSeconds;
      if (at >= settings.seconds) break;
      const accented = index % settings.numerator === 0;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = accented ? 1320 : 880;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(accented ? 0.34 : 0.2, at + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.045);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.05);
    }
    return await context.startRendering();
  }

  function resetVideo() {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.hidden = true;
    download.hidden = true;
    if (playButton) playButton.disabled = true;
    if (timeline) timeline.disabled = true;
    stage.classList.remove('is-playing');
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = null;
  }

  function refreshPreview() {
    if (isRendering) return;
    resetVideo();
    try {
      const settings = readSettings();
      const svg = settingsAsSvg(settings);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      imagePreview.src = previewUrl;
      imagePreview.hidden = false;
      if (placeholder) placeholder.hidden = true;
      const bars = settings.bars === 1 ? 'bar' : 'bars';
      durationLabel.textContent = `${settings.bars} ${bars} · ${settings.seconds.toFixed(2)} sec · ${settings.aspect}`;
      recordButton.disabled = false;
      setStatus('Ready. Preview shows the opening beat; export includes the full animated count and synthesized click track.');
    } catch (error) {
      imagePreview.hidden = true;
      if (placeholder) placeholder.hidden = false;
      durationLabel.textContent = error.message;
      recordButton.disabled = true;
      setStatus(error.message);
    }
  }

  for (const control of [designSelect, aspectSelect, bpmInput, barsInput, numeratorInput, denominatorSelect]) {
    control.addEventListener('input', refreshPreview);
    control.addEventListener('change', refreshPreview);
  }

  async function renderMetronome() {
    if (isRendering) {
      cancelRequested = true;
      recordButton.disabled = true;
      setButtonLabel('Cancelling…');
      setStatus('Cancelling metronome video render…');
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
    setButtonLabel('Cancel render');
    recordButton.setAttribute('aria-label', 'Cancel metronome video render');
    controls.querySelectorAll('input, select').forEach((control) => { control.disabled = true; });
    imagePreview.hidden = true;
    if (placeholder) placeholder.hidden = true;
    resetVideo();
    setStatus('Preparing synthesized metronome click track…');

    try {
      const audio = await createClickTrack(settings);
      if (cancelRequested) {
        setStatus('Metronome render cancelled.');
        return;
      }
      const result = await engine.render({
        width: settings.width,
        height: settings.height,
        fps: FPS,
        segments: [{
          seconds: settings.seconds,
          audio,
          draw: async (ctx, at) => {
            const svg = metronome.renderMetronomeFrame({
              design: settings.design,
              aspect: settings.aspect,
              frame: frameAt(settings, at),
              title: '',
              subtitle: '',
            });
            await drawSvgFrame(ctx, svg);
          },
        }],
        onProgress: (progress, phase) => {
          if (!cancelRequested) setStatus(`${phase} · ${Math.round(progress * 100)}%`);
        },
        shouldStop: () => cancelRequested,
      });

      if (cancelRequested || result.cancelled) {
        setStatus('Metronome video render cancelled. Change settings or try again.');
        return;
      }

      if (videoUrl) URL.revokeObjectURL(videoUrl);
      videoUrl = URL.createObjectURL(result.blob);
      video.src = videoUrl;
      video.hidden = false;
      video.load();
      download.href = videoUrl;
      download.download = `metronome-${settings.design}-${settings.aspect}.${result.extension}`;
      download.hidden = false;
      if (placeholder) placeholder.hidden = true;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      const audioLabel = result.audioCodec ? `${result.audioCodec} click track` : 'audio track';
      setStatus(`Rendered ${result.frames} frames · ${result.seconds.toFixed(2)} sec · ${result.container.toUpperCase()} · ${audioLabel}`);
    } catch (error) {
      setStatus(`Metronome video render failed: ${error.message || error}`);
      imagePreview.hidden = false;
    } finally {
      isRendering = false;
      recordButton.disabled = false;
      setButtonLabel('Render metronome video');
      recordButton.setAttribute('aria-label', 'Render metronome video');
      controls.querySelectorAll('input, select').forEach((control) => { control.disabled = false; });
      cancelRequested = false;
    }
  }

  recordButton.addEventListener('click', () => { void renderMetronome(); });
  refreshPreview();
  window.addEventListener('pagehide', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, { once: true });
})();
