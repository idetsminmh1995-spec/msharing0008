(() => {
  const page = document.querySelector('[data-notation-page]');
  if (!page) return;

  const engine = window.NotationEngine;
  const fileInput = page.querySelector('[data-file-input]');
  const chooseFileButton = page.querySelector('[data-choose-file]');
  const dropZone = page.querySelector('[data-drop-zone]');
  const fileName = page.querySelector('[data-file-name]');
  const controls = page.querySelector('[data-controls]');
  const stage = page.querySelector('[data-stage]');
  const score = page.querySelector('[data-score]');
  const status = page.querySelector('[data-status]');
  const diagnostics = page.querySelector('[data-diagnostics]');
  const layoutSelect = page.querySelector('[data-layout-select]');
  const playButton = page.querySelector('[data-play]');
  const volumeInput = page.querySelector('[data-volume]');
  const volumeValue = page.querySelector('[data-volume-value]');
  const pdfButton = page.querySelector('[data-download-pdf]');
  const zoomOutButton = page.querySelector('[data-zoom-out]');
  const zoomInButton = page.querySelector('[data-zoom-in]');
  const zoomValue = page.querySelector('[data-zoom-value]');

  let xmlText = '';
  let renderResult = null;
  let layoutMode = 'page';
  let soundReady = false;
  let soundEngine = null;
  let soundInitPromise = null;
  let playbackEndTimer = null;
  let isPlaying = false;
  let zoomPercent = 100;

  const announce = (message, visible = false) => {
    status.textContent = message;
    status.classList.toggle('is-visible', visible);
  };

  const updateZoom = () => {
    score.style.zoom = `${zoomPercent}%`;
    zoomValue.textContent = `${zoomPercent}%`;
    zoomOutButton.disabled = !renderResult || zoomPercent <= 50;
    zoomInButton.disabled = !renderResult || zoomPercent >= 200;
  };

  const dispatchSoundEvent = (name, detail = {}) => {
    document.dispatchEvent(new CustomEvent(`notationlab:${name}`, { detail }));
  };

  const ensureSoundEngine = async () => {
    if (soundEngine) return soundEngine;
    if (soundInitPromise) return soundInitPromise;
    const SoundFont = window.NotationSoundFont;
    if (!SoundFont?.R2SoundFontEngine) throw new Error('SoundFont engine bundle could not be loaded.');
    const configuredSoundFont = window.MSHARING_SOUNDFONT_CONFIG || {};
    soundInitPromise = SoundFont.R2SoundFontEngine.create({
      manifestUrl: 'soundfonts/manifest.json',
      processorUrl: 'assets/spessasynth_processor.min.js',
      assetBaseUrl: 'soundfonts',
      assetId: 'musescore-general-sf3',
      ...configuredSoundFont,
    }).then((engineInstance) => {
      soundEngine = engineInstance;
      soundReady = true;
      dispatchSoundEvent('sound-ready', { asset: engineInstance.asset });
      return engineInstance;
    }).catch((error) => {
      soundInitPromise = null;
      throw error;
    });
    return soundInitPromise;
  };

  const setPlaying = (playing) => {
    isPlaying = playing;
    playButton.textContent = playing ? 'Ⅱ' : '▶';
    playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playButton.setAttribute('aria-pressed', String(playing));
  };

  const schedulePlaybackEnd = (playback) => {
    if (playbackEndTimer !== null) window.clearTimeout(playbackEndTimer);
    const endSeconds = Math.max(0, ...playback.events.map((event) => engine.resolvePosition(playback, event.tick + event.durationTicks).seconds));
    playbackEndTimer = window.setTimeout(() => {
      setPlaying(false);
      dispatchSoundEvent('playback-ended', { playback });
    }, Math.max(0, endSeconds * 1000 + 80));
  };

  const renderScore = () => {
    if (!xmlText || !engine?.renderFromMusicXml) return;
    try {
      renderResult = engine.renderFromMusicXml(xmlText, { config: { layout: { mode: layoutMode } } });
      score.replaceChildren();
      const svgDocument = new DOMParser().parseFromString(renderResult.svg, 'image/svg+xml');
      const parserError = svgDocument.querySelector('parsererror');
      const svg = svgDocument.documentElement;
      if (parserError || svg?.localName !== 'svg') throw new Error('Notation Engine returned invalid SVG.');
      score.append(document.importNode(svg, true));
      stage.dataset.layout = layoutMode;
      stage.hidden = false;
      controls.hidden = false;
      pdfButton.disabled = false;
      playButton.disabled = false;
      updateZoom();
      setPlaying(false);

      const errors = (renderResult.diagnostics || []).filter((item) => item.severity === 'error');
      const warnings = (renderResult.diagnostics || []).filter((item) => item.severity !== 'error');
      diagnostics.replaceChildren();
      const relevant = [...errors, ...warnings];
      if (relevant.length) {
        diagnostics.hidden = false;
        relevant.forEach((item) => {
          const line = document.createElement('p');
          line.textContent = item.message || item.code || 'Notation diagnostic';
          diagnostics.append(line);
        });
      } else {
        diagnostics.hidden = true;
      }

      dispatchSoundEvent('score-loaded', {
        playback: renderResult.playback,
        filename: fileName.textContent,
        volume: Number(volumeInput.value) / 100,
      });
      announce(errors.length ? `Notation loaded with ${errors.length} issue${errors.length === 1 ? '' : 's'}.` : 'Notation loaded.', errors.length > 0);
    } catch (error) {
      renderResult = null;
      stage.hidden = true;
      controls.hidden = true;
      pdfButton.disabled = true;
      playButton.disabled = true;
      announce(error instanceof Error ? error.message : 'Could not render this MusicXML file.', true);
    }
  };

  const loadFile = async (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['musicxml', 'xml', 'mxl'].includes(extension)) {
      announce('Choose a .musicxml, .xml, or .mxl file.', true);
      return;
    }
    if (!engine) {
      announce('Notation Engine could not be loaded.', true);
      return;
    }

    fileName.textContent = file.name;
    announce('Loading notation…');
    try {
      if (extension === 'mxl') {
        const archive = new Uint8Array(await file.arrayBuffer());
        const extracted = engine.unzipMxl(archive, window.DOMParser);
        if (!extracted.xmlText) {
          const message = extracted.diagnostics?.map((item) => item.message).filter(Boolean).join(' ');
          throw new Error(message || 'Could not read the score inside this MXL file.');
        }
        xmlText = extracted.xmlText;
      } else {
        xmlText = await file.text();
      }
      layoutMode = layoutSelect.value || 'page';
      renderScore();
    } catch (error) {
      xmlText = '';
      renderResult = null;
      stage.hidden = true;
      controls.hidden = true;
      pdfButton.disabled = true;
      announce(error instanceof Error ? error.message : 'Could not open this file.', true);
    }
  };

  chooseFileButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => loadFile(fileInput.files?.[0]));

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragleave', (event) => {
    if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('is-dragging');
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    loadFile(event.dataTransfer?.files?.[0]);
  });

  layoutSelect.addEventListener('change', () => {
    layoutMode = layoutSelect.value;
    if (xmlText) renderScore();
  });

  zoomOutButton.addEventListener('click', () => {
    zoomPercent = Math.max(50, zoomPercent - 10);
    updateZoom();
  });
  zoomInButton.addEventListener('click', () => {
    zoomPercent = Math.min(200, zoomPercent + 10);
    updateZoom();
  });

  playButton.addEventListener('click', () => {
    if (!renderResult) return;
    if (!soundReady) {
      announce('Loading SoundFont…');
      void ensureSoundEngine().then((engineInstance) => {
        setPlaying(true);
        schedulePlaybackEnd(renderResult.playback);
        return engineInstance.play(renderResult.playback, Number(volumeInput.value) / 100);
      }).catch((error) => {
        setPlaying(false);
        announce(error instanceof Error ? error.message : 'Could not load the SoundFont.', true);
      });
      return;
    }
    const nextPlaying = !isPlaying;
    setPlaying(nextPlaying);
    if (nextPlaying) {
      schedulePlaybackEnd(renderResult.playback);
      void soundEngine?.play(renderResult.playback, Number(volumeInput.value) / 100);
    } else {
      if (playbackEndTimer !== null) window.clearTimeout(playbackEndTimer);
      soundEngine?.pause();
    }
    dispatchSoundEvent(nextPlaying ? 'play' : 'pause', { playback: renderResult.playback, volume: Number(volumeInput.value) / 100 });
  });

  volumeInput.addEventListener('input', () => {
    volumeValue.value = `${volumeInput.value}%`;
    soundEngine?.setVolume(Number(volumeInput.value) / 100);
    dispatchSoundEvent('volume', { volume: Number(volumeInput.value) / 100 });
  });

  pdfButton.addEventListener('click', async () => {
    if (!renderResult?.svg || !engine?.exportPdf) return;
    pdfButton.disabled = true;
    announce('Preparing PDF…');
    try {
      const pdf = await engine.exportPdf(renderResult.svg, { scale: 2 });
      const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
      const link = document.createElement('a');
      const baseName = (fileName.textContent || 'notation').replace(/\.[^.]+$/, '');
      link.href = url;
      link.download = `${baseName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      announce('PDF downloaded.');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Could not export this score as PDF.', true);
    } finally {
      pdfButton.disabled = false;
    }
  });

  document.addEventListener('notationlab:sound-ready', () => {
    soundReady = true;
    announce(renderResult ? 'SoundFont connected.' : 'SoundFont ready.');
  });
  document.addEventListener('notationlab:playback-state', (event) => {
    const playing = event.detail?.playing;
    if (typeof playing === 'boolean') setPlaying(playing);
  });
  document.addEventListener('notationlab:playback-ended', () => setPlaying(false));
  dispatchSoundEvent('ready', { apiVersion: 1 });
})();
