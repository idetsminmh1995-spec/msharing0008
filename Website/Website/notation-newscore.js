/**
 * New-score setup: the instrument catalog and the MusicXML it produces.
 *
 * MuseScore opens a wizard before an empty score exists -- you pick the
 * instruments, then the key, time signature, tempo and how many bars to
 * start with. This is the same idea, kept in one file so the entry page
 * (which asks the questions) and the editor (which opens the answer) both
 * build the score the same way. Nothing here renders; it only writes the
 * MusicXML the engine already parses.
 *
 * A part is one instrument. The engine plays a part through its own MIDI
 * program, and a `<unpitched>` part on MIDI channel 10 through the
 * SoundFont's drum kit, so the catalog states both -- see
 * `Website/Notation/Notation Engine/src/playback/routing.ts`.
 */
(() => {
  /**
   * The instruments the wizard offers, in the order a beginner looks for
   * them. `program` is a 1-based General MIDI program number (MusicXML's
   * own numbering); `clef` is the sign/line pair the part is written in;
   * `percussion` marks a drum part, which plays on channel 10 and stores
   * its notes as `<unpitched>` rather than `<pitch>`.
   */
  const INSTRUMENTS = [
    { id: 'piano', name: 'Piano', group: 'Keyboards', program: 1, clef: { sign: 'G', line: 2 }, midiChannel: 1, staffKinds: ['grand', 'single'] },
    { id: 'electric-piano', name: 'Electric Piano', group: 'Keyboards', program: 5, clef: { sign: 'G', line: 2 }, midiChannel: 1, staffKinds: ['grand', 'single'] },
    { id: 'organ', name: 'Organ', group: 'Keyboards', program: 20, clef: { sign: 'G', line: 2 }, midiChannel: 1, staffKinds: ['grand', 'single'] },
    { id: 'acoustic-guitar', name: 'Acoustic Guitar', group: 'Guitars', program: 25, clef: { sign: 'G', line: 2 }, midiChannel: 1, transposeChromatic: -12, staffKinds: ['single', 'tab', 'grand-tab'] },
    { id: 'electric-guitar', name: 'Electric Guitar', group: 'Guitars', program: 28, clef: { sign: 'G', line: 2 }, midiChannel: 1, transposeChromatic: -12, staffKinds: ['single', 'tab', 'grand-tab'] },
    { id: 'bass-guitar', name: 'Bass Guitar', group: 'Guitars', program: 34, clef: { sign: 'F', line: 4 }, midiChannel: 1, transposeChromatic: -12, staffKinds: ['single', 'tab'] },
    { id: 'violin', name: 'Violin', group: 'Strings', program: 41, clef: { sign: 'G', line: 2 }, midiChannel: 1 },
    { id: 'viola', name: 'Viola', group: 'Strings', program: 42, clef: { sign: 'C', line: 3 }, midiChannel: 1 },
    { id: 'cello', name: 'Cello', group: 'Strings', program: 43, clef: { sign: 'F', line: 4 }, midiChannel: 1 },
    { id: 'string-ensemble', name: 'String Ensemble', group: 'Strings', program: 49, clef: { sign: 'G', line: 2 }, midiChannel: 1 },
    { id: 'flute', name: 'Flute', group: 'Winds', program: 74, clef: { sign: 'G', line: 2 }, midiChannel: 1 },
    { id: 'clarinet', name: 'Clarinet', group: 'Winds', program: 72, clef: { sign: 'G', line: 2 }, midiChannel: 1 },
    { id: 'saxophone', name: 'Saxophone', group: 'Winds', program: 66, clef: { sign: 'G', line: 2 }, midiChannel: 1 },
    { id: 'trumpet', name: 'Trumpet', group: 'Brass', program: 57, clef: { sign: 'G', line: 2 }, midiChannel: 1 },
    { id: 'trombone', name: 'Trombone', group: 'Brass', program: 58, clef: { sign: 'F', line: 4 }, midiChannel: 1 },
    { id: 'voice', name: 'Voice', group: 'Voices', program: 54, clef: { sign: 'G', line: 2 }, midiChannel: 1 },
    {
      id: 'drum-kit',
      name: 'Drum Kit',
      group: 'Drums',
      program: 1,
      clef: { sign: 'percussion', line: 2 },
      midiChannel: 10,
      percussion: true,
      staffKinds: ['percussion'],
    },
  ];

  /**
   * How a part is laid out on the page -- the second question the wizard
   * asks, beside the instrument. A piano writes on a grand staff or a
   * single one; a guitar in notation, in tab, or in both at once; a kit
   * has only its percussion staff, so it is not offered a choice at all.
   */
  const STAFF_KINDS = {
    grand: { id: 'grand', label: 'Grand staff', staves: 2 },
    single: { id: 'single', label: 'Single staff', staves: 1 },
    tab: { id: 'tab', label: 'Tab', staves: 1, tab: true },
    'grand-tab': { id: 'grand-tab', label: 'Grand staff + Tab', staves: 2, tab: true },
    percussion: { id: 'percussion', label: 'Percussion staff', staves: 1 },
  };

  const BY_ID = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument]));

  const KEY_FIFTHS = {
    C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6,
    F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6,
  };

  const KEY_LABELS = {
    C: 'C major', G: 'G major', D: 'D major', A: 'A major', E: 'E major', B: 'B major', 'F#': 'F# major',
    F: 'F major', Bb: 'Bb major', Eb: 'Eb major', Ab: 'Ab major', Db: 'Db major', Gb: 'Gb major',
  };

  const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '6/8', '12/8', '5/4', '7/8'];

  const DEFAULT_SPEC = {
    title: 'Untitled score',
    composer: '',
    instrumentIds: ['piano'],
    staffKind: 'grand',
    key: 'C',
    time: '4/4',
    tempo: 120,
    measures: 4,
  };

  /** The staff kinds an instrument can be written on; a kit has no choice. */
  const staffKindsFor = (id) => instrumentFor(id).staffKinds ?? ['single'];

  const escapeXml = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  /** The catalog entry for an id, falling back to the piano so a stale
   *  handoff (an id the catalog no longer lists) still opens a score. */
  const instrumentFor = (id) => BY_ID.get(id) ?? BY_ID.get('piano');

  /**
   * Normalises whatever the wizard collected into a spec the builder can
   * trust: known instrument ids, no duplicates, a key/time/tempo/measure
   * count inside the ranges the controls offer.
   */
  function normaliseSpec(input = {}) {
    const ids = Array.isArray(input.instrumentIds) ? input.instrumentIds : [];
    const known = ids.filter((id) => BY_ID.has(id));
    const unique = [...new Set(known)];
    const instrumentIds = unique.length > 0 ? unique : [...DEFAULT_SPEC.instrumentIds];
    // The note-line choice belongs to the FIRST instrument: it is asked
    // beside that instrument, and one part cannot be laid out two ways.
    const offered = staffKindsFor(instrumentIds[0]);
    const staffKind = offered.includes(input.staffKind) ? input.staffKind : offered[0];
    const measures = Number(input.measures);
    const tempo = Number(input.tempo);
    return {
      title: String(input.title ?? '').trim() || DEFAULT_SPEC.title,
      composer: String(input.composer ?? '').trim(),
      instrumentIds,
      staffKind,
      key: input.key in KEY_FIFTHS ? input.key : DEFAULT_SPEC.key,
      time: TIME_SIGNATURES.includes(input.time) ? input.time : DEFAULT_SPEC.time,
      tempo: Number.isFinite(tempo) ? Math.min(300, Math.max(20, Math.round(tempo))) : DEFAULT_SPEC.tempo,
      measures: Number.isFinite(measures) ? Math.min(64, Math.max(1, Math.round(measures))) : DEFAULT_SPEC.measures,
    };
  }

  const beatsOf = (time) => {
    const [beats, beatType] = time.split('/').map(Number);
    return { beats, beatType };
  };

  /** Divisions per quarter note. 4 covers 16ths; 8 adds 32nds for 6/8 and 12/8. */
  const divisionsFor = (time) => {
    const { beatType } = beatsOf(time);
    return beatType >= 8 ? 8 : 4;
  };

  /**
   * The note lines a part is drawn on: `<staves>`, the per-staff clefs and
   * the tab line count.
   *
   * The wizard's note-line choice is what decides this. A grand staff is
   * two staves with a treble clef above and a bass below; a tab is one
   * six-line staff with a TAB clef; a grand staff plus tab is both at once,
   * which is how guitar music is usually printed. Every clef has to be
   * numbered when there is more than one staff, or the second one is drawn
   * on top of the first.
   */
  function staffLayoutXml(instrument, spec) {
    const kind = STAFF_KINDS[spec.staffKind] ?? STAFF_KINDS.single;
    const tabLines = 6;
    const clef = (number, sign, line) =>
      `<clef${number === undefined ? '' : ` number="${number}"`}><sign>${sign}</sign><line>${line}</line></clef>`;
    const details = (number) =>
      `<staff-details${number === undefined ? '' : ` number="${number}"`}><staff-lines>${tabLines}</staff-lines></staff-details>`;
    if (kind.staves === 1) {
      return kind.tab
        ? { staves: '', clefs: clef(undefined, 'TAB', 5), details: details(undefined) }
        : { staves: '', clefs: '', details: '' };
    }
    if (kind.tab) {
      return {
        staves: '<staves>2</staves>',
        clefs: clef(1, instrument.clef.sign, instrument.clef.line) + clef(2, 'TAB', 5),
        details: details(2),
      };
    }
    // Grand staff: treble over bass, the pairing every piano part uses.
    return { staves: '<staves>2</staves>', clefs: clef(1, 'G', 2) + clef(2, 'F', 4), details: '' };
  }

  function attributesXml(instrument, spec, divisions) {
    const { beats, beatType } = beatsOf(spec.time);
    const fifths = KEY_FIFTHS[spec.key] ?? 0;
    const layout = staffLayoutXml(instrument, spec);
    // The layout names its own clefs whenever it lays the part out; only a
    // plain single staff needs the instrument's clef stated here.
    const clef = layout.clefs !== ''
      ? ''
      : instrument.clef.sign === 'percussion'
        ? '<clef><sign>percussion</sign><line>2</line></clef>'
        : `<clef><sign>${instrument.clef.sign}</sign><line>${instrument.clef.line}</line></clef>`;
    // A transposing instrument states its sounding-vs-written interval so
    // the engine plays it at concert pitch while the notation stays where
    // the player reads it. The engine sums `chromatic + octaveChange * 12`
    // (see `parser/musicxml/attributes.ts`), so an octave-down instrument
    // states the octave alone -- putting -12 in BOTH fields would sound it
    // two octaves low.
    let transpose = '';
    if (instrument.transposeChromatic !== undefined) {
      const octaveChange = Math.trunc(instrument.transposeChromatic / 12);
      const chromatic = instrument.transposeChromatic - octaveChange * 12;
      transpose = `<transpose><chromatic>${chromatic}</chromatic><octave-change>${octaveChange}</octave-change></transpose>`;
    }
    const staffDetails = instrument.percussion
      ? '<staff-details><staff-lines>5</staff-lines></staff-details>'
      : '';
    // MusicXML's own element order: divisions, key, time, staves, clef,
    // staff-details, transpose. A reader that walks the elements in this
    // order is entitled to stop at the first one it does not expect.
    return (
      `<attributes><divisions>${divisions}</divisions>` +
      `<key><fifths>${fifths}</fifths></key>` +
      `<time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>` +
      layout.staves +
      clef +
      layout.clefs +
      layout.details +
      staffDetails +
      transpose +
      `</attributes>`
    );
  }

  /**
   * The first measure's tempo, written the way MuseScore writes it: a
   * visible metronome mark plus the `<sound tempo>` playback uses.
   *
   * `<sound tempo>` is ALWAYS quarter-notes per minute, whatever the
   * visible mark counts, so the mark's beat unit decides the conversion.
   * The tempo the user typed is the beat they will count: a dotted quarter
   * in 6/8, an eighth in 7/8, a quarter otherwise.
   *
   * `<beat-unit>` names a plain note type; a dot is the separate
   * `<beat-unit-dot/>` child. Writing `dotted-quarter` there is not a note
   * type at all, so parsers drop the whole mark and fall back to
   * `<sound tempo>`, which reads back as a different tempo than the one the
   * user typed.
   */
  function tempoXml(tempo, time) {
    const { beats, beatType } = beatsOf(time);
    let unit = 'quarter';
    let dotted = false;
    let quarterBpm = tempo;
    if (beatType === 8 && beats % 3 === 0) {
      dotted = true;
      quarterBpm = tempo * 1.5;
    } else if (beatType === 8) {
      unit = 'eighth';
      quarterBpm = tempo / 2;
    } else if (beatType >= 16) {
      unit = '16th';
      quarterBpm = tempo / 4;
    }
    const perMinute = Math.round(tempo);
    const dot = dotted ? '<beat-unit-dot/>' : '';
    return (
      `<direction placement="above"><direction-type>` +
      `<metronome><beat-unit>${unit}</beat-unit>${dot}<per-minute>${perMinute}</per-minute></metronome>` +
      `</direction-type><sound tempo="${Math.round(quarterBpm * 100) / 100}"/></direction>`
    );
  }

  /**
   * One empty measure. A measure is a single whole-measure rest, which is
   * how MusicXML says "nothing here yet"; the editor replaces that
   * placeholder when the first note is written into it. `head` is the
   * measure's own `<attributes>`/`<direction>` -- those elements are
   * children of the measure, never siblings of it.
   *
   * The rest's duration is the bar's real length: `divisions` counts per
   * QUARTER note, so an eighth-note beat is half a division, not one. A
   * 6/8 bar is 3 quarters long, not 6 -- getting this wrong makes every
   * x/8 bar twice too wide and the click grid lands half a bar off.
   *
   * A two-staff part gets one rest PER staff, each on its own voice, with
   * a `<backup>` between them. A grand staff whose lower staff carries no
   * voice at all is drawn empty and every click there lands on nothing, so
   * the placeholder has to cover both lines from the first bar.
   */
  function measureXml(number, divisions, beats, beatType, head = '', staves = 1) {
    const barDivisions = (divisions * beats * 4) / beatType;
    const rest = (staff) =>
      `<note><rest measure="yes"/><duration>${barDivisions}</duration><voice>${staff}</voice>` +
      (staves > 1 ? `<staff>${staff}</staff>` : '') +
      `</note>`;
    if (staves <= 1) return `<measure number="${number}">${head}${rest(1)}</measure>`;
    const body = [];
    for (let staff = 1; staff <= staves; staff += 1) {
      if (staff > 1) body.push(`<backup><duration>${barDivisions}</duration></backup>`);
      body.push(rest(staff));
    }
    return `<measure number="${number}">${head}${body.join('')}</measure>`;
  }

  /**
   * The drums a new kit part is set up with: the nine a beginner actually
   * writes, in the order they sit on the staff. `key` is the General MIDI
   * percussion key number.
   *
   * MusicXML names a drum per INSTRUMENT, not per part: each
   * `<score-instrument>` carries one `<midi-unpitched>`, and every note
   * points at the instrument it is played on. A note with no resolved
   * instrument is silent (see `playback/event-stream.ts`), so the kit has
   * to be declared up front for a written drum note to sound.
   */
  const DRUM_KIT = [
    { key: 36, name: 'Bass Drum' },
    { key: 38, name: 'Snare' },
    { key: 42, name: 'Closed Hi-Hat' },
    { key: 46, name: 'Open Hi-Hat' },
    { key: 45, name: 'Low Tom' },
    { key: 47, name: 'Mid Tom' },
    { key: 50, name: 'High Tom' },
    { key: 49, name: 'Crash Cymbal' },
    { key: 51, name: 'Ride Cymbal' },
  ];

  const drumInstrumentId = (partId, key) => `${partId}-I${key}`;

  function partListXml(instruments) {
    const parts = instruments
      .map((instrument, index) => {
        const partId = `P${index + 1}`;
        const name = escapeXml(instrument.name);
        if (instrument.percussion) {
          // One instrument per drum, all on the GM percussion channel.
          // `<midi-unpitched>` is 1-based, so a GM key of 38 is stated 39.
          const kit = DRUM_KIT.map(
            (drum) =>
              `<score-instrument id="${drumInstrumentId(partId, drum.key)}">` +
              `<instrument-name>${escapeXml(drum.name)}</instrument-name></score-instrument>` +
              `<midi-instrument id="${drumInstrumentId(partId, drum.key)}">` +
              `<midi-channel>${instrument.midiChannel}</midi-channel>` +
              `<midi-program>${instrument.program}</midi-program>` +
              `<midi-unpitched>${drum.key + 1}</midi-unpitched>` +
              `</midi-instrument>`,
          ).join('');
          return `<score-part id="${partId}"><part-name>${name}</part-name>${kit}</score-part>`;
        }
        const instrumentId = `${partId}-I1`;
        const midi =
          `<midi-instrument id="${instrumentId}">` +
          `<midi-channel>${instrument.midiChannel}</midi-channel>` +
          `<midi-program>${instrument.program}</midi-program>` +
          `</midi-instrument>`;
        return (
          `<score-part id="${partId}">` +
          `<part-name>${name}</part-name>` +
          `<score-instrument id="${instrumentId}"><instrument-name>${name}</instrument-name></score-instrument>` +
          midi +
          `</score-part>`
        );
      })
      .join('');
    return `<part-list>${parts}</part-list>`;
  }

  function identityXml(spec) {
    const work = `<work><work-title>${escapeXml(spec.title)}</work-title></work>`;
    const composer = spec.composer
      ? `<identification><creator type="composer">${escapeXml(spec.composer)}</creator></identification>`
      : '';
    return `${work}${composer}`;
  }

  /**
   * Builds the whole score: one part per chosen instrument, `spec.measures`
   * empty bars each, the tempo on the first beat of the first bar, and the
   * key/time/clef on every part's first bar.
   */
  function buildMusicXml(input) {
    const spec = normaliseSpec(input);
    const instruments = spec.instrumentIds.map(instrumentFor);
    const divisions = divisionsFor(spec.time);
    const { beats, beatType } = beatsOf(spec.time);
    // Only the first instrument carries the note-line choice, so only its
    // part is laid out on more than one staff.
    const stavesOf = (index) =>
      index === 0 ? (STAFF_KINDS[spec.staffKind] ?? STAFF_KINDS.single).staves : 1;
    const parts = instruments
      .map((instrument, index) => {
        const measures = [];
        for (let number = 1; number <= spec.measures; number += 1) {
          const head =
            number === 1
              ? attributesXml(instrument, spec, divisions) + tempoXml(spec.tempo, spec.time)
              : '';
          measures.push(measureXml(number, divisions, beats, beatType, head, stavesOf(index)));
        }
        return `<part id="P${index + 1}">${measures.join('')}</part>`;
      })
      .join('');
    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n` +
      `<score-partwise version="4.0">` +
      identityXml(spec) +
      partListXml(instruments) +
      parts +
      `</score-partwise>`
    );
  }

  /** A one-line description of what the wizard will open, for the review step. */
  function summarise(input) {
    const spec = normaliseSpec(input);
    const names = spec.instrumentIds.map((id) => instrumentFor(id).name);
    return {
      ...spec,
      instrumentNames: names,
      staffKindLabel: (STAFF_KINDS[spec.staffKind] ?? STAFF_KINDS.single).label,
      keyLabel: KEY_LABELS[spec.key] ?? spec.key,
    };
  }

  window.NotationNewScore = {
    INSTRUMENTS,
    STAFF_KINDS,
    KEY_FIFTHS,
    KEY_LABELS,
    TIME_SIGNATURES,
    DEFAULT_SPEC,
    instrumentFor,
    staffKindsFor,
    normaliseSpec,
    buildMusicXml,
    summarise,
  };
})();
