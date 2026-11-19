/**
 * Notation Lab editor — semantic score editing.
 *
 * The SVG is only ever a picture of `state.doc`. Clicks map back to musical
 * positions (measure/voice/event, or tick + staff position) through the
 * engine's own playback geometry, edits rebuild `state.doc`, and the engine
 * re-renders it. Nothing is edited by mutating the drawing.
 */
(() => {
  const root = document.querySelector('[data-editor-toolbar]');
  if (!root) return;

  const engine = window.NotationEngine;
  const docTools = window.NotationDoc;
  const pick = (selector) => document.querySelector(selector);

  const saveButton = pick('[data-editor-save]');
  const backButton = pick('[data-editor-back]');
  const undoButton = pick('[data-editor-undo]');
  const redoButton = pick('[data-editor-redo]');
  const playButton = pick('[data-editor-play]');
  const noteInputButton = pick('[data-editor-note-input]');
  const addMeasureButton = pick('[data-editor-add-measure]');
  const removeMeasureButton = pick('[data-editor-remove-measure]');
  const canvas = pick('[data-editor-canvas]');
  const scoreHost = pick('[data-editor-score]');
  const statusMessage = pick('[data-editor-status]');
  const statusFile = pick('[data-editor-file]');
  const zoomOutput = pick('[data-editor-zoom]');
  const zoomIn = pick('[data-editor-zoom-in]');
  const zoomOut = pick('[data-editor-zoom-out]');
  const clefSelect = pick('[data-editor-clef]');
  const keySelect = pick('[data-editor-key]');
  const timeSelect = pick('[data-editor-time]');
  const partSelect = pick('[data-editor-part]');
  const tempoOutput = pick('[data-editor-tempo]');
  const exportPdf = pick('[data-editor-export-pdf]');
  const exportSvg = pick('[data-editor-export-svg]');
  const exportPng = pick('[data-editor-export-png]');
  const exportToggle = pick('[data-editor-export-toggle]');
  const exportList = pick('[data-editor-export-list]');
  const metronomeButton = pick('[data-editor-metronome]');
  const soundFontSelect = pick('[data-editor-soundfont]');
  const testNoteButton = pick('[data-editor-test-note]');
  const testScoreButton = pick('[data-editor-test-score]');
  const previewButton = pick('[data-editor-preview]');
  const viewToggle = pick('[data-editor-view-toggle]');
  const viewList = pick('[data-editor-view-list]');
  const viewLabel = pick('[data-editor-view-label]');
  const viewButtons = [...document.querySelectorAll('[data-editor-view-list] [data-editor-view]')];
  const durationButtons = [...document.querySelectorAll('[data-editor-duration]')];
  const accidentalButtons = [...document.querySelectorAll('[data-editor-accidental]')];
  const dotButton = pick('[data-editor-dot]');
  const restButton = pick('[data-editor-rest]');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ACCIDENTAL_ALTER = { sharp: 1, flat: -1, natural: 0 };
  const SHORTCUT_DURATION = {
    '1': 'whole', '2': 'half', '3': 'quarter', '4': 'eighth', '5': '16th', '6': '32nd',
  };

  const state = {
    doc: null,
    result: null,
    filename: '',
    zoom: 100,
    layout: 'page',
    tool: { duration: 'quarter', dots: 0, rest: false, accidental: null },
    noteInput: true,
    activePartId: null,
    drumInstruments: null,
    tempoMarks: null,
    selection: null,
    entry: null,
    history: [],
    future: [],
    // playback
    playing: false,
    sound: null,
    soundLoading: null,
    soundTried: false,
    // audition
    previewOn: true,
    soundFonts: [],
    soundAssetId: null,
    soundAssetPaths: null,
    playSeconds: 0,
    playStartSeconds: 0,
    playStartedAt: 0,
    rafId: null,
    soundingId: null,
    // metronome
    metronomeOn: false,
    metronome: null,
    metronomeTimers: [],
  };

  const announce = (message) => { statusMessage.textContent = message; };
  const setFile = (name) => { statusFile.textContent = name || ''; };

  // ---- starter score -----------------------------------------------------

  const CLEF_SIGN = { treble: { sign: 'G', line: 2 }, bass: { sign: 'F', line: 4 }, alto: { sign: 'C', line: 3 } };
  const KEY_FIFTHS = { C: 0, G: 1, D: 2, F: -1 };
  const TIME_PAIR = { '4/4': [4, 4], '3/4': [3, 4], '2/4': [2, 4], '6/8': [6, 8] };

  function starterMusicXml() {
    const clef = CLEF_SIGN[clefSelect.value] || CLEF_SIGN.treble;
    const fifths = KEY_FIFTHS[keySelect.value] ?? 0;
    const [beats, beatType] = TIME_PAIR[timeSelect.value] || TIME_PAIR['4/4'];
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
  }

  // ---- document history --------------------------------------------------

  const canUndo = () => state.history.length > 0;
  const canRedo = () => state.future.length > 0;

  const syncHistory = () => {
    undoButton.disabled = !canUndo();
    redoButton.disabled = !canRedo();
  };

  /** Snapshot the document, then apply a mutation to it. */
  const commit = (mutate, message) => {
    if (!state.doc) return;
    const before = state.doc;
    const after = mutate(before);
    if (after === before) return;
    state.history.push(before);
    if (state.history.length > 100) state.history.shift();
    state.future.length = 0;
    state.doc = after;
    syncHistory();
    if (message) announce(message);
    render();
  };

  const undo = () => {
    if (!canUndo()) return;
    state.future.push(state.doc);
    state.doc = state.history.pop();
    syncHistory();
    clampPointers();
    announce('Undo.');
    render();
  };

  const redo = () => {
    if (!canRedo()) return;
    state.history.push(state.doc);
    state.doc = state.future.pop();
    syncHistory();
    clampPointers();
    announce('Redo.');
    render();
  };

  // ---- musical helpers ---------------------------------------------------

  /**
   * The part being written into. A wizard score can hold several -- piano
   * plus drums, say -- and every edit command takes a part id, so the
   * editor writes into the one the user is looking at rather than always
   * the first. Defaults to part 1, which is all a single-instrument score
   * has.
   */
  const activePartId = () => state.activePartId ?? state.doc?.score.parts[0]?.id ?? 'P1';

  const partById = (partId) => state.doc?.score.parts.find((part) => part.id === partId) ?? null;
  const measureCountOf = (partId) => partById(partId)?.measures.length ?? 1;
  const partNameOf = (partId) => partById(partId)?.name ?? 'this part';

  /** True when the active part is a drum kit: its notes are unpitched and
   *  each one names the drum it is played on. */
  const activePartIsPercussion = () => {
    const attribute = attributeAt(1);
    const sign = attribute?.clefsByStaff?.[1]?.sign ?? attribute?.clefSign;
    return sign === 'percussion';
  };

  const attributeAt = (measureNumber) => docTools.attributeFor(state.doc, activePartId(), measureNumber);

  const clefAt = (measureNumber) => {
    const attribute = attributeAt(measureNumber);
    const sign = attribute?.clefsByStaff?.[1]?.sign ?? attribute?.clefSign ?? 'G';
    return docTools.clefDefinitionFor(sign);
  };

  const capacityOf = (measureNumber) => docTools.ticksPerMeasure(state.doc, activePartId(), measureNumber);

  const durationForTool = () =>
    engine.duration(
      state.tool.duration,
      state.tool.dots,
      engine.ticksForDisplayedDuration({ type: state.tool.duration, dots: state.tool.dots }),
    );

  const accidentalAlter = () =>
    state.tool.accidental === null ? null : ACCIDENTAL_ALTER[state.tool.accidental];

  const eventsIn = (measureNumber, voiceId = 1) => {
    const measure = partById(activePartId())?.measures.find((m) => m.number === measureNumber);
    return measure?.voices.find((voice) => voice.id === voiceId)?.events ?? [];
  };

  /** Resolves a tick that ran past the measure's end into the measure it belongs to, appending measures as needed. */
  function locateTick(tick, measureNumber) {
    let number = measureNumber;
    let local = tick;
    for (;;) {
      const capacity = capacityOf(number);
      if (local < capacity) return { measureNumber: number, tick: local };
      const next = number + 1;
      if (!state.doc.score.parts[0].measures.some((m) => m.number === next)) {
        state.doc = docTools.appendMeasure(state.doc, activePartId());
      }
      local -= capacity;
      number = next;
    }
  }

  const globalTickOf = (measureNumber, tickInMeasure) =>
    (state.result?.playback.globalTickOffsetByMeasure.get(measureNumber) ?? 0) + tickInMeasure;

  // ---- geometry ----------------------------------------------------------

  /** Staff line runs in the rendered SVG, top to bottom, as system bands. */
  function detectStaves(svg) {
    const lines = [...svg.querySelectorAll('line')]
      .filter((line) => line.getAttribute('y1') === line.getAttribute('y2'))
      .filter((line) => Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3)
      .map((line) => Number(line.getAttribute('y1')));
    const ys = [...new Set(lines)].sort((a, b) => a - b);
    const staves = [];
    let run = [];
    for (const y of ys) {
      const previous = run[run.length - 1];
      if (previous === undefined || Math.abs(y - previous - 1) < 0.01) run.push(y);
      else { if (run.length >= 5) staves.push(run); run = [y]; }
    }
    if (run.length >= 5) staves.push(run);
    return staves.map((lines, index) => ({
      systemIndex: index,
      topY: lines[0],
      bottomY: lines[lines.length - 1],
    }));
  }

  /** Client point -> the SVG's own staff-space coordinates. */
  function toSvgPoint(svg, clientX, clientY) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  /** The event whose drawn bounding box contains the point, smallest box first. */
  function eventAt(svg, x, y) {
    const groups = [...svg.querySelectorAll('[data-id]')];
    let best = null;
    for (const group of groups) {
      let box;
      try { box = group.getBBox(); } catch { continue; }
      const pad = 0.6;
      if (x < box.x - pad || x > box.x + box.width + pad) continue;
      if (y < box.y - pad || y > box.y + box.height + pad) continue;
      const area = Math.max(box.width, 0.5) * Math.max(box.height, 0.5);
      if (!best || area < best.area) best = { group, area };
    }
    return best?.group ?? null;
  }

  /** The staff whose vertical band the point is in, or the nearest one. */
  function staffAt(staves, y) {
    if (staves.length === 0) return null;
    const inside = staves.find((staff) => y >= staff.topY - 2 && y <= staff.bottomY + 2);
    if (inside) return inside;
    return staves.reduce((best, staff) => {
      const center = (staff.topY + staff.bottomY) / 2;
      const bestCenter = (best.topY + best.bottomY) / 2;
      return Math.abs(y - center) < Math.abs(y - bestCenter) ? staff : best;
    }, staves[0]);
  }

  /**
   * A click's staff position, in half staff spaces. The engine's own
   * convention: `staffPositionForPitch` returns 0 for the bottom line and
   * grows downward, and the renderer draws a notehead's baseline at
   * `bottomY + position`. Clicks far outside the staff are clamped to a
   * sane ledger range rather than sent off the page.
   */
  function staffPositionFromPoint(staff, y) {
    if (!staff) return 0;
    const raw = y - staff.bottomY;
    const top = staff.topY - staff.bottomY;
    return Math.round(Math.min(top + 2, Math.max(-5, raw)) * 2) / 2;
  }

  // ---- rendering ---------------------------------------------------------

  const setControlsEnabled = (enabled) => {
    playButton.disabled = !enabled;
    metronomeButton.disabled = !enabled;
    saveButton.disabled = !enabled;
    exportToggle.disabled = !enabled;
    exportPdf.disabled = !enabled;
    exportSvg.disabled = !enabled;
    exportPng.disabled = !enabled;
    addMeasureButton.disabled = !enabled;
    removeMeasureButton.disabled = !enabled;
    if (!enabled) setExportMenu(false);
  };

  const setExportMenu = (open) => {
    exportList.hidden = !open;
    exportToggle.setAttribute('aria-expanded', String(open));
  };

  const setViewMenu = (open) => {
    viewList.hidden = !open;
    viewToggle.setAttribute('aria-expanded', String(open));
  };

  const setView = (mode) => {
    state.layout = mode;
    const label = mode === 'scroll' ? 'Horizontal' : 'Page';
    if (viewLabel) viewLabel.textContent = label;
    viewButtons.forEach((button) => {
      button.setAttribute('aria-checked', String(button.dataset.editorView === mode));
    });
    if (state.result) render();
  };

  const updateZoom = () => {
    state.zoom = Math.min(200, Math.max(50, state.zoom));
    scoreHost.style.zoom = `${state.zoom}%`;
    zoomOutput.textContent = `${state.zoom}%`;
    zoomIn.disabled = !state.result || state.zoom >= 200;
    zoomOut.disabled = !state.result || state.zoom <= 50;
  };

  function svgElement(name, attrs) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }

  /** Draws the entry cursor, selection highlight and playback playhead over the score. */
  function applyOverlays(svg, staves) {
    svg.querySelectorAll('[data-editor-selected]').forEach((node) => node.removeAttribute('data-editor-selected'));
    svg.querySelectorAll('.editor-overlay').forEach((node) => node.remove());

    const overlay = svgElement('g', { class: 'editor-overlay' });
    const staffFor = (systemIndex) => staves[systemIndex] ?? staves[0];
    const bandTop = (staff) => (staff ? staff.topY - 4 : 0);
    const bandHeight = (staff) => (staff ? staff.bottomY - staff.topY + 8 : 8);
    const mark = (id) => {
      const group = svg.querySelector(`[data-id="${id}"]`);
      if (group) group.setAttribute('data-editor-selected', 'true');
    };

    if (state.selection) {
      mark(engine.notationEventId(
        state.selection.partId, state.selection.measureNumber, state.selection.voiceId, state.selection.eventIndex,
      ));
    }
    if (state.soundingId) mark(state.soundingId);

    if (state.entry && state.result) {
      const staff = staffFor(state.entry.systemIndex);
      const x = engine.positionToX(state.result.playback, globalTickOf(state.entry.measureNumber, state.entry.tick)).x;
      overlay.appendChild(svgElement('rect', {
        class: 'editor-cursor',
        x: x - 0.08,
        y: bandTop(staff),
        width: 0.16,
        height: bandHeight(staff),
      }));
    }

    if (state.result && state.playing) {
      const tick = engine.secondsToTick(state.result.playback.tempoMap, state.playSeconds);
      const placement = engine.computeCursorPlacement(state.result.playback, tick, { mode: 'cursorMoves' });
      const staff = staffFor(placement.systemIndex);
      overlay.appendChild(svgElement('rect', {
        class: 'editor-playhead',
        x: placement.markerX - 0.06,
        y: bandTop(staff),
        width: 0.12,
        height: bandHeight(staff),
      }));
    }

    if (overlay.childElementCount > 0) svg.appendChild(overlay);
  }

  function render() {
    if (!state.doc) return;
    if (!engine?.renderParsedMusicXml) {
      announce('Notation Engine is unavailable.');
      return;
    }
    try {
      const result = engine.renderParsedMusicXml(state.doc, { config: { layout: { mode: state.layout } } });
      const parsed = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
      const svg = parsed.documentElement;
      if (parsed.querySelector('parsererror') || svg?.localName !== 'svg') {
        throw new Error('The score renderer returned invalid SVG.');
      }
      const imported = document.importNode(svg, true);
      state.result = result;
      scoreHost.replaceChildren(imported);
      scoreHost.hidden = false;
      canvas.dataset.layout = state.layout;
      applyOverlays(imported, detectStaves(imported));
      setControlsEnabled(true);
      syncHistory();
      syncPartSelect();
      updateZoom();
      refreshTempo();
      const errors = (result.diagnostics || []).filter((item) => item.severity === 'error');
      if (errors.length) {
        announce(`Score loaded with ${errors.length} issue${errors.length === 1 ? '' : 's'}.`);
      }
    } catch (error) {
      state.result = null;
      scoreHost.hidden = true;
      setControlsEnabled(false);
      announce(error instanceof Error ? error.message : 'The score could not be rendered.');
    }
  }

  function showEmpty(message) {
    state.doc = null;
    state.result = null;
    state.filename = '';
    state.activePartId = null;
    state.drumInstruments = null;
    state.tempoMarks = null;
    state.selection = null;
    state.entry = null;
    state.history.length = 0;
    state.future.length = 0;
    scoreHost.hidden = true;
    scoreHost.replaceChildren();
    setControlsEnabled(false);
    syncHistory();
    syncPartSelect();
    setFile('');
    if (message) announce(message);
  }

  /**
   * The drum kits in this score, keyed by part, for writing into them.
   *
   * A kit part names its drums through `<midi-instrument><midi-unpitched>`,
   * which the parser exposes as `midiInstrumentsByPart`. Each GM key then
   * has a staff line and notehead in the engine's own kit table. Building
   * the map here means the editor knows which line the user clicked
   * without a second copy of the kit living in the website.
   */
  function collectDrumInstruments(parsed) {
    const byPart = new Map();
    const table = engine.DEFAULT_DRUM_MAPPING_TABLE;
    if (!table) return byPart;
    for (const part of parsed.score.parts) {
      const gmNotes = parsed.midiInstrumentsByPart?.get(part.id);
      if (!gmNotes || gmNotes.size === 0) continue;
      const kit = new Map();
      for (const [instrumentId, gmNote] of gmNotes) {
        const entry = table[gmNote];
        if (!entry) continue;
        const { step, octave } = docTools.pitchFromStaffPosition(engine.PERCUSSION_CLEF, entry.staffPosition);
        kit.set(`${step}${octave}`, {
          instrumentId,
          gmNote,
          staffPosition: entry.staffPosition,
          displayStep: step,
          displayOctave: octave,
          name: entry.name,
        });
      }
      if (kit.size > 0) byPart.set(part.id, kit);
    }
    return byPart;
  }

  function loadXml(xml, name) {
    const parsed = engine.parseMusicXml(xml, window.DOMParser);
    const errors = (parsed.diagnostics || []).filter((item) => item.severity === 'error');
    if (errors.length && parsed.score.parts.every((part) => part.measures.length === 0)) {
      throw new Error(errors[0]?.message || 'The score could not be read.');
    }
    state.drumInstruments = collectDrumInstruments(parsed);
    state.tempoMarks = parsed.tempoMarks ?? null;
    // Pad every measure out to its own meter before editing. The renderer
    // takes a measure's drawn width from the span its events cover, so a
    // bar written as a lone quarter note would render a quarter wide and
    // the next click would land in the following measure.
    const padded = parsed.score.parts.reduce(
      (doc, part) => docTools.padMeasure(doc, part.id),
      parsed,
    );
    state.doc = padded;
    state.activePartId = padded.score.parts[0]?.id ?? 'P1';
    state.filename = name;
    state.history.length = 0;
    state.future.length = 0;
    state.selection = null;
    state.entry = { partId: activePartId(), measureNumber: 1, voiceId: 1, tick: 0, systemIndex: 0 };
    setFile(name);
    render();
    announce('Score ready.');
  }

  async function readFile(file) {
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
  }

  // ---- selection, navigation, entry --------------------------------------

  function clampPointers() {
    if (!state.doc) return;
    const measures = state.doc.score.parts[0]?.measures ?? [];
    const last = measures[measures.length - 1]?.number ?? 1;
    if (state.entry && !measures.some((m) => m.number === state.entry.measureNumber)) {
      state.entry = { ...state.entry, measureNumber: last, tick: 0 };
    }
    if (state.selection && !measures.some((m) => m.number === state.selection.measureNumber)) {
      state.selection = null;
    }
  }

  function selectEvent(partId, measureNumber, voiceId, eventIndex) {
    const events = eventsIn(measureNumber, voiceId);
    state.selection = { partId, measureNumber, voiceId, eventIndex };
    state.entry = {
      partId,
      measureNumber,
      voiceId,
      tick: events[eventIndex]?.startTick ?? 0,
      systemIndex: state.entry?.systemIndex ?? 0,
    };
    render();
  }

  function moveSelection(direction) {
    if (!state.selection) return;
    const { measureNumber, voiceId, eventIndex } = state.selection;
    const events = eventsIn(measureNumber, voiceId);
    const nextIndex = eventIndex + direction;
    if (nextIndex >= 0 && nextIndex < events.length) {
      selectEvent(activePartId(), measureNumber, voiceId, nextIndex);
      return;
    }
    if (direction > 0) {
      const nextMeasure = measureNumber + 1;
      if (!state.doc.score.parts[0].measures.some((m) => m.number === nextMeasure)) {
        state.doc = docTools.appendMeasure(state.doc, activePartId());
      }
      if (eventsIn(nextMeasure, voiceId).length > 0) {
        selectEvent(activePartId(), nextMeasure, voiceId, 0);
        return;
      }
      state.entry = { partId: activePartId(), measureNumber: nextMeasure, voiceId, tick: 0, systemIndex: state.entry?.systemIndex ?? 0 };
      state.selection = null;
      announce(`Measure ${nextMeasure}.`);
      render();
      return;
    }
    if (measureNumber > 1) {
      const previous = measureNumber - 1;
      const previousEvents = eventsIn(previous, voiceId);
      selectEvent(activePartId(), previous, voiceId, Math.max(0, previousEvents.length - 1));
    }
  }

  const shiftPitch = (pitch, semitones) => engine.soundingPitch(pitch, semitones);

  function transposeSelection(semitones) {
    if (!state.selection) return;
    const { partId, measureNumber, voiceId, eventIndex } = state.selection;
    const event = eventsIn(measureNumber, voiceId)[eventIndex];
    if (!event || event.kind === 'rest') return;
    const moved = event.kind === 'chord'
      ? { ...event, notes: event.notes.map((note) => ({ ...note, pitch: shiftPitch(note.pitch, semitones) })) }
      : { ...event, pitch: shiftPitch(event.pitch, semitones) };
    commit((doc) => docTools.replaceEvent(doc, { partId, measureNumber, voiceId, eventIndex, event: moved }),
      `Moved ${semitones > 0 ? 'up' : 'down'}.`);
    previewPitch(moved.kind === 'chord' ? moved.notes[0].pitch : moved.pitch);
  }

  function deleteSelection() {
    if (!state.selection) return;
    const { partId, measureNumber, voiceId, eventIndex } = state.selection;
    const remaining = eventsIn(measureNumber, voiceId).length - 1;
    commit((doc) => docTools.deleteEvent(doc, { partId, measureNumber, voiceId, eventIndex }), 'Deleted.');
    state.selection = remaining <= 0 ? null : { ...state.selection, eventIndex: Math.min(eventIndex, remaining - 1) };
    render();
  }

  function advanceEntry(ticks, measureNumber, voiceId) {
    const located = locateTick(state.entry.tick + ticks, measureNumber);
    state.entry = { ...state.entry, measureNumber: located.measureNumber, tick: located.tick, voiceId };
    state.selection = null;
    render();
  }

  /**
   * Writes a note, rest, or chord member at the entry cursor and rolls the
   * cursor forward.
   *
   * `staffPosition` is the clicked line, which a drum kit needs: its notes
   * are unpitched, so the line the user clicked is what names the drum.
   */
  function insertAtEntry({ step = null, octave = null, rest = false, addToChord = false, staffPosition = null }) {
    if (!state.doc) return;
    if (!state.entry) {
      state.entry = { partId: activePartId(), measureNumber: 1, voiceId: 1, tick: 0, systemIndex: 0 };
    }
    const { measureNumber, voiceId } = state.entry;
    const capacity = capacityOf(measureNumber);
    const remaining = capacity - state.entry.tick;
    if (remaining <= 0) {
      const located = locateTick(state.entry.tick, measureNumber);
      state.entry = { ...state.entry, ...located };
      render();
      return;
    }
    const duration = durationForTool();
    const ticks = Math.min(duration.ticks, remaining);
    const fitted = ticks === duration.ticks
      ? duration
      : engine.duration(engine.durationTypeAndDotsFromTicks(ticks).type, engine.durationTypeAndDotsFromTicks(ticks).dots, ticks);

    if (rest) {
      const event = engine.rest({ duration: fitted, voice: voiceId, staff: 1, startTick: state.entry.tick });
      commit((doc) => docTools.insertEvent(doc, { partId: activePartId(), measureNumber, voiceId, event }), 'Rest inserted.');
      advanceEntry(ticks, measureNumber, voiceId);
      return;
    }

    // A kit part has no pitches: the clicked line names a drum instead.
    const drumPitch = drumPitchFor(staffPosition);
    if (drumPitch && !rest) {
      const drum = drumFor(drumPitch);
      const events = eventsIn(measureNumber, voiceId);
      const existingIndex = events.findIndex((event) => (event.startTick ?? 0) === state.entry.tick);
      const existing = existingIndex >= 0 ? events[existingIndex] : null;
      const note = engine.note({
        pitch: drumPitch,
        duration: existing && existing.kind !== 'rest' ? existing.duration : fitted,
        voice: voiceId,
        staff: 1,
        ...(drum ? { instrumentId: drum.instrumentId } : {}),
      });
      if (existing && existing.kind !== 'rest') {
        commit((doc) => docTools.replaceEvent(doc, { partId: activePartId(), measureNumber, voiceId, eventIndex: existingIndex, event: note }), `Replaced with ${drum?.name ?? 'drum'}.`);
        previewPitch(drumPitch, drum);
        render();
        return;
      }
      commit((doc) => docTools.insertEvent(doc, { partId: activePartId(), measureNumber, voiceId, event: note }), `Inserted ${drum?.name ?? 'drum'}.`);
      previewPitch(drumPitch, drum);
      advanceEntry(ticks, measureNumber, voiceId);
      return;
    }

    if (step === null) {
      announce('Click a staff line or press a note letter first.');
      return;
    }
    const alter = accidentalAlter();
    const pitch = { kind: 'pitched', step, alter: alter ?? 0, octave };
    const events = eventsIn(measureNumber, voiceId);
    const existingIndex = events.findIndex((event) => (event.startTick ?? 0) === state.entry.tick);
    const existing = existingIndex >= 0 ? events[existingIndex] : null;

    if (existing && existing.kind !== 'rest') {
      const note = engine.note({ pitch, duration: existing.duration, voice: voiceId, staff: 1 });
      if (addToChord) {
        const notes = existing.kind === 'chord' ? [...existing.notes, note] : [existing, note];
        const chord = engine.chord(notes, { startTick: state.entry.tick });
        commit((doc) => docTools.replaceEvent(doc, { partId: activePartId(), measureNumber, voiceId, eventIndex: existingIndex, event: chord }), 'Note added to chord.');
      } else {
        // A plain letter or click on an occupied beat restates that beat's
        // pitch, replacing rather than stacking by default.
        commit((doc) => docTools.replaceEvent(doc, { partId: activePartId(), measureNumber, voiceId, eventIndex: existingIndex, event: note }), `Replaced with ${step}${octave}.`);
      }
      previewPitch(pitch);
      render();
      return;
    }

    const event = engine.note({ pitch, duration: fitted, voice: voiceId, staff: 1, startTick: state.entry.tick });
    commit((doc) => docTools.insertEvent(doc, { partId: activePartId(), measureNumber, voiceId, event }), `Inserted ${step}${octave}.`);
    previewPitch(pitch);
    advanceEntry(ticks, measureNumber, voiceId);
  }

  /**
   * The drum a staff position means, for a kit part.
   *
   * A kit's notes are `<unpitched>` and each one names the drum it is
   * played on; a note with no instrument is silent. The drum map is what
   * says which line is which drum, so the click's staff position is looked
   * up there rather than converted to a pitch.
   */
  function drumFor(pitch) {
    if (pitch.kind !== 'unpitched' || !activePartIsPercussion()) return null;
    const partId = activePartId();
    const key = `${pitch.displayStep}${pitch.displayOctave}`;
    return state.drumInstruments?.get(partId)?.get(key) ?? null;
  }

  /** The unpitched pitch for the drum at a staff position, or null when
   *  the part is not a kit (or nothing sits on that line). */
  function drumPitchFor(staffPosition) {
    if (!activePartIsPercussion() || staffPosition === undefined || staffPosition === null) return null;
    const partId = activePartId();
    const kit = state.drumInstruments?.get(partId);
    if (!kit) return null;
    const entry = [...kit.values()].find((drum) => drum.staffPosition === staffPosition);
    if (!entry) return null;
    return engine.unpitchedPitch(entry.displayStep, entry.displayOctave);
  }

  /** The octave whose notes sit nearest the middle of the current clef. */
  function currentOctave() {
    return docTools.pitchFromStaffPosition(clefAt(state.entry?.measureNumber ?? 1), 0).octave;
  }

  // ---- pointer interaction -----------------------------------------------

  function onScorePointerDown(event) {
    if (!state.result || !state.doc) return;
    const svg = scoreHost.querySelector('svg');
    if (!svg) return;
    const point = toSvgPoint(svg, event.clientX, event.clientY);
    if (!point) return;
    const staves = detectStaves(svg);
    const staff = staffAt(staves, point.y);
    const systemIndex = staff?.systemIndex ?? 0;
    const hit = eventAt(svg, point.x, point.y);

    if (hit) {
      const [partId, measureToken, voiceToken, eventToken] = hit.getAttribute('data-id').split('#');
      // Clicking a staff is how a multi-part score says which part you are
      // writing into: every edit command takes a part id, and a drum part
      // would otherwise be unreachable behind the first instrument.
      state.activePartId = partId;
      if (partSelect && !partSelect.hidden) partSelect.value = partId;
      const measureNumber = Number(measureToken.replace('m', ''));
      const voiceId = Number(voiceToken.replace('v', ''));
      const eventIndex = Number(eventToken.replace('e', ''));
      const existing = eventsIn(measureNumber, voiceId)[eventIndex];
      const staffPosition = staffPositionFromPoint(staff, point.y);
      const { step, octave } = docTools.pitchFromStaffPosition(clefAt(measureNumber), staffPosition);
      // A rest -- including the whole-measure placeholder MusicXML writes
      // for an empty measure -- is not a note to select. In note input it
      // is the SPACE to write into, so fall through to the positional
      // placement below rather than trapping every click on beat 1.
      if (existing && existing.kind !== 'rest') {
        // In note input a staff click always writes. Clicking a note that
        // is already there -- the commonest gesture when writing a melody,
        // since notes sit where the pointer is -- must replace that note
        // (or, with Shift, add to its chord). Dropping into selection here
        // made the click look like it did nothing. Selecting a note in
        // order to transpose it is what note input OFF is for.
        if (state.noteInput && !state.tool.rest) {
          state.entry = { partId, measureNumber, voiceId, tick: existing.startTick ?? 0, systemIndex };
          state.selection = null;
          insertAtEntry({ step, octave, addToChord: event.shiftKey, staffPosition });
          return;
        }
        state.selection = { partId, measureNumber, voiceId, eventIndex };
        state.entry = { partId, measureNumber, voiceId, tick: existing.startTick ?? 0, systemIndex };
        announce(state.noteInput ? `Measure ${measureNumber}, beat ready.` : 'Note selected.');
        render();
        return;
      }
    }

    // `xToTick`, not `xToPosition`: the latter snaps to the nearest
    // EXISTING note, so in a measure whose only event is on beat 1 every
    // click would land on beat 1 and the user could never write beat 3.
    // `xToTick` is the continuous inverse, and the result is snapped to
    // the current note value's own grid, the way step entry does.
    const rawTick = engine.xToTick(state.result.playback, point.x, systemIndex);
    const position = engine.resolvePosition(state.result.playback, rawTick).position;
    const grid = Math.max(1, durationForTool().ticks);
    const capacity = capacityOf(position.measureNumber);
    const snappedTick = Math.min(
      Math.max(0, capacity - grid),
      Math.round(position.tickInMeasure / grid) * grid,
    );
    const staffPosition = staffPositionFromPoint(staff, point.y);
    const { step, octave } = docTools.pitchFromStaffPosition(clefAt(position.measureNumber), staffPosition);
    state.entry = {
      partId: activePartId(),
      measureNumber: position.measureNumber,
      voiceId: 1,
      tick: snappedTick,
      systemIndex,
    };
    state.selection = null;
    if (state.noteInput) {
      if (state.tool.rest) insertAtEntry({ rest: true });
      else insertAtEntry({ step, octave, staffPosition });
      return;
    }
    announce(`Measure ${position.measureNumber}, ${step}${octave}.`);
    render();
  }

  // ---- metronome ---------------------------------------------------------

  /** Quarter-note BPM from the score's own tempo map (the engine's default is 120). */
  const scoreBpm = () => {
    const segment = state.result?.playback.tempoMap.segments?.[0];
    if (!segment?.microsecondsPerQuarter) return 120;
    return Math.round(60_000_000 / segment.microsecondsPerQuarter);
  };

  /**
   * The metronome mark the score itself carries, so the readout counts the
   * same beat the printed mark does. 6/8 is counted in dotted quarters and
   * 7/8 in eighths, so the unit cannot be guessed from the denominator
   * alone.
   */
  const tempoMark = () => state.tempoMarks?.[0] ?? null;

  const TEMPO_UNIT_GLYPH = {
    whole: '\u{1D15D}',
    half: '\u{1D15E}',
    quarter: '\u2669',
    eighth: '\u266A',
    '16th': '\u{1D161}',
    '32nd': '\u{1D162}',
  };

  const scoreTimeSignature = () => {
    const measureNumber = state.entry?.measureNumber ?? 1;
    const attribute = attributeAt(measureNumber);
    const numerator = attribute?.timeNumerator ?? 4;
    const denominator = attribute?.timeDenominator ?? 4;
    return { numerator, denominator };
  };

  const refreshTempo = () => {
    const { numerator, denominator } = scoreTimeSignature();
    const mark = tempoMark();
    const fallbackUnit = denominator === 8 ? 'eighth' : denominator === 4 ? 'quarter' : 'quarter';
    const unit = mark?.beatUnit ?? fallbackUnit;
    const glyph = TEMPO_UNIT_GLYPH[unit] ?? '\u2669';
    const dots = mark?.beatUnitDots ? '.'.repeat(mark.beatUnitDots) : '';
    // The printed mark counts its own beat; the tempo map counts quarters,
    // so the mark's own number wins whenever the score carries one.
    const bpm = mark?.perMinute ?? scoreBpm();
    tempoOutput.textContent = `${glyph}${dots}=${bpm}`;
    tempoOutput.title = `Tempo ${bpm} BPM · ${numerator}/${denominator}`;
  };

  const clearMetronomeTimers = () => {
    for (const timer of state.metronomeTimers) window.clearTimeout(timer);
    state.metronomeTimers.length = 0;
  };

  /** Schedules the metronome clicks from `fromSeconds` on, using the score's own tempo and metre. */
  const scheduleMetronome = (fromSeconds = 0) => {
    clearMetronomeTimers();
    if (!state.metronomeOn || !state.result) return;
    if (!state.metronome) {
      state.metronome = new (window.AudioContext || window.webkitAudioContext)();
    }
    const context = state.metronome;
    void context.resume();
    const bpm = scoreBpm();
    const { numerator, denominator } = scoreTimeSignature();
    const beatSeconds = (60 * 4) / (bpm * denominator);
    const totalSeconds = Math.max(0, endSeconds() - fromSeconds);
    const firstBeat = Math.ceil(fromSeconds / beatSeconds - 1e-6);
    const beats = Math.ceil(totalSeconds / beatSeconds) + 1;
    const origin = context.currentTime;
    for (let index = 0; index < beats; index += 1) {
      const beatIndex = firstBeat + index;
      const at = origin + beatIndex * beatSeconds - fromSeconds;
      if (at < origin) continue;
      const accented = ((beatIndex % numerator) + numerator) % numerator === 0;
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
  };

  const setMetronome = (on) => {
    state.metronomeOn = on;
    metronomeButton.setAttribute('aria-pressed', String(on));
    metronomeButton.classList.toggle('is-active', on);
    if (on) {
      scheduleMetronome(state.playing ? state.playSeconds : 0);
      announce('Metronome on.');
    } else {
      clearMetronomeTimers();
      announce('Metronome off.');
    }
  };

  // ---- playback ----------------------------------------------------------

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
    if (state.soundTried) throw new Error('Playback is unavailable in this preview.');
    if (state.soundLoading) return state.soundLoading;
    state.soundTried = true;
    const SoundFont = window.NotationSoundFont;
    if (!SoundFont?.R2SoundFontEngine) throw new Error('The sound engine could not be loaded.');
    const configured = window.MSHARING_SOUNDFONT_CONFIG || {};
    const assetId = state.soundAssetId ?? configured.assetId;
    // One creation promise is shared by every caller (Play, the sound
    // tests, and the note preview), so a fast writer never starts two
    // loads of the same SoundFont.
    state.soundLoading = SoundFont.R2SoundFontEngine.create({
      manifestUrl: 'soundfonts/manifest.json',
      processorUrl: 'assets/spessasynth_processor.min.js',
      assetBaseUrl: 'soundfonts',
      ...configured,
      // The manifest's own paths win over the engine's built-in table, so
      // a host that moves an asset only has to update the manifest.
      ...(state.soundAssetPaths ? { assetPaths: state.soundAssetPaths } : {}),
      ...(assetId ? { assetId } : {}),
    }).then((engine) => {
      state.sound = engine;
      state.soundLoading = null;
      return engine;
    }).catch((error) => {
      state.soundLoading = null;
      state.soundTried = false;
      throw error;
    });
    return state.soundLoading;
  };

  /**
   * Sounds a written pitch the moment it is placed, so the writer hears the
   * note instead of pressing Play to check it. The SoundFont is fetched on
   * the first preview and reused; a failed or slow load never blocks the
   * edit -- the note is already committed by the time this runs.
   */
  function previewPitch(pitch, drum = null) {
    if (!state.previewOn || state.playing) return;
    // An unpitched drum has no MIDI number of its own; its sound is the
    // GM key the kit declared for it.
    const midi = drum ? drum.gmNote : engine.midiNoteNumber?.(pitch);
    if (midi === undefined) return;
    void ensureSound()
      .then((sound) => sound.preview?.([midi]))
      .catch(() => {
        /* no sound available; writing still works */
      });
  }

  // ---- SoundFont audition ------------------------------------------------
  //
  // The Sound Engine fetches its SoundFonts from R2 at runtime, and the
  // app has no other way to try one: the Play button needs a loaded
  // score, and there is no page for picking a font. These controls fill
  // that gap -- pick an asset from the manifest, then play a C major
  // scale either as a hand-built event stream ("Test") or through a real
  // render ("Score"), so a font that loads but does not sound is caught
  // here rather than on the next score.

  const C_MAJOR_SCALE = [60, 62, 64, 65, 67, 69, 71, 72];
  /** A font that decodes past this is at risk of exhausting the browser. */
  const LARGE_ASSET_BYTES = 512 * 1024 * 1024;

  const selectedFont = () => state.soundFonts.find((font) => font.id === state.soundAssetId);

  function assetBytes(manifest, assetPath) {
    if (typeof assetPath !== 'string') return undefined;
    const name = assetPath.split('/').pop();
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const match = files.find((file) => typeof file.path === 'string' && file.path.split('/').pop() === name);
    return typeof match?.bytes === 'number' ? match.bytes : undefined;
  }

  function renderSoundFontOptions() {
    if (!soundFontSelect) return;
    soundFontSelect.replaceChildren(
      ...state.soundFonts.map((font) => {
        const option = document.createElement('option');
        option.value = font.id;
        option.textContent = font.label;
        return option;
      }),
    );
    if (state.soundAssetId) soundFontSelect.value = state.soundAssetId;
    const hasFonts = state.soundFonts.length > 0;
    soundFontSelect.disabled = !hasFonts;
    testNoteButton.disabled = !hasFonts;
    testScoreButton.disabled = !hasFonts;
  }

  /** Loads the R2 manifest and fills the picker. Never throws to the caller. */
  async function loadSoundFonts() {
    if (!soundFontSelect) return;
    try {
      if (typeof fetch !== 'function') throw new Error('fetch is unavailable');
      const configured = window.MSHARING_SOUNDFONT_CONFIG || {};
      const manifestUrl = configured.manifestUrl || 'soundfonts/manifest.json';
      const response = await fetch(manifestUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`SoundFont manifest request failed (${response.status}).`);
      const manifest = await response.json();
      const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
      const assetPaths = manifest.runtime?.assetPaths || {};
      state.soundAssetPaths = assetPaths;
      state.soundFonts = assets.map((asset) => {
        const bytes = assetBytes(manifest, assetPaths[asset.id]);
        const megabytes = bytes ? `, ${Math.round(bytes / (1024 * 1024))} MB` : '';
        const oversized = bytes !== undefined && bytes > LARGE_ASSET_BYTES;
        return {
          id: asset.id,
          displayName: asset.displayName || asset.id,
          label: `${asset.displayName || asset.id} (${asset.format || 'sf2'}${megabytes})${oversized ? ' — large' : ''}`,
          oversized,
        };
      });
      const preferred = configured.assetId || manifest.runtime?.defaultAssetId;
      const known = state.soundFonts.some((font) => font.id === preferred);
      state.soundAssetId = known ? preferred : (state.soundFonts[0]?.id ?? null);
      renderSoundFontOptions();
    } catch (error) {
      // Keep the page's own status line for the score; the picker says
      // what went wrong on its own.
      soundFontSelect.replaceChildren(new Option('SoundFonts unavailable', ''));
      soundFontSelect.disabled = true;
      soundFontSelect.title = error instanceof Error ? error.message : 'Could not load the SoundFont list.';
    }
  }

  function disposeSound() {
    if (!state.sound) return;
    try {
      state.sound.destroy?.();
    } catch {
      /* a failed teardown must not block picking another font */
    }
    state.sound = null;
    state.soundLoading = null;
    state.soundTried = false;
  }

  function onSoundFontChange() {
    const id = soundFontSelect?.value;
    if (!id || id === state.soundAssetId) return;
    state.soundAssetId = id;
    disposeSound();
    const font = selectedFont();
    announce(
      font?.oversized
        ? `${font.displayName} is large — it may exhaust browser memory.`
        : `SoundFont: ${font?.displayName ?? id}.`,
    );
  }

  /** (က) A scale as a hand-built event stream — no score involved. */
  function builtScalePlayback() {
    const quarter = engine.TICKS_PER_QUARTER;
    const { tempoMap } = engine.buildTempoMap([{ tick: 0, microsecondsPerQuarter: 500_000 }]);
    const events = C_MAJOR_SCALE.map((midi, index) => {
      const tick = index * quarter;
      return {
        tick,
        seconds: engine.tickToSeconds(tempoMap, tick),
        durationTicks: quarter,
        partId: 'audition',
        noteIds: [],
        midiNotes: [midi],
        measureNumber: 1,
      };
    });
    const totalTicks = C_MAJOR_SCALE.length * quarter;
    return {
      measureNumbersInOrder: [1],
      globalTickOffsetByMeasure: new Map([[1, 0]]),
      measureTicksByNumber: new Map([[1, totalTicks]]),
      timeSignatureByMeasure: new Map([[1, { numerator: 4, denominator: 4 }]]),
      measureLayoutsByNumber: new Map([[1, { width: 0, positionsByTick: new Map(), headerWidth: 0 }]]),
      placementByMeasureNumber: new Map([[1, { x: 0, width: 0, systemIndex: 0, pageIndex: 0, systemY: 0 }]]),
      measureHeaderAllowance: 0,
      tempoMap,
      events,
      tracks: [{ id: 'audition', name: 'Audition' }],
      performance: {
        entries: [],
        totalTicks,
        totalSeconds: engine.tickToSeconds(tempoMap, totalTicks),
        hasRepeats: false,
      },
      repeatDiagnostics: [],
    };
  }

  /** (ခ) The same scale written as MusicXML and put through a real render. */
  function scaleMusicXml() {
    const divisions = 4;
    const eighth = divisions / 2;
    const notes = [
      ['C', 4],
      ['D', 4],
      ['E', 4],
      ['F', 4],
      ['G', 4],
      ['A', 4],
      ['B', 4],
      ['C', 5],
    ];
    const body = notes
      .map(
        ([step, octave]) =>
          `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${eighth}</duration><voice>1</voice></note>`,
      )
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>${divisions}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
    ${body}
  </measure></part>
</score-partwise>`;
  }

  async function playAudition(playback, label) {
    const font = selectedFont();
    const name = font?.displayName ?? state.soundAssetId ?? 'SoundFont';
    announce(`Testing ${name} — ${label}…`);
    try {
      const sound = await ensureSound();
      await sound.play(playback, 1);
      announce(`Test playing — ${name} (${label}).`);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'The sound test failed.');
    }
  }

  async function testBuiltScale() {
    await playAudition(builtScalePlayback(), 'built');
  }

  async function testRenderedScale() {
    try {
      const rendered = engine.renderFromMusicXml(scaleMusicXml(), { domParser: window.DOMParser });
      await playAudition(rendered.playback, 'rendered');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'The test score could not be rendered.');
    }
  }

  /** Total ticks in the score — the whole timeline, rests included. */
  const totalTicks = () => {
    const measures = state.doc?.score.parts[0]?.measures ?? [];
    return measures.reduce((sum, measure) => sum + capacityOf(measure.number), 0);
  };

  const endTick = () => Math.max(totalTicks(), ...(state.result?.playback.events ?? []).map((event) => event.tick + event.durationTicks));

  const endSeconds = () => {
    if (!state.result) return 0;
    return engine.resolvePosition(state.result.playback, endTick()).seconds;
  };

  /** The note id sounding at `tick`, so the cursor can highlight it. */
  const soundingAt = (tick) => {
    const events = state.result?.playback.events ?? [];
    let best = null;
    for (const event of events) {
      if (tick >= event.tick && tick < event.tick + event.durationTicks && (!best || event.tick > best.tick)) {
        best = event;
      }
    }
    return best ? engine.elementIdForNoteId(best.noteIds[0]) : null;
  };

  function frame() {
    if (!state.playing || !state.result) return;
    state.playSeconds = state.playStartSeconds + (performance.now() - state.playStartedAt) / 1000;
    const tick = engine.secondsToTick(state.result.playback.tempoMap, state.playSeconds);
    if (tick >= endTick() || state.playSeconds >= endSeconds() + 0.15) {
      stopPlayback();
      return;
    }
    const id = soundingAt(tick);
    if (id !== state.soundingId) {
      state.soundingId = id;
      render();
    } else {
      const line = scoreHost.querySelector('svg .editor-playhead');
      if (line) {
        line.setAttribute('x', String(engine.computeCursorPlacement(state.result.playback, tick, { mode: 'cursorMoves' }).markerX - 0.06));
      } else {
        render();
      }
    }
    state.rafId = window.requestAnimationFrame(frame);
  }

  function stopPlayback() {
    setPlaying(false);
    if (state.rafId !== null) window.cancelAnimationFrame(state.rafId);
    state.rafId = null;
    state.soundingId = null;
    state.playSeconds = 0;
    clearMetronomeTimers();
    state.sound?.pause?.();
    announce('Stopped.');
    render();
  }

  /** Where playback starts: the entry cursor if there is one, else the top. */
  const startSeconds = () => {
    if (!state.result || !state.entry) return 0;
    const tick = globalTickOf(state.entry.measureNumber, state.entry.tick);
    return Math.max(0, engine.resolvePosition(state.result.playback, tick).seconds);
  };

  async function togglePlay() {
    if (!state.result) return;
    if (state.playing) {
      state.sound?.pause?.();
      clearMetronomeTimers();
      setPlaying(false);
      if (state.rafId !== null) window.cancelAnimationFrame(state.rafId);
      state.rafId = null;
      state.soundingId = null;
      announce('Paused.');
      render();
      return;
    }
    if (!state.sound) {
      announce('Loading playback…');
      try {
        await ensureSound();
      } catch (error) {
        announce(error instanceof Error ? error.message : 'Playback is unavailable.');
      }
    }
    if (state.playSeconds >= endSeconds()) state.playSeconds = startSeconds();
    state.playStartSeconds = state.playSeconds;
    state.playStartedAt = performance.now();
    setPlaying(true);
    state.sound?.play?.(state.result.playback, 1, state.playSeconds);
    if (state.metronomeOn) scheduleMetronome(state.playSeconds);
    state.rafId = window.requestAnimationFrame(frame);
    announce('Playing.');
  }

  // ---- export ------------------------------------------------------------

  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const baseName = () => (state.filename || 'notation').replace(/\.[^.]+$/, '');

  async function runExport(button, kind) {
    if (!state.result?.svg) return;
    button.disabled = true;
    announce(`Preparing ${kind.toUpperCase()}…`);
    try {
      if (kind === 'svg') {
        const svg = engine.exportSvg ? engine.exportSvg(state.result.svg, { title: baseName() }) : state.result.svg;
        download(new Blob([svg], { type: 'image/svg+xml' }), `${baseName()}.svg`);
      } else if (kind === 'pdf') {
        download(new Blob([await engine.exportPdf(state.result.svg, { scale: 2 })], { type: 'application/pdf' }), `${baseName()}.pdf`);
      } else {
        download(new Blob([await engine.exportPng(state.result.svg, { scale: 2 })], { type: 'image/png' }), `${baseName()}.png`);
      }
      announce(`${kind.toUpperCase()} downloaded.`);
    } catch (error) {
      announce(error instanceof Error ? error.message : `Could not export ${kind.toUpperCase()}.`);
    } finally {
      button.disabled = !state.result;
    }
  }

  // Save writes the score into the user's account library (kept in the
  // browser); Export is the way a file leaves the app.
  const SCORE_LIBRARY_KEY = 'msharing-notation-scores';

  const readLibrary = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(SCORE_LIBRARY_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  function saveScore() {
    if (!state.doc) return;
    const name = baseName() || 'Untitled score';
    const xml = docTools.toMusicXml(state.doc);
    const scores = readLibrary();
    const existing = scores.findIndex((score) => score.name === name);
    const record = { name, xml, savedAt: new Date().toISOString() };
    if (existing >= 0) scores[existing] = record;
    else scores.unshift(record);
    try {
      localStorage.setItem(SCORE_LIBRARY_KEY, JSON.stringify(scores.slice(0, 100)));
      announce(`Saved to your account — ${name}.`);
    } catch {
      announce('Could not save to your account — browser storage is full.');
    }
  }

  // ---- toolbar state -----------------------------------------------------

  const syncTools = () => {
    durationButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.editorDuration === state.tool.duration));
    });
    accidentalButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.editorAccidental === state.tool.accidental));
    });
    dotButton.setAttribute('aria-pressed', String(state.tool.dots > 0));
    restButton.setAttribute('aria-pressed', String(state.tool.rest));
    noteInputButton.setAttribute('aria-pressed', String(state.noteInput));
    if (previewButton) previewButton.setAttribute('aria-pressed', String(state.previewOn));
    root.dataset.mode = state.noteInput ? 'input' : 'select';
  };

  function applySetup() {
    const clef = CLEF_SIGN[clefSelect.value] || CLEF_SIGN.treble;
    const fifths = KEY_FIFTHS[keySelect.value] ?? 0;
    const [numerator, denominator] = TIME_PAIR[timeSelect.value] || TIME_PAIR['4/4'];
    commit(
      (doc) => docTools.setSetup(doc, { partId: activePartId(), clef, fifths, numerator, denominator }),
      'Score setup applied.',
    );
  }

  const keyForFifths = (fifths) => Object.keys(KEY_FIFTHS).find((key) => KEY_FIFTHS[key] === fifths) ?? 'C';
  const timeForPair = (numerator, denominator) =>
    Object.keys(TIME_PAIR).find((time) => TIME_PAIR[time][0] === numerator && TIME_PAIR[time][1] === denominator) ?? null;

  /**
   * Points the setup dropdowns at what the loaded score actually says.
   *
   * `applySetup` writes ALL THREE controls at once, so a dropdown left on
   * its default while the score says something else would quietly reset
   * the other two the first time it was touched: open a 3/4 score in G and
   * change only the clef, and the meter would snap back to 4/4. A value the
   * control has no option for is left alone rather than guessed at.
   */
  function syncSetupControls() {
    syncPartSelect();
    const attribute = attributeAt(1);
    if (!attribute) return;
    const clefName = docTools.clefNameFromSign(attribute.clefsByStaff?.[1]?.sign ?? attribute.clefSign ?? 'G');
    if (CLEF_SIGN[clefName]) clefSelect.value = clefName;
    const key = keyForFifths(attribute.fifths ?? 0);
    if (KEY_FIFTHS[key] !== undefined) keySelect.value = key;
    const time = timeForPair(attribute.timeNumerator, attribute.timeDenominator);
    if (time) timeSelect.value = time;
  }

  /**
   * The part list. A one-part score hides the control rather than showing
   * a dropdown with a single choice, and a kit part is labelled as such so
   * it is clear why clicking a line writes a drum and not a pitch.
   */
  function syncPartSelect() {
    if (!partSelect) return;
    const parts = state.doc?.score.parts ?? [];
    const options = parts.map((part) => ({
      value: part.id,
      label: state.drumInstruments?.has(part.id) ? `${part.name} (percussion)` : part.name,
    }));
    // Rebuilding the options on every render would close an open menu, so
    // only touch the DOM when the part list itself changed.
    const signature = options.map((option) => `${option.value}:${option.label}`).join('|');
    if (partSelect.dataset.signature !== signature) {
      partSelect.textContent = '';
      for (const option of options) {
        const node = document.createElement('option');
        node.value = option.value;
        node.textContent = option.label;
        partSelect.append(node);
      }
      partSelect.dataset.signature = signature;
    }
    partSelect.value = activePartId();
    // A single-part score has nothing to choose, so the whole group goes
    // away -- leaving its divider behind would show an empty separator.
    const group = partSelect.closest('.editor-toolbar__group');
    const divider = group?.previousElementSibling;
    const hide = options.length <= 1;
    partSelect.hidden = hide;
    if (group) group.hidden = hide;
    if (divider?.classList.contains('editor-toolbar__divider')) divider.hidden = hide;
  }

  /** Switching part is a change of target, not an edit: the clef and key
   *  dropdowns follow, so the next note lands in the part on screen. */
  function onPartChange() {
    const partId = partSelect.value;
    if (!state.doc?.score.parts.some((part) => part.id === partId)) return;
    state.activePartId = partId;
    const measureNumber = Math.min(state.entry?.measureNumber ?? 1, measureCountOf(partId));
    state.entry = { partId, measureNumber, voiceId: state.entry?.voiceId ?? 1, tick: 0, systemIndex: state.entry?.systemIndex ?? 0 };
    state.selection = null;
    syncSetupControls();
    render();
    announce(`Writing into ${partNameOf(partId)}.`);
  }

  // ---- wiring ------------------------------------------------------------

  backButton.addEventListener('click', () => window.location.assign('notation.html'));
  saveButton.addEventListener('click', saveScore);
  undoButton.addEventListener('click', undo);
  redoButton.addEventListener('click', redo);
  playButton.addEventListener('click', () => void togglePlay());

  if (soundFontSelect) soundFontSelect.addEventListener('change', onSoundFontChange);
  if (testNoteButton) testNoteButton.addEventListener('click', () => void testBuiltScale());
  if (testScoreButton) testScoreButton.addEventListener('click', () => void testRenderedScale());
  if (previewButton) previewButton.addEventListener('click', () => {
    state.previewOn = !state.previewOn;
    syncTools();
    if (state.previewOn) {
      announce('Note preview on — you will hear each note as you write.');
      const octave = currentOctave();
      previewPitch({ kind: 'pitched', step: 'C', alter: 0, octave });
    } else {
      announce('Note preview off.');
    }
  });

  noteInputButton.addEventListener('click', () => {
    state.noteInput = !state.noteInput;
    syncTools();
    announce(state.noteInput ? 'Note input on — click the staff to write.' : 'Note input off.');
  });
  addMeasureButton.addEventListener('click', () => commit((doc) => docTools.appendMeasure(doc, activePartId()), 'Measure added.'));
  removeMeasureButton.addEventListener('click', () => commit((doc) => docTools.removeLastMeasure(doc, activePartId()), 'Measure removed.'));

  scoreHost.addEventListener('pointerdown', onScorePointerDown);

  zoomIn.addEventListener('click', () => { state.zoom += 10; updateZoom(); });
  zoomOut.addEventListener('click', () => { state.zoom -= 10; updateZoom(); });
  viewToggle.addEventListener('click', () => setViewMenu(viewList.hidden));
  viewButtons.forEach((button) => button.addEventListener('click', () => {
    setView(button.dataset.editorView);
    setViewMenu(false);
    announce(button.dataset.editorView === 'scroll' ? 'Horizontal view.' : 'Page view.');
  }));

  metronomeButton.addEventListener('click', () => setMetronome(!state.metronomeOn));

  exportToggle.addEventListener('click', () => setExportMenu(exportList.hidden));
  exportPdf.addEventListener('click', () => { setExportMenu(false); void runExport(exportPdf, 'pdf'); });
  exportSvg.addEventListener('click', () => { setExportMenu(false); void runExport(exportSvg, 'svg'); });
  exportPng.addEventListener('click', () => { setExportMenu(false); void runExport(exportPng, 'png'); });
  document.addEventListener('pointerdown', (event) => {
    if (!exportList.hidden && !event.target.closest('[data-editor-export-menu]')) setExportMenu(false);
    if (!viewList.hidden && !event.target.closest('[data-editor-view-menu]')) setViewMenu(false);
  });

  durationButtons.forEach((button) => button.addEventListener('click', () => {
    state.tool.duration = button.dataset.editorDuration;
    syncTools();
    announce(`Note value: ${button.getAttribute('aria-label')}.`);
  }));
  accidentalButtons.forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.editorAccidental;
    state.tool.accidental = state.tool.accidental === value ? null : value;
    syncTools();
    announce(state.tool.accidental ? `${button.getAttribute('aria-label')} selected.` : 'Accidental cleared.');
  }));
  dotButton.addEventListener('click', () => {
    state.tool.dots = state.tool.dots > 0 ? 0 : 1;
    syncTools();
    announce(state.tool.dots ? 'Dot on.' : 'Dot off.');
  });
  restButton.addEventListener('click', () => {
    state.tool.rest = !state.tool.rest;
    syncTools();
    announce(state.tool.rest ? 'Rests on.' : 'Rests off.');
  });

  [clefSelect, keySelect, timeSelect].forEach((select) => select.addEventListener('change', applySetup));
  if (partSelect) partSelect.addEventListener('change', onPartChange);

  document.addEventListener('keydown', (event) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName || '');
    if (typing) return;
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); saveScore(); return; }
    if (modifier && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); return; }
    if (modifier && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) { event.preventDefault(); redo(); return; }
    if (modifier && event.key === '=') { event.preventDefault(); state.zoom += 10; updateZoom(); return; }
    if (modifier && event.key === '-') { event.preventDefault(); state.zoom -= 10; updateZoom(); return; }
    if (event.code === 'Space') { event.preventDefault(); void togglePlay(); return; }

    if (event.key === 'Escape') { state.selection = null; render(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveSelection(1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(-1); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); transposeSelection(event.shiftKey ? 12 : 1); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); transposeSelection(event.shiftKey ? -12 : -1); return; }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelection(); return; }

    if (SHORTCUT_DURATION[event.key]) {
      state.tool.duration = SHORTCUT_DURATION[event.key];
      syncTools();
      announce(`Note value: ${state.tool.duration}.`);
      return;
    }
    if (event.key === '.') { state.tool.dots = state.tool.dots > 0 ? 0 : 1; syncTools(); return; }
    if (event.key.toLowerCase() === 'n') {
      state.noteInput = !state.noteInput;
      syncTools();
      announce(state.noteInput ? 'Note input on.' : 'Note input off.');
      return;
    }
    if (event.key.toLowerCase() === 'm') { setMetronome(!state.metronomeOn); return; }
    if (event.key === '0' || event.key.toLowerCase() === 'r') {
      if (state.noteInput) insertAtEntry({ rest: true });
      else { state.tool.rest = !state.tool.rest; syncTools(); }
      return;
    }

    const letter = event.key.toUpperCase();
    if (state.noteInput && docTools.STEPS.includes(letter)) {
      event.preventDefault();
      insertAtEntry({ step: letter, octave: currentOctave(), addToChord: event.shiftKey });
    }
  });

  // ---- entry handoff -----------------------------------------------------

  function restoreHandoff() {
    const intent = new URLSearchParams(window.location.search).get('intent');
    const pending = sessionStorage.getItem('notation-lab-pending-file');
    if (pending) {
      sessionStorage.removeItem('notation-lab-pending-file');
      try {
        const payload = JSON.parse(pending);
        const binary = atob(payload.data);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const file = new File([bytes], payload.name, { type: payload.type || 'application/octet-stream' });
        void readFile(file);
        return;
      } catch {
        showEmpty('The selected file could not be reopened. Please choose it again.');
        return;
      }
    }
    if (intent === 'open') {
      showEmpty('No file was handed over. Please choose one from the Notation Lab.');
      return;
    }
    // "Create" asks for the instruments and the score's basics first; the
    // wizard leaves that answer in sessionStorage for this page to build.
    const newScore = sessionStorage.getItem('notation-lab-new-score');
    if (newScore && window.NotationNewScore) {
      sessionStorage.removeItem('notation-lab-new-score');
      try {
        const spec = window.NotationNewScore.normaliseSpec(JSON.parse(newScore));
        loadXml(window.NotationNewScore.buildMusicXml(spec), `${spec.title}.musicxml`);
        syncSetupControls();
        return;
      } catch {
        // Fall through to the starter score: a broken handoff must still
        // open something writable.
      }
    }
    // A bare visit, or "create": start a new score. An editor with no staff
    // and every control disabled gives a writer nothing to click, which
    // reads as "I cannot write a note here" -- the opposite of this page's
    // purpose.
    try {
      loadXml(starterMusicXml(), 'Untitled score.musicxml');
    } catch (error) {
      showEmpty(error.message);
    }
  }

  tempoOutput.textContent = '\u2669=120';
  syncTools();
  setControlsEnabled(false);
  updateZoom();
  restoreHandoff();
  void loadSoundFonts();
})();
