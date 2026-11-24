(() => {
  const studio = document.querySelector('[data-studio-page]');
  if (!studio) return;

  const selectedTool = (new URLSearchParams(window.location.search).get('tool') || 'drums').toLowerCase();
  if (selectedTool !== 'voice') return;

  const engine = window.VideoEngine;
  const controls = document.querySelector('[data-voice-controls]');
  const audioInput = document.querySelector('[data-voice-audio-input]');
  const audioName = document.querySelector('[data-voice-audio-name]');
  const recordButton = document.querySelector('[data-voice-record]');
  const aspectSelect = document.querySelector('[data-voice-aspect]');
  const summaryLabel = document.querySelector('[data-voice-summary]');
  const generateButton = document.querySelector('[data-studio-generate]');
  const status = document.querySelector('[data-studio-status]');
  const video = document.querySelector('[data-video-output]');
  const placeholder = document.querySelector('[data-video-placeholder]');
  const download = document.querySelector('[data-video-download]');
  const timeline = document.querySelector('[data-video-timeline]');
  const playButton = document.querySelector('[data-video-play]');
  const FPS = 30;
  /**
   * The longest recording this page will turn into a video. A decoded
   * AudioBuffer is held whole, so the limit is about memory rather than
   * taste: an hour of stereo at 48 kHz is over a gigabyte before a single
   * frame is encoded.
   */
  const MAX_SECONDS = 300;
  const MAX_FILE_BYTES = 64 * 1024 * 1024;
  /** Peaks are read once, so the frame never depends on when it is drawn. */
  const PEAK_COLUMNS = 1024;

  let isRendering = false;
  let cancelRequested = false;
  let videoUrl = null;
  let recording = null;
  let recorder = null;
  let source = null;

  const setStatus = (message) => {
    if (status) status.textContent = message;
  };

  if (controls) controls.hidden = false;
  document.querySelector('[data-studio-settings]')?.setAttribute('hidden', '');
  document.querySelector('.drum-pad-grid')?.setAttribute('hidden', '');
  document.querySelector('.tempo-row')?.setAttribute('hidden', '');
  const title = document.querySelector('[data-studio-title]');
  if (title) title.textContent = 'Voice Studio';
  const pageTitle = document.querySelector('title');
  if (pageTitle) pageTitle.textContent = 'Voice Studio — M Sharing';
  if (generateButton) {
    generateButton.textContent = 'Generate Voice Video';
    generateButton.setAttribute('aria-label', 'Render voice video');
  }

  if (!engine || !controls || !aspectSelect || !generateButton || !status || !video || !download) {
    if (generateButton) generateButton.disabled = true;
    setStatus('Video Engine is not available on this page.');
    return;
  }

  function readSettings() {
    const aspect = aspectSelect.value;
    const size = engine.sizeFor(aspect);
    return { aspect, ...size, color: 'black' };
  }

  /**
   * Decodes a file or a recording into the one AudioBuffer the video needs.
   *
   * The callback form is still the only one some Safari builds answer, so
   * both are wired and whichever resolves first wins.
   */
  function decodeAudio(blob) {
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContext) {
      return Promise.reject(new Error('This browser cannot decode audio. Try a current version of Chrome, Edge, Safari, or Firefox.'));
    }
    const context = new OfflineContext(1, 1, 48000);
    return blob.arrayBuffer().then((data) => new Promise((resolve, reject) => {
      const failed = (error) => reject(new Error(`The recording could not be decoded${error?.message ? `: ${error.message}` : ''}.`));
      const settled = context.decodeAudioData(data, resolve, failed);
      if (settled && typeof settled.then === 'function') settled.then(resolve, failed);
    }));
  }

  /** The loudest sample in each of `columns` slices, across every channel. */
  function peaksOf(buffer, columns) {
    const channels = [];
    for (let index = 0; index < buffer.numberOfChannels; index += 1) {
      channels.push(buffer.getChannelData(index));
    }
    const length = buffer.length;
    const peaks = new Float32Array(columns);
    for (let column = 0; column < columns; column += 1) {
      const start = Math.floor((column * length) / columns);
      const end = Math.min(length, Math.floor(((column + 1) * length) / columns));
      let peak = 0;
      for (const samples of channels) {
        for (let sample = start; sample < end; sample += 1) {
          const value = Math.abs(samples[sample]);
          if (value > peak) peak = value;
        }
      }
      peaks[column] = peak;
    }
    return peaks;
  }

  function describe(buffer) {
    const seconds = buffer.duration;
    const channels = buffer.numberOfChannels === 1 ? 'mono' : `${buffer.numberOfChannels} channels`;
    return `${seconds.toFixed(2)} sec · ${Math.round(buffer.sampleRate / 1000)} kHz · ${channels} · audible`;
  }

  function acceptAudio(buffer, label) {
    if (!(buffer.duration > 0)) throw new Error('That recording is empty. Choose one with sound in it.');
    if (buffer.duration > MAX_SECONDS) {
      throw new Error(`That recording is ${buffer.duration.toFixed(1)} sec long. The longest this page will render is ${MAX_SECONDS} sec; trim it first.`);
    }
    source = { buffer, label };
    if (summaryLabel) summaryLabel.textContent = `${label} · ${describe(buffer)}`;
    generateButton.disabled = false;
  }

  async function useFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`That file is ${(file.size / 1048576).toFixed(1)} MB. The largest this page will read is ${MAX_FILE_BYTES / 1048576} MB.`);
    }
    setStatus(`Reading ${file.name}…`);
    acceptAudio(await decodeAudio(file), file.name);
    setStatus(`${file.name} is ready. Generate the video to hear it.`);
  }

  /**
   * Microphone capture. The permission prompt is the user's to answer, and a
   * refusal is reported as a refusal rather than as a broken page.
   */
  async function toggleRecording() {
    if (recording) {
      recorder?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('This browser cannot record from a microphone. Choose a recording instead.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      setStatus(error?.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow it in the browser, or choose a recording instead.'
        : `The microphone could not be opened${error?.message ? `: ${error.message}` : ''}. Choose a recording instead.`);
      return;
    }
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      recording = null;
      recorder = null;
      if (recordButton) {
        recordButton.textContent = 'Record from microphone';
        recordButton.setAttribute('aria-label', 'Record from the microphone');
      }
      const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
      try {
        acceptAudio(await decodeAudio(blob), 'Microphone recording');
        setStatus('Recording is ready. Generate the video to hear it.');
      } catch (error) {
        setStatus(error.message);
      }
    };
    recorder.start();
    recording = stream;
    if (recordButton) {
      recordButton.textContent = 'Stop recording';
      recordButton.setAttribute('aria-label', 'Stop recording');
    }
    setStatus('Recording from the microphone. Press the button again to stop.');
  }

  async function renderVoice() {
    if (isRendering) {
      cancelRequested = true;
      generateButton.disabled = true;
      generateButton.textContent = 'Cancelling…';
      setStatus('Cancelling voice video render…');
      return;
    }

    let settings;
    try {
      settings = readSettings();
    } catch (error) {
      setStatus(error.message);
      return;
    }
    if (!source) {
      setStatus('Choose a recording or record from the microphone first.');
      return;
    }

    isRendering = true;
    cancelRequested = false;
    generateButton.disabled = false;
    generateButton.textContent = 'Cancel render';
    generateButton.setAttribute('aria-label', 'Cancel voice video render');
    controls.querySelectorAll('input, select').forEach((control) => { control.disabled = true; });
    // Recording while encoding would put a stream behind the frames being read.
    if (recordButton) recordButton.disabled = true;
    if (placeholder) placeholder.hidden = true;
    if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null; }

    try {
      const { buffer, label } = source;
      const seconds = buffer.duration;
      const peaks = peaksOf(buffer, PEAK_COLUMNS);
      const palette = engine.paletteFor(settings.color);

      if (summaryLabel) summaryLabel.textContent = `${label} · ${describe(buffer)}`;

      /**
       * The waveform, with the played part in the accent colour. The
       * playhead comes from `at` alone, so a frame drawn twice is the same
       * frame -- the video's clock and the audio's are the same clock.
       */
      const drawWaveform = (ctx, rect, at) => {
        ctx.fillStyle = palette.background;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        const middle = rect.y + rect.height / 2;
        const half = rect.height / 2 - Math.max(8, rect.height * 0.08);
        ctx.strokeStyle = palette.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rect.x, middle);
        ctx.lineTo(rect.x + rect.width, middle);
        ctx.stroke();

        const barWidth = rect.width / peaks.length;
        const progress = seconds > 0 ? Math.min(1, Math.max(0, at / seconds)) : 0;
        for (let index = 0; index < peaks.length; index += 1) {
          const x = rect.x + index * barWidth;
          const height = Math.max(1, peaks[index] * half);
          ctx.fillStyle = index / peaks.length <= progress ? palette.accent : palette.muted;
          ctx.fillRect(x, middle - height, Math.max(1, barWidth - 0.5), height * 2);
        }

        const headX = rect.x + rect.width * progress;
        ctx.strokeStyle = palette.text;
        ctx.lineWidth = Math.max(1, Math.round(rect.width / 640));
        ctx.beginPath();
        ctx.moveTo(headX, rect.y);
        ctx.lineTo(headX, rect.y + rect.height);
        ctx.stroke();
      };

      const segments = [{
        seconds,
        // The decoded sound is the segment's sound: without it the export
        // would be a silent picture of a waveform.
        audio: buffer,
        draw: (ctx, at) => {
          ctx.fillStyle = palette.background;
          ctx.fillRect(0, 0, settings.width, settings.height);
          return engine.composeFrame(ctx, {
            instrument: 'voice',
            width: settings.width,
            height: settings.height,
            parts: {
              title: (target, rect) => engine.drawTitlePart(target, rect, at, {}, palette, {
                brand: 'M Sharing',
                model: 'voice',
                titleOne: label,
                titleTwo: settings.aspect,
              }),
              instrument: (target, rect) => drawWaveform(target, rect, at),
            },
          });
        },
      }];
      const ending = await engine.thankYouSegment(settings.width, settings.height);
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
        setStatus('Voice video render cancelled. Change settings or try again.');
        return;
      }

      videoUrl = URL.createObjectURL(result.blob);
      video.src = videoUrl;
      video.hidden = false;
      video.load();
      download.href = videoUrl;
      download.download = `voice-${settings.aspect}.${result.extension}`;
      download.hidden = false;
      if (placeholder) placeholder.hidden = true;
      if (playButton) playButton.disabled = false;
      if (timeline) timeline.disabled = false;
      const sound = ending ? 'Thank You ending' : 'no Thank You clip';
      setStatus(`Rendered ${result.frames} frames · ${seconds.toFixed(2)} sec · ${result.container.toUpperCase()} · audible · ${sound}`);
    } catch (error) {
      setStatus(`Voice video render failed: ${error.message || error}`);
      if (placeholder) placeholder.hidden = false;
    } finally {
      isRendering = false;
      generateButton.disabled = false;
      generateButton.textContent = 'Generate Voice Video';
      generateButton.setAttribute('aria-label', 'Render voice video');
      controls.querySelectorAll('input, select').forEach((control) => { control.disabled = false; });
      if (recordButton) recordButton.disabled = false;
      cancelRequested = false;
    }
  }

  audioInput?.addEventListener('change', async () => {
    const file = audioInput.files?.[0];
    if (audioName) audioName.textContent = file ? file.name : 'No file selected';
    if (!file) return;
    try {
      await useFile(file);
    } catch (error) {
      source = null;
      generateButton.disabled = true;
      if (summaryLabel) summaryLabel.textContent = '';
      setStatus(error.message);
    }
  });

  recordButton?.addEventListener('click', () => { void toggleRecording(); });
  generateButton.addEventListener('click', () => { void renderVoice(); });
  generateButton.disabled = true;
  setStatus('Choose a recording or record from the microphone, then generate the video.');
  window.addEventListener('pagehide', () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    recording?.getTracks().forEach((track) => track.stop());
  }, { once: true });
})();
