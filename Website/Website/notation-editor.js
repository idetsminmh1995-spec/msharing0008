(() => {
  const root = document.querySelector('[data-editor-toolbar]');
  if (!root) return;

  const engine = window.NotationEngine;
  const pick = (selector) => document.querySelector(selector);

  const fileInput = pick('[data-editor-file-input]');
  const openButtons = [...document.querySelectorAll('[data-editor-open]')];
  const newButtons = [...document.querySelectorAll('[data-editor-new]')];
  const saveButton = pick('[data-editor-save]');
  const undoButton = pick('[data-editor-undo]');
  const redoButton = pick('[data-editor-redo]');
  const playButton = pick('[data-editor-play]');
  const canvas = pick('[data-editor-canvas]');
  const scoreHost = pick('[data-editor-score]');
  const emptyState = pick('[data-editor-empty]');
  const statusMessage = pick('[data-editor-status]');
  const statusFile = pick('[data-editor-file]');
  const zoomOutput = pick('[data-editor-zoom]');
  const zoomIn = pick('[data-editor-zoom-in]');
  const zoomOut = pick('[data-editor-zoom-out]');
  const layoutSelect = pick('[data-editor-layout]');
  const clefSelect = pick('[data-editor-clef]');
  const keySelect = pick('[data-editor-key]');
  const timeSelect = pick('[data-editor-time]');
  const tempoOutput = pick('[data-editor-tempo]');
  const exportPdf = pick('[data-editor-export-pdf]');
  const exportSvg = pick('[data-editor-export-svg]');
  const exportPng = pick('[data-editor-export-png]');
  const durationButtons = [...document.querySelectorAll('[data-editor-duration]')];
  const accidentalButtons = [...document.querySelectorAll('[data-editor-accidental]')];
  const dotButton = pick('[data-editor-dot]');
  const restButton = pick('[data-editor-rest]');

  const state = {
    xml: '',
    filename: '',
    result: null,
    zoom: 100,
    layout: 'page',
    playing: false,
    sound: null,
    soundTried: false,
    endTimer: null,
    tool: { duration: 'quarter', dot: false, rest: false, accidental: null },
    history: [],
    future: [],
  };

  const announce = (message) => { statusMessage.textContent = message; };
  const setFile = (name) => { statusFile.textContent = name || ''; };

  // ---- score templates --------------------------------------------------

  const CLEF = {
    treble: { sign: 'G', line: 2 },
    bass: { sign: 'F', line: 4 },
    alto: { sign: 'C', line: 3 },
  };
  const KEY = { C: 0, G: 1, D: 2, F: -1 };
  const TIME = { '4/4': [4, 4], '3/4': [3, 4], '2/4': [2, 4], '6/8': [6, 8] };

  const starterScore = () => {
    const clef = CLEF[clefSelect.value] || CLEF.treble;
    const fifths = KEY[keySelect.value] ?? 0;
    const [beats, beatType] = TIME[timeSelect.value] || TIME['4/4'];
    const divisions = 4;
    const measures = [];
    for (let n = 1; n <= 4; n += 1) {
      const attributes =
        n === 1
          ? `<attributes><divisions>${divisions}</divisions><key><fifths>${fifths}</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><clef><sign>${clef.sign}</sign><line>${clef.line}</line></clef></attributes>`
          : '';
      const rest = `<note><rest measure="yes"/><duration>${divisions * beats}</duration><voice>1</voice></note>`;
      measures.push(`<measure number="${n}">${attributes}${rest}</measure>`);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>Untitled score</work-title></work>
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">${measures.join('')}</part>
</score-partwise>`;
  };

  // ---- rendering --------------------------------------------------------

  const setControlsEnabled = (enabled) => {
    playButton.disabled = !enabled;
    saveButton.disabled = !enabled;
    exportPdf.disabled = !enabled;
    exportSvg.disabled = !enabled;
    exportPng.disabled = !enabled;
  };

  const updateZoom = () => {
    state.zoom = Math.min(200, Math.max(50, state.zoom));
    scoreHost.style.zoom = `${state.zoom}%`;
    zoomOutput.textContent = `${state.zoom}%`;
    zoomIn.disabled = !state.result || state.zoom >= 200;
    zoomOut.disabled = !state.result || state.zoom <= 50;
  };

  const render = () => {
    if (!state.xml) return;
    if (!engine?.renderFromMusicXml) {
      announce('Notation Engine is unavailable.');
      return;
    }
    try {
      const result = engine.renderFromMusicXml(state.xml, { config: { layout: { mode: state.layout } } });
      const parsed = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
      const svg = parsed.documentElement;
      if (parsed.querySelector('parsererror') || svg?.localName !== 'svg') {
        throw new Error('The score renderer returned invalid SVG.');
      }
      scoreHost.replaceChildren(document.importNode(svg, true));
      scoreHost.hidden = false;
      emptyState.hidden = true;
      canvas.dataset.layout = state.layout;
      state.result = result;
      setControlsEnabled(true);
      updateZoom();
      const errors = (result.diagnostics || []).filter((item) => item.severity === 'error');
      announce(errors.length
        ? `Score loaded with ${errors.length} issue${errors.length === 1 ? '' : 's'}.`
        : 'Score ready.');
    } catch (error) {
      state.result = null;
      scoreHost.hidden = true;
      emptyState.hidden = false;
      setControlsEnabled(false);
      announce(error instanceof Error ? error.message : 'The score could not be rendered.');
    }
  };

  const showEmpty = (message) => {
    state.xml = '';
    state.result = null;
    state.filename = '';
    scoreHost.hidden = true;
    scoreHost.replaceChildren();
    emptyState.hidden = false;
    setControlsEnabled(false);
    setFile('');
    if (message) announce(message);
  };

  const loadXml = (xml, name) => {
    state.xml = xml;
    state.filename = name;
    setFile(name);
    render();
  };

  const readFile = async (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['musicxml', 'xml', 'mxl'].includes(extension || '')) {
      announce('Choose a .musicxml, .xml, or .mxl file.');
      return;
    }
    announce('Opening score…');
    try {
      let xml;
      if (extension === 'mxl') {
        const archive = new Uint8Array(await file.arrayBuffer());
        const extracted = engine.unzipMxl(archive, window.DOMParser);
        if (!extracted.xmlText) {
          const detail = extracted.diagnostics?.map((item) => item.message).filter(Boolean).join(' ');
          throw new Error(detail || 'The MXL archive could not be read.');
        }
        xml = extracted.xmlText;
      } else {
        xml = await file.text();
      }
      loadXml(xml, file.name);
    } catch (error) {
      showEmpty(error instanceof Error ? error.message : 'The score could not be opened.');
    }
  };

  // ---- playback ---------------------------------------------------------

  const setPlaying = (playing) => {
    state.playing = playing;
    playButton.setAttribute('aria-pressed', String(playing));
    playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playButton.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14" /></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>';
  };

  const ensureSound = async () => {
    if (state.sound) return state.sound;
    if (state.soundTried && !state.sound) throw new Error('Playback is unavailable in this preview.');
    state.soundTried = true;
    const SoundFont = window.NotationSoundFont;
    if (!SoundFont?.R2SoundFontEngine) throw new Error('The sound engine could not be loaded.');
    const configured = window.MSHARING_SOUNDFONT_CONFIG || {};
    state.sound = await SoundFont.R2SoundFontEngine.create({
      manifestUrl: 'soundfonts/manifest.json',
      processorUrl: 'assets/spessasynth_processor.min.js',
      assetBaseUrl: 'soundfonts',
      assetId: 'musescore-general-sf3',
      ...configured,
    });
    return state.sound;
  };

  const scheduleEnd = (playback) => {
    if (state.endTimer !== null) window.clearTimeout(state.endTimer);
    const seconds = Math.max(0, ...playback.events.map((event) => engine.resolvePosition(playback, event.tick + event.durationTicks).seconds));
    state.endTimer = window.setTimeout(() => setPlaying(false), Math.max(0, seconds * 1000 + 120));
  };

  const togglePlay = async () => {
    if (!state.result) return;
    if (!state.sound) {
      announce('Loading playback…');
      try {
        await ensureSound();
      } catch (error) {
        announce(error instanceof Error ? error.message : 'Playback is unavailable.');
        return;
      }
    }
    const next = !state.playing;
    setPlaying(next);
    if (next) {
      scheduleEnd(state.result.playback);
      void state.sound.play(state.result.playback, 1);
      announce('Playing.');
    } else {
      if (state.endTimer !== null) window.clearTimeout(state.endTimer);
      state.sound.pause();
      announce('Paused.');
    }
  };

  // ---- export -----------------------------------------------------------

  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const baseName = () => (state.filename || 'notation').replace(/\.[^.]+$/, '');

  const runExport = async (button, kind) => {
    if (!state.result?.svg) return;
    button.disabled = true;
    announce(`Preparing ${kind.toUpperCase()}…`);
    try {
      if (kind === 'svg') {
        const svg = engine.exportSvg
          ? engine.exportSvg(state.result.svg, { title: baseName() })
          : state.result.svg;
        download(new Blob([svg], { type: 'image/svg+xml' }), `${baseName()}.svg`);
      } else if (kind === 'pdf') {
        const bytes = await engine.exportPdf(state.result.svg, { scale: 2 });
        download(new Blob([bytes], { type: 'application/pdf' }), `${baseName()}.pdf`);
      } else {
        const bytes = await engine.exportPng(state.result.svg, { scale: 2 });
        download(new Blob([bytes], { type: 'image/png' }), `${baseName()}.png`);
      }
      announce(`${kind.toUpperCase()} downloaded.`);
    } catch (error) {
      announce(error instanceof Error ? error.message : `Could not export ${kind.toUpperCase()}.`);
    } finally {
      button.disabled = !state.result;
    }
  };

  const saveScore = () => {
    if (!state.xml) return;
    download(new Blob([state.xml], { type: 'application/vnd.recordare.musicxml+xml' }), `${baseName()}.musicxml`);
    announce('Score file downloaded.');
  };

  // ---- toolbar tools ----------------------------------------------------

  const syncTools = () => {
    durationButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.editorDuration === state.tool.duration));
    });
    accidentalButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.editorAccidental === state.tool.accidental));
    });
    dotButton.setAttribute('aria-pressed', String(state.tool.dot));
    restButton.setAttribute('aria-pressed', String(state.tool.rest));
  };

  const applySetup = () => {
    tempoOutput.textContent = '\u2669=120';
    if (!state.xml) return;
    loadXml(starterScore(), state.filename || 'Untitled score.musicxml');
  };

  // ---- wiring -----------------------------------------------------------

  openButtons.forEach((button) => button.addEventListener('click', () => fileInput.click()));
  newButtons.forEach((button) => button.addEventListener('click', () => loadXml(starterScore(), 'Untitled score.musicxml')));
  fileInput.addEventListener('change', () => readFile(fileInput.files?.[0]));
  saveButton.addEventListener('click', saveScore);

  undoButton.addEventListener('click', () => announce('Undo becomes available with note entry.'));
  redoButton.addEventListener('click', () => announce('Redo becomes available with note entry.'));

  playButton.addEventListener('click', () => void togglePlay());

  zoomIn.addEventListener('click', () => { state.zoom += 10; updateZoom(); });
  zoomOut.addEventListener('click', () => { state.zoom -= 10; updateZoom(); });
  layoutSelect.addEventListener('change', () => { state.layout = layoutSelect.value; render(); });

  exportPdf.addEventListener('click', () => void runExport(exportPdf, 'pdf'));
  exportSvg.addEventListener('click', () => void runExport(exportSvg, 'svg'));
  exportPng.addEventListener('click', () => void runExport(exportPng, 'png'));

  durationButtons.forEach((button) => button.addEventListener('click', () => {
    state.tool.duration = button.dataset.editorDuration;
    state.tool.rest = false;
    syncTools();
    announce(`Note value: ${button.getAttribute('aria-label')}.`);
  }));
  accidentalButtons.forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.editorAccidental;
    state.tool.accidental = state.tool.accidental === value ? null : value;
    syncTools();
    announce(state.tool.accidental ? `${button.getAttribute('aria-label')} selected.` : 'Accidental cleared.');
  }));
  dotButton.addEventListener('click', () => { state.tool.dot = !state.tool.dot; syncTools(); announce(state.tool.dot ? 'Dot on.' : 'Dot off.'); });
  restButton.addEventListener('click', () => { state.tool.rest = !state.tool.rest; syncTools(); announce(state.tool.rest ? 'Rests on.' : 'Rests off.'); });

  [clefSelect, keySelect, timeSelect].forEach((select) => select.addEventListener('change', applySetup));

  document.addEventListener('keydown', (event) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName || '');
    if (typing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); fileInput.click(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveScore(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key === '=') { event.preventDefault(); state.zoom += 10; updateZoom(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key === '-') { event.preventDefault(); state.zoom -= 10; updateZoom(); return; }
    if (event.code === 'Space') { event.preventDefault(); void togglePlay(); return; }
    const shortcuts = { '1': 'whole', '2': 'half', '3': 'quarter', '4': 'eighth', '5': '16th' };
    if (shortcuts[event.key]) {
      state.tool.duration = shortcuts[event.key];
      syncTools();
      announce(`Note value: ${shortcuts[event.key]}.`);
    }
  });

  // ---- entry handoff ----------------------------------------------------

  const restoreHandoff = () => {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get('intent');
    if (intent === 'create') { loadXml(starterScore(), 'Untitled score.musicxml'); return; }
    const pending = sessionStorage.getItem('notation-lab-pending-file');
    if (!pending) return;
    sessionStorage.removeItem('notation-lab-pending-file');
    try {
      const payload = JSON.parse(pending);
      const binary = atob(payload.data);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const file = new File([bytes], payload.name, { type: payload.type || 'application/octet-stream' });
      void readFile(file);
    } catch {
      showEmpty('The selected file could not be reopened. Please choose it again.');
    }
  };

  syncTools();
  setControlsEnabled(false);
  updateZoom();
  restoreHandoff();
})();
