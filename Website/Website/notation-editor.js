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
  const toolbarStack = document.querySelector('[data-editor-toolbars]');

  const engine = window.NotationEngine;
  const docTools = window.NotationDoc;
  const pick = (selector) => document.querySelector(selector);

  const backButton = pick('[data-editor-back]');
  const undoButton = pick('[data-editor-undo]');
  const redoButton = pick('[data-editor-redo]');
  const noteInputButton = pick('[data-editor-note-input]');
  const addMeasureButton = pick('[data-editor-add-measure]');
  const removeMeasureButton = pick('[data-editor-remove-measure]');
  const scoreHost = pick('[data-editor-score]');
  const statusMessage = pick('[data-editor-status]');
  const statusFile = pick('[data-editor-file]');
  const clefSelect = pick('[data-editor-clef]');
  const keySelect = pick('[data-editor-key]');
  const timeSelect = pick('[data-editor-time]');
  const partSelect = pick('[data-editor-part]');
  const exportPdf = pick('[data-editor-export-pdf]');
  const exportSvg = pick('[data-editor-export-svg]');
  const exportPng = pick('[data-editor-export-png]');
  const exportToggle = pick('[data-editor-export-toggle]');
  const exportList = pick('[data-editor-export-list]');
  const playButton = pick('[data-editor-play]');
  const stopButton = pick('[data-editor-stop]');
  const metronomeButton = pick('[data-editor-metronome]');
  const saveButton = pick('[data-editor-save]');
  const soundFontSelect = pick('[data-editor-soundfont]');
  const testNoteButton = pick('[data-editor-test-note]');
  const testScoreButton = pick('[data-editor-test-score]');
  const previewButton = pick('[data-editor-preview]');
  const durationButtons = [...document.querySelectorAll('[data-editor-duration]')];
  const accidentalButtons = [...document.querySelectorAll('[data-editor-accidental]')];
  const dotButtons = [...document.querySelectorAll('[data-editor-dots]')];
  const tieButton = pick('[data-editor-tie]');
  const slurButton = pick('[data-editor-slur]');
  const articulationButtons = [...document.querySelectorAll('[data-editor-articulation]')];
  const dynamicButtons = [...document.querySelectorAll('[data-editor-dynamic]')];
  const flipButton = pick('[data-editor-flip]');
  const copyButton = pick('[data-editor-copy]');
  const cutButton = pick('[data-editor-cut]');
  const deleteButton = pick('[data-editor-delete]');
  const pasteButton = pick('[data-editor-paste]');
  const restButton = pick('[data-editor-rest]');
  const zoomInButton = pick('[data-editor-zoom-in]');
  const zoomOutButton = pick('[data-editor-zoom-out]');
  const zoomOutput = pick('[data-editor-zoom]');
  const lengthOutput = pick('[data-editor-length]');
  const popoverTriggers = [...document.querySelectorAll('[data-editor-popover]')];
  const popoverPanels = [...document.querySelectorAll('[data-editor-popover-panel]')];
  const overflowGroup = pick('[data-editor-overflow-group]');
  const overflowPanel = pick('[data-editor-popover-panel="overflow"]');
  const overflowTrigger = pick('[data-editor-popover="overflow"]');
  const voiceSelect = pick('[data-editor-voice]');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  // A4 in staff spaces at the engine's own 1.75mm spatium -- the engraving
  // scale MuseScore and other engravers default to, with 10mm margins.
  // The engine's page default (30 x 42) is 7mm per staff space, four times
  // larger, which drew every note four times too big for the sheet.
  const PAGE_A4 = {
    pageWidth: 120,
    pageHeight: 169.7,
    marginTop: 5.7,
    marginBottom: 5.7,
    marginLeft: 5.7,
    marginRight: 5.7,
  };
  const ACCIDENTAL_ALTER = { 'double-sharp': 2, sharp: 1, natural: 0, flat: -1, 'double-flat': -2 };
  const SHORTCUT_DURATION = {
    '1': 'whole', '2': 'half', '3': 'quarter', '4': 'eighth', '5': '16th', '6': '32nd', '7': '64th',
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
    // The full selection, as cells. A plain click leaves exactly one; a
    // Shift-click or a rubber band leaves many. `selection` stays the
    // anchor (where the cursor sits), `range` is what is painted and what
    // commands act on -- MuseScore's own split between the anchor note and
    // the blue band.
    range: [],
    drag: null,
    marquee: null,
    // The voice being written into. A measure can hold up to four, and a
    // voice is the only way to write a second line on one staff.
    voice: 1,
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
    // The metronome's count-in: the score waits a bar before its first
    // note, and the sound engine is started when that bar ends.
    countInEndsAt: 0,
    soundTimer: null,
    // metronome
    metronomeOn: false,
    metronome: null,
    metronomeTimers: [],
    // Oscillators already scheduled on the audio clock. They keep sounding
    // once scheduled, so stopping the metronome has to stop these too.
    metronomeNodes: [],
  };

  const announce = (message) => { statusMessage.textContent = message; };
  const setFile = (name) => { statusFile.textContent = name || ''; };

  // ---- starter score -----------------------------------------------------

  const CLEF_SIGN = { treble: { sign: 'G', line: 2 }, bass: { sign: 'F', line: 4 }, alto: { sign: 'C', line: 3 } };
  const KEY_FIFTHS = { C: 0, G: 1, D: 2, F: -1 };
  const TIME_PAIR = { '4/4': [4, 4], '3/4': [3, 4], '2/4': [2, 4], '6/8': [6, 8] };

  function starterMusicXml() {
    const clef = CLEF_SIGN[clefSelect?.value] || CLEF_SIGN.treble;
    const fifths = KEY_FIFTHS[keySelect?.value] ?? 0;
    const [beats, beatType] = TIME_PAIR[timeSelect?.value] || TIME_PAIR['4/4'];
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

  /**
   * The same lookup against an arbitrary document. A drag reads its base
   * document (the one from before the gesture) rather than the live one,
   * so repeated pointer moves never compound on each other.
   */
  const eventsInFrom = (doc, measureNumber, voiceId, partId) => {
    const measure = doc?.score.parts.find((part) => part.id === partId)
      ?.measures.find((m) => m.number === measureNumber);
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
      .map((line) => ({
        y: Number(line.getAttribute('y1')),
        left: Math.min(Number(line.getAttribute('x1')), Number(line.getAttribute('x2'))),
        right: Math.max(Number(line.getAttribute('x1')), Number(line.getAttribute('x2'))),
      }));
    const ys = [...new Set(lines.map((line) => line.y))].sort((a, b) => a - b);
    const staves = [];
    let run = [];
    const closeRun = () => {
      if (run.length < 5) return;
      const band = run.map((y) => y.y);
      staves.push({
        systemIndex: staves.length,
        topY: band[0],
        bottomY: band[band.length - 1],
        leftX: Math.min(...run.map((line) => line.left)),
        rightX: Math.max(...run.map((line) => line.right)),
      });
    };
    for (const y of ys) {
      const previous = run[run.length - 1]?.y;
      if (previous === undefined || Math.abs(y - previous - 1) < 0.01) run.push(...lines.filter((line) => line.y === y));
      else { closeRun(); run = lines.filter((line) => line.y === y); }
    }
    closeRun();
    return staves;
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

  /**
   * The staff whose vertical band the point is in.
   *
   * The band is the five lines plus two spaces of ledger room above and
   * below, which is where a note can be written. A point outside every band
   * is not on any staff and returns null: a click in the margin, on the
   * title, or between two systems must not drop a note into the score.
   * Callers that only need a reference staff for measuring (a pitch drag)
   * ask for `nearest`.
   */
  function staffAt(staves, y, { nearest = false } = {}) {
    if (staves.length === 0) return null;
    const inside = staves.find((staff) => y >= staff.topY - 2 && y <= staff.bottomY + 2);
    if (inside) return inside;
    if (!nearest) return null;
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
   * `bottomY + position`. Clicks are clamped to two ledger lines either
   * side of the staff rather than sent off the page.
   */
  function staffPositionFromPoint(staff, y) {
    if (!staff) return 0;
    const raw = y - staff.bottomY;
    // The staff is four spaces tall, so the top line sits at -4. A ledger
    // line above or below is one more space, and two of them is as far as a
    // click may reach; the band `staffAt` accepts is exactly this range.
    const lowest = staff.topY - staff.bottomY - 2;
    return Math.round(Math.min(2, Math.max(lowest, raw)) * 2) / 2;
  }

  /**
   * Whether a point can be written on: inside a staff's five lines plus
   * two ledger spaces, and within the horizontal run of the staff itself.
   * Everything else on the page -- the margins, the title, the gap between
   * two systems -- is not part of the score, so a click there writes
   * nothing rather than dropping a note at a clamped position.
   */
  function pointOnStaff(staff, point) {
    if (!staff) return false;
    const bandTop = staff.topY - 2;
    const bandBottom = staff.bottomY + 2;
    if (point.y < bandTop || point.y > bandBottom) return false;
    if (staff.leftX !== undefined && point.x < staff.leftX - 1) return false;
    if (staff.rightX !== undefined && point.x > staff.rightX + 1) return false;
    return true;
  }

  // ---- rendering ---------------------------------------------------------

  const setControlsEnabled = (enabled) => {
    [exportToggle, exportPdf, exportSvg, exportPng, addMeasureButton, removeMeasureButton, playButton, stopButton, metronomeButton, saveButton]
      .forEach((control) => { if (control) control.disabled = !enabled; });
    if (!enabled) setExportMenu(false);
  };

  const setExportMenu = (open) => {
    if (exportList) exportList.hidden = !open;
    if (exportToggle) exportToggle.setAttribute('aria-expanded', String(open));
  };

  const updateZoom = () => {
    state.zoom = Math.min(200, Math.max(50, state.zoom));
    // A CSS `zoom` on the host would scale the box and its 100%-wide child
    // together, leaving the sheet the same size. Widening the sheet itself
    // is what actually makes the music bigger.
    scoreHost.style.setProperty('--editor-zoom', `${state.zoom}%`);
    scoreHost.style.setProperty('--editor-zoom-factor', String(state.zoom / 100));
    if (zoomOutput) zoomOutput.textContent = `${state.zoom}%`;
  };

  // ---- toolbar popovers --------------------------------------------------

  /**
   * Opens the panel under its trigger, clamped to the window.
   *
   * The row scrolls sideways on a narrow screen, so a panel left to CSS
   * would be clipped by that scroll box. It is `position:fixed` and placed
   * here from the trigger's own box: right-aligned to the trigger when
   * there is room, shifted left when the panel would run off the right
   * edge, and flipped above the trigger when it would run off the bottom.
   * That is what keeps it inside the webview at any width.
   */
  const placePopover = (trigger, panel) => {
    const anchor = trigger.getBoundingClientRect();
    const margin = 8;
    // Two passes: a panel that wraps to a second row grows taller than the
    // box measured before it was laid out, so the first placement can still
    // touch the edge. Re-measuring after the write settles it.
    for (let pass = 0; pass < 2; pass += 1) {
      const box = panel.getBoundingClientRect();
      const maxLeft = window.innerWidth - box.width - margin;
      const left = Math.max(margin, Math.min(anchor.left, maxLeft));
      const below = anchor.bottom + 6;
      const top = below + box.height <= window.innerHeight - margin
        ? below
        : Math.max(margin, anchor.top - box.height - 6);
      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${Math.round(top)}px`;
    }
  };

  const closePopovers = (except = null) => {
    popoverTriggers.forEach((trigger) => {
      if (trigger === except) return;
      trigger.setAttribute('aria-expanded', 'false');
      const panel = popoverPanels.find((node) => node.dataset.editorPopoverPanel === trigger.dataset.editorPopover);
      if (panel) panel.hidden = true;
    });
  };

  const togglePopover = (trigger) => {
    const panel = popoverPanels.find((node) => node.dataset.editorPopoverPanel === trigger.dataset.editorPopover);
    if (!panel) return;
    const open = panel.hidden;
    closePopovers(trigger);
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) placePopover(trigger, panel);
  };

  // ---- toolbar overflow --------------------------------------------------

  /**
   * Keeps the tools in the order they were written, and folds only what
   * would run past the window.
   *
   * The row is measured as it is: as long as it fits, every tool stays on
   * it. When it would run past the edge, the groups at the end are moved
   * -- unchanged, same order -- into the box behind the "more" icon, which
   * takes their place on the row. Undo and Redo sit after that icon, so
   * history is never behind a box.
   */
  const historyGroup = root.querySelector('.editor-toolbar__group[aria-label="History"]');
  const toolbarUnits = [];
  const overflowDivider = overflowGroup?.previousElementSibling?.hasAttribute('data-editor-divider')
    ? overflowGroup.previousElementSibling
    : null;
  if (overflowGroup && historyGroup) {
    let pendingDivider = null;
    for (const node of [...root.children]) {
      if (node === overflowGroup || node === historyGroup) break;
      if (node.hasAttribute('data-editor-divider')) { pendingDivider = node; continue; }
      if (node.classList.contains('editor-toolbar__group')) {
        toolbarUnits.push({ group: node, divider: pendingDivider });
        pendingDivider = null;
      }
    }
  }

  const layoutToolbar = () => {
    if (!overflowGroup || !overflowPanel || !historyGroup) return;

    // Put every unit back on the row in its written order first, so a
    // wider window brings the tools back out of the box.
    for (const { group, divider } of toolbarUnits) {
      group.hidden = false;
      if (divider) {
        divider.hidden = false;
        root.insertBefore(divider, overflowGroup);
      }
      root.insertBefore(group, overflowGroup);
    }
    overflowGroup.hidden = true;
    if (overflowDivider) overflowDivider.hidden = true;
    overflowPanel.replaceChildren();

    // No layout to measure against (a hidden page, or a test runner): keep
    // every tool on the row rather than folding the whole row away.
    if (!(root.clientWidth > 0)) return;

    const overflowing = () => root.scrollWidth > root.clientWidth + 1;
    if (!overflowing()) return;

    // The icon itself takes room, so show it before deciding how much is
    // left; if the row fits again with it, nothing needs folding.
    overflowGroup.hidden = false;
    if (overflowDivider) overflowDivider.hidden = false;
    if (!overflowing()) {
      overflowGroup.hidden = true;
      if (overflowDivider) overflowDivider.hidden = true;
      return;
    }

    for (let index = toolbarUnits.length - 1; index >= 0 && overflowing(); index -= 1) {
      const { group, divider } = toolbarUnits[index];
      if (divider) divider.hidden = true;
      // Prepending keeps the written order: the last unit moved is the
      // first one in the box.
      overflowPanel.prepend(group);
    }
  };

  let toolbarWidth = -1;
  const relayoutToolbar = () => {
    const width = root.clientWidth;
    if (width === toolbarWidth) return;
    toolbarWidth = width;
    layoutToolbar();
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

    // The anchor gets the solid highlight; the rest of the range gets the
    // lighter band, so a long selection still shows where the cursor is.
    for (const cell of state.range) {
      mark(engine.notationEventId(cell.partId, cell.measureNumber, cell.voiceId, cell.eventIndex));
    }
    if (state.selection) {
      const id = engine.notationEventId(
        state.selection.partId, state.selection.measureNumber, state.selection.voiceId, state.selection.eventIndex,
      );
      mark(id);
      const anchor = svg.querySelector(`[data-id="${id}"]`);
      if (anchor && state.range.length > 1) anchor.setAttribute('data-editor-anchor', 'true');
    }
    if (state.soundingId) mark(state.soundingId);

    // While the score plays, the playhead is the cursor. Drawing the entry
    // cursor as well would put two vertical lines on the staff pointing at
    // different beats, which reads as the editor losing its place.
    if (state.entry && state.result && !state.playing) {
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
      // Same mapping the play loop uses: on a repeated score the marker
      // must jump back with the music instead of running off the end.
      const tick = writtenTickAt(state.playSeconds);
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

    if (state.marquee) {
      const { x, y, width, height } = state.marquee;
      overlay.appendChild(svgElement('rect', {
        class: 'editor-marquee',
        x,
        y,
        width,
        height,
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
      // A page-mode score is drawn as a stack of sheets, the way an
      // engraving program shows it: a visible gap between pages, and each
      // page's systems spread down to the bottom margin so a page reads as
      // full rather than half-empty. Scroll mode has neither.
      const result = engine.renderParsedMusicXml(state.doc, {
        config: {
          layout: { mode: state.layout },
          ...(state.layout === 'page'
            ? { page: { ...PAGE_A4, gapBetweenPages: 3, verticalJustify: true } }
            : {}),
        },
      });
      const parsed = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
      const svg = parsed.documentElement;
      if (parsed.querySelector('parsererror') || svg?.localName !== 'svg') {
        throw new Error('The score renderer returned invalid SVG.');
      }
      const imported = document.importNode(svg, true);
      state.result = result;
      scoreHost.replaceChildren(imported);
      scoreHost.hidden = false;
      scoreHost.dataset.layout = state.layout;
      applyOverlays(imported, detectStaves(imported));
      setControlsEnabled(true);
      syncHistory();
      syncPartSelect();
      // The tie and flip buttons read the selection, so their pressed state
      // has to follow every redraw, not only the tool clicks.
      syncTools();
      updateZoom();
      updateLength();
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
    clearSelection();
    state.entry = null;
    state.history.length = 0;
    state.future.length = 0;
    scoreHost.hidden = true;
    scoreHost.replaceChildren();
    setControlsEnabled(false);
    syncHistory();
    syncPartSelect();
    setFile('');
    updateLength();
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
    clearSelection();
    state.entry = { partId: activePartId(), measureNumber: 1, voiceId: state.voice, tick: 0, systemIndex: 0 };
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
      clearSelection();
    }
    state.range = state.range.filter((cell) => eventsIn(cell.measureNumber, cell.voiceId)[cell.eventIndex]);
  }

  /** The selected cells, falling back to the anchor when no range is painted. */
  const selectedCells = () =>
    state.range.length > 0 ? state.range : state.selection ? [state.selection] : [];

  /** The event behind a cell, or null when the cell has gone stale. */
  const eventFor = (cell) =>
    cell ? eventsIn(cell.measureNumber, cell.voiceId)[cell.eventIndex] ?? null : null;

  function setSelection(cells, anchor = null) {
    state.range = cells;
    state.selection = anchor ?? cells[0] ?? null;
  }

  /**
   * Selects one event. With `extend`, the range grows from the existing
   * anchor to this event -- MuseScore's Shift-click. The span is taken in
   * reading order (measure, then voice, then event index), so extending
   * backwards works as well as forwards.
   */
  function selectEvent(partId, measureNumber, voiceId, eventIndex, { extend = false } = {}) {
    const events = eventsIn(measureNumber, voiceId);
    const anchor = state.selection;
    const target = { partId, measureNumber, voiceId, eventIndex };
    if (extend && anchor) {
      const from = { ...anchor };
      const cells = [];
      const ordered = cellsBetween(from, target);
      cells.push(...ordered);
      setSelection(cells, anchor);
      state.entry = {
        partId: anchor.partId,
        measureNumber: anchor.measureNumber,
        voiceId: anchor.voiceId,
        tick: eventFor(anchor)?.startTick ?? 0,
        systemIndex: state.entry?.systemIndex ?? 0,
      };
      render();
      return;
    }
    setSelection([target], target);
    state.entry = {
      partId,
      measureNumber,
      voiceId,
      tick: events[eventIndex]?.startTick ?? 0,
      systemIndex: state.entry?.systemIndex ?? 0,
    };
    render();
  }

  /**
   * Every event from `from` to `to` in reading order, inclusive.
   *
   * A score reads measure by measure, and within a measure voice by
   * voice. Both ends can sit anywhere, so the walk starts at whichever
   * comes first and stops at whichever comes last -- which is what makes
   * a Shift-click backwards behave the same as one forwards.
   */
  function cellsBetween(from, to) {
    const key = (cell) => [cell.measureNumber, cell.voiceId, cell.eventIndex];
    const compare = (a, b) => {
      const [am, av, ae] = key(a);
      const [bm, bv, be] = key(b);
      return am - bm || av - bv || ae - be;
    };
    const [start, end] = compare(from, to) <= 0 ? [from, to] : [to, from];
    const cells = [];
    for (let measureNumber = start.measureNumber; measureNumber <= end.measureNumber; measureNumber += 1) {
      const measure = partById(activePartId())?.measures.find((m) => m.number === measureNumber);
      if (!measure) continue;
      for (const voice of measure.voices) {
        const count = voice.events.length;
        for (let eventIndex = 0; eventIndex < count; eventIndex += 1) {
          const cell = { partId: activePartId(), measureNumber, voiceId: voice.id, eventIndex };
          if (compare(cell, start) < 0 || compare(cell, end) > 0) continue;
          cells.push(cell);
        }
      }
    }
    return cells;
  }

  /** Ctrl+A: every note in the active part, as one range. */
  function selectAll() {
    if (!state.doc) return;
    const partId = activePartId();
    const measures = partById(partId)?.measures ?? [];
    const cells = [];
    for (const measure of measures) {
      for (const voice of measure.voices) {
        for (let eventIndex = 0; eventIndex < voice.events.length; eventIndex += 1) {
          if (voice.events[eventIndex].kind === 'rest') continue;
          cells.push({ partId, measureNumber: measure.number, voiceId: voice.id, eventIndex });
        }
      }
    }
    if (cells.length === 0) {
      announce('Nothing to select.');
      return;
    }
    setSelection(cells, cells[0]);
    state.entry = {
      partId,
      measureNumber: cells[0].measureNumber,
      voiceId: cells[0].voiceId,
      tick: eventFor(cells[0])?.startTick ?? 0,
      systemIndex: state.entry?.systemIndex ?? 0,
    };
    announce(`Selected ${cells.length} note${cells.length === 1 ? '' : 's'}.`);
    render();
  }

  /** Clears the selection and any painted range. */
  function clearSelection() {
    state.range = [];
    state.selection = null;
  }

  // ---- palette -----------------------------------------------------------
  //
  // A palette mark is a property of a note, not a mode: clicking "staccato"
  // applies it to the selection and the button stays lit while every
  // selected note already carries it. Clicking again removes it, which is
  // how MuseScore's palette toggles work and saves a separate eraser.

  /** Fills the toolbar's bare glyph buttons from the engine's own font. */
  function paintToolGlyphs() {
    for (const host of document.querySelectorAll('[data-editor-glyph]')) {
      const glyph = engine.getGlyph?.(host.dataset.editorGlyph);
      if (glyph?.char) host.textContent = glyph.char;
    }
  }

  // A fermata is a single flag on the note rather than a list, so it is
  // patched through its own boolean field instead of an array.
  const MARKS = {
    articulation: { field: 'articulations' },
    ornament: { field: 'ornaments' },
    fermata: { field: 'hasFermata' },
  };

  /** The notes a palette action should touch: the selection, minus rests. */
  const paletteTargets = () =>
    selectedCells().filter((cell) => {
      const event = eventFor(cell);
      return event && event.kind !== 'rest';
    });

  const noteCarries = (note, kind, value) => {
    if (kind === 'fermata') return Boolean(note.hasFermata);
    return (note[MARKS[kind].field] ?? []).includes(value);
  };

  const eventNotes = (event) => (event.kind === 'chord' ? event.notes : [event]);

  /**
   * True when every selected note already starts a tie, so the button can
   * show its pressed state and the click knows to remove instead of add.
   */
  const selectionTied = () =>
    paletteTargets().length > 0 &&
    paletteTargets().every((cell) => eventNotes(eventFor(cell)).every((note) => note.tieStart));

  /** The event that begins exactly where `event` ends, in the same voice. */
  function eventAfter(cell, event) {
    const end = (event.startTick ?? 0) + event.duration.ticks;
    const measure = partById(cell.partId)?.measures.find((m) => m.number === cell.measureNumber);
    const events = measure?.voices.find((v) => v.id === cell.voiceId)?.events ?? [];
    const next = events[events.indexOf(event) + 1];
    return next && (next.startTick ?? 0) === end ? next : null;
  }

  const samePitchAs = (event, notes) => {
    const others = eventNotes(event);
    return notes.every((note) =>
      others.some((other) => JSON.stringify(other.pitch) === JSON.stringify(note.pitch)),
    );
  };

  /**
   * Tie: joins each selected note to the next note of the same pitch in its
   * own voice. Start and stop are written as one command, so undo takes the
   * whole tie away instead of leaving half of it behind.
   */
  function toggleTie() {
    const cells = paletteTargets();
    if (cells.length === 0) {
      announce('Select a note first.');
      return;
    }
    const removing = selectionTied();
    const edits = [];
    for (const cell of cells) {
      const event = eventFor(cell);
      if (!event) continue;
      if (removing) {
        // Both halves come off together, or the next note keeps a stop tie
        // that no longer has a start to meet.
        const target = eventAfter(cell, event);
        edits.push({
          cell,
          patch: { tieStart: null },
          ...(target ? { next: { ...cell, eventIndex: cell.eventIndex + 1 }, nextPatch: { tieStop: null } } : {}),
        });
        continue;
      }
      const target = eventAfter(cell, event);
      // A tie needs a following note of the same pitch to land on; anything
      // else would draw into thin air and be dropped by the renderer.
      if (!target || target.kind === 'rest' || !samePitchAs(target, eventNotes(event))) continue;
      edits.push({ cell, patch: { tieStart: true }, next: { ...cell, eventIndex: cell.eventIndex + 1 }, nextPatch: { tieStop: true } });
    }
    if (edits.length === 0) {
      announce(removing ? 'No tie to remove.' : 'Nothing to tie to — a tie needs the same pitch on the next beat.');
      return;
    }
    commit((doc) => {
      let next = doc;
      for (const edit of edits) {
        const { partId, measureNumber, voiceId, eventIndex } = edit.cell;
        next = docTools.patchEvent(next, { partId, measureNumber, voiceId, eventIndex, patch: edit.patch });
        if (edit.next) {
          next = docTools.patchEvent(next, {
            partId: edit.next.partId,
            measureNumber: edit.next.measureNumber,
            voiceId: edit.next.voiceId,
            eventIndex: edit.next.eventIndex,
            patch: edit.nextPatch,
          });
        }
      }
      return next;
    }, removing ? 'Tie removed.' : `Tie added${edits.length === 1 ? '' : ` (${edits.length})`}.`);
  }

  /** True when every selected note already starts a slur. */
  const selectionSlurred = () =>
    paletteTargets().length > 0 &&
    paletteTargets().every((cell) =>
      eventNotes(eventFor(cell)).every((note) => (note.slurStarts ?? []).length > 0),
    );

  /** The lowest slur number this note is not already using, so a second slur nests. */
  function freeSlurNumber(note) {
    const used = new Set([...(note?.slurStarts ?? []), ...(note?.slurStops ?? [])]);
    for (let number = 1; number <= 8; number += 1) if (!used.has(number)) return number;
    return 8;
  }

  /**
   * Slur: joins each selected note to the next note in its own voice. Unlike
   * a tie, a slur may join different pitches, so the only requirement is
   * that a following note exists. Start and stop are one command, so undo
   * takes the whole curve away.
   */
  function toggleSlur() {
    const cells = paletteTargets();
    if (cells.length === 0) {
      announce('Select a note first.');
      return;
    }
    const edits = [];
    for (const cell of cells) {
      const event = eventFor(cell);
      if (!event) continue;
      const notes = eventNotes(event);
      const target = eventAfter(cell, event);
      const startNumbers = notes.flatMap((note) => note.slurStarts ?? []);
      if (startNumbers.length > 0) {
        const stops = (target ? eventNotes(target) : []).flatMap((note) => note.slurStops ?? []);
        const remaining = stops.filter((number) => !startNumbers.includes(number));
        edits.push({
          cell,
          patch: { slurStarts: null },
          ...(target
            ? {
                next: { ...cell, eventIndex: cell.eventIndex + 1 },
                nextPatch: { slurStops: remaining.length > 0 ? remaining : null },
              }
            : {}),
        });
        continue;
      }
      if (!target || target.kind === 'rest') continue;
      const number = freeSlurNumber(notes[0]);
      edits.push({
        cell,
        patch: { slurStarts: [number] },
        next: { ...cell, eventIndex: cell.eventIndex + 1 },
        nextPatch: { slurStops: [number] },
      });
    }
    if (edits.length === 0) {
      announce('Nothing to slur to — a slur needs a following note in the same voice.');
      return;
    }
    const removing = edits.every((edit) => edit.patch.slurStarts === null);
    commit((doc) => {
      let next = doc;
      for (const edit of edits) {
        const { partId, measureNumber, voiceId, eventIndex } = edit.cell;
        next = docTools.patchEvent(next, { partId, measureNumber, voiceId, eventIndex, patch: edit.patch });
        if (edit.next) {
          next = docTools.patchEvent(next, {
            partId: edit.next.partId,
            measureNumber: edit.next.measureNumber,
            voiceId: edit.next.voiceId,
            eventIndex: edit.next.eventIndex,
            patch: edit.nextPatch,
          });
        }
      }
      return next;
    }, removing ? 'Slur removed.' : `Slur added${edits.length === 1 ? '' : ` (${edits.length})`}.`);
  }

  /**
   * Flip: turns the selected notes' stems over. A note with no explicit
   * direction follows the staff's automatic rule, so the flip needs the
   * direction it currently shows -- otherwise the first click would look
   * like it did nothing.
   */
  function flipStems() {
    const cells = paletteTargets();
    if (cells.length === 0) {
      announce('Select a note first.');
      return;
    }
    commit((doc) => {
      let next = doc;
      for (const cell of cells) {
        const event = eventFor(cell);
        if (!event) continue;
        const notes = eventNotes(event);
        const current =
          notes[0]?.explicitStemDirection ??
          engine.chordStemDirection(
            notes.map((note) => staffPositionOf(note.pitch, cell.measureNumber)),
            engine.middleLineY(5),
          );
        next = docTools.patchEvent(next, {
          partId: cell.partId,
          measureNumber: cell.measureNumber,
          voiceId: cell.voiceId,
          eventIndex: cell.eventIndex,
          patch: { explicitStemDirection: current === 'up' ? 'down' : 'up' },
        });
      }
      return next;
    }, 'Stem flipped.');
  }

  /** A note's staff position, so the stem rule can be asked what it would draw. */
  function staffPositionOf(pitch, measureNumber) {
    if (!pitch || pitch.kind !== 'pitched') return 0;
    const clef = clefAt(measureNumber ?? state.entry?.measureNumber ?? 1);
    try {
      return engine.staffPositionForPitch(clef, pitch.step, pitch.octave);
    } catch {
      return 0;
    }
  }

  /** True when every selected note already has this mark. */
  function selectionCarries(kind, value) {
    const cells = paletteTargets();
    if (cells.length === 0) return false;
    return cells.every((cell) => eventNotes(eventFor(cell)).every((note) => noteCarries(note, kind, value)));
  }

  /**
   * Applies or removes a mark on every selected note.
   *
   * The whole selection is one command, so undoing a palette click on a
   * phrase restores the phrase rather than peeling it off one note at a
   * time -- and the toggle is decided from the SELECTION's state, not from
   * each note's, so a mixed selection becomes uniform instead of flipping
   * half of it.
   */
  function applyMark(kind, value) {
    const cells = paletteTargets();
    if (cells.length === 0) {
      announce('Select a note first.');
      return;
    }
    const removing = selectionCarries(kind, value);
    const definition = MARKS[kind];
    commit((doc) => {
      let next = doc;
      for (const cell of cells) {
        const event = eventFor(cell);
        if (!event) continue;
        const patch = {};
        if (kind === 'fermata') {
          patch.hasFermata = removing ? null : true;
        } else {
          const field = definition.field;
          // Each note keeps its own list, so a chord's notes each get the
          // mark and the patch is built from the note's own current state.
          const apply = (note) => {
            const current = note[field] ?? [];
            return removing ? current.filter((mark) => mark !== value) : [...new Set([...current, value])];
          };
          if (event.kind === 'chord') {
            patch.notes = event.notes.map((note) => {
              const list = apply(note);
              const copy = { ...note };
              if (list.length === 0) delete copy[field];
              else copy[field] = list;
              return copy;
            });
          } else {
            const list = apply(event);
            patch[field] = list.length === 0 ? null : list;
          }
        }
        next = docTools.patchEvent(next, {
          partId: cell.partId,
          measureNumber: cell.measureNumber,
          voiceId: cell.voiceId,
          eventIndex: cell.eventIndex,
          patch,
        });
      }
      return next;
    }, `${removing ? 'Removed' : 'Added'} ${kind === 'fermata' ? 'fermata' : value}.`);
  }

  /**
   * Applies or removes a dynamic at the selection's own tick.
   *
   * A dynamic belongs to a tick, not a note, so a range applies it at each
   * distinct tick it covers: selecting a phrase and pressing *ff* marks the
   * start of each affected note. A range of tied or chorded notes that
   * share one tick gets a single mark.
   */
  function applyDynamic(level) {
    const cells = paletteTargets();
    if (cells.length === 0) {
      announce('Select a note first.');
      return;
    }
    const targets = cells.map((cell) => ({ cell, event: eventFor(cell) })).filter((target) => target.event);
    if (targets.length === 0) return;
    const current = docTools.dynamicAt(state.doc, targets[0].cell.partId, targets[0].cell.measureNumber, targets[0].event.startTick ?? 0);
    const removing = current === level;
    commit((doc) => {
      let next = doc;
      const seen = new Set();
      for (const { cell, event } of targets) {
        const tick = event.startTick ?? 0;
        const key = `${cell.partId}|${cell.measureNumber}|${tick}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next = docTools.setDynamic(next, {
          partId: cell.partId,
          measureNumber: cell.measureNumber,
          tick,
          level: removing ? null : level,
          placement: 'below',
        });
      }
      return next;
    }, removing ? `Removed ${level}.` : `Added ${level}.`);
  }

  /** The dynamic level in force at the selection's own tick, if any. */
  function selectionDynamic() {
    const cell = paletteTargets()[0] ?? null;
    if (!cell || !state.doc) return null;
    const event = eventFor(cell);
    return docTools.dynamicAt(state.doc, cell.partId, cell.measureNumber, event?.startTick ?? 0);
  }

  /** Switches the voice that new notes are written into. */
  function setVoice(voiceId) {
    const id = Math.min(4, Math.max(1, Number(voiceId) || 1));
    state.voice = id;
    if (voiceSelect) voiceSelect.value = String(id);
    if (state.entry) state.entry = { ...state.entry, voiceId: id };
    announce(`Voice ${id}.`);
    render();
  }

  function moveSelection(direction) {
    if (!state.selection) return;
    const { measureNumber, voiceId, eventIndex } = state.selection;
    const events = eventsIn(measureNumber, voiceId);
    // Arrow keys step note to note, the way MuseScore walks a phrase: a
    // rest between two notes is skipped rather than becoming a stop.
    const step = (from, delta) => {
      for (let index = from + delta; index >= 0 && index < events.length; index += delta) {
        if (events[index]?.kind !== 'rest') return index;
      }
      return -1;
    };
    const nextIndex = step(eventIndex, direction);
    if (nextIndex >= 0) {
      selectEvent(activePartId(), measureNumber, voiceId, nextIndex);
      return;
    }
    if (direction > 0) {
      const nextMeasure = measureNumber + 1;
      if (!state.doc.score.parts[0].measures.some((m) => m.number === nextMeasure)) {
        state.doc = docTools.appendMeasure(state.doc, activePartId());
      }
      const nextEvents = eventsIn(nextMeasure, voiceId);
      const firstNote = nextEvents.findIndex((event) => event.kind !== 'rest');
      if (firstNote >= 0) {
        selectEvent(activePartId(), nextMeasure, voiceId, firstNote);
        return;
      }
      state.entry = { partId: activePartId(), measureNumber: nextMeasure, voiceId, tick: 0, systemIndex: state.entry?.systemIndex ?? 0 };
      clearSelection();
      announce(`Measure ${nextMeasure}.`);
      render();
      return;
    }
    if (measureNumber > 1) {
      const previous = measureNumber - 1;
      const previousEvents = eventsIn(previous, voiceId);
      const lastNote = previousEvents.reduce((found, event, index) => (event.kind !== 'rest' ? index : found), -1);
      if (lastNote >= 0) selectEvent(activePartId(), previous, voiceId, lastNote);
    }
  }

  /**
   * Moves one note by whole staff steps.
   *
   * MuseScore's Up/Down are diatonic: C becomes D, never C sharp, and the
   * accidental that was written travels with the note. So this walks the
   * staff's own diatonic ladder rather than adding semitones -- which is
   * also what makes an octave exactly seven steps in both directions,
   * whatever the key signature.
   */
  function transposeNote(pitch, steps, clef) {
    if (!pitch || pitch.kind === 'unpitched') return pitch;
    const position = engine.staffPositionForPitch(clef, pitch.step, pitch.octave);
    const moved = docTools.pitchFromStaffPosition(clef, position - steps * 0.5);
    return { ...pitch, step: moved.step, octave: moved.octave };
  }

  /**
   * Transposes every note in the selection. The whole range moves as one
   * command, so a Shift-click selection and a single note behave the same
   * and undo once.
   */
  function transposeSelection(steps) {
    const cells = selectedCells();
    if (cells.length === 0) return;
    const movable = cells.filter((cell) => {
      const event = eventFor(cell);
      return event && event.kind !== 'rest';
    });
    if (movable.length === 0) return;
    commit((doc) => {
      let next = doc;
      for (const cell of movable) {
        const event = eventFor(cell);
        const clef = clefAt(cell.measureNumber);
        const patch = event.kind === 'chord'
          ? { notes: event.notes.map((note) => ({ ...note, pitch: transposeNote(note.pitch, steps, clef) })) }
          : { pitch: transposeNote(event.pitch, steps, clef) };
        next = docTools.patchEvent(next, {
          partId: cell.partId,
          measureNumber: cell.measureNumber,
          voiceId: cell.voiceId,
          eventIndex: cell.eventIndex,
          patch,
        });
      }
      return next;
    }, describeTranspose(steps, movable.length));
    const first = eventFor(movable[0]);
    if (first && first.kind !== 'chord') previewPitch(first.pitch);
  }

  /** The status line MuseScore would show: one note names the move, many count it. */
  function describeTranspose(steps, count) {
    const direction = steps > 0 ? 'up' : 'down';
    const magnitude = Math.abs(steps);
    if (count > 1) return `Moved ${count} notes ${direction} ${magnitude} step${magnitude === 1 ? '' : 's'}.`;
    if (magnitude === 7) return `Moved ${direction} an octave.`;
    return `Moved ${direction} ${magnitude} step${magnitude === 1 ? '' : 's'}.`;
  }

  /**
   * Deletes the selection, leaving rests where the notes were.
   *
   * The anchor is kept so the cursor stays where the user was looking --
   * MuseScore leaves the selection on the first rest of the cleared
   * passage rather than dropping it.
   */
  function deleteSelection() {
    const cells = selectedCells();
    if (cells.length === 0) {
      announce('Select a note first.');
      return;
    }
    const deletable = cells.filter((cell) => {
      const event = eventFor(cell);
      return event && event.kind !== 'rest';
    });
    if (deletable.length === 0) {
      announce('There is nothing to delete there.');
      return;
    }
    const anchor = state.selection ? { ...state.selection } : { ...deletable[0] };
    commit((doc) => docTools.deleteEvents(doc, deletable),
      `Deleted ${deletable.length} note${deletable.length === 1 ? '' : 's'}.`);
    // The event at the anchor's index is a rest now, so the anchor still
    // points at the right place in the bar.
    const anchorEvent = eventFor(anchor);
    if (anchorEvent) setSelection([anchor], anchor);
    else clearSelection();
    render();
  }

  /**
   * The selection as MusicXML on the clipboard, so a copy can be pasted
   * into another notation program rather than only within this page.
   *
   * The excerpt is a whole document (see `docTools.excerpt`), which is what
   * makes it portable: it carries its own attributes and bar lines.
   */
  async function copySelection() {
    const cells = selectedCells();
    if (cells.length === 0) {
      announce('Select a note first.');
      return false;
    }
    const excerpt = docTools.excerpt(state.doc, cells);
    if (!excerpt) {
      announce('Nothing to copy.');
      return false;
    }
    const counted = `${cells.length} note${cells.length === 1 ? '' : 's'}`;
    try {
      await navigator.clipboard.writeText(docTools.toMusicXml(excerpt));
    } catch {
      announce('The browser would not give this page the clipboard.');
      return false;
    }
    announce(`Copied ${counted}.`);
    return true;
  }

  /** Copies the selection, then clears the notes it copied. */
  async function cutSelection() {
    if (await copySelection()) deleteSelection();
  }

  /**
   * Writes the clipboard's MusicXML into the score at the entry cursor.
   *
   * The clipboard is read as text and parsed with the engine's own reader,
   * so a copy pasted from another program lands with its rhythm intact --
   * and a copy taken here round-trips, because `copySelection` writes the
   * same MusicXML this reads back.
   */
  async function pasteSelection() {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      announce('The browser would not give this page the clipboard.');
      return;
    }
    if (!text.trim()) {
      announce('The clipboard is empty.');
      return;
    }
    let parsed;
    try {
      parsed = engine.parseMusicXml(text, window.DOMParser);
    } catch {
      announce('The clipboard does not hold MusicXML.');
      return;
    }
    if (!parsed?.score?.parts?.length) {
      announce('The clipboard does not hold MusicXML.');
      return;
    }
    const entry = state.entry ?? {
      partId: activePartId(),
      measureNumber: 1,
      voiceId: state.voice,
      tick: 0,
    };
    const cell = {
      partId: activePartId(),
      measureNumber: entry.measureNumber,
      voiceId: entry.voiceId ?? state.voice,
      tick: entry.tick,
    };
    const notes = parsed.score.parts[0].measures.reduce(
      (sum, measure) =>
        sum +
        measure.voices.reduce(
          (inner, voice) => inner + voice.events.filter((event) => event.kind !== 'rest').length,
          0,
        ),
      0,
    );
    if (notes === 0) {
      announce('Nothing to paste.');
      return;
    }
    commit(
      (doc) => docTools.paste(doc, parsed, cell),
      `Pasted ${notes} note${notes === 1 ? '' : 's'}.`,
    );
    render();
  }

  function advanceEntry(ticks, measureNumber, voiceId) {
    const located = locateTick(state.entry.tick + ticks, measureNumber);
    state.entry = { ...state.entry, measureNumber: located.measureNumber, tick: located.tick, voiceId };
    clearSelection();
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
      state.entry = { partId: activePartId(), measureNumber: 1, voiceId: state.voice, tick: 0, systemIndex: 0 };
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
    const hit = eventAt(svg, point.x, point.y);

    if (hit) {
      // A note is always grabbable, however many ledger lines it sits on:
      // only a press on empty space has to be inside the staff band.
      const hitStaff = staff ?? staffAt(staves, point.y, { nearest: true });
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
      const staffPosition = staffPositionFromPoint(hitStaff, point.y);
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
          state.entry = { partId, measureNumber, voiceId, tick: existing.startTick ?? 0, systemIndex: hitStaff.systemIndex };
          clearSelection();
          insertAtEntry({ step, octave, addToChord: event.shiftKey, staffPosition });
          return;
        }
        // With note input off a click selects, Shift-click extends the
        // range, and a drag moves the note to a new pitch -- MuseScore's
        // three selection gestures.
        selectEvent(partId, measureNumber, voiceId, eventIndex, { extend: event.shiftKey });
        state.drag = {
          kind: 'pitch',
          pointerId: event.pointerId,
          baseDoc: state.doc,
          // Measured from where the POINTER went down, not from where the
          // note is drawn: a note follows the pointer's own movement, so
          // grabbing it off-centre never snaps it to the cursor.
          startPosition: staffPosition,
          anchor: { partId, measureNumber, voiceId, eventIndex },
          steps: 0,
        };
        scoreHost.setPointerCapture?.(event.pointerId);
        announce(event.shiftKey ? 'Range extended.' : 'Note selected.');
        return;
      }
    }

    // Writing on empty space only happens on the staff itself. A press on
    // the margin, the title or the gap between two systems is not part of
    // the score, so it must not move the cursor or write a note there.
    if (!pointOnStaff(staff, point)) return;
    const systemIndex = staff.systemIndex;

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
      voiceId: state.voice,
      tick: snappedTick,
      systemIndex,
    };
    if (state.noteInput) {
      clearSelection();
      if (state.tool.rest) insertAtEntry({ rest: true });
      else insertAtEntry({ step, octave, staffPosition });
      return;
    }
    // Note input off, empty staff: this is where a rubber band starts.
    // MuseScore's band is the way to grab a phrase without clicking each
    // note, so the gesture has to begin on empty space as well as on a
    // note -- and it must not clear the selection until the band is
    // actually dragged, or a plain click on empty staff would still be a
    // selection gesture.
    state.marquee = { originX: point.x, originY: point.y, x: point.x, y: point.y, width: 0, height: 0 };
    state.drag = { kind: 'marquee', pointerId: event.pointerId };
    scoreHost.setPointerCapture?.(event.pointerId);
    announce(`Measure ${position.measureNumber}, ${step}${octave}.`);
    render();
  }

  /**
   * A drag in flight.
   *
   * Two gestures share this handler because both start with a press on
   * the score: moving a selected note's pitch, and dragging a rubber
   * band. Which one is running is `state.drag.kind`.
   */
  function onScorePointerMove(event) {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const svg = scoreHost.querySelector('svg');
    if (!svg) return;
    const point = toSvgPoint(svg, event.clientX, event.clientY);
    if (!point) return;

    if (drag.kind === 'marquee') {
      const { originX, originY } = state.marquee;
      state.marquee = {
        originX,
        originY,
        x: Math.min(originX, point.x),
        y: Math.min(originY, point.y),
        width: Math.abs(point.x - originX),
        height: Math.abs(point.y - originY),
      };
      render();
      return;
    }

    if (drag.kind !== 'pitch') return;
    const steps = stepsFromPointer(drag, point);
    if (steps === drag.steps) return;
    drag.steps = steps;
    applyDragTranspose(drag, steps);
  }

  /**
   * Staff steps between the drag's start and the pointer.
   *
   * Staff positions are in half staff spaces -- one diatonic step is 0.5
   * -- so the difference is doubled to count whole steps and rounded,
   * because a pointer between two lines is nearer one of them.
   */
  function stepsFromPointer(drag, point) {
    const svg = scoreHost.querySelector('svg');
    if (!svg) return 0;
    const staff = staffAt(detectStaves(svg), point.y, { nearest: true });
    if (!staff) return 0;
    const position = staffPositionFromPoint(staff, point.y);
    return Math.round((drag.startPosition - position) * 2);
  }

  /**
   * Re-applies the drag's pitch from the document as it was when the drag
   * began, so a long drag is one undo step rather than one per pointer
   * move. The base document is re-read every time, which also means
   * dragging back to the start leaves the note exactly as it was.
   */
  function applyDragTranspose(drag, steps) {
    const { anchor } = drag;
    const baseEvent = eventsInFrom(drag.baseDoc, anchor.measureNumber, anchor.voiceId, anchor.partId)[anchor.eventIndex];
    if (!baseEvent || baseEvent.kind === 'rest') return;
    if (steps === 0) {
      state.doc = drag.baseDoc;
      render();
      return;
    }
    const clef = clefAt(anchor.measureNumber);
    const patch = baseEvent.kind === 'chord'
      ? { notes: baseEvent.notes.map((note) => ({ ...note, pitch: transposeNote(note.pitch, steps, clef) })) }
      : { pitch: transposeNote(baseEvent.pitch, steps, clef) };
    state.doc = docTools.patchEvent(drag.baseDoc, {
      partId: anchor.partId,
      measureNumber: anchor.measureNumber,
      voiceId: anchor.voiceId,
      eventIndex: anchor.eventIndex,
      patch,
    });
    render();
    announce(describeTranspose(steps, 1));
  }

  function onScorePointerUp(event) {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    scoreHost.releasePointerCapture?.(event.pointerId);
    state.drag = null;

    if (drag.kind === 'marquee') {
      const band = state.marquee;
      state.marquee = null;
      if (band && (band.width > 0.3 || band.height > 0.3)) {
        selectWithinBand(band);
      } else {
        // A press and release without movement is a plain click on empty
        // staff: MuseScore clears the selection there.
        clearSelection();
        render();
      }
      return;
    }

    if (drag.kind === 'pitch' && drag.steps !== 0) {
      // One history entry for the whole gesture: the document as it was
      // before the drag, then the dragged one.
      state.history.push(drag.baseDoc);
      if (state.history.length > 100) state.history.shift();
      state.future.length = 0;
      syncHistory();
    }
    state.drag = null;
  }

  /** Everything whose drawn box the band covers, in reading order. */
  function selectWithinBand(band) {
    const svg = scoreHost.querySelector('svg');
    if (!svg || !state.result) return;
    const cells = [];
    for (const group of svg.querySelectorAll('[data-id]')) {
      let box;
      try { box = group.getBBox(); } catch { continue; }
      const overlaps =
        box.x + box.width >= band.x &&
        box.x <= band.x + band.width &&
        box.y + box.height >= band.y &&
        box.y <= band.y + band.height;
      if (!overlaps) continue;
      const [partId, measureToken, voiceToken, eventToken] = group.getAttribute('data-id').split('#');
      const cell = {
        partId,
        measureNumber: Number(measureToken.replace('m', '')),
        voiceId: Number(voiceToken.replace('v', '')),
        eventIndex: Number(eventToken.replace('e', '')),
      };
      // Rests are not selectable, the same as a click on one.
      if (eventFor(cell)?.kind === 'rest') continue;
      cells.push(cell);
    }
    cells.sort((a, b) =>
      a.measureNumber - b.measureNumber || a.voiceId - b.voiceId || a.eventIndex - b.eventIndex);
    if (cells.length === 0) {
      clearSelection();
      announce('Nothing selected.');
      render();
      return;
    }
    setSelection(cells, cells[0]);
    state.activePartId = cells[0].partId;
    announce(`Selected ${cells.length} note${cells.length === 1 ? '' : 's'}.`);
    render();
  }

  // ---- metronome ---------------------------------------------------------

  /** Quarter-note BPM from the score's own tempo map (the engine's default is 120). */
  const scoreBpm = () => {
    const segment = state.result?.playback.tempoMap.segments?.[0];
    if (!segment?.microsecondsPerQuarter) return 120;
    return Math.round(60_000_000 / segment.microsecondsPerQuarter);
  };

  const scoreTimeSignature = () => {
    const measureNumber = state.entry?.measureNumber ?? 1;
    const attribute = attributeAt(measureNumber);
    const numerator = attribute?.timeNumerator ?? 4;
    const denominator = attribute?.timeDenominator ?? 4;
    return { numerator, denominator };
  };

  const clearMetronomeTimers = () => {
    for (const timer of state.metronomeTimers) window.clearTimeout(timer);
    state.metronomeTimers.length = 0;
    // Clicks are scheduled on the audio clock, so a timer cannot cancel
    // them: each one has to be stopped by hand, or the metronome keeps
    // ticking after the score has stopped.
    for (const oscillator of state.metronomeNodes) {
      try { oscillator.stop(); } catch { /* already stopped */ }
      try { oscillator.disconnect(); } catch { /* already disconnected */ }
    }
    state.metronomeNodes.length = 0;
  };

  /**
   * Clicks one bar at the score's own tempo and metre, then stops.
   *
   * The count-in is the metronome's whole job: it says "bar one is coming"
   * and then gets out of the way. Clicking on into the score would put a
   * stray click on the music's own downbeat -- the note and a click landing
   * together -- so the last click is the bar's last beat and the music
   * starts after it, in silence but on time.
   *
   * `onDone` runs when the bar is over, which is where the button goes off
   * again.
   */
  const scheduleMetronome = (barSeconds = countInSeconds(), onDone = null) => {
    clearMetronomeTimers();
    if (!state.metronomeOn || !state.result) return;
    const { numerator, denominator } = scoreTimeSignature();
    const beatSeconds = (60 * 4) / (scoreBpm() * denominator);
    // The bar's length is the score's, not the audio host's: the switch has
    // to go off on time even where nothing can be played.
    if (onDone) state.metronomeTimers.push(window.setTimeout(onDone, barSeconds * 1000));

    // A host without Web Audio (an old browser, a preview) still has a
    // working metronome button; it just cannot make a sound there.
    if (!state.metronome) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      state.metronome = new Audio();
    }
    const context = state.metronome;
    void context.resume();
    const origin = context.currentTime;

    const click = (at, accented) => {
      if (at < origin) return;
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
      state.metronomeNodes.push(oscillator);
    };

    for (let index = 0; index < numerator; index += 1) {
      const at = index * beatSeconds;
      // A bar cut short (a metre change mid-count) gets only the beats it
      // actually has.
      if (at >= barSeconds - 1e-9) break;
      click(origin + at, index === 0);
    }
  };

  /** One bar at the score's own tempo — how long the count-in lasts. */
  const countInSeconds = () => {
    const { numerator, denominator } = scoreTimeSignature();
    return numerator * ((60 * 4) / (scoreBpm() * denominator));
  };

  const setMetronome = (on, { quiet = false } = {}) => {
    state.metronomeOn = on;
    if (on) {
      if (state.playing && !state.countInEndsAt) {
        // Switched on mid-play: count one bar from here and then go quiet
        // again, so the clicks never run on under the music.
        scheduleMetronome(countInSeconds(), () => setMetronome(false, { quiet: true }));
      }
      announce('Metronome on — one bar counts in before the notes.');
    } else {
      clearMetronomeTimers();
      if (!quiet) announce('Metronome off.');
    }
    syncPlayback();
  };

  // ---- playback ----------------------------------------------------------

  const setPlaying = (playing) => {
    state.playing = playing;
  };

  // Headless hosts have no animation-frame clock. Playback still runs
  // there, it just cannot repaint, so the frame calls stay optional.
  const requestFrame = (callback) =>
    (typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(callback) : null);
  const cancelFrame = (id) => {
    if (id !== null && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(id);
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
    if (testNoteButton) testNoteButton.disabled = !hasFonts;
    if (testScoreButton) testScoreButton.disabled = !hasFonts;
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
    // A repeated score lasts as long as its PERFORMANCE, not as long as
    // its written bars: stopping at the written end would cut the second
    // pass off mid-phrase.
    const performance = state.result.playback.performance;
    if (performance?.hasRepeats) return performance.totalSeconds;
    return engine.resolvePosition(state.result.playback, endTick()).seconds;
  };

  /**
   * How long the score lasts, in the bottom bar.
   *
   * The length is the timeline's own end -- every measure's capacity,
   * rests included -- resolved to seconds through the engine's tempo map,
   * so a metronome mark in the file is reflected rather than a fixed
   * tempo assumed. A repeated score lasts as long as it SOUNDS, so the
   * second pass is counted. It follows every redraw, which is why
   * render() calls it.
   */
  function updateLength() {
    if (!lengthOutput) return;
    const seconds = Math.round(endSeconds());
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    lengthOutput.textContent = `${minutes}:${String(rest).padStart(2, '0')}`;
  }

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

  /** The written tick sounding at `seconds` of the performance. */
  const writtenTickAt = (seconds) => {
    const performance = state.result?.playback.performance;
    if (performance?.hasRepeats) {
      return engine.performanceSecondsToWritten(performance, state.result.playback.tempoMap, seconds).writtenTick;
    }
    return engine.secondsToTick(state.result.playback.tempoMap, seconds);
  };

  function frame() {
    if (!state.playing || !state.result) return;
    const now = performance.now();
    // The count-in holds the playhead still on the first beat while the
    // metronome clicks a bar, then the score starts on the click after it.
    if (state.countInEndsAt) {
      if (now < state.countInEndsAt) {
        state.rafId = requestFrame(frame);
        return;
      }
      state.countInEndsAt = 0;
      state.playStartedAt = now;
      announce('Playing.');
    }
    state.playSeconds = state.playStartSeconds + (now - state.playStartedAt) / 1000;
    // The cursor follows the score's WRITTEN timeline, so a repeat sends
    // it back to the bar it jumps to rather than running off the end.
    const tick = writtenTickAt(state.playSeconds);
    if (state.playSeconds >= endSeconds() + 0.15) {
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
    state.rafId = requestFrame(frame);
  }

  function stopPlayback() {
    setPlaying(false);
    cancelFrame(state.rafId);
    state.rafId = null;
    if (state.soundTimer) window.clearTimeout(state.soundTimer);
    state.soundTimer = null;
    state.countInEndsAt = 0;
    state.soundingId = null;
    // Stop returns to where playback would begin, not to a silent top, so
    // pressing Play again repeats from the entry cursor.
    state.playSeconds = startSeconds();
    clearMetronomeTimers();
    state.sound?.pause?.();
    announce('Stopped.');
    syncPlayback();
    render();
  }

  /** Where playback starts: the entry cursor if there is one, else the top. */
  const startSeconds = () => {
    if (!state.result || !state.entry) return 0;
    const tick = globalTickOf(state.entry.measureNumber, state.entry.tick);
    const performance = state.result.playback.performance;
    if (performance?.hasRepeats) {
      return engine.writtenTickToPerformanceSeconds(performance, state.result.playback.tempoMap, tick);
    }
    return Math.max(0, engine.resolvePosition(state.result.playback, tick).seconds);
  };

  const pausePlayback = () => {
    state.sound?.pause?.();
    clearMetronomeTimers();
    if (state.soundTimer) window.clearTimeout(state.soundTimer);
    state.soundTimer = null;
    state.countInEndsAt = 0;
    setPlaying(false);
    cancelFrame(state.rafId);
    state.rafId = null;
    state.soundingId = null;
    announce('Paused.');
    syncPlayback();
    render();
  };

  async function togglePlay() {
    if (!state.result) return;
    if (state.playing) {
      pausePlayback();
      return;
    }
    if (state.playSeconds >= endSeconds()) state.playSeconds = startSeconds();
    // With the metronome on, one bar of clicks comes first and the score
    // waits for it, so the first note lands on a beat the writer has just
    // heard rather than on a silent downbeat. The clicks stop with that
    // bar: the metronome is the count, not a running pulse under the music.
    const leadIn = state.metronomeOn ? countInSeconds() : 0;
    const from = state.playSeconds;
    state.playStartSeconds = from;
    state.playStartedAt = performance.now();
    state.countInEndsAt = leadIn > 0 ? state.playStartedAt + leadIn * 1000 : 0;
    setPlaying(true);
    // Draw at once so the playhead appears and the entry cursor steps
    // aside on the same frame the sound starts.
    render();
    if (leadIn > 0) scheduleMetronome(leadIn, () => setMetronome(false, { quiet: true }));
    state.rafId = requestFrame(frame);
    announce(leadIn > 0 ? 'Counting in…' : 'Playing.');
    syncPlayback();

    // The SoundFont loads while the bar counts in, so the first note is not
    // held up by a font that is still arriving.
    if (!state.sound) {
      if (leadIn === 0) announce('Loading playback…');
      try {
        await ensureSound();
      } catch (error) {
        stopPlayback();
        announce(error instanceof Error ? error.message : 'Playback is unavailable.');
        return;
      }
      if (!state.playing) return;
    }
    const beginSound = () => {
      state.soundTimer = null;
      if (!state.playing) return;
      state.sound?.play?.(state.result.playback, 1, from);
    };
    const wait = state.countInEndsAt ? Math.max(0, state.countInEndsAt - performance.now()) : 0;
    if (wait > 0) {
      state.soundTimer = window.setTimeout(beginSound, wait);
    } else {
      beginSound();
      // The count-in announces its own end; without one the score is
      // already running, so say so once the font is in.
      announce('Playing.');
    }
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
    dotButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.editorDots) === state.tool.dots));
    });
    tieButton.setAttribute('aria-pressed', String(selectionTied()));
    if (slurButton) slurButton.setAttribute('aria-pressed', String(selectionSlurred()));
    articulationButtons.forEach((button) => {
      const value = button.dataset.editorArticulation;
      button.setAttribute('aria-pressed', String(selectionCarries('articulation', value)));
    });
    const dynamic = selectionDynamic();
    dynamicButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.editorDynamic === dynamic));
    });
    restButton.setAttribute('aria-pressed', String(state.tool.rest));
    noteInputButton.setAttribute('aria-pressed', String(state.noteInput));
    if (previewButton) previewButton.setAttribute('aria-pressed', String(state.previewOn));
    if (zoomOutput) zoomOutput.textContent = `${state.zoom}%`;
    root.dataset.mode = state.noteInput ? 'input' : 'select';
    if (toolbarStack) toolbarStack.dataset.mode = root.dataset.mode;
  };

  /**
   * The playback controls follow the state they control: Play turns into
   * Pause while the score runs, and the metronome shows whether it will
   * count the next bar in.
   */
  const syncPlayback = () => {
    if (playButton) {
      playButton.setAttribute('aria-pressed', String(state.playing));
      playButton.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
      playButton.setAttribute('title', state.playing ? 'Pause (Space)' : 'Play (Space)');
      playButton.dataset.playing = String(state.playing);
    }
    if (metronomeButton) metronomeButton.setAttribute('aria-pressed', String(state.metronomeOn));
  };

  function applySetup() {
    const clef = CLEF_SIGN[clefSelect?.value] || CLEF_SIGN.treble;
    const fifths = KEY_FIFTHS[keySelect?.value] ?? 0;
    const [numerator, denominator] = TIME_PAIR[timeSelect?.value] || TIME_PAIR['4/4'];
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
    if (clefSelect && CLEF_SIGN[clefName]) clefSelect.value = clefName;
    const key = keyForFifths(attribute.fifths ?? 0);
    if (keySelect && KEY_FIFTHS[key] !== undefined) keySelect.value = key;
    const time = timeForPair(attribute.timeNumerator, attribute.timeDenominator);
    if (timeSelect && time) timeSelect.value = time;
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
    const group = partSelect.closest('.editor-bottombar__group');
    const divider = group?.previousElementSibling;
    const hide = options.length <= 1;
    partSelect.hidden = hide;
    if (group) group.hidden = hide;
    if (divider?.classList.contains('editor-bottombar__divider')) divider.hidden = hide;
  }

  /** Switching part is a change of target, not an edit: the clef and key
   *  dropdowns follow, so the next note lands in the part on screen. */
  function selectPart(partId) {
    if (!state.doc?.score.parts.some((part) => part.id === partId)) return;
    state.activePartId = partId;
    const measureNumber = Math.min(state.entry?.measureNumber ?? 1, measureCountOf(partId));
    state.entry = { partId, measureNumber, voiceId: state.entry?.voiceId ?? state.voice, tick: 0, systemIndex: state.entry?.systemIndex ?? 0 };
    clearSelection();
    syncSetupControls();
    render();
    announce(`Writing into ${partNameOf(partId)}.`);
  }

  function onPartChange() {
    if (partSelect) selectPart(partSelect.value);
  }

  // ---- wiring ------------------------------------------------------------

  backButton.addEventListener('click', () => window.location.assign('notation.html'));
  undoButton.addEventListener('click', undo);
  redoButton.addEventListener('click', redo);

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
  // The new bar goes where the writer is looking -- after the bar the
  // cursor sits in -- and the eraser takes that same bar away, so the two
  // buttons act on one place rather than one acting at the end of the piece
  // and the other wherever the pointer happens to be.
  const currentMeasureNumber = () =>
    state.selection?.measureNumber ?? state.entry?.measureNumber ?? 1;

  if (addMeasureButton) {
    addMeasureButton.addEventListener('click', () => {
      const at = currentMeasureNumber();
      commit((doc) => docTools.insertMeasureAfter(doc, activePartId(), at), `Measure added after bar ${at}.`);
      clearSelection();
      state.entry = { ...(state.entry ?? {}), partId: activePartId(), measureNumber: at + 1, voiceId: state.voice, tick: 0 };
      render();
    });
  }
  if (removeMeasureButton) {
    removeMeasureButton.addEventListener('click', () => {
      const at = currentMeasureNumber();
      const count = partById(activePartId())?.measures.length ?? 0;
      if (count <= 1) {
        announce('A score keeps at least one bar.');
        return;
      }
      commit((doc) => docTools.removeMeasure(doc, activePartId(), at), `Bar ${at} removed.`);
      clearSelection();
      state.entry = { ...(state.entry ?? {}), partId: activePartId(), measureNumber: Math.max(1, Math.min(at, count - 1)), voiceId: state.voice, tick: 0 };
      render();
    });
  }
  if (copyButton) copyButton.addEventListener('click', () => void copySelection());
  if (cutButton) cutButton.addEventListener('click', () => void cutSelection());
  if (deleteButton) deleteButton.addEventListener('click', () => deleteSelection());
  if (pasteButton) pasteButton.addEventListener('click', () => void pasteSelection());

  scoreHost.addEventListener('pointerdown', onScorePointerDown);
  scoreHost.addEventListener('pointermove', onScorePointerMove);
  scoreHost.addEventListener('pointerup', onScorePointerUp);
  scoreHost.addEventListener('pointercancel', onScorePointerUp);

  // Ctrl+wheel zooms the score; a plain wheel is left alone so it scrolls
  // the page. `passive:false` is required or the browser zooms the whole
  // page instead. Trackpads and pinch gestures emit many small deltas, so
  // the wheel travel is accumulated and one step is taken per notch.
  let wheelTravel = 0;
  scoreHost.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    wheelTravel += event.deltaY;
    if (Math.abs(wheelTravel) < 40) return;
    state.zoom += wheelTravel < 0 ? 10 : -10;
    wheelTravel = 0;
    updateZoom();
  }, { passive: false });

  if (playButton) playButton.addEventListener('click', () => void togglePlay());
  if (stopButton) stopButton.addEventListener('click', stopPlayback);
  if (metronomeButton) metronomeButton.addEventListener('click', () => setMetronome(!state.metronomeOn));
  if (saveButton) saveButton.addEventListener('click', saveScore);

  if (exportToggle) exportToggle.addEventListener('click', () => setExportMenu(exportList.hidden));
  if (exportPdf) exportPdf.addEventListener('click', () => { setExportMenu(false); void runExport(exportPdf, 'pdf'); });
  if (exportSvg) exportSvg.addEventListener('click', () => { setExportMenu(false); void runExport(exportSvg, 'svg'); });
  if (exportPng) exportPng.addEventListener('click', () => { setExportMenu(false); void runExport(exportPng, 'png'); });
  document.addEventListener('pointerdown', (event) => {
    if (exportList && !exportList.hidden && !event.target.closest('[data-editor-export-menu]')) setExportMenu(false);
    // A popover closes on any press outside its trigger and its panel, so
    // the score stays reachable with one tap rather than two.
    if (!event.target.closest('[data-editor-popover], [data-editor-popover-panel]')) closePopovers();
  });

  popoverTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => togglePopover(trigger));
  });
  // A tool inside a panel picks its value and folds the box away again,
  // which is what a palette button is for.
  popoverPanels.forEach((panel) => {
    panel.addEventListener('click', (event) => {
      if (event.target.closest('.editor-tool')) closePopovers();
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePopovers();
  });
  window.addEventListener('resize', () => {
    closePopovers();
    relayoutToolbar();
  });
  // Fonts and the zoom readout settle after first paint, so measure once
  // the row has its real width, and again whenever it changes size.
  relayoutToolbar();
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => relayoutToolbar()).observe(root);
  } else {
    window.addEventListener('load', relayoutToolbar);
  }

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
  dotButtons.forEach((button) => button.addEventListener('click', () => {
    const dots = Number(button.dataset.editorDots);
    state.tool.dots = state.tool.dots === dots ? 0 : dots;
    syncTools();
    announce(state.tool.dots ? `${state.tool.dots} dot${state.tool.dots === 1 ? '' : 's'} on.` : 'Dots off.');
  }));
  tieButton.addEventListener('click', toggleTie);
  if (slurButton) slurButton.addEventListener('click', toggleSlur);
  articulationButtons.forEach((button) => button.addEventListener('click', () => {
    applyMark('articulation', button.dataset.editorArticulation);
  }));
  dynamicButtons.forEach((button) => button.addEventListener('click', () => {
    applyDynamic(button.dataset.editorDynamic);
  }));
  if (zoomInButton) zoomInButton.addEventListener('click', () => { state.zoom += 10; updateZoom(); });
  if (zoomOutButton) zoomOutButton.addEventListener('click', () => { state.zoom -= 10; updateZoom(); });
  flipButton.addEventListener('click', flipStems);
  restButton.addEventListener('click', () => {
    state.tool.rest = !state.tool.rest;
    syncTools();
    announce(state.tool.rest ? 'Rests on.' : 'Rests off.');
  });

  if (voiceSelect) voiceSelect.addEventListener('change', () => setVoice(voiceSelect.value));
  [clefSelect, keySelect, timeSelect].forEach((select) => select?.addEventListener('change', applySetup));
  if (partSelect) partSelect.addEventListener('change', onPartChange);

  document.addEventListener('keydown', (event) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName || '');
    if (typing) return;
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); saveScore(); return; }
    if (modifier && event.key.toLowerCase() === 'c') { event.preventDefault(); void copySelection(); return; }
    if (modifier && event.key.toLowerCase() === 'x') { event.preventDefault(); void cutSelection(); return; }
    if (modifier && event.key.toLowerCase() === 'v') { event.preventDefault(); void pasteSelection(); return; }
    if (modifier && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); return; }
    if (modifier && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) { event.preventDefault(); redo(); return; }
    if (modifier && event.key === '=') { event.preventDefault(); state.zoom += 10; updateZoom(); return; }
    if (modifier && event.key === '-') { event.preventDefault(); state.zoom -= 10; updateZoom(); return; }
    // Ctrl+Alt+1-4 picks the voice, MuseScore's own shortcut. It is
    // checked before the plain-digit note values below so the modifier
    // wins over the note value those digits would otherwise set.
    if (modifier && event.altKey && ['1', '2', '3', '4'].includes(event.key)) {
      event.preventDefault();
      setVoice(event.key);
      return;
    }
    if (event.code === 'Space') { event.preventDefault(); void togglePlay(); return; }

    if (event.key === 'Escape') { clearSelection(); render(); return; }
    if (modifier && event.key.toLowerCase() === 'a') { event.preventDefault(); selectAll(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveSelection(1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(-1); return; }
    // MuseScore's Up/Down move a staff step (diatonic); Ctrl is the octave.
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      transposeSelection(modifier ? 7 : 1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      transposeSelection(modifier ? -7 : -1);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelection(); return; }

    if (SHORTCUT_DURATION[event.key]) {
      state.tool.duration = SHORTCUT_DURATION[event.key];
      syncTools();
      announce(`Note value: ${state.tool.duration}.`);
      return;
    }
    if (event.key === '.') { state.tool.dots = (state.tool.dots + 1) % 4; syncTools(); return; }
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

  syncTools();
  syncPlayback();
  paintToolGlyphs();
  setControlsEnabled(false);
  updateZoom();
  restoreHandoff();
  void loadSoundFonts();
})();
