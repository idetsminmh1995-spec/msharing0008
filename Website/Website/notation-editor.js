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
  const exportXml = pick('[data-editor-export-xml]');
  const exportMxl = pick('[data-editor-export-mxl]');
  const exportToggle = pick('[data-editor-export-toggle]');
  const exportList = pick('[data-editor-export-list]');
  const playButton = pick('[data-editor-play]');
  const stopButton = pick('[data-editor-stop]');
  const metronomeButton = pick('[data-editor-metronome]');
  const saveButton = pick('[data-editor-save]');
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
  const chordButton = pick('[data-editor-chord]');
  const zoomInButton = pick('[data-editor-zoom-in]');
  const zoomOutButton = pick('[data-editor-zoom-out]');
  const layoutButtons = [...document.querySelectorAll('[data-editor-layout]')];
  const zoomOutput = pick('[data-editor-zoom]');
  const lengthOutput = pick('[data-editor-length]');
  const popoverTriggers = [...document.querySelectorAll('[data-editor-popover]')];
  const popoverPanels = [...document.querySelectorAll('[data-editor-popover-panel]')];
  const overflowGroup = pick('[data-editor-overflow-group]');
  const overflowPanel = pick('[data-editor-popover-panel="overflow"]');
  const overflowTrigger = pick('[data-editor-popover="overflow"]');
  const instPanel = pick('[data-editor-popover-panel="inst"]');
  const mixerPanel = pick('[data-editor-popover-panel="mixer"]');
  const instButton = pick('[data-editor-popover="inst"]');
  const mixerButton = pick('[data-editor-popover="mixer"]');
  const sidebar = pick('[data-editor-sidebar]');
  const sidebarHandle = pick('[data-editor-sidebar-handle]');
  const sidebarBody = pick('[data-editor-sidebar-body]');
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
    tool: { duration: 'quarter', dots: 0, rest: false, accidental: null, chord: false },
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
    // Voice overrides keyed `partId:staffNumber`, set by the voice picker or
    // Ctrl+Alt+1-4. Absent means "the staff's own default", which is voice 1
    // on a single staff and the staff's own number on a grand staff.
    voicesByStaff: {},
    entry: null,
    // The dock's own state: which tab shows, and which palettes it holds.
    sidebarTab: 'palettes',
    paletteGroups: [],
    history: [],
    future: [],
    // playback
    playing: false,
    sound: null,
    soundLoading: null,
    soundTried: false,
    // preview
    previewOn: true,
    soundAssetId: null,
    soundAssetPaths: null,
    playSeconds: 0,
    playStartSeconds: 0,
    playStartedAt: 0,
    rafId: null,
    soundingId: null,
    /** Which system the playhead was last drawn on, so a frame that crosses into another one redraws. */
    playheadSystem: null,
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

  const attributeAt = (measureNumber, partId = activePartId()) =>
    docTools.attributeFor(state.doc, partId, measureNumber);

  /**
   * The clef a staff is written in.
   *
   * A grand staff's two staves have their own clefs, so the staff the user
   * is writing on decides the pitch of the line they clicked: without the
   * number, a click on the bass staff would be read in the treble clef and
   * write a note two octaves from where it was drawn.
   */
  const clefAt = (measureNumber, staffNumber = 1, partId = activePartId()) => {
    const attribute = attributeAt(measureNumber, partId);
    const sign = attribute?.clefsByStaff?.[staffNumber]?.sign ?? attribute?.clefSign ?? 'G';
    return docTools.clefDefinitionFor(sign);
  };

  /** Whether a staff is a tab staff, so a click there names a string, not a pitch. */
  const isTabStaff = (measureNumber, staffNumber = 1, partId = activePartId()) => {
    const attribute = attributeAt(measureNumber, partId);
    const sign = attribute?.clefsByStaff?.[staffNumber]?.sign ?? attribute?.clefSign;
    return sign === 'TAB';
  };

  /**
   * What a click on a tab line means: a string, its fret, and the pitch
   * that pair sounds.
   *
   * A tab staff's lines ARE its strings, highest string on the top line,
   * and `staffPositionFromPoint` already measures in the staff's own
   * spaces, so one line is one unit and the bottom line (position 0) is
   * the lowest string. A click writes an open string: the writer picks the
   * fret from the Inst. panel, where each string shows its frets.
   */
  const tabClickFor = (staffNumber, staffPosition) => {
    const lines = attributeAt(state.entry?.measureNumber ?? 1)?.staffLinesByStaff?.[staffNumber] ?? 6;
    // Position 0 is the bottom line and each line above it is one more,
    // so the top line reads as string 1 and the bottom as the last one.
    const stringNumber = Math.min(lines, Math.max(1, Math.round(lines + staffPosition)));
    const pitch = tabPitch(stringNumber, 0);
    return pitch ? { ...pitch, stringNumber, fret: 0 } : null;
  };

  /**
   * The staff a part draws its tablature on, or null when it has none.
   *
   * A guitar part printed as "grand staff + tab" is ONE part on two
   * staves: staff 1 carries the notation and staff 2 the fret numbers. The
   * two are the same music, so whatever is written on one has to appear on
   * the other -- see `writePaired`.
   */
  function tabStaffOf(measureNumber, partId = activePartId()) {
    const staves = Math.max(1, attributeAt(measureNumber, partId)?.staves ?? 1);
    for (let staff = 1; staff <= staves; staff += 1) {
      if (isTabStaff(measureNumber, staff, partId)) return staff;
    }
    return null;
  }

  /** The part's first staff that is not a tab staff, or null when every staff is one. */
  function notationStaffOf(measureNumber, partId = activePartId()) {
    const staves = Math.max(1, attributeAt(measureNumber, partId)?.staves ?? 1);
    for (let staff = 1; staff <= staves; staff += 1) {
      if (!isTabStaff(measureNumber, staff, partId)) return staff;
    }
    return null;
  }

  /**
   * Where a written pitch sits on the instrument's fretboard.
   *
   * The written pitch is compared with the open strings directly: the
   * engine's `STRING_DATA` lists a fretted instrument's strings at the
   * pitches they are WRITTEN with, so the octave a guitar or a bass sounds
   * below its notation is already carried by the clef. The lowest fret
   * wins -- that is how a player reads a single note -- and a tie goes to
   * the thinner string, which keeps the note off the low strings when it
   * fits higher up.
   *
   * `taken` holds the strings already spoken for by an earlier note of the
   * same chord, so two notes never land on one string.
   */
  function tabPositionFor(pitch, taken = new Set()) {
    const data = activeInstrument().data;
    const midi = pitch?.kind === 'pitched' ? engine.midiNoteNumber?.(pitch) : undefined;
    if (!data || midi === undefined) return null;
    const count = data.openStrings.length;
    let best = null;
    for (let index = 0; index < count; index += 1) {
      const fret = midi - data.openStrings[index];
      if (fret < 0 || fret > data.frets) continue;
      const stringNumber = count - index;
      if (taken.has(stringNumber)) continue;
      if (
        best === null ||
        fret < best.fret ||
        (fret === best.fret && stringNumber < best.stringNumber)
      ) {
        best = { stringNumber, fret };
      }
    }
    return best;
  }

  /**
   * The same music as `event`, drawn on `toStaff`.
   *
   * A tab staff needs the string and fret as well as the pitch, and only
   * the instrument's tuning can turn one into the other, so a note that no
   * string can reach makes the whole counterpart impossible -- half a chord
   * on the tab staff would be a different chord from the one written.
   */
  function counterpartEvent(event, toStaff, measureNumber) {
    const tab = isTabStaff(measureNumber, toStaff);
    const voiceId = voiceForStaff(toStaff);
    const startTick = event.startTick ?? 0;
    const init = { duration: event.duration, voice: voiceId, staff: toStaff, startTick };
    // A rest carries no pitch, so it needs no string: it is the same rest on
    // either staff, and a beat the writer cleared has to clear both.
    if (event.kind === 'rest') return engine.rest(init);
    const taken = new Set();
    const members = [];
    for (const note of eventNotes(event)) {
      if (!tab) {
        members.push(engine.note({ ...init, pitch: note.pitch }));
        continue;
      }
      // A note written from the fretboard already states its string; honour
      // that choice instead of re-deriving a different one.
      const position =
        note.stringNumber !== undefined && note.fret !== undefined
          ? { stringNumber: note.stringNumber, fret: note.fret }
          : tabPositionFor(note.pitch, taken);
      if (position === null) return null;
      taken.add(position.stringNumber);
      members.push(engine.note({ ...init, pitch: note.pitch, ...position }));
    }
    if (members.length === 0) return null;
    return members.length === 1 ? members[0] : engine.chord(members, { startTick });
  }

  /**
   * Writes one event, and the same music on the part's other staff.
   *
   * Both writes go into ONE document, so the pair undoes as a single
   * command and the score is never drawn with a notation note and a tab
   * rest on the same beat. `to` is null on a part that prints one staff.
   */
  function writePaired(doc, { partId, measureNumber, voiceId, event, replaceIndex = -1, to = null }) {
    const written =
      replaceIndex >= 0
        ? docTools.replaceEvent(doc, { partId, measureNumber, voiceId, eventIndex: replaceIndex, event })
        : docTools.insertEvent(doc, { partId, measureNumber, voiceId, event });
    if (to === null) return written;
    const counterpart = counterpartEvent(event, to, measureNumber);
    if (counterpart === null) return written;
    const pairVoice = voiceForStaff(to, partId);
    const events = eventsInFrom(written, measureNumber, pairVoice, partId);
    const index = indexAtTickOnStaff(events, event.startTick ?? 0, to);
    return index >= 0
      ? docTools.replaceEvent(written, {
          partId,
          measureNumber,
          voiceId: pairVoice,
          eventIndex: index,
          event: counterpart,
        })
      : docTools.insertEvent(written, {
          partId,
          measureNumber,
          voiceId: pairVoice,
          event: counterpart,
        });
  }

  /** The part's other staff when it prints notation and tab together, else null. */
  function pairedStaffFor(staffNumber, measureNumber = state.entry?.measureNumber ?? 1) {
    const tabStaff = tabStaffOf(measureNumber);
    if (tabStaff === null) return null;
    if (staffNumber === tabStaff) return notationStaffOf(measureNumber);
    return tabStaff;
  }

  /**
   * The pitch a string sounds at a fret.
   *
   * A tab line names a string, not a pitch, so the open string's tuning is
   * what turns the click into a note. `openStrings` runs lowest first, so
   * string 1 (the highest) is its last entry.
   */
  const tabPitch = (stringNumber, fret) => {
    const open = activeInstrument().data?.openStrings ?? [];
    const openMidi = open[open.length - stringNumber];
    return openMidi === undefined ? null : pitchFromMidi(openMidi + fret);
  };

  /**
   * How far a written pitch on this part must move to sound.
   *
   * MusicXML's `<transpose>` states what is added to a written pitch to get
   * a sounding one, so a guitar written at E4 sounds at E3. Playback reads
   * it from the same attribute (`transpose.semitones`); a preview that
   * skipped it would audition a different note from the one Play produces.
   */
  const transposeSemitonesAt = (measureNumber, partId = activePartId()) =>
    attributeAt(measureNumber, partId)?.transpose?.semitones ?? 0;

  const capacityOf = (measureNumber) => docTools.ticksPerMeasure(state.doc, activePartId(), measureNumber);

  const durationForTool = () =>
    engine.duration(
      state.tool.duration,
      state.tool.dots,
      engine.ticksForDisplayedDuration({ type: state.tool.duration, dots: state.tool.dots }),
    );

  /**
   * The beat a point on a staff falls on, snapped to the current note
   * value's grid.
   *
   * The click handler and the hit test both need it: the hit test uses it
   * to tell a press on a note from a press on the beat beside it, which
   * differ by only a notehead's width in a dense bar.
   */
  function snappedTickAt(x, systemIndex, staffNumber) {
    const rawTick = engine.xToTick(state.result.playback, x, systemIndex);
    const position = engine.resolvePosition(state.result.playback, rawTick).position;
    const grid = Math.max(1, durationForTool().ticks);
    const capacity = capacityOf(position.measureNumber);
    return {
      measureNumber: position.measureNumber,
      tick: Math.min(Math.max(0, capacity - grid), Math.round(position.tickInMeasure / grid) * grid),
      staffNumber,
    };
  }

  const accidentalAlter = () =>
    state.tool.accidental === null ? null : ACCIDENTAL_ALTER[state.tool.accidental];

  /** A pitch as a writer reads it, so the status line names the note it wrote. */
  const pitchLabel = (step, alter, octave) =>
    `${step}${alter === 1 ? '#' : alter === -1 ? 'b' : alter === 2 ? '##' : alter === -2 ? 'bb' : ''}${octave}`;

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

  /**
   * Staff line runs in the rendered SVG, top to bottom.
   *
   * A run of five lines is a STAFF. The engine, however, addresses a
   * SYSTEM -- the row of staves played together, one staff per part. Those
   * two numbers only agree in a one-part score: with two parts every system
   * holds two staves, so the second staff is band 1 but still system 0.
   * Each band therefore carries the system it belongs to, taken from the
   * engine's own system origins rather than from its position in this list.
   * Without that, clicking the lower staff asked the engine about a system
   * that does not exist and the note landed at the start of the score.
   */
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
    let runSpacing = null;
    const closeRun = () => {
      if (run.length >= 5) {
        const band = run.map((line) => line.y);
        staves.push({
          systemIndex: 0,
          topY: band[0],
          bottomY: band[band.length - 1],
          // One space of THIS staff, in SVG units: a five-line staff is 1,
          // a six-line tab staff is 1.5. Pitch and hit-test maths both need
          // it, and assuming 1 draws a tab note in the wrong place.
          space: runSpacing ?? 1,
          leftX: Math.min(...run.map((line) => line.left)),
          rightX: Math.max(...run.map((line) => line.right)),
        });
      }
      run = [];
      runSpacing = null;
    };
    for (const y of ys) {
      // A run continues while the gap matches the spacing the run itself
      // established. A grand staff's two staves are 6.5 apart while a tab
      // staff spaces its six lines 1.5 apart, so a fixed gap of 1 finds
      // neither: the first gap of a run is what defines that staff.
      const previous = run[run.length - 1]?.y;
      const gap = previous === undefined ? null : y - previous;
      const continues = gap !== null && (runSpacing === null ? gap > 0 : Math.abs(gap - runSpacing) < 0.01);
      if (continues) {
        if (runSpacing === null) runSpacing = gap;
        run.push(...lines.filter((line) => line.y === y));
      } else {
        closeRun();
        run = lines.filter((line) => line.y === y);
      }
    }
    closeRun();

    // A system's origin sits above its top staff, so a band belongs to the
    // last origin that does not start below it.
    const origins = systemOrigins();
    for (const staff of staves) {
      const owner = origins.filter((origin) => origin.y <= staff.topY + 0.01).pop();
      staff.systemIndex = owner?.systemIndex ?? origins[0]?.systemIndex ?? 0;
    }

    // Every system draws the same staves in the same order -- part by part,
    // staff by staff -- so a band's place within its system names which
    // part and which of that part's staves it is.
    const slots = staffSlots();
    const bySystem = new Map();
    for (const staff of staves) {
      if (!bySystem.has(staff.systemIndex)) bySystem.set(staff.systemIndex, []);
      bySystem.get(staff.systemIndex).push(staff);
    }
    for (const group of bySystem.values()) {
      group.forEach((staff, index) => {
        staff.partId = slots[index]?.partId;
        staff.staffNumber = slots[index]?.staffNumber ?? 1;
      });
    }
    return staves;
  }

  /** Every staff the score draws, in drawing order: one entry per staff of each part. */
  function staffSlots() {
    const slots = [];
    for (const part of state.doc?.score.parts ?? []) {
      const count = Math.max(1, attributeAt(1, part.id)?.staves ?? 1);
      for (let staffNumber = 1; staffNumber <= count; staffNumber += 1) {
        slots.push({ partId: part.id, staffNumber });
      }
    }
    return slots;
  }

  /** Each system's vertical origin, top to bottom, from the engine's placements. */
  function systemOrigins() {
    const placements = state.result?.playback.placementByMeasureNumber;
    if (!placements) return [];
    const seen = new Map();
    for (const placement of placements.values()) {
      if (!seen.has(placement.systemIndex)) seen.set(placement.systemIndex, placement.systemY);
    }
    return [...seen]
      .map(([systemIndex, y]) => ({ systemIndex, y }))
      .sort((a, b) => a.y - b.y);
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
    const inside = staves.find(
      (staff) => y >= staff.topY - 2 * (staff.space ?? 1) && y <= staff.bottomY + 2 * (staff.space ?? 1),
    );
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
    // Measured in this staff's own spaces, so a tab staff's 1.5 spacing is
    // read as the six lines it is rather than as a five-line staff's 1.
    const space = staff.space ?? 1;
    const raw = (y - staff.bottomY) / space;
    // The staff is four spaces tall, so the top line sits at -4. A ledger
    // line above or below is one more space, and two of them is as far as a
    // click may reach; the band `staffAt` accepts is exactly this range.
    const lowest = (staff.topY - staff.bottomY) / space - 2;
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
    const space = staff.space ?? 1;
    const bandTop = staff.topY - 2 * space;
    const bandBottom = staff.bottomY + 2 * space;
    if (point.y < bandTop || point.y > bandBottom) return false;
    if (staff.leftX !== undefined && point.x < staff.leftX - 1) return false;
    if (staff.rightX !== undefined && point.x > staff.rightX + 1) return false;
    return true;
  }

  // ---- rendering ---------------------------------------------------------

  const setControlsEnabled = (enabled) => {
    [exportToggle, exportPdf, exportSvg, exportPng, exportXml, exportMxl, addMeasureButton, removeMeasureButton, playButton, stopButton, metronomeButton, saveButton]
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
    // The instrument box is a strip -- a keyboard, a fretboard, a row of
    // pads -- so it takes the editor's own width rather than the width of
    // its contents under the button, which is how MuseScore's panel reads.
    if (panel.classList.contains('editor-popover--inst')) {
      placeWidePopover(trigger, panel);
      return;
    }
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

  /**
   * Places a box that spans the editor, aligned with the score workspace.
   *
   * It is clamped to the window, so a narrow screen still gets a box that
   * fills it edge to edge instead of one that overflows; and it sits above
   * the bottom bar, which is where its trigger lives.
   */
  const placeWidePopover = (trigger, panel) => {
    const margin = 8;
    const anchor = trigger.getBoundingClientRect();
    const workspace = scoreHost.getBoundingClientRect();
    const width = Math.max(240, Math.min(workspace.width, window.innerWidth - margin * 2));
    const left = Math.max(margin, Math.min(workspace.left, window.innerWidth - width - margin));
    for (let pass = 0; pass < 2; pass += 1) {
      const height = panel.getBoundingClientRect().height;
      const above = anchor.top - height - 8;
      const top = above >= margin ? above : Math.max(margin, anchor.bottom + 8);
      panel.style.width = `${Math.round(width)}px`;
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
    if (open) {
      placePopover(trigger, panel);
      // The strip is as wide as a real piano, so it opens on middle C
      // rather than on A0. Measured after the box is laid out, or the
      // scroll width is still zero.
      const strip = panel.querySelector('[data-editor-piano]');
      const middleC = strip?.querySelector('[data-editor-inst-key="C4"]');
      if (strip && middleC) {
        strip.scrollLeft = Math.max(0, middleC.offsetLeft - strip.clientWidth / 2 + middleC.offsetWidth / 2);
      }
    }
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
    /** Every staff of one system, top to bottom -- one per part, then per staff of that part. */
    const stavesOf = (systemIndex) => staves.filter((staff) => staff.systemIndex === systemIndex);
    const bandTop = (staff) => (staff ? staff.topY - 4 : 0);
    const bandHeight = (staff) => (staff ? staff.bottomY - staff.topY + 8 : 8);
    /**
     * The band one staff of one part covers. A marker for a particular
     * note belongs on that note's own staff -- a grand staff draws two, and
     * a beat written into the bass staff must not be marked on the treble.
     */
    const staffBand = (partId, staffNumber) => {
      const staff =
        staves.find((candidate) => candidate.partId === partId && candidate.staffNumber === staffNumber) ?? staves[0];
      return { top: bandTop(staff), height: bandHeight(staff) };
    };
    /** A marker for a whole system covers every staff on it: the beat belongs to all the parts. */
    const systemBand = (systemIndex) => {
      const own = stavesOf(systemIndex);
      if (own.length === 0) return { top: 0, height: 8 };
      return {
        top: own[0].topY - 4,
        height: own[own.length - 1].bottomY - own[0].topY + 8,
      };
    };
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
      // The cursor marks the staff the next note goes on, so it is drawn on
      // that staff and not on the whole system: a grand staff would
      // otherwise show one line spanning both, which says nothing about
      // where the note will land.
      const band = staffBand(state.entry.partId ?? activePartId(), state.entry.staffNumber ?? 1);
      const x = engine.positionToX(state.result.playback, globalTickOf(state.entry.measureNumber, state.entry.tick)).x;
      overlay.appendChild(svgElement('rect', {
        class: 'editor-cursor',
        x: x - 0.08,
        y: band.top,
        width: 0.16,
        height: band.height,
      }));
    }

    if (state.result && state.playing) {
      // Same mapping the play loop uses: on a repeated score the marker
      // must jump back with the music instead of running off the end.
      const tick = writtenTickAt(state.playSeconds);
      const placement = engine.computeCursorPlacement(state.result.playback, tick, { mode: 'cursorMoves' });
      const band = systemBand(placement.systemIndex);
      overlay.appendChild(svgElement('rect', {
        class: 'editor-playhead',
        x: placement.markerX - 0.06,
        y: band.top,
        width: 0.12,
        height: band.height,
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
      // A part added, renamed or re-instrumented changes the routing, so
      // the sound engine has to hear about it before the next note.
      syncSoundTracks();
      scoreHost.replaceChildren(imported);
      scoreHost.hidden = false;
      scoreHost.dataset.layout = state.layout;
      applyOverlays(imported, detectStaves(imported));
      setControlsEnabled(true);
      syncHistory();
      syncPartSelect();
      syncInstrumentPanel();
      // The tie and flip buttons read the selection, so their pressed state
      // has to follow every redraw, not only the tool clicks.
      syncTools();
      syncPalette();
      syncSidebarPanel();
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
    syncInstrumentPanel();
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
   *
   * A line can carry more than one drum: closed and open hi-hat share the
   * top space and differ only by notehead, and so do the high tom and the
   * ride. Keying the kit by line alone kept only the last of each pair, so
   * one of the two could never be written -- and which one survived
   * depended on the order the file happened to declare them. Every drum is
   * kept here instead, in the part's own declaration order, and the writer
   * chooses among them (see `insertAtEntry`).
   */
  function collectDrumInstruments(parsed) {
    const byPart = new Map();
    const table = engine.DEFAULT_DRUM_MAPPING_TABLE;
    if (!table) return byPart;
    for (const part of parsed.score.parts) {
      const gmNotes = parsed.midiInstrumentsByPart?.get(part.id);
      if (!gmNotes || gmNotes.size === 0) continue;
      const byPosition = new Map();
      for (const [instrumentId, gmNote] of gmNotes) {
        const entry = table[gmNote];
        if (!entry) continue;
        const { step, octave } = docTools.pitchFromStaffPosition(engine.PERCUSSION_CLEF, entry.staffPosition);
        const drum = {
          instrumentId,
          gmNote,
          staffPosition: entry.staffPosition,
          displayStep: step,
          displayOctave: octave,
          name: entry.name,
        };
        const onThisLine = byPosition.get(entry.staffPosition);
        if (onThisLine === undefined) byPosition.set(entry.staffPosition, [drum]);
        else onThisLine.push(drum);
      }
      if (byPosition.size > 0) byPart.set(part.id, byPosition);
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
    state.entry = {
      partId: activePartId(),
      measureNumber: 1,
      voiceId: voiceForStaff(1),
      tick: 0,
      staffNumber: 1,
    };
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
        staffNumber: eventFor(anchor)?.staff ?? state.entry?.staffNumber ?? 1,
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
      staffNumber: events[eventIndex]?.staff ?? state.entry?.staffNumber ?? 1,
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
    // Selecting is not moving the insertion point: the entry cursor stays
    // where the user left it, so a copy-then-paste lands on the next beat
    // rather than on top of the note it just copied.
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

  /** Switches the voice that new notes are written into, for the current staff. */
  function setVoice(voiceId) {
    const id = Math.min(4, Math.max(1, Number(voiceId) || 1));
    state.voice = id;
    if (voiceSelect) voiceSelect.value = String(id);
    // The picker applies to the staff the cursor is on, so the other staff
    // keeps its own default instead of being dragged along.
    const staffNumber = state.entry?.staffNumber ?? 1;
    if (state.entry) {
      state.voicesByStaff = {
        ...state.voicesByStaff,
        [`${activePartId()}:${staffNumber}`]: id,
      };
      state.entry = { ...state.entry, voiceId: id };
    }
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
      state.entry = { partId: activePartId(), measureNumber: nextMeasure, voiceId, tick: 0 };
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
    if (first && first.kind !== 'chord') previewPitch(first.pitch, null, movable[0].measureNumber);
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
   * The cells the selection implies, with their notation/tab counterparts.
   *
   * On a guitar part that prints both, one beat is one note written twice,
   * so clearing the notation note has to clear the tab one as well or the
   * two staves disagree about the bar.
   */
  function withCounterparts(cells) {
    const all = new Map(cells.map((cell) => [`${cell.measureNumber}:${cell.voiceId}:${cell.eventIndex}`, cell]));
    for (const cell of cells) {
      const event = eventFor(cell);
      if (!event || event.kind === 'rest') continue;
      const to = pairedStaffFor(event.staff ?? 1, cell.measureNumber);
      if (to === null) continue;
      const voiceId = voiceForStaff(to);
      const events = eventsIn(cell.measureNumber, voiceId);
      const index = indexAtTickOnStaff(events, event.startTick ?? 0, to);
      if (index < 0) continue;
      const pairEvent = events[index];
      if (!pairEvent || pairEvent.kind === 'rest') continue;
      all.set(`${cell.measureNumber}:${voiceId}:${index}`, {
        partId: cell.partId,
        measureNumber: cell.measureNumber,
        voiceId,
        eventIndex: index,
      });
    }
    return [...all.values()];
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
    const deletable = withCounterparts(cells).filter((cell) => {
      const event = eventFor(cell);
      return event && event.kind !== 'rest';
    });
    if (deletable.length === 0) {
      announce('There is nothing to delete there.');
      return;
    }
    // The count is what the writer selected, not what was written: on a
    // paired part the tab note goes with the notation one, and saying
    // "2 notes" for one click would be wrong.
    const count = cells.filter((cell) => {
      const event = eventFor(cell);
      return event && event.kind !== 'rest';
    }).length;
    const anchor = state.selection ? { ...state.selection } : { ...deletable[0] };
    commit((doc) => docTools.deleteEvents(doc, deletable),
      `Deleted ${count} note${count === 1 ? '' : 's'}.`);
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

  /**
   * The voice a staff writes into.
   *
   * A part's staves are separate lines of music and need separate voices.
   * Writing both into voice 1 put a treble note and a bass note on one
   * timeline, where the second read as "this beat is taken" and replaced
   * the first -- the bug that made only one note per column writable. A new
   * grand staff already ships placeholder rests this way (voice 1 on staff
   * 1, voice 2 on staff 2), so the default matches what is on screen.
   */
  function voiceForStaff(staffNumber, partId = activePartId()) {
    const staves = Math.max(1, attributeAt(1, partId)?.staves ?? 1);
    const fallback = staves <= 1 ? 1 : Math.min(4, Math.max(1, staffNumber));
    return state.voicesByStaff?.[`${partId}:${staffNumber}`] ?? fallback;
  }

  /** The voice the cursor will write into. */
  function entryVoiceId() {
    if (!state.entry) return state.voice;
    return state.entry.voiceId ?? voiceForStaff(state.entry.staffNumber ?? 1);
  }

  /**
   * The index of the event already sitting on `tick` on `staffNumber`.
   *
   * A voice is not one per part: a grand staff's two staves hold their own
   * voices, but a file may still carry one voice across both (the parser
   * keeps whatever the file said). Matching on the tick alone then finds the
   * OTHER staff's note and overwrites it, which is what made a bass note
   * delete the treble note above it. The staff is part of what "this beat is
   * taken" means.
   */
  function indexAtTickOnStaff(events, tick, staffNumber) {
    return events.findIndex(
      (event) => (event.startTick ?? 0) === tick && (event.staff ?? 1) === staffNumber,
    );
  }

  /**
   * Rolls the entry cursor past a written note.
   *
   * `written` remembers where the note went so that Shift and a letter can
   * stack on it rather than on the beat the cursor has moved to. A new click
   * replaces the whole entry object, so the memory never outlives the
   * gesture that set it.
   */
  function advanceEntry(ticks, measureNumber, voiceId) {
    const written = {
      measureNumber,
      tick: state.entry.tick,
      staffNumber: state.entry.staffNumber ?? 1,
      voiceId,
    };
    const located = locateTick(state.entry.tick + ticks, measureNumber);
    state.entry = { ...state.entry, measureNumber: located.measureNumber, tick: located.tick, voiceId, written };
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
  function insertAtEntry({ step = null, octave = null, rest = false, addToChord = false, staffPosition = null, alter = null, drum = null, stringNumber = null, fret = null }) {
    if (!state.doc) return;
    if (!state.entry) {
      state.entry = {
        partId: activePartId(),
        measureNumber: 1,
        voiceId: voiceForStaff(1),
        tick: 0,
        staffNumber: 1,
      };
    }
    // Chord mode keeps every note on the beat the last one was written on,
    // so the mode and Shift are the same gesture: one is a latch, the other
    // is held. A rest is a beat of its own and never joins a chord.
    const stacking = !rest && (addToChord || state.tool.chord);
    // A chord stacks on the beat AND the staff it was written on: a click on
    // the bass staff must not join the chord the treble staff holds.
    if (stacking && state.entry.written !== undefined) {
      state.entry = { ...state.entry, ...state.entry.written };
    }
    const { measureNumber, voiceId } = state.entry;
    const staff = state.entry.staffNumber ?? 1;
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
      const event = engine.rest({ duration: fitted, voice: voiceId, staff, startTick: state.entry.tick });
      // A guitar part that prints notation and tab is one part on two
      // staves, so a rest clears both -- otherwise the tab staff keeps
      // sounding a note the notation staff has just been cleared of.
      commit(
        (doc) =>
          writePaired(doc, {
            partId: activePartId(),
            measureNumber,
            voiceId,
            event,
            to: pairedStaffFor(staff, measureNumber),
          }),
        'Rest inserted.',
      );
      advanceEntry(ticks, measureNumber, voiceId);
      return;
    }

    // A kit part has no pitches: the clicked line names a drum instead.
    // A letter key names the same line a click there would, so both
    // gestures reach the kit -- and neither may fall through to the
    // pitched branch below, which would write a note a drum part cannot
    // sound.
    //
    // Gated on a kit actually being declared, not on the clef: a
    // percussion-clef staff that names no GM drums has no drums to write,
    // and keeps writing pitches exactly as it always did.
    //
    // A line can name two drums, so the choice is made against what is
    // already on the beat: a plain click writes the first, a chord click
    // the first that is not in the chord yet.
    const kit = state.drumInstruments?.get(activePartId()) ?? null;
    const line = drum !== null ? drum.staffPosition : staffPosition ?? drumLineForLetter(step);
    const drums = drum !== null ? [drum] : drumsOnLine(line);
    if (kit !== null && !rest) {
      if (drums.length === 0) {
        announce(
          step === null
            ? 'Click a staff line to write a drum.'
            : `No drum is mapped to ${step}; click the line you want.`,
        );
        return;
      }
      const events = eventsIn(measureNumber, voiceId);
      const existingIndex = indexAtTickOnStaff(events, state.entry.tick, staff);
      const existing = existingIndex >= 0 ? events[existingIndex] : null;
      const chosen = drum ?? pickDrumForLine(line, existing);
      if (chosen === null) {
        const names = drums.map((entry) => entry.name).join(' and ');
        announce(`${names} are already in the chord.`);
        return;
      }
      const drumPitch = engine.unpitchedPitch(chosen.displayStep, chosen.displayOctave);
      const note = engine.note({
        pitch: drumPitch,
        duration: existing && existing.kind !== 'rest' ? existing.duration : fitted,
        voice: voiceId,
        staff,
        instrumentId: chosen.instrumentId,
      });
      if (existing && existing.kind !== 'rest') {
        // A drum chord is written the same way a pitched one is: kick and
        // hi-hat land on the same beat, so a Shift-click on the second
        // line stacks it instead of replacing the first.
        if (stacking) {
          const stacked = stackedWith(existing, note, state.entry.tick);
          if (stacked === null) {
            announce(`${chosen.name} is already in the chord.`);
            return;
          }
          commit((doc) => docTools.replaceEvent(doc, { partId: activePartId(), measureNumber, voiceId, eventIndex: existingIndex, event: stacked }), `Added ${chosen.name} to the chord.`);
        } else {
          commit((doc) => docTools.replaceEvent(doc, { partId: activePartId(), measureNumber, voiceId, eventIndex: existingIndex, event: note }), `Replaced with ${chosen.name}.`);
        }
        previewPitch(drumPitch, chosen);
        render();
        return;
      }
      commit((doc) => docTools.insertEvent(doc, { partId: activePartId(), measureNumber, voiceId, event: note }), `Inserted ${chosen.name}.`);
      previewPitch(drumPitch, chosen);
      advanceEntry(ticks, measureNumber, voiceId);
      return;
    }

    if (step === null) {
      announce('Click a staff line or press a note letter first.');
      return;
    }
    const alterValue = alter ?? accidentalAlter();
    const pitch = { kind: 'pitched', step, alter: alterValue ?? 0, octave };
    const tab = stringNumber === null ? {} : { stringNumber, ...(fret === null ? {} : { fret }) };
    const events = eventsIn(measureNumber, voiceId);
    const existingIndex = indexAtTickOnStaff(events, state.entry.tick, staff);
    const existing = existingIndex >= 0 ? events[existingIndex] : null;

    if (existing && existing.kind !== 'rest') {
      const note = engine.note({ pitch, duration: existing.duration, voice: voiceId, staff, ...tab });
      // The tab staff is the same music as the notation staff above it, so
      // a note written on either has to appear on both -- a guitarist reads
      // one and plays from the other.
      const to = pairedStaffFor(staff, measureNumber);
      if (stacking) {
        const stacked = stackedWith(existing, note, state.entry.tick);
        if (stacked === null) {
          announce(`${pitchLabel(step, pitch.alter, octave)} is already in the chord.`);
          return;
        }
        commit((doc) => writePaired(doc, { partId: activePartId(), measureNumber, voiceId, event: stacked, replaceIndex: existingIndex, to }), 'Note added to chord.');
      } else {
        // A plain letter or click on an occupied beat restates that beat's
        // pitch, replacing rather than stacking by default.
        commit((doc) => writePaired(doc, { partId: activePartId(), measureNumber, voiceId, event: note, replaceIndex: existingIndex, to }), `Replaced with ${pitchLabel(step, pitch.alter, octave)}.`);
      }
      previewPitch(pitch, null, measureNumber);
      render();
      return;
    }

    const event = engine.note({ pitch, duration: fitted, voice: voiceId, staff, startTick: state.entry.tick, ...tab });
    commit((doc) => writePaired(doc, { partId: activePartId(), measureNumber, voiceId, event, to: pairedStaffFor(staff, measureNumber) }), `Inserted ${pitchLabel(step, pitch.alter, octave)}.`);
    previewPitch(pitch, null, measureNumber);
    advanceEntry(ticks, measureNumber, voiceId);
  }

  /**
   * `existing` plus `note` as one chord at `tick`, or `null` when `note` is
   * already a notehead of that chord.
   *
   * Writing a chord is a repeated gesture -- click the beat, Shift-click
   * each further line -- so the same line clicked twice has to be a no-op.
   * The engine's `chord()` would happily accept two identical noteheads,
   * which draws a doubled head and plays the note twice as loud.
   */
  function stackedWith(existing, note, tick) {
    const members = existing.kind === 'chord' ? existing.notes : [existing];
    const samePitch = (a, b) =>
      a.pitch.kind === 'unpitched' || b.pitch.kind === 'unpitched'
        ? a.instrumentId === b.instrumentId &&
          a.pitch.displayStep === b.pitch.displayStep &&
          a.pitch.displayOctave === b.pitch.displayOctave
        : a.pitch.step === b.pitch.step &&
          a.pitch.alter === b.pitch.alter &&
          a.pitch.octave === b.pitch.octave;
    if (members.some((member) => samePitch(member, note))) return null;
    return engine.chord([...members, note], { startTick: tick });
  }

  /**
   * The staff line a note letter names on a kit staff.
   *
   * A kit's drums are not all in one octave -- a snare sits above the
   * middle line and a bass drum below it -- so a letter has to mean "the
   * line this letter names" on whichever octave actually carries a drum.
   * The kit's own lines decide: a letter resolves to the first line,
   * starting from the one nearest the middle of the staff and moving
   * outward, that the part has a drum on. That keeps every drum the kit
   * declares reachable from the keyboard, which is the point of step
   * entry.
   */
  function drumLineForLetter(step) {
    if (step === null) return null;
    const kit = state.drumInstruments?.get(activePartId());
    if (kit === undefined) return null;
    const centre = docTools.pitchFromStaffPosition(
      clefAt(state.entry?.measureNumber ?? 1, state.entry?.staffNumber ?? 1),
      0,
    ).octave;
    // Two octaves either way covers every line a five-line staff and its
    // ledger lines reach; nearest-first means F is the bass drum before
    // it is a tom two octaves up.
    for (const octave of [centre, centre + 1, centre - 1, centre + 2, centre - 2]) {
      const position = engine.staffPositionForPitch(engine.PERCUSSION_CLEF, step, octave);
      if (kit.has(position)) return position;
    }
    return null;
  }

  /**
   * Every drum the kit puts on one staff line, in the part's declaration
   * order -- or an empty list when the part is not a kit, or nothing sits
   * on that line.
   *
   * A line can carry more than one drum (closed and open hi-hat; high tom
   * and ride), so a click on it is a choice, not a single answer. Which
   * one gets written is `pickDrumForLine`'s call.
   */
  function drumsOnLine(staffPosition) {
    if (!activePartIsPercussion() || staffPosition === undefined || staffPosition === null) return [];
    return state.drumInstruments?.get(activePartId())?.get(staffPosition) ?? [];
  }

  /**
   * Which drum a click on `staffPosition` writes.
   *
   * One line can carry two drums -- closed and open hi-hat, high tom and
   * ride -- so a plain click writes the first the part declared, and a
   * chord click writes the first that is not already in the chord. That
   * makes the second drum on a line reachable at all, which keying the
   * kit by line alone made impossible. `null` means every drum on the
   * line is already in the chord.
   */
  function pickDrumForLine(staffPosition, existing) {
    const drums = drumsOnLine(staffPosition);
    if (drums.length === 0) return null;
    if (existing === null || existing.kind === 'rest') return drums[0];
    const members = existing.kind === 'chord' ? existing.notes : [existing];
    const inChord = new Set(members.map((member) => member.instrumentId));
    return drums.find((drum) => !inChord.has(drum.instrumentId)) ?? null;
  }

  /** The octave whose notes sit nearest the middle of the current clef. */
  function currentOctave() {
    return docTools.pitchFromStaffPosition(
      clefAt(state.entry?.measureNumber ?? 1, state.entry?.staffNumber ?? 1),
      0,
    ).octave;
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
      const staffNumber = hitStaff?.staffNumber ?? 1;
      const { step, octave } = docTools.pitchFromStaffPosition(
        clefAt(measureNumber, staffNumber, partId),
        staffPosition,
      );
      // A note's hit box is a notehead wide plus padding, which in a dense
      // bar overlaps the beat beside it. Taking every hit as "you clicked
      // this note" meant a click on the '&' replaced the note on the beat,
      // so an eighth-note groove could never be written. The beat the
      // POINTER is over decides instead: only a press on the note's own
      // beat is a press on the note, and anything else falls through to
      // the positional placement below.
      const clickedTick = hitStaff === null
        ? null
        : snappedTickAt(point.x, hitStaff.systemIndex, hitStaff.staffNumber ?? 1);
      const onThisNote = clickedTick === null
        || clickedTick.measureNumber !== measureNumber
        || clickedTick.tick === (existing?.startTick ?? 0);
      // A rest -- including the whole-measure placeholder MusicXML writes
      // for an empty measure -- is not a note to select. In note input it
      // is the SPACE to write into, so fall through to the positional
      // placement below rather than trapping every click on beat 1.
      if (existing && existing.kind !== 'rest' && onThisNote) {
        // In note input a staff click always writes. Clicking a note that
        // is already there -- the commonest gesture when writing a melody,
        // since notes sit where the pointer is -- must replace that note
        // (or, with Shift, add to its chord). Dropping into selection here
        // made the click look like it did nothing. Selecting a note in
        // order to transpose it is what note input OFF is for.
        if (state.noteInput && !state.tool.rest) {
          state.entry = {
            partId,
            measureNumber,
            voiceId,
            tick: existing.startTick ?? 0,
            staffNumber,
          };
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
    // A staff click names the part as well as the beat: a grand staff's
    // lower staff belongs to the same part, a second part's staff to its
    // own, and the note has to be written into the one that was clicked.
    if (staff.partId) {
      state.activePartId = staff.partId;
      if (partSelect && !partSelect.hidden) partSelect.value = staff.partId;
    }
    const staffNumber = staff.staffNumber ?? 1;

    // `xToTick`, not `xToPosition`: the latter snaps to the nearest
    // EXISTING note, so in a measure whose only event is on beat 1 every
    // click would land on beat 1 and the user could never write beat 3.
    // `xToTick` is the continuous inverse, and `snappedTickAt` snaps the
    // result to the current note value's own grid, the way step entry does.
    const position = snappedTickAt(point.x, systemIndex, staffNumber);
    const snappedTick = position.tick;
    const staffPosition = staffPositionFromPoint(staff, point.y);
    // A tab line names a string, not a pitch: the click has to become a
    // string/fret pair or the note is written to a staff position the tab
    // cannot draw, and the engine then drops it as a missing fret.
    const tab = isTabStaff(position.measureNumber, staffNumber)
      ? tabClickFor(staffNumber, staffPosition)
      : null;
    const { step, octave } = tab
      ? tab
      : docTools.pitchFromStaffPosition(
          clefAt(position.measureNumber, staffNumber),
          staffPosition,
        );
    // Chord mode is a latch on the BEAT you are working on, not a trap: a
    // click that lands on a different beat moves there and starts a new
    // chord. Pinning every click to the last written beat made a groove
    // impossible -- the kick and hi-hat stacked on 1, and the hi-hat
    // written on the '&' stacked on 1 as well, because its own x was
    // ignored. `written` is what `advanceEntry` recorded, so a click on the
    // same beat (or near enough to snap to it) still stacks.
    // A chord stacks only on its own staff: joining a treble chord from the
    // bass staff would put two staves' notes in one chord, which the engine
    // rejects outright (and used to leave the click doing nothing at all).
    const stackingClick =
      state.tool.chord &&
      state.entry?.written !== undefined &&
      (state.entry.written.staffNumber ?? 1) === staffNumber &&
      state.entry.written.measureNumber === position.measureNumber &&
      state.entry.written.tick === snappedTick;
    // A grand staff's two staves are separate lines, so each writes into its
    // own voice. Without this both landed in voice 1, and because the beat
    // lookup used to ignore the staff, the second note replaced the first.
    const clickedVoiceId = stackingClick
      ? state.entry.written.voiceId ?? voiceForStaff(staffNumber)
      : voiceForStaff(staffNumber);
    state.entry = {
      partId: activePartId(),
      measureNumber: stackingClick ? state.entry.written.measureNumber : position.measureNumber,
      voiceId: clickedVoiceId,
      tick: stackingClick ? state.entry.written.tick : snappedTick,
      staffNumber,
      ...(stackingClick ? { written: state.entry.written } : {}),
    };
    if (state.noteInput) {
      clearSelection();
      if (state.tool.rest) insertAtEntry({ rest: true });
      else if (tab) {
        insertAtEntry({
          ...tab,
          step,
          octave,
          staffPosition,
          addToChord: event.shiftKey,
        });
      } else insertAtEntry({ step, octave, staffPosition, addToChord: event.shiftKey });
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
   * Clicks a bar at the score's own tempo and metre, then queues the next
   * one, so the pulse runs on for as long as the switch is on.
   *
   * `startAt` is the audio clock's own time for the bar: a pulse that runs
   * on stays on its grid instead of drifting with each timer.
   */
  const scheduleMetronome = (barSeconds = countInSeconds(), startAt = null) => {
    clearMetronomeTimers();
    // The metre and tempo come from the score, so there is nothing to click
    // against until one is open.
    if (!state.metronomeOn || !state.doc) return;
    const { numerator, denominator } = scoreTimeSignature();
    const beatSeconds = (60 * 4) / (scoreBpm() * denominator);

    // A host without Web Audio (an old browser, a preview) still has a
    // working metronome button; it just cannot make a sound there.
    if (!state.metronome) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      state.metronome = new Audio();
    }
    const context = state.metronome;
    void context.resume();
    const origin = startAt ?? context.currentTime;

    const click = (at, accented) => {
      if (at < context.currentTime) return;
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

    // Queue the next bar a little early, on the same grid, so the pulse
    // never gaps between one bar and the next.
    const next = origin + barSeconds;
    const delay = Math.max(0, (next - context.currentTime) * 1000 - 120);
    state.metronomeTimers.push(window.setTimeout(() => scheduleMetronome(barSeconds, next), delay));
  };

  /** One bar at the score's own tempo — how long the count-in lasts. */
  const countInSeconds = () => {
    const { numerator, denominator } = scoreTimeSignature();
    return numerator * ((60 * 4) / (scoreBpm() * denominator));
  };

  const setMetronome = (on) => {
    state.metronomeOn = on;
    if (on) {
      // The switch is audible on its own: it starts the pulse straight
      // away, whether or not the score is playing.
      scheduleMetronome();
      announce('Metronome on.');
    } else {
      clearMetronomeTimers();
      announce('Metronome off.');
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

  /** The in-flight manifest read, so playback can wait for the host's asset list. */
  let soundFontsLoading = null;

  const ensureSound = async () => {
    if (state.sound) return state.sound;
    if (state.soundTried) throw new Error('Playback is unavailable in this preview.');
    if (state.soundLoading) return state.soundLoading;
    state.soundTried = true;
    const SoundFont = window.NotationSoundFont;
    if (!SoundFont?.R2SoundFontEngine) throw new Error('The sound engine could not be loaded.');
    // Play must not race the manifest: a writer can press Play before the
    // asset list has arrived, and the id it carries decides which font
    // loads. Waiting here costs nothing when the read already finished.
    if (soundFontsLoading) await soundFontsLoading;
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
      // A note auditioned before Play needs the score's own routing, or
      // the first note a writer places sounds as the default piano.
      syncSoundTracks();
      return engine;
    }).catch((error) => {
      state.soundLoading = null;
      state.soundTried = false;
      throw error;
    });
    return state.soundLoading;
  };

  /** Hands the score's current tracks to the sound engine, if it is loaded. */
  function syncSoundTracks() {
    // Re-routing mid-playback would re-send program changes under the notes
    // already sounding; `play` sets the routing itself when it starts.
    if (state.playing) return;
    const tracks = state.result?.playback?.tracks;
    if (!tracks || !state.sound?.setTracks) return;
    state.sound.setTracks(tracks);
  }

  /**
   * Sounds a written pitch the moment it is placed, so the writer hears the
   * note instead of pressing Play to check it. The SoundFont is fetched on
   * the first preview and reused; a failed or slow load never blocks the
   * edit -- the note is already committed by the time this runs.
   *
   * The audition has to be the note Play would produce, so a transposing
   * part is moved by its `<transpose>` here too. The measure decides the
   * amount, because a part can change transposition mid-score.
   */
  function previewPitch(pitch, drum = null, measureNumber = state.entry?.measureNumber ?? 1) {
    if (!state.previewOn || state.playing) return;
    // An unpitched drum has no MIDI number of its own; its sound is the
    // GM key the kit declared for it, and a kit never transposes.
    const midi = drum
      ? drum.gmNote
      : engine.midiNoteNumber?.(pitch, transposeSemitonesAt(measureNumber));
    if (midi === undefined) return;
    // The part decides the channel, and so the instrument and whether the
    // note is percussion: a note written on the violin part must not be
    // auditioned as a piano.
    const partId = activePartId();
    void ensureSound()
      .then((sound) => sound.preview?.([midi], undefined, partId))
      .catch(() => {
        /* no sound available; writing still works */
      });
  }

  // ---- SoundFont manifest ------------------------------------------------
  //
  // The Sound Engine fetches its SoundFonts from R2 at runtime, and the
  // host's manifest is the only list of them: it names the assets, their
  // paths and which one to load by default. Reading it is what lets the
  // engine use the project's own fonts instead of its built-in table.

  /** Loads the R2 manifest so playback uses the host's own asset list. Never throws to the caller. */
  async function loadSoundFonts() {
    try {
      if (typeof fetch !== 'function') throw new Error('fetch is unavailable');
      const configured = window.MSHARING_SOUNDFONT_CONFIG || {};
      const manifestUrl = configured.manifestUrl || 'soundfonts/manifest.json';
      const response = await fetch(manifestUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`SoundFont manifest request failed (${response.status}).`);
      const manifest = await response.json();
      const assetPaths = manifest.runtime?.assetPaths || {};
      const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
      state.soundAssetPaths = assetPaths;
      const preferred = configured.assetId || manifest.runtime?.defaultAssetId;
      const known = assets.some((asset) => asset.id === preferred);
      state.soundAssetId = known ? preferred : (assets[0]?.id ?? null);
    } catch {
      // The engine keeps its own table when the manifest cannot be read,
      // so a failed fetch costs the host's fonts, not playback.
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
    // Crossing into another system moves the marker DOWN as well as along,
    // so a frame that only re-sets `x` would leave the playhead on the row
    // it started on -- on a paged score that is a different line of music
    // entirely. A system change is a redraw, exactly like a new note.
    const placement = engine.computeCursorPlacement(state.result.playback, tick, { mode: 'cursorMoves' });
    if (id !== state.soundingId || placement.systemIndex !== state.playheadSystem) {
      state.soundingId = id;
      state.playheadSystem = placement.systemIndex;
      render();
    } else {
      const line = scoreHost.querySelector('svg .editor-playhead');
      if (line) {
        line.setAttribute('x', String(placement.markerX - 0.06));
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
    state.playheadSystem = null;
    // Stop returns to where playback would begin, not to a silent top, so
    // pressing Play again repeats from the entry cursor.
    state.playSeconds = startSeconds();
    clearMetronomeTimers();
    // Stopping the score does not switch the metronome off; the switch is
    // still on, so its pulse picks up again.
    if (state.metronomeOn) scheduleMetronome();
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
    if (state.metronomeOn) scheduleMetronome();
    if (state.soundTimer) window.clearTimeout(state.soundTimer);
    state.soundTimer = null;
    state.countInEndsAt = 0;
    setPlaying(false);
    cancelFrame(state.rafId);
    state.rafId = null;
    state.soundingId = null;
    state.playheadSystem = null;
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
    // heard. The pulse runs on under the music: the switch is a metronome,
    // and it keeps time for as long as it is on.
    const leadIn = state.metronomeOn ? countInSeconds() : 0;
    const from = state.playSeconds;
    state.playStartSeconds = from;
    state.playStartedAt = performance.now();
    state.countInEndsAt = leadIn > 0 ? state.playStartedAt + leadIn * 1000 : 0;
    setPlaying(true);
    // Draw at once so the playhead appears and the entry cursor steps
    // aside on the same frame the sound starts.
    render();
    if (leadIn > 0) scheduleMetronome(leadIn);
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
      } else if (kind === 'png') {
        download(new Blob([await engine.exportPng(state.result.svg, { scale: 2 })], { type: 'image/png' }), `${baseName()}.png`);
      } else {
        // MusicXML and MXL carry the score itself, not a picture of it, so
        // another program can open it and keep editing.
        const xml = docTools.toMusicXml(state.doc);
        if (kind === 'mxl') {
          download(new Blob([engine.exportMxl(xml)], { type: 'application/vnd.recordare.musicxml' }), `${baseName()}.mxl`);
        } else {
          download(new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' }), `${baseName()}.musicxml`);
        }
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

  const syncLayout = () => {
    layoutButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.editorLayout === state.layout));
    });
  };

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
    if (chordButton) chordButton.setAttribute('aria-pressed', String(state.tool.chord));
    noteInputButton.setAttribute('aria-pressed', String(state.noteInput));
    if (previewButton) previewButton.setAttribute('aria-pressed', String(state.previewOn));
    if (zoomOutput) zoomOutput.textContent = `${state.zoom}%`;
    root.dataset.mode = state.noteInput ? 'input' : 'select';
    if (toolbarStack) toolbarStack.dataset.mode = root.dataset.mode;
    // The voice picker shows the voice of the staff the cursor is on, so it
    // has to follow the cursor: clicking the bass staff must show voice 2.
    if (voiceSelect) {
      voiceSelect.value = String(entryVoiceId());
    }
    syncLayout();
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
    // A different part has its own staves, so the entry starts on its first.
    state.entry = { partId, measureNumber, voiceId: voiceForStaff(1, partId), tick: 0, staffNumber: 1 };
    clearSelection();
    syncSetupControls();
    render();
    announce(`Writing into ${partNameOf(partId)}.`);
  }

  function onPartChange() {
    if (partSelect) selectPart(partSelect.value);
  }

  // ---- instrument and mixer boxes -----------------------------------------

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTE_ALTER = { 'C#': 1, 'D#': 1, 'F#': 1, 'G#': 1, 'A#': 1 };
  // A piano's own range: A0 (MIDI 21) to C8 (MIDI 108), the 88 keys a
  // player expects when the panel says "piano".
  const PIANO_LOW_MIDI = 21;
  const PIANO_HIGH_MIDI = 108;

  /** Splits a MIDI number into the step, accidental and octave it is written with. */
  function pitchFromMidi(midi) {
    const name = NOTE_NAMES[((midi % 12) + 12) % 12];
    return { step: name[0], alter: NOTE_ALTER[name] ?? 0, octave: Math.floor(midi / 12) - 1 };
  }

  const stringData = () => engine.NotationDefaults?.STRING_DATA ?? [];

  /**
   * What the Inst. box offers for the part being written.
   *
   * The part itself decides, not the writer: a kit gets drum pads, a
   * fretted instrument gets its own strings and frets, and everything else
   * gets a keyboard. A fretted part is recognised by the name the score
   * gives it, falling back to its GM program so a part named by another
   * program still gets a fretboard.
   */
  function activeInstrument() {
    if (!state.doc) return { kind: 'none' };
    const partId = activePartId();
    if (state.drumInstruments?.has(partId) || activePartIsPercussion()) return { kind: 'drums' };
    const name = partById(partId)?.name ?? '';
    const byName = stringData().find((entry) => entry.name === name);
    if (byName) return { kind: 'fretted', data: byName };
    const program = state.result?.playback?.tracks?.find((track) => track.id === partId)?.program;
    if (program !== undefined && program >= 24 && program <= 39) {
      const family = program <= 31 ? /guitar/i : /bass/i;
      const byProgram = stringData().find((entry) => family.test(entry.id));
      if (byProgram) return { kind: 'fretted', data: byProgram };
    }
    return { kind: 'keys' };
  }

  const panelTitle = (text) => {
    const title = document.createElement('span');
    title.className = 'editor-inst__title';
    title.textContent = text;
    return title;
  };

  const panelNote = (text) => {
    const note = document.createElement('span');
    note.className = 'editor-inst__note';
    note.textContent = text;
    return note;
  };

  /**
   * The whole piano, A0 to C8.
   *
   * A writer picks the instrument's real range, not a window onto it: a
   * bass line needs A0 and a melody can reach C8, and a panel that stopped
   * at two octaves could write neither. The strip scrolls sideways and
   * opens on middle C, where most writing starts.
   *
   * Shift-click stacks, the same gesture the staff uses for a chord, so
   * C-E-G is three presses without leaving the panel.
   */
  function buildKeyboard() {
    const body = document.createElement('div');
    body.className = 'editor-inst';
    body.append(panelTitle('Keyboard — 88 keys'));
    const strip = document.createElement('div');
    strip.className = 'editor-inst__piano';
    strip.dataset.editorPiano = '';
    const row = document.createElement('div');
    row.className = 'editor-inst__piano-row';
    const WHITE = 22;
    const GAP = 1;
    const BLACK = 14;
    let whiteCount = 0;
    for (let midi = PIANO_LOW_MIDI; midi <= PIANO_HIGH_MIDI; midi += 1) {
      const pitch = pitchFromMidi(midi);
      const black = pitch.alter !== 0;
      const key = document.createElement('button');
      key.type = 'button';
      key.dataset.editorInstKey = `${pitch.step}${black ? '#' : ''}${pitch.octave}`;
      key.setAttribute('aria-label', `${pitch.step}${black ? '#' : ''}${pitch.octave}`);
      key.title = key.dataset.editorInstKey;
      key.addEventListener('click', (event) =>
        insertAtEntry({ ...pitch, addToChord: event.shiftKey }),
      );
      if (black) {
        key.className = 'editor-inst__black';
        key.style.left = `${(whiteCount - 1) * (WHITE + GAP) + WHITE + GAP / 2 - BLACK / 2}px`;
      } else {
        key.className = 'editor-inst__white';
        // Only the C keys are labelled: 52 names in a strip this narrow
        // would read as noise, and C is how a player finds their place.
        if (pitch.step === 'C') key.textContent = `C${pitch.octave}`;
        whiteCount += 1;
      }
      row.append(key);
    }
    strip.append(row);
    body.append(strip);
    body.append(panelNote('88 keys, A0–C8. Shift-click stacks a chord.'));
    return body;
  }

  /**
   * The instrument's own strings, highest first, with a fret button per
   * position. A click states the string and fret as well as the pitch, so
   * the note lands where a tab staff would draw it.
   */
  function buildFretboard(data) {
    const body = document.createElement('div');
    body.className = 'editor-inst';
    body.append(panelTitle(`${data.name} — ${data.openStrings.length} strings`));
    const shownFrets = Math.min(12, data.frets);
    const highest = data.openStrings.length;
    for (let stringNumber = 1; stringNumber <= highest; stringNumber += 1) {
      const openMidi = data.openStrings[highest - stringNumber];
      const line = document.createElement('div');
      line.className = 'editor-inst__string';
      const label = document.createElement('span');
      label.className = 'editor-inst__string-label';
      const openPitch = pitchFromMidi(openMidi);
      label.textContent = `S${stringNumber} ${openPitch.step}${openPitch.octave}`;
      line.append(label);
      for (let fret = 0; fret <= shownFrets; fret += 1) {
        const pitch = pitchFromMidi(openMidi + fret);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `editor-inst__fret${fret === 0 ? ' editor-inst__fret--open' : ''}`;
        button.dataset.editorInstFret = `${stringNumber}:${fret}`;
        button.setAttribute('aria-label', `String ${stringNumber}, fret ${fret}`);
        button.title = `${pitch.step}${pitch.octave}`;
        button.textContent = fret === 0 ? '0' : String(fret);
        button.addEventListener('click', (event) =>
          insertAtEntry({ ...pitch, stringNumber, fret, addToChord: event.shiftKey }),
        );
        line.append(button);
      }
      body.append(line);
    }
    body.append(panelNote(`Frets 0–${shownFrets} of ${data.frets}.`));
    return body;
  }

  /** The kit's drums as pads, highest line first, the order a percussion palette uses. */
  function buildDrumPads() {
    const body = document.createElement('div');
    body.className = 'editor-inst';
    const kit = state.drumInstruments?.get(activePartId());
    const drums = [...(kit?.values() ?? [])].flat();
    body.append(panelTitle('Percussion'));
    if (drums.length === 0) {
      body.append(panelNote('This part names no drums to write.'));
      return body;
    }
    const grid = document.createElement('div');
    grid.className = 'editor-inst__drums';
    [...drums]
      .sort((a, b) => b.staffPosition - a.staffPosition)
      .forEach((drum) => {
        const pad = document.createElement('button');
        pad.type = 'button';
        pad.className = 'editor-inst__drum';
        pad.dataset.editorInstDrum = String(drum.gmNote);
        pad.setAttribute('aria-label', drum.name);
        pad.textContent = drum.name;
        pad.addEventListener('click', (event) =>
          insertAtEntry({ drum, addToChord: event.shiftKey }),
        );
        grid.append(pad);
      });
    body.append(grid);
    return body;
  }

  /**
   * The mixer lists the score's parts. It is a placeholder: the sliders
   * are drawn but carry no level yet, so the box says so rather than
   * pretending to mix.
   */
  function buildMixer() {
    const body = document.createElement('div');
    body.className = 'editor-inst';
    body.append(panelTitle('Mixer'));
    const tracks = state.result?.playback?.tracks ?? [];
    if (tracks.length === 0) {
      body.append(panelNote('Open a score to see its parts.'));
      return body;
    }
    for (const track of tracks) {
      const row = document.createElement('div');
      row.className = 'editor-inst__row';
      const name = document.createElement('span');
      name.className = 'editor-inst__row-name';
      name.textContent = track.name ?? track.id;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'editor-inst__slider';
      slider.min = '0';
      slider.max = '127';
      slider.value = '100';
      slider.disabled = true;
      slider.setAttribute('aria-label', `${track.name ?? track.id} level`);
      row.append(name, slider);
      body.append(row);
    }
    body.append(panelNote('Levels are not wired up yet.'));
    return body;
  }

  /**
   * Rebuilds both boxes for the part now being written.
   *
   * Only when what they show has changed: a redraw follows every written
   * note, and replacing the panel's buttons on each one would throw away
   * the focus a keyboard user is standing on.
   */
  function syncInstrumentPanel() {
    const instrument = activeInstrument();
    const signature = [
      instrument.kind,
      instrument.data?.id ?? '',
      activePartId() ?? '',
      state.drumInstruments?.get(activePartId())?.size ?? 0,
      (state.result?.playback?.tracks ?? []).map((track) => `${track.id}:${track.name}`).join('|'),
    ].join('/');
    if (instPanel && instPanel.dataset.signature !== signature) {
      instPanel.dataset.signature = signature;
      instPanel.replaceChildren(
        instrument.kind === 'drums'
          ? buildDrumPads()
          : instrument.kind === 'fretted'
            ? buildFretboard(instrument.data)
            : instrument.kind === 'keys'
              ? buildKeyboard()
              : panelNote('Open a score to write notes.'),
      );
    }
    if (mixerPanel && mixerPanel.dataset.signature !== signature) {
      mixerPanel.dataset.signature = signature;
      mixerPanel.replaceChildren(buildMixer());
    }
    if (instButton) instButton.disabled = !state.doc;
    if (mixerButton) mixerButton.disabled = !state.doc;
  }

  // ---- sidebar -----------------------------------------------------------

  /**
   * The dock remembers where the writer left it: open or closed, and on
   * which tab.
   *
   * The score library already survives a reload, so a dock that snapped
   * shut on every visit would make the writer reopen the same panel each
   * time. Storage is optional -- a browser that refuses it still gets a
   * working dock for the visit.
   */
  const SIDEBAR_STORE_KEY = 'notation-lab-sidebar';
  const SIDEBAR_TABS = ['palettes', 'properties', 'instruments'];

  function readSidebarState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SIDEBAR_STORE_KEY) || '{}');
      return {
        open: parsed?.open === true,
        tab: SIDEBAR_TABS.includes(parsed?.tab) ? parsed.tab : 'palettes',
      };
    } catch {
      return { open: false, tab: 'palettes' };
    }
  }

  function writeSidebarState() {
    try {
      localStorage.setItem(
        SIDEBAR_STORE_KEY,
        JSON.stringify({ open: isSidebarOpen(), tab: state.sidebarTab }),
      );
    } catch {
      // Storage is optional: the dock still works for this visit.
    }
  }

  /**
   * The dock opens from one arrow handle and closes on anything else.
   *
   * A notation window belongs to the score, so the dock cannot be a
   * column that is always there: it slides in over the page, and the
   * first press that is not on it -- or the handle again -- puts it back.
   * It and the Inst. box are two panels over the same score, so opening
   * one closes the other rather than stacking them.
   */
  const setSidebar = (open) => {
    if (!sidebar || !sidebarHandle) return;
    // A press on the score closes the dock on every click, so a state that
    // is already the wanted one has to cost nothing -- not a repaint and
    // not a storage write.
    if (isSidebarOpen() === open) return;
    sidebar.hidden = !open;
    sidebarHandle.setAttribute('aria-expanded', String(open));
    sidebarHandle.setAttribute('aria-label', open ? 'Close sidebar' : 'Open sidebar');
    if (open) closePopovers();
    writeSidebarState();
  };
  const isSidebarOpen = () => Boolean(sidebar) && !sidebar.hidden;

  // ---- palettes ----------------------------------------------------------
  //
  // MuseScore's palette dock, limited to the marks this editor can really
  // write. A group is a collapsible section and an item is one button;
  // `apply` performs the edit through the same `commit()` path the toolbar
  // uses, so a palette click undoes like any other command. `pressed` says
  // whether the selection already carries the mark, which is what lights
  // the button -- and clicking a lit button takes the mark away.

  /** The bar a palette command acts on: the selection's, else the cursor's. */
  const paletteMeasure = () =>
    state.selection?.measureNumber ?? state.entry?.measureNumber ?? 1;

  /** The beat a palette mark sits at -- the selection's own, else the bar's start. */
  const paletteTick = () => {
    const event = eventFor(paletteTargets()[0] ?? selectedCells()[0]);
    return event ? (event.startTick ?? 0) : 0;
  };

  const paletteAttribute = (measureNumber = paletteMeasure()) =>
    state.doc ? attributeAt(measureNumber, activePartId()) : null;

  /** True when every selected note already carries `field: value`. */
  const selectionCarriesField = (field, value) => {
    const cells = paletteTargets();
    if (cells.length === 0) return false;
    return cells.every((cell) =>
      eventNotes(eventFor(cell)).every((note) => note[field] === value),
    );
  };

  /**
   * Sets or clears plain fields on every selected note.
   *
   * `fields` maps a note field to the value to write; a null value removes
   * the field, which is how the same button adds and takes away. A chord's
   * members each get their own copy -- the document layer merges a patch
   * into every note of a chord, so the fields stay per-note.
   */
  function toggleNoteFields(fields, { remove = false, message }) {
    const cells = paletteTargets();
    if (cells.length === 0) {
      announce('Select a note first.');
      return;
    }
    const patch = remove
      ? Object.fromEntries(Object.keys(fields).map((key) => [key, null]))
      : fields;
    commit((doc) => {
      let next = doc;
      for (const cell of cells) {
        next = docTools.patchEvent(next, {
          partId: cell.partId,
          measureNumber: cell.measureNumber,
          voiceId: cell.voiceId,
          eventIndex: cell.eventIndex,
          patch,
        });
      }
      return next;
    }, message);
  }

  /** Writes an accidental onto every selected note, or clears it again. */
  function applyAccidentalToSelection(alter, label) {
    const cells = paletteTargets();
    if (cells.length === 0) {
      announce('Select a note first.');
      return;
    }
    const removing = cells.every((cell) =>
      eventNotes(eventFor(cell)).every((note) => (note.pitch?.alter ?? 0) === alter),
    );
    const nextAlter = removing ? 0 : alter;
    commit((doc) => {
      let next = doc;
      for (const cell of cells) {
        const event = eventFor(cell);
        if (!event) continue;
        const repitch = (note) => ({
          ...note,
          pitch: note.pitch?.kind === 'unpitched' ? note.pitch : { ...note.pitch, alter: nextAlter },
        });
        const patch = event.kind === 'chord'
          ? { notes: event.notes.map(repitch) }
          : { pitch: repitch(event).pitch };
        next = docTools.patchEvent(next, {
          partId: cell.partId,
          measureNumber: cell.measureNumber,
          voiceId: cell.voiceId,
          eventIndex: cell.eventIndex,
          patch,
        });
      }
      return next;
    }, removing ? 'Accidental removed.' : `${label} applied.`);
  }

  /** Writes one direction mark -- a word, a pedal or a hairpin -- at the cursor's beat. */
  function applyDirectionMark(merge, message) {
    commit(
      (doc) => docTools.setDirection(doc, {
        partId: activePartId(),
        measureNumber: paletteMeasure(),
        tick: paletteTick(),
        placement: 'below',
        merge,
      }),
      message,
    );
  }

  /**
   * A hairpin spans beats, so it is written as the pair MusicXML wants: a
   * start on the selected beat and a stop at the end of the bar. One
   * command, so undo takes the whole wedge away.
   */
  function applyHairpin(type, label) {
    const measureNumber = paletteMeasure();
    const tick = paletteTick();
    const end = Math.max(tick + 1, Math.round(docTools.ticksPerMeasure(state.doc, activePartId(), measureNumber)));
    commit(
      (doc) => {
        const started = docTools.setDirection(doc, {
          partId: activePartId(),
          measureNumber,
          tick,
          placement: 'below',
          merge: (direction) => ({ ...direction, wedges: [{ type, number: 1 }] }),
        });
        return docTools.setDirection(started, {
          partId: activePartId(),
          measureNumber,
          tick: end,
          placement: 'below',
          merge: (direction) => ({ ...direction, wedges: [{ type: 'stop', number: 1 }] }),
        });
      },
      `${label} added.`,
    );
  }

  /** Sets or clears one bar's ending barline. */
  function applyBarline(patch, message) {
    commit(
      (doc) => docTools.setBarline(doc, {
        partId: activePartId(),
        measureNumber: paletteMeasure(),
        patch,
      }),
      message,
    );
  }

  /** Sets or clears one bar's page or system break. */
  function applyPrint(flag, message) {
    const measureNumber = paletteMeasure();
    const current = (state.doc?.prints ?? []).find(
      (print) => print.partId === activePartId() && print.measureNumber === measureNumber,
    );
    const on = Boolean(current?.[flag]);
    commit(
      (doc) => docTools.setPrint(doc, {
        partId: activePartId(),
        measureNumber,
        newSystem: flag === 'newSystem' ? !on : Boolean(current?.newSystem),
        newPage: flag === 'newPage' ? !on : Boolean(current?.newPage),
      }),
      on ? `${message} removed.` : `${message} added.`,
    );
  }

  /** The tempo marks the palette offers, in quarter-notes per minute. */
  const PALETTE_TEMPI = [40, 60, 72, 84, 96, 120, 144, 168, 200];

  const KEY_PALETTE = [
    ['C', 0], ['G', 1], ['D', 2], ['A', 3], ['E', 4], ['B', 5], ['F#', 6],
    ['F', -1], ['Bb', -2], ['Eb', -3], ['Ab', -4], ['Db', -5], ['Gb', -6],
  ];

  const TIME_PALETTE = [
    ['4/4', 4, 4], ['3/4', 3, 4], ['2/4', 2, 4], ['6/8', 6, 8],
    ['2/2', 2, 2], ['3/8', 3, 8], ['5/4', 5, 4], ['12/8', 12, 8],
  ];

  /**
   * The catalogue. Every group's `apply` receives the item's own `value`,
   * so an item is a label plus data and the command is written once.
   */
  const PALETTE_GROUPS = [
    {
      id: 'clefs',
      label: 'Clefs',
      open: true,
      items: [
        { id: 'treble', label: 'Treble clef', glyph: 'gClef', value: { clefSign: 'G', clefLine: 2, clefsByStaff: { 1: { sign: 'G', line: 2 } } } },
        { id: 'bass', label: 'Bass clef', glyph: 'fClef', value: { clefSign: 'F', clefLine: 4, clefsByStaff: { 1: { sign: 'F', line: 4 } } } },
        { id: 'alto', label: 'Alto clef', glyph: 'cClef', value: { clefSign: 'C', clefLine: 3, clefsByStaff: { 1: { sign: 'C', line: 3 } } } },
      ],
      apply: (value) => commit(
        (doc) => docTools.setAttributesFrom(doc, { partId: activePartId(), measureNumber: paletteMeasure(), patch: value }),
        'Clef changed from this bar.',
      ),
      pressed: (value) => paletteAttribute()?.clefSign === value.clefSign,
    },
    {
      id: 'keys',
      label: 'Key signatures',
      open: true,
      items: KEY_PALETTE.map(([name, fifths]) => ({
        id: `key-${name}`,
        label: `${name} major`,
        text: name,
        value: fifths,
      })),
      apply: (fifths) => commit(
        (doc) => docTools.setAttributesFrom(doc, { partId: activePartId(), measureNumber: paletteMeasure(), patch: { fifths } }),
        'Key signature changed from this bar.',
      ),
      pressed: (fifths) => (paletteAttribute()?.fifths ?? 0) === fifths,
    },
    {
      id: 'times',
      label: 'Time signatures',
      open: true,
      items: TIME_PALETTE.map(([name, numerator, denominator]) => ({
        id: `time-${name.replace('/', '-')}`,
        label: `${name} time`,
        text: name,
        value: { numerator, denominator },
      })),
      apply: ({ numerator, denominator }) => commit(
        (doc) => docTools.setAttributesFrom(doc, {
          partId: activePartId(),
          measureNumber: paletteMeasure(),
          patch: { timeNumerator: numerator, timeDenominator: denominator },
        }),
        'Meter changed from this bar.',
      ),
      pressed: ({ numerator, denominator }) => {
        const attribute = paletteAttribute();
        return attribute?.timeNumerator === numerator && attribute?.timeDenominator === denominator;
      },
    },
    {
      id: 'tempo',
      label: 'Tempo',
      open: true,
      items: PALETTE_TEMPI.map((bpm) => ({
        id: `tempo-${bpm}`,
        label: `${bpm} per quarter`,
        text: `\u2669=${bpm}`,
        value: bpm,
      })),
      apply: (perMinute) => commit(
        (doc) => docTools.setTempo(doc, {
          partId: activePartId(),
          measureNumber: paletteMeasure(),
          tick: 0,
          perMinute,
        }),
        `Tempo ${perMinute} added.`,
      ),
      pressed: (perMinute) => (state.doc?.tempoMarks ?? []).some(
        (mark) =>
          mark.partId === activePartId() &&
          mark.measureNumber === paletteMeasure() &&
          mark.perMinute === perMinute,
      ),
    },
    {
      id: 'accidentals',
      label: 'Accidentals',
      open: true,
      items: [
        { id: 'double-flat', label: 'Double flat', glyph: 'accidentalDoubleFlat', value: -2 },
        { id: 'flat', label: 'Flat', glyph: 'accidentalFlat', value: -1 },
        { id: 'natural', label: 'Natural', glyph: 'accidentalNatural', value: 0 },
        { id: 'sharp', label: 'Sharp', glyph: 'accidentalSharp', value: 1 },
        { id: 'double-sharp', label: 'Double sharp', glyph: 'accidentalDoubleSharp', value: 2 },
      ],
      apply: (alter) => applyAccidentalToSelection(alter, 'Accidental'),
      pressed: (alter) => {
        const cells = paletteTargets();
        return cells.length > 0 && cells.every((cell) =>
          eventNotes(eventFor(cell)).every((note) => (note.pitch?.alter ?? 0) === alter),
        );
      },
    },
    {
      id: 'dynamics',
      label: 'Dynamics',
      open: true,
      items: ['pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff', 'fp', 'sfz'].map((level) => ({
        id: `dynamic-${level}`,
        label: level,
        glyph: engine.dynamicGlyphName?.(level),
        value: level,
      })),
      apply: (level) => applyDynamic(level),
      pressed: (level) => selectionDynamic() === level,
    },
    {
      id: 'articulations',
      label: 'Articulations',
      open: true,
      items: [
        { id: 'accent', label: 'Accent', glyph: 'articAccentAbove', value: 'accent' },
        { id: 'staccato', label: 'Staccato', glyph: 'articStaccatoAbove', value: 'staccato' },
        { id: 'tenuto', label: 'Tenuto', glyph: 'articTenutoAbove', value: 'tenuto' },
        { id: 'marcato', label: 'Marcato', glyph: 'articMarcatoAbove', value: 'marcato' },
        { id: 'staccatissimo', label: 'Staccatissimo', glyph: 'articStaccatissimoAbove', value: 'staccatissimo' },
        { id: 'sforzato', label: 'Sforzato', glyph: 'articSoftAccentAbove', value: 'sforzato' },
      ],
      apply: (value) => applyMark('articulation', value),
      pressed: (value) => selectionCarries('articulation', value),
    },
    {
      id: 'ornaments',
      label: 'Ornaments',
      open: true,
      items: [
        { id: 'trill', label: 'Trill', glyph: 'ornamentTrill', value: 'trill' },
        { id: 'mordent', label: 'Mordent', glyph: 'ornamentMordent', value: 'mordent' },
        { id: 'turn', label: 'Turn', glyph: 'ornamentTurn', value: 'turn' },
        { id: 'turn-inverted', label: 'Inverted turn', glyph: 'ornamentTurnInverted', value: 'turnInverted' },
      ],
      apply: (value) => applyMark('ornament', value),
      pressed: (value) => selectionCarries('ornament', value),
    },
    {
      id: 'fermata',
      label: 'Fermata',
      open: true,
      items: [
        { id: 'fermata-above', label: 'Fermata above', glyph: 'fermataAbove', value: 'above' },
        { id: 'fermata-below', label: 'Fermata below', glyph: 'fermataBelow', value: 'below' },
      ],
      apply: (placement, item) => toggleNoteFields(
        { hasFermata: true, fermataPlacement: placement },
        {
          remove: selectionCarriesField('fermataPlacement', placement),
          message: `${item.label} ${selectionCarriesField('fermataPlacement', placement) ? 'removed' : 'added'}.`,
        },
      ),
      pressed: (placement) => selectionCarriesField('fermataPlacement', placement),
    },
    {
      id: 'text',
      label: 'Text',
      open: true,
      typed: { label: 'Staff text', placeholder: 'Text to add at the cursor' },
      items: [
        { id: 'rehearsal-a', label: 'Rehearsal mark A', text: 'A', value: { rehearsals: ['A'] } },
        { id: 'rehearsal-b', label: 'Rehearsal mark B', text: 'B', value: { rehearsals: ['B'] } },
        { id: 'rehearsal-c', label: 'Rehearsal mark C', text: 'C', value: { rehearsals: ['C'] } },
      ],
      apply: (merge) => applyDirectionMark(
        (direction) => ({
          ...direction,
          words: merge.words ?? direction.words,
          rehearsals: merge.rehearsals ?? direction.rehearsals,
        }),
        merge.words ? `Text added: ${merge.words[0]}.` : 'Rehearsal mark added.',
      ),
      pressed: () => false,
    },
    {
      id: 'repeats',
      label: 'Repeats & jumps',
      open: true,
      items: [
        { id: 'repeat-start', label: 'Repeat start', glyph: 'repeatStart', text: '\u{1D106}', value: { leftRepeatDirection: 'forward' } },
        { id: 'repeat-end', label: 'Repeat end', glyph: 'repeatEnd', text: '\u{1D107}', value: { repeatDirection: 'backward', barlineStyle: 'light-heavy' } },
        { id: 'volta-start', label: 'First ending start', text: '1.', value: { leftEndingNumbers: [1], leftEndingType: 'start' } },
        { id: 'volta-stop', label: 'First ending end', text: '1.', value: { endingNumbers: [1], endingType: 'stop', barlineStyle: 'light-heavy' } },
      ],
      apply: (patch, item) => applyBarline(patch, `${item.label} set.`),
      pressed: (patch) => {
        const attribute = paletteAttribute();
        return Object.entries(patch).every(([field, value]) => attribute?.[field] === value);
      },
    },
    {
      id: 'barlines',
      label: 'Barlines',
      open: true,
      items: [
        { id: 'barline-single', label: 'Single barline', glyph: 'barlineSingle', value: { barlineStyle: 'regular' } },
        { id: 'barline-double', label: 'Double barline', glyph: 'barlineDouble', value: { barlineStyle: 'light-light' } },
        { id: 'barline-final', label: 'Final barline', glyph: 'barlineFinal', value: { barlineStyle: 'light-heavy' } },
        { id: 'barline-dashed', label: 'Dashed barline', glyph: 'barlineDashed', value: { barlineStyle: 'dashed' } },
      ],
      apply: (patch, item) => applyBarline(patch, `${item.label} set.`),
      pressed: (patch) => paletteAttribute()?.barlineStyle === patch.barlineStyle,
    },
    {
      id: 'lines',
      label: 'Lines',
      open: true,
      items: [
        { id: 'crescendo', label: 'Crescendo', text: '<', value: ['crescendo', 'Crescendo'] },
        { id: 'decrescendo', label: 'Decrescendo', text: '>', value: ['decrescendo', 'Decrescendo'] },
      ],
      apply: ([type, label]) => applyHairpin(type, label),
      pressed: () => false,
    },
    {
      id: 'pedal',
      label: 'Pedal',
      open: true,
      items: [
        { id: 'pedal-start', label: 'Pedal start', glyph: 'keyboardPedalPed', value: 'start' },
        { id: 'pedal-stop', label: 'Pedal stop', glyph: 'keyboardPedalUp', value: 'stop' },
      ],
      apply: (type) => applyDirectionMark(
        (direction) => ({ ...direction, pedals: [{ type, number: 1 }] }),
        type === 'start' ? 'Pedal start added.' : 'Pedal stop added.',
      ),
      pressed: () => false,
    },
    {
      id: 'grace',
      label: 'Grace notes',
      open: true,
      items: [
        { id: 'acciaccatura', label: 'Acciaccatura', glyph: 'graceNoteSlashStemUp', value: { isGrace: true, graceSlash: true } },
        { id: 'appoggiatura', label: 'Appoggiatura', glyph: 'graceNoteAppoggiaturaStemUp', value: { isGrace: true } },
      ],
      apply: (fields, item) => {
        const removing = Boolean(eventNotes(paletteTargets().map(eventFor).find(Boolean))[0]?.isGrace);
        return toggleNoteFields(fields, {
          remove: removing,
          message: `${item.label} ${removing ? 'removed' : 'added'}.`,
        });
      },
      pressed: () => Boolean(eventNotes(eventFor(paletteTargets()[0]) ?? {})[0]?.isGrace),
    },
    {
      id: 'tremolos',
      label: 'Tremolos',
      open: true,
      items: [
        { id: 'tremolo-1', label: 'One stroke', glyph: 'tremolo1', value: 1 },
        { id: 'tremolo-2', label: 'Two strokes', glyph: 'tremolo2', value: 2 },
        { id: 'tremolo-3', label: 'Three strokes', glyph: 'tremolo3', value: 3 },
      ],
      apply: (strokes, item) => toggleNoteFields(
        { tremoloStrokes: strokes, tremoloType: 'single' },
        {
          remove: selectionCarriesField('tremoloStrokes', strokes),
          message: `${item.label} tremolo ${selectionCarriesField('tremoloStrokes', strokes) ? 'removed' : 'added'}.`,
        },
      ),
      pressed: (strokes) => selectionCarriesField('tremoloStrokes', strokes),
    },
    {
      id: 'arpeggios',
      label: 'Arpeggios & glissandi',
      open: true,
      items: [
        { id: 'arpeggio-up', label: 'Arpeggio up', glyph: 'arpeggiatoUp', value: 'up' },
        { id: 'arpeggio-down', label: 'Arpeggio down', glyph: 'arpeggiatoDown', value: 'down' },
      ],
      apply: (direction, item) => toggleNoteFields(
        { arpeggiate: direction },
        {
          remove: selectionCarriesField('arpeggiate', direction),
          message: `${item.label} ${selectionCarriesField('arpeggiate', direction) ? 'removed' : 'added'}.`,
        },
      ),
      pressed: (direction) => selectionCarriesField('arpeggiate', direction),
    },
    {
      id: 'noteheads',
      label: 'Noteheads',
      open: true,
      items: [
        { id: 'notehead-normal', label: 'Normal notehead', glyph: 'noteheadBlack', value: 'normal' },
        { id: 'notehead-x', label: 'Cross notehead', glyph: 'noteheadXBlack', value: 'x' },
        { id: 'notehead-diamond', label: 'Diamond notehead', glyph: 'noteheadDiamondBlack', value: 'diamond' },
        { id: 'notehead-circle-x', label: 'Circle cross', glyph: 'noteheadCircleX', value: 'circle-x' },
        { id: 'notehead-triangle', label: 'Triangle notehead', glyph: 'noteheadTriangleUpBlack', value: 'triangle' },
        { id: 'notehead-square', label: 'Square notehead', glyph: 'noteheadSquareBlack', value: 'square' },
        { id: 'notehead-slash', label: 'Slash notehead', glyph: 'noteheadSlashHorizontalEnds', value: 'slash' },
      ],
      apply: (notehead, item) => toggleNoteFields(
        { explicitNotehead: notehead },
        {
          remove: selectionCarriesField('explicitNotehead', notehead),
          message: `${item.label} ${selectionCarriesField('explicitNotehead', notehead) ? 'removed' : 'set'}.`,
        },
      ),
      pressed: (notehead) => selectionCarriesField('explicitNotehead', notehead),
    },
    {
      id: 'breaks',
      label: 'Breaks & spacers',
      open: true,
      items: [
        { id: 'system-break', label: 'System break', text: '\u21B5', value: 'newSystem' },
        { id: 'page-break', label: 'Page break', text: '\u21A4', value: 'newPage' },
      ],
      apply: (flag) => applyPrint(flag, flag === 'newSystem' ? 'System break' : 'Page break'),
      pressed: (flag) => (state.doc?.prints ?? []).some(
        (print) =>
          print.partId === activePartId() &&
          print.measureNumber === paletteMeasure() &&
          print[flag],
      ),
    },
  ];

  /**
   * The groups the dock opens with: the thirteen in MuseScore's own palette
   * list. The rest of the catalogue is one Add Palettes click away, which is
   * what keeps the dock from opening as a wall of headers.
   */
  const DEFAULT_PALETTE_GROUPS = [
    'clefs', 'keys', 'times', 'tempo', 'accidentals', 'dynamics',
    'articulations', 'ornaments', 'text', 'repeats', 'barlines', 'lines', 'breaks',
  ];

  const PALETTE_STORE_KEY = 'notation-lab-palette-groups';

  function readPaletteGroups() {
    try {
      const raw = localStorage.getItem(PALETTE_STORE_KEY);
      if (!raw) return [...DEFAULT_PALETTE_GROUPS];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...DEFAULT_PALETTE_GROUPS];
      // A group the catalogue no longer has is dropped rather than shown as
      // an empty section.
      return parsed.filter((id) => PALETTE_GROUPS.some((group) => group.id === id));
    } catch {
      return [...DEFAULT_PALETTE_GROUPS];
    }
  }

  function writePaletteGroups(ids) {
    state.paletteGroups = ids;
    try {
      localStorage.setItem(PALETTE_STORE_KEY, JSON.stringify(ids));
    } catch {
      // Storage is optional: the dock still works for this visit.
    }
  }

  const paletteGroups = () =>
    PALETTE_GROUPS.filter((group) => state.paletteGroups.includes(group.id));

  /** The palette buttons, so their pressed state can follow the selection. */
  let paletteButtons = [];

  const syncPalette = () => {
    for (const entry of paletteButtons) {
      const pressed = entry.group.pressed ? entry.group.pressed(entry.item.value) : false;
      entry.node.setAttribute('aria-pressed', String(Boolean(pressed)));
    }
  };

  /** One palette button: a glyph from the score font, or a short text label. */
  function paletteButton(group, item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'editor-palette__item';
    button.dataset.paletteItem = item.id;
    button.title = item.label;
    button.setAttribute('aria-label', item.label);
    button.setAttribute('aria-pressed', 'false');
    const glyph = item.glyph ? engine.getGlyph?.(item.glyph)?.char : '';
    const face = document.createElement('span');
    if (glyph) {
      face.className = 'editor-palette__glyph';
      face.textContent = glyph;
    } else {
      face.className = 'editor-palette__text';
      face.textContent = item.text ?? item.label;
    }
    button.append(face);
    button.addEventListener('click', () => {
      group.apply(item.value, item);
      syncPalette();
    });
    paletteButtons.push({ node: button, group, item });
    return button;
  }

  /** One collapsible group: a header that folds, and a grid of its items. */
  function paletteSection(group) {
    const section = document.createElement('section');
    section.className = 'editor-palette';
    section.dataset.paletteGroup = group.id;
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'editor-palette__header';
    header.setAttribute('aria-expanded', String(Boolean(group.open)));
    header.dataset.paletteToggle = group.id;
    const caret = document.createElement('span');
    caret.className = 'editor-palette__caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = '\u25B8';
    const name = document.createElement('span');
    name.className = 'editor-palette__name';
    name.textContent = group.label;
    header.append(caret, name);
    const items = document.createElement('div');
    items.className = 'editor-palette__items';
    items.hidden = !group.open;
    header.addEventListener('click', () => {
      const open = items.hidden;
      items.hidden = !open;
      header.setAttribute('aria-expanded', String(open));
    });
    for (const item of group.items) items.append(paletteButton(group, item));
    if (group.typed) items.append(typedPaletteField(group));
    section.append(header, items);
    return section;
  }

  /**
   * A palette entry that needs words: a field and a button, because a staff
   * text is whatever the writer types rather than a fixed mark.
   */
  function typedPaletteField(group) {
    const form = document.createElement('form');
    form.className = 'editor-palette__typed';
    form.dataset.paletteTyped = group.id;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'editor-palette__input';
    input.placeholder = group.typed.placeholder;
    input.setAttribute('aria-label', group.typed.label);
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'editor-palette__add';
    add.textContent = 'Add';
    form.append(input, add);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) {
        announce('Type the text to add first.');
        return;
      }
      group.apply({ words: [text] });
      input.value = '';
    });
    return form;
  }

  /** The search field and the Add Palettes button above the groups. */
  function paletteTools() {
    const bar = document.createElement('div');
    bar.className = 'editor-palette__tools';
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'editor-palette__search';
    search.placeholder = 'Search palettes';
    search.setAttribute('aria-label', 'Search palettes');
    search.dataset.paletteSearch = '';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'editor-palette__add-palettes';
    add.dataset.paletteAdd = '';
    add.setAttribute('aria-expanded', 'false');
    add.textContent = 'Add Palettes';
    bar.append(search, add);
    search.addEventListener('input', () => applyPaletteSearch(search.value));
    add.addEventListener('click', () => {
      const open = add.getAttribute('aria-expanded') !== 'true';
      add.setAttribute('aria-expanded', String(open));
      renderAddPalettes(open);
    });
    return bar;
  }

  /** Hides the items a query does not match, and the groups left empty. */
  function applyPaletteSearch(query) {
    const needle = query.trim().toLowerCase();
    for (const section of sidebarBody?.querySelectorAll('[data-palette-group]') ?? []) {
      const group = PALETTE_GROUPS.find((entry) => entry.id === section.dataset.paletteGroup);
      const items = section.querySelector('.editor-palette__items');
      let shown = 0;
      for (const item of items?.children ?? []) {
        const label = (item.getAttribute('aria-label') ?? item.textContent ?? '').toLowerCase();
        const match = needle === '' || label.includes(needle);
        item.hidden = !match;
        if (match && item.classList.contains('editor-palette__item')) shown += 1;
      }
      const groupMatch = needle === '' || (group?.label ?? '').toLowerCase().includes(needle);
      section.hidden = needle !== '' && shown === 0 && !groupMatch;
      if (needle !== '' && items) items.hidden = false;
    }
  }

  /** The Add Palettes list: every group not yet in the dock, one button each. */
  function renderAddPalettes(open) {
    let panel = sidebarBody?.querySelector('[data-palette-available]');
    if (!open) {
      panel?.remove();
      return;
    }
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'editor-palette__available';
      panel.dataset.paletteAvailable = '';
      const list = document.createElement('div');
      list.className = 'editor-palette__available-list';
      const missing = PALETTE_GROUPS.filter((group) => !state.paletteGroups.includes(group.id));
      if (missing.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'editor-sidebar__empty';
        empty.textContent = 'Every palette is already in the dock.';
        list.append(empty);
      }
      for (const group of missing) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'editor-palette__available-item';
        button.dataset.paletteAddGroup = group.id;
        button.textContent = group.label;
        button.addEventListener('click', () => {
          writePaletteGroups([...state.paletteGroups, group.id]);
          buildSidebar();
        });
        list.append(button);
      }
      panel.append(list);
      sidebarBody.append(panel);
    }
  }

  // ---- properties panel --------------------------------------------------
  //
  // MuseScore's Properties dock: the selected note's own values, editable
  // in place. Every control writes through the same `commit()` path the
  // toolbar and the palette use, so a property edit undoes like any other
  // command and the renderer is never edited directly.

  /** The one event the panel edits: the selection's anchor, when it is a note. */
  function propertyTarget() {
    const cells = paletteTargets();
    if (cells.length === 0) return null;
    const cell = state.selection ?? cells[0];
    const event = eventFor(cell);
    return event && event.kind !== 'rest' ? { cell, event } : null;
  }

  const propertyRow = (label, control, field = null) => {
    const row = document.createElement('label');
    row.className = 'editor-props__row';
    const name = document.createElement('span');
    name.className = 'editor-props__label';
    name.textContent = label;
    if (field) control.dataset.propsField = field;
    row.append(name, control);
    return row;
  };

  const propertySelect = (options, value, onChange, ariaLabel) => {
    const select = document.createElement('select');
    select.className = 'editor-props__select';
    select.setAttribute('aria-label', ariaLabel);
    for (const option of options) {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      select.append(node);
    }
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
    return select;
  };

  const propertyNumber = (value, { min, max, onChange, ariaLabel }) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'editor-props__number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.setAttribute('aria-label', ariaLabel);
    input.addEventListener('change', () => onChange(Number(input.value)));
    return input;
  };

  /** Every note value the toolbar can write, as a duration picker. */
  const DURATION_OPTIONS = [
    { value: 'whole:0', label: 'Whole' },
    { value: 'half:0', label: 'Half' },
    { value: 'half:1', label: 'Dotted half' },
    { value: 'quarter:0', label: 'Quarter' },
    { value: 'quarter:1', label: 'Dotted quarter' },
    { value: 'eighth:0', label: 'Eighth' },
    { value: 'eighth:1', label: 'Dotted eighth' },
    { value: '16th:0', label: '16th' },
    { value: '32nd:0', label: '32nd' },
  ];

  /**
   * Moves the selected note onto another staff of its own part.
   *
   * A grand staff or a notation-plus-tab part is one part on two staves, so
   * this is how a writer moves a line between them. The note is re-spelled
   * for its destination -- a tab staff wants a string and a fret, a
   * notation staff wants only the pitch -- and the beat it leaves becomes a
   * rest, so neither staff loses its meter.
   */
  function moveNoteToStaff(cell, staffNumber) {
    const event = eventFor(cell);
    if (!event || event.kind === 'rest') return;
    if ((event.staff ?? 1) === staffNumber) return;
    const moved = counterpartEvent(event, staffNumber, cell.measureNumber);
    if (moved === null) {
      announce('That note cannot be played on the other staff.');
      return;
    }
    const voiceId = voiceForStaff(staffNumber);
    commit(
      (doc) => docTools.moveEvent(doc, cell, { voiceId, event: moved }),
      `Moved to staff ${staffNumber}.`,
    );
    setSelection([{ ...cell, voiceId }], { ...cell, voiceId });
    render();
  }

  /**
   * Re-pitches one note of the selection, keeping its string and fret
   * honest.
   *
   * A tab note's `<string>`/`<fret>` describe its OLD pitch, so writing a
   * new one has to re-derive them from the instrument's tuning or the tab
   * staff would draw the new pitch on the old string. `fretFor` is the
   * engine's own arithmetic; a pitch no string can reach is written as a
   * plain pitched note, which is what MuseScore does rather than guessing.
   */
  function pitchNoteAt(cell, noteIndex, step, octave, alter = 0) {
    const event = eventFor(cell);
    if (!event || event.kind === 'rest') return;
    const notes = eventNotes(event);
    const pitches = notes.map((note, index) =>
      index === noteIndex
        ? { step, octave, alter, kind: note.pitch.kind === 'unpitched' ? 'unpitched' : 'pitched' }
        : { step: note.pitch.step, octave: note.pitch.octave, alter: note.pitch.alter ?? 0 },
    );
    commit(
      (doc) => docTools.setNotesPitch(doc, cell, pitches),
      `Wrote ${pitchLabel(step, alter, octave)}.`,
    );
    const updated = eventFor(cell);
    const written = updated ? eventNotes(updated)[noteIndex] : null;
    if (written) previewPitch(written.pitch, null, cell.measureNumber);
  }

  /** One editable row per notehead, so a chord's members are edited one by one. */
  function propertyPitches(target) {
    const box = document.createElement('div');
    box.className = 'editor-props__pitches';
    const notes = eventNotes(target.event);
    notes.forEach((note, index) => {
      if (note.pitch.kind === 'unpitched') {
        const row = document.createElement('div');
        row.className = 'editor-props__row';
        const label = document.createElement('span');
        label.className = 'editor-props__label';
        label.textContent = `Note ${index + 1}`;
        const value = document.createElement('span');
        value.className = 'editor-props__readout';
        value.textContent = `${note.pitch.displayStep}${note.pitch.displayOctave}`;
        row.append(label, value);
        box.append(row);
        return;
      }
      const stepSelect = propertySelect(
        docTools.STEPS.map((step) => ({ value: step, label: step })),
        note.pitch.step,
        (value) => pitchNoteAt(target.cell, index, value, note.pitch.octave, note.pitch.alter ?? 0),
        `Note ${index + 1} step`,
      );
      stepSelect.dataset.propsField = `step-${index}`;
      const octaveInput = propertyNumber(note.pitch.octave, {
        min: -1,
        max: 9,
        ariaLabel: `Note ${index + 1} octave`,
        onChange: (value) =>
          pitchNoteAt(target.cell, index, note.pitch.step, value, note.pitch.alter ?? 0),
      });
      octaveInput.dataset.propsField = `octave-${index}`;
      const row = document.createElement('div');
      row.className = 'editor-props__row';
      const label = document.createElement('span');
      label.className = 'editor-props__label';
      label.textContent = notes.length > 1 ? `Note ${index + 1}` : 'Pitch';
      row.append(label, stepSelect, octaveInput);
      box.append(row);
    });
    return box;
  }

  /**
   * The lyric verses under this note, one text field each.
   *
   * A note's syllables are the note's own, so the panel reads them from the
   * first member of a chord -- which is the note the renderer centres the
   * word on. Existing verses are listed in order; the last row is always an
   * empty field for the next verse, so a second verse needs no "add"
   * button. Typing `-` at either end of a syllable is how a writer says the
   * word continues, and `setLyric` turns that into `<syllabic>`.
   */
  function propertyLyrics(target) {
    const box = document.createElement('div');
    box.className = 'editor-props__lyrics';
    const member = eventNotes(target.event)[0];
    const existing = [...(member?.lyrics ?? [])].sort((a, b) => a.number - b.number);
    const nextVerse = existing.reduce((highest, lyric) => Math.max(highest, lyric.number), 0) + 1;
    const rows = [...existing.map((lyric) => ({ verse: lyric.number, text: lyric.text })), { verse: nextVerse, text: '' }];
    for (const row of rows) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'editor-props__text';
      input.value = row.text;
      input.placeholder = row.text === '' && row.verse === 1 ? 'Add lyrics' : `Verse ${row.verse}`;
      input.setAttribute('aria-label', `Lyrics verse ${row.verse}`);
      input.dataset.propsField = `lyric-${row.verse}`;
      // The panel is only rebuilt when its signature changes, so this field
      // outlives one commit. Compare against the last value this field wrote,
      // not the value it was built with, or a second edit looks like a no-op.
      let committed = row.text;
      const write = () => {
        const text = input.value;
        if (text === committed) return;
        committed = text;
        commit(
          (doc) => docTools.setLyric(doc, target.cell, { verse: row.verse, text }),
          text.trim() === '' ? 'Lyric removed.' : `Wrote "${text.trim()}".`,
        );
      };
      input.addEventListener('change', write);
      // Enter commits and returns focus to the score so typing a line of
      // syllables never needs the mouse.
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        write();
        scoreHost.focus();
      });
      box.append(propertyRow(row.verse === 1 && row.text === '' ? 'Lyrics' : `Verse ${row.verse}`, input));
    }
    return box;
  }

  /** The Properties tab: what the selection is and the fields it can change. */
  function buildPropertiesPanel() {
    const panel = document.createElement('div');
    panel.className = 'editor-props';
    const target = propertyTarget();
    if (!target) {
      panel.append(panelNote('Select a note to see its properties.'));
      return panel;
    }
    const { cell, event } = target;
    const readout = document.createElement('div');
    readout.className = 'editor-props__row';
    const readoutLabel = document.createElement('span');
    readoutLabel.className = 'editor-props__label';
    readoutLabel.textContent = 'Position';
    const readoutValue = document.createElement('span');
    readoutValue.className = 'editor-props__readout';
    readoutValue.textContent = `Bar ${cell.measureNumber}, voice ${cell.voiceId}, tick ${event.startTick ?? 0}`;
    readout.append(readoutLabel, readoutValue);
    panel.append(panelTitle('Properties'), readout);

    panel.append(propertyPitches(target), propertyLyrics(target));

    const duration = event.duration;
    panel.append(
      propertyRow(
        'Duration',
        propertySelect(
          DURATION_OPTIONS,
          `${duration.type}:${duration.dots}`,
          (value) => {
            const [type, dots] = value.split(':');
            const ticks = engine.ticksForDisplayedDuration({ type, dots: Number(dots) });
            commit(
              (doc) =>
                docTools.setEventDuration(doc, cell, engine.duration(type, Number(dots), ticks)),
              'Duration changed.',
            );
          },
          'Duration',
        ),
        'duration',
      ),
    );

    const staves = Math.max(1, attributeAt(cell.measureNumber)?.staves ?? 1);
    panel.append(
      propertyRow(
        'Voice',
        propertySelect(
          [1, 2, 3, 4].map((voiceId) => ({ value: String(voiceId), label: `Voice ${voiceId}` })),
          String(event.voice ?? cell.voiceId),
          (value) => {
            commit(
              (doc) => docTools.setEventVoice(doc, cell, Number(value)),
              `Moved to voice ${value}.`,
            );
            setSelection([{ ...cell, voiceId: Number(value) }], {
              ...cell,
              voiceId: Number(value),
            });
            render();
          },
          'Voice',
        ),
        'voice',
      ),
    );

    if (staves > 1) {
      panel.append(
        propertyRow(
          'Staff',
          propertySelect(
            Array.from({ length: staves }, (_, index) => ({
              value: String(index + 1),
              label: `Staff ${index + 1}`,
            })),
            String(event.staff ?? 1),
            (value) => moveNoteToStaff(cell, Number(value)),
            'Staff',
          ),
          'staff',
        ),
      );
    }

    const member = eventNotes(event)[0];
    if (member?.stringNumber !== undefined) {
      panel.append(
        propertyRow(
          'Tab',
          Object.assign(document.createElement('span'), {
            className: 'editor-props__readout',
            textContent: `String ${member.stringNumber}, fret ${member.fret ?? 0}`,
          }),
          'tab',
        ),
      );
    }
    return panel;
  }

  // ---- instruments panel -------------------------------------------------
  //
  // MuseScore's Instruments dock: the score's own part list, not the Inst.
  // box. The box is a writing surface for the part you are on; this panel
  // is the score's staff setup -- rename a part, switch to it, add one,
  // take one away.

  /** A fresh part id that no part in the document already uses. */
  function nextPartId() {
    const used = new Set((state.doc?.score.parts ?? []).map((part) => part.id));
    for (let index = 1; ; index += 1) {
      const id = `P${index}`;
      if (!used.has(id)) return id;
    }
  }

  /**
   * The layout a catalog instrument is written in.
   *
   * Key and meter belong to the score and are copied by `addPart`; what
   * belongs to the instrument is its staves, clefs, tab lines and
   * transposition, and those are the fields the renderer reads to draw it.
   */
  function layoutForInstrument(instrument) {
    const percussion = Boolean(instrument.percussion);
    const transposing =
      instrument.transposeChromatic === undefined
        ? {}
        : {
            transpose: {
              chromatic: instrument.transposeChromatic % 12,
              octaveChange: Math.trunc(instrument.transposeChromatic / 12),
              semitones: instrument.transposeChromatic,
            },
          };
    const clef = { sign: instrument.clef.sign, line: instrument.clef.line };
    const single = { staves: 1, clefSign: clef.sign, clefLine: clef.line, clefsByStaff: { 1: clef } };
    if (instrument.id === 'piano' || instrument.id === 'electric-piano' || instrument.id === 'organ') {
      return {
        ...single,
        staves: 2,
        clefsByStaff: { 1: { sign: 'G', line: 2 }, 2: { sign: 'F', line: 4 } },
        clefSign: 'G',
        clefLine: 2,
        ...transposing,
      };
    }
    if (percussion) {
      return {
        ...single,
        clefsByStaff: { 1: clef },
        staffLinesByStaff: { 1: 5 },
        ...transposing,
      };
    }
    return { ...single, ...transposing };
  }

  /** The GM routing a new part's `<midi-instrument>` needs. */
  function routingForInstrument(instrument, partId) {
    const instrumentId = `${partId}-I1`;
    const info = {
      program: instrument.program,
      channel: instrument.midiChannel ?? 1,
      name: instrument.name,
    };
    return new Map([[instrumentId, info]]);
  }

  /** One part's row: its name, a switch-to button, and a remove button. */
  function instrumentRow(part) {
    const row = document.createElement('div');
    row.className = 'editor-instruments__row';
    row.dataset.partRow = part.id;
    const active = part.id === activePartId();
    if (active) row.dataset.active = 'true';

    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'editor-instruments__name';
    name.value = part.name ?? part.id;
    name.setAttribute('aria-label', `Name of ${part.name ?? part.id}`);
    name.dataset.partName = part.id;
    name.addEventListener('change', () => {
      const value = name.value.trim();
      if (value === '' || value === part.name) {
        name.value = part.name ?? part.id;
        return;
      }
      commit((doc) => docTools.renamePart(doc, part.id, value), `Renamed to ${value}.`);
    });

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'editor-instruments__select';
    select.dataset.partSelect = part.id;
    select.textContent = active ? 'Writing' : 'Write';
    select.setAttribute('aria-pressed', String(active));
    select.addEventListener('click', () => {
      state.activePartId = part.id;
      clearSelection();
      state.entry = null;
      syncPartSelect();
      buildSidebar();
      render();
      announce(`Writing into ${part.name ?? part.id}.`);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'editor-instruments__remove';
    remove.dataset.partRemove = part.id;
    remove.textContent = '\u00D7';
    remove.title = `Remove ${part.name ?? part.id}`;
    remove.setAttribute('aria-label', `Remove ${part.name ?? part.id}`);
    remove.disabled = (state.doc?.score.parts.length ?? 0) <= 1;
    remove.addEventListener('click', () => {
      const remaining = (state.doc?.score.parts ?? []).filter((entry) => entry.id !== part.id);
      if (remaining.length === 0) {
        announce('A score needs at least one part.');
        return;
      }
      commit((doc) => docTools.removePart(doc, part.id), `Removed ${part.name ?? part.id}.`);
      if (activePartId() === part.id) {
        state.activePartId = remaining[0].id;
        state.entry = null;
        clearSelection();
      }
      buildSidebar();
      render();
    });

    row.append(name, select, remove);
    return row;
  }

  /** The Instruments tab: the score's part list, and the catalog to add from. */
  function buildInstrumentsPanel() {
    const panel = document.createElement('div');
    panel.className = 'editor-instruments';
    panel.append(panelTitle('Instruments'));
    const parts = state.doc?.score.parts ?? [];
    if (parts.length === 0) {
      panel.append(panelNote('Open a score to see its parts.'));
      return panel;
    }
    const list = document.createElement('div');
    list.className = 'editor-instruments__list';
    for (const part of parts) list.append(instrumentRow(part));
    panel.append(list);

    const catalog = window.NotationNewScore?.INSTRUMENTS ?? [];
    const form = document.createElement('form');
    form.className = 'editor-instruments__add';
    form.dataset.instrumentAdd = '';
    const select = document.createElement('select');
    select.className = 'editor-props__select';
    select.setAttribute('aria-label', 'Instrument to add');
    select.dataset.instrumentAddSelect = '';
    for (const instrument of catalog) {
      const option = document.createElement('option');
      option.value = instrument.id;
      option.textContent = instrument.name;
      select.append(option);
    }
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'editor-instruments__add-button';
    add.textContent = 'Add';
    form.append(select, add);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const instrument = catalog.find((entry) => entry.id === select.value);
      if (!instrument) return;
      const partId = nextPartId();
      commit(
        (doc) =>
          docTools.addPart(doc, {
            partId,
            name: instrument.name,
            layout: layoutForInstrument(instrument),
            routing: routingForInstrument(instrument, partId),
          }),
        `Added ${instrument.name}.`,
      );
      state.activePartId = partId;
      state.entry = null;
      clearSelection();
      buildSidebar();
      render();
    });
    panel.append(form);
    panel.append(panelNote('Adding a part copies the score\u2019s key and meter.'));
    return panel;
  }

  /**
   * The dock itself: its tab bar and the Palettes panel.
   *
   * Rebuilt rather than patched when a palette is added, because the whole
   * list changes shape -- but never on a score edit, which is why the
   * pressed states are updated in place by `syncPalette`.
   */
  function buildSidebar() {
    if (!sidebarBody) return;
    paletteButtons = [];
    const tabs = document.createElement('div');
    tabs.className = 'editor-sidebar__tabs';
    tabs.setAttribute('role', 'tablist');
    const panels = [
      { id: 'palettes', label: 'Palettes', ready: true },
      { id: 'more', label: '\u22EF', ready: false, title: 'More panels' },
      { id: 'properties', label: 'Properties', ready: true },
      { id: 'instruments', label: 'Instruments', ready: true },
    ];
    for (const panel of panels) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'editor-sidebar__tab';
      tab.dataset.sidebarTab = panel.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(panel.id === state.sidebarTab));
      tab.textContent = panel.label;
      if (panel.title) tab.title = panel.title;
      if (!panel.ready) tab.dataset.pending = 'true';
      tab.addEventListener('click', () => {
        if (!panel.ready) {
          announce(`${panel.label} is not wired up yet.`);
          return;
        }
        state.sidebarTab = panel.id;
        writeSidebarState();
        buildSidebar();
      });
      tabs.append(tab);
    }
    const panel = document.createElement('div');
    panel.className = 'editor-sidebar__panel';
    panel.setAttribute('role', 'tabpanel');
    if (state.sidebarTab === 'palettes') {
      panel.append(paletteTools());
      const groups = paletteGroups();
      if (groups.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'editor-sidebar__empty';
        empty.textContent = 'No palettes in the dock. Use Add Palettes to bring one back.';
        panel.append(empty);
      }
      for (const group of groups) panel.append(paletteSection(group));
    } else if (state.sidebarTab === 'properties') {
      panel.append(buildPropertiesPanel());
    } else if (state.sidebarTab === 'instruments') {
      panel.append(buildInstrumentsPanel());
    }
    sidebarBody.replaceChildren(tabs, panel);
    if (state.sidebarTab !== 'palettes') panel.dataset.signature = sidebarPanelSignature();
    syncPalette();
  }

  /**
   * What the open dock panel is showing, as one comparable string.
   *
   * Both builders read the score and the selection, so this is the cheap
   * test for "would rebuilding change anything".
   */
  function sidebarPanelSignature() {
    if (state.sidebarTab === 'properties') {
      return [
        'properties',
        state.selection
          ? `${state.selection.measureNumber}:${state.selection.voiceId}:${state.selection.eventIndex}`
          : '',
        state.range.length,
        (state.doc?.score.parts ?? []).map((part) => part.id).join('|'),
      ].join('/');
    }
    return [
      'instruments',
      (state.doc?.score.parts ?? []).map((part) => `${part.id}:${part.name}`).join('|'),
      activePartId() ?? '',
    ].join('/');
  }

  /**
   * Keeps the open dock panel in step with the selection.
   *
   * The panel is rebuilt rather than patched because every field in it
   * reads the selection, but only when what it would show has actually
   * changed -- a redraw follows every written note, and replacing the
   * controls on each one would throw away the focus a keyboard user is
   * standing on.
   */
  function syncSidebarPanel() {
    if (!sidebarBody || state.sidebarTab === 'palettes') return;
    const panel = sidebarBody.querySelector('.editor-sidebar__panel');
    if (!panel) return;
    const signature = sidebarPanelSignature();
    if (panel.dataset.signature === signature) return;
    panel.dataset.signature = signature;
    panel.replaceChildren(
      state.sidebarTab === 'properties' ? buildPropertiesPanel() : buildInstrumentsPanel(),
    );
  }

  // ---- wiring ------------------------------------------------------------

  backButton.addEventListener('click', () => window.location.assign('notation.html'));
  undoButton.addEventListener('click', undo);
  redoButton.addEventListener('click', redo);

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
      const staffNumber = state.entry?.staffNumber ?? 1;
      state.entry = {
        ...(state.entry ?? {}),
        partId: activePartId(),
        measureNumber: at + 1,
        voiceId: voiceForStaff(staffNumber),
        tick: 0,
        staffNumber,
      };
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
      const staffNumber = state.entry?.staffNumber ?? 1;
      state.entry = {
        ...(state.entry ?? {}),
        partId: activePartId(),
        measureNumber: Math.max(1, Math.min(at, count - 1)),
        voiceId: voiceForStaff(staffNumber),
        tick: 0,
        staffNumber,
      };
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
  if (exportXml) exportXml.addEventListener('click', () => { setExportMenu(false); void runExport(exportXml, 'musicxml'); });
  if (exportMxl) exportMxl.addEventListener('click', () => { setExportMenu(false); void runExport(exportMxl, 'mxl'); });
  document.addEventListener('pointerdown', (event) => {
    if (exportList && !exportList.hidden && !event.target.closest('[data-editor-export-menu]')) setExportMenu(false);
    // A popover closes on any press outside its trigger and its panel, so
    // the score stays reachable with one tap rather than two. A toolbar
    // tool is the exception: chord mode and the note values are settings
    // you change WHILE writing on the instrument's keys, so pressing one
    // must leave the instrument box open behind it.
    const onToolbarTool = event.target.closest('.editor-toolbar .editor-tool');
    if (
      !onToolbarTool &&
      !event.target.closest('[data-editor-popover], [data-editor-popover-panel]')
    ) {
      closePopovers();
    }
    if (!event.target.closest('[data-editor-sidebar], [data-editor-sidebar-handle]')) {
      setSidebar(false);
    }
  });

  if (sidebarHandle) {
    sidebarHandle.addEventListener('click', () => setSidebar(!isSidebarOpen()));
  }

  popoverTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      // The Inst. box and the dock both cover the score, so one at a time.
      if (trigger !== sidebarHandle) setSidebar(false);
      togglePopover(trigger);
    });
  });
  // A tool inside a panel picks its value and folds the box away again,
  // which is what a palette button is for.
  popoverPanels.forEach((panel) => {
    panel.addEventListener('click', (event) => {
      // Only a tool INSIDE the box folds it away (that is a palette pick).
      // Chord mode and the note values live in the toolbar, and they are
      // settings you change while writing on the instrument's keys -- so
      // pressing one must leave the instrument box open.
      if (event.target.closest('[data-editor-popover-panel] .editor-tool')) closePopovers();
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closePopovers();
    setSidebar(false);
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
  // Page and Horizontal are the same score drawn two ways: sheets with
  // margins, or one continuous row of systems. Switching re-renders from
  // the same document, so nothing is lost and the cursor stays put.
  layoutButtons.forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.editorLayout;
    if (state.layout === mode) return;
    state.layout = mode;
    syncLayout();
    render();
    announce(mode === 'page' ? 'Page view.' : 'Horizontal view.');
  }));
  flipButton.addEventListener('click', flipStems);
  restButton.addEventListener('click', () => {
    state.tool.rest = !state.tool.rest;
    syncTools();
    announce(state.tool.rest ? 'Rests on.' : 'Rests off.');
  });
  if (chordButton) chordButton.addEventListener('click', () => {
    state.tool.chord = !state.tool.chord;
    syncTools();
    announce(state.tool.chord
      ? 'Chord mode on — each note you write stacks on the same beat.'
      : 'Chord mode off.');
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

  state.paletteGroups = readPaletteGroups();
  const savedDock = readSidebarState();
  state.sidebarTab = savedDock.tab;
  syncTools();
  syncPlayback();
  paintToolGlyphs();
  buildSidebar();
  // The dock comes back where it was left; `setSidebar` is what puts the
  // handle's own labels in step with it.
  setSidebar(savedDock.open);
  setControlsEnabled(false);
  updateZoom();
  restoreHandoff();
  void (soundFontsLoading = loadSoundFonts());
})();
