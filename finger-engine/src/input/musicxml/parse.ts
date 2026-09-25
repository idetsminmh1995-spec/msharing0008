/**
 * parse.ts — MusicXML to `ParsedPart[]` (Plan Part 03 §A).
 *
 * [IN-E06] The Notation Engine is the preferred road in for MusicXML:
 * it owns note order and timing for the whole app (D-011), and the
 * adapter next door reads its score. THIS parser exists for two
 * reasons the plan names: the fields the Notation Engine does not keep
 * (read straight from the file and matched by document position), and
 * the unit tests, where a fixture has to become notes without a
 * notation layer in the way. For the same fixtures both roads must
 * produce the same notes at the same times.
 */
import type {
  NoteEvent,
  ParsedPart,
  Technique,
  TechniqueLink,
  TimeSignatureChange,
} from '../../core/types.js';
import type { TechnicalLinkEnd } from './technical.js';
import { tempoMap, type TempoSegment } from '../../core/tempo.js';
import { STANDARD_TUNING } from '../../core/tuning.js';
import type { EngineWarning } from '../../core/timeline-schema.js';
import {
  childNamed,
  childNumber,
  childText,
  childrenNamed,
  parseXml,
  type XmlNode,
} from './xml.js';
import {
  hasTie,
  isChordMember,
  isGrace,
  isRest,
  readTechnical,
  writtenPitch,
} from './technical.js';

/** The tick resolution everything inside the engine uses, whatever the file's `<divisions>` says. */
export const TICKS_PER_QUARTER = 480;

export interface MusicXmlParseResult {
  readonly parts: readonly ParsedPart[];
  readonly warnings: readonly EngineWarning[];
}

interface PartState {
  divisions: number;
  transposeSemitones: number;
  tuning: number[] | undefined;
  capo: number | undefined;
  numStrings: number;
}

function toText(source: string | ArrayBuffer | Uint8Array): string {
  if (typeof source === 'string') return source;
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  // Only UTF-8 needs decoding; the ASCII fast path above is already right for it.
  return typeof TextDecoder === 'undefined' ? out : new TextDecoder('utf-8').decode(bytes);
}

/** [IN-X10] `<staff-tuning line="n">`: line 1 is the LOWEST string, the same end this engine counts from. */
function readStaffTuning(details: XmlNode): { tuning?: number[]; numStrings?: number } {
  const lines = childrenNamed(details, 'staff-tuning');
  if (lines.length === 0) return {};
  const tuning: number[] = [];
  for (const line of lines) {
    const index = Number(line.attributes['line'] ?? '0');
    const step = childText(line, 'tuning-step');
    const octave = childNumber(line, 'tuning-octave');
    if (!Number.isInteger(index) || index < 1 || step === undefined || octave === undefined) {
      continue;
    }
    const semitone = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step];
    if (semitone === undefined) continue;
    tuning[index - 1] = (octave + 1) * 12 + semitone + (childNumber(line, 'tuning-alter') ?? 0);
  }
  const filled = tuning.filter((pitch) => typeof pitch === 'number');
  if (filled.length === 0) return {};
  return { tuning: filled, numStrings: filled.length };
}

/** A `<metronome>` mark as quarter-note BPM (IN-X25). */
function metronomeBpm(direction: XmlNode): number | undefined {
  for (const type of childrenNamed(direction, 'direction-type')) {
    const metronome = childNamed(type, 'metronome');
    if (metronome === undefined) continue;
    const perMinute = childNumber(metronome, 'per-minute');
    if (perMinute === undefined) continue;
    const unit = childText(metronome, 'beat-unit') ?? 'quarter';
    const quarters =
      { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25, '32nd': 0.125 }[unit] ?? 1;
    const dots = childrenNamed(metronome, 'beat-unit-dot').length;
    const dotted = quarters * (2 - Math.pow(0.5, dots));
    return perMinute * dotted;
  }
  return undefined;
}

function bpmOf(node: XmlNode): number | undefined {
  const sound = childNamed(node, 'sound') ?? node;
  const tempo = sound.attributes['tempo'];
  if (tempo !== undefined) {
    const value = Number(tempo);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

/**
 * Every part in the file, as notes in WRITTEN order.
 *
 * Repeats are not unrolled here: [IN-X26/IN-E01] that is the Notation
 * Engine's job, and doing it twice in two places is how the dots and
 * the cursor would end up telling different stories.
 */
export function parseMusicXml(source: string | ArrayBuffer | Uint8Array): MusicXmlParseResult {
  const warnings: EngineWarning[] = [];
  const text = toText(source);
  if (text.startsWith('PK')) {
    return {
      parts: [],
      warnings: [
        {
          code: 'MXL_NOT_UNZIPPED',
          message:
            '[IN-X01] this is a .mxl archive; unzip it with the app’s own reader and pass the score XML',
        },
      ],
    };
  }

  const root = parseXml(text);
  if (root === undefined || root.name !== 'score-partwise') {
    return {
      parts: [],
      warnings: [
        {
          code: 'NOT_MUSICXML',
          message: 'no <score-partwise> element: this is not a MusicXML score this engine reads',
        },
      ],
    };
  }

  const names = new Map<string, string>();
  const programs = new Map<string, number>();
  for (const scorePart of childrenNamed(childNamed(root, 'part-list'), 'score-part')) {
    const id = scorePart.attributes['id'];
    if (id === undefined) continue;
    names.set(id, childText(scorePart, 'part-name') ?? id);
    const program = childNumber(childNamed(scorePart, 'midi-instrument'), 'midi-program');
    // MusicXML counts programs from 1; General MIDI from 0.
    if (program !== undefined) programs.set(id, program - 1);
  }

  const tempoEvents = new Map<number, number>();
  const timeSignatures = new Map<number, TimeSignatureChange>();
  const parts: ParsedPart[] = [];

  for (const partNode of childrenNamed(root, 'part')) {
    const partId = partNode.attributes['id'] ?? `P${parts.length + 1}`;
    const parsed = parsePart(partNode, partId, tempoEvents, timeSignatures, warnings);
    const name = names.get(partId) ?? partId;
    const program = programs.get(partId);
    parts.push({
      ...parsed,
      name,
      ...(program !== undefined ? { gmProgram: program } : {}),
    });
  }

  // Tempo and time signatures belong to the piece, not to one part, so
  // every part is given the same map however many staves wrote it.
  const segments: TempoSegment[] = [...tempoEvents.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([startTick, bpm]) => ({ startTick, microsecondsPerQuarter: 60_000_000 / bpm }));
  const map = tempoMap(TICKS_PER_QUARTER, segments);
  const meters = [...timeSignatures.values()].sort((a, b) => a.tick - b.tick);

  return {
    parts: parts.map((part) => ({ ...part, tempoMap: map, timeSignatures: meters })),
    warnings,
  };
}

function parsePart(
  partNode: XmlNode,
  partId: string,
  tempoEvents: Map<number, number>,
  timeSignatures: Map<number, TimeSignatureChange>,
  warnings: EngineWarning[],
): Omit<ParsedPart, 'name'> {
  const state: PartState = {
    divisions: 1,
    transposeSemitones: 0,
    tuning: undefined,
    capo: undefined,
    numStrings: 6,
  };
  const notes: NoteEvent[] = [];
  /** What each note's `<slide>`/`<hammer-on>`/`<pull-off>` ends said, until they are paired up. */
  const linkEnds = new Map<string, readonly TechnicalLinkEnd[]>();
  let globalTick = 0;
  let hasTab = false;
  let index = 0;

  for (const measureNode of childrenNamed(partNode, 'measure')) {
    const measureNumber = Number(measureNode.attributes['number'] ?? '0');
    const measureStart = globalTick;
    let cursor = measureStart;
    let lastStart = measureStart;
    let measureEnd = measureStart;

    for (const event of measureNode.children) {
      if (event.name === 'attributes') {
        readAttributes(event, state, measureStart, timeSignatures);
        continue;
      }
      if (event.name === 'direction' || event.name === 'sound') {
        const bpm = bpmOf(event) ?? metronomeBpm(event);
        if (bpm !== undefined && !tempoEvents.has(cursor)) tempoEvents.set(cursor, bpm);
        continue;
      }
      if (event.name === 'backup') {
        cursor -= ticksOf(childNumber(event, 'duration') ?? 0, state.divisions);
        continue;
      }
      if (event.name === 'forward') {
        cursor += ticksOf(childNumber(event, 'duration') ?? 0, state.divisions);
        measureEnd = Math.max(measureEnd, cursor);
        continue;
      }
      if (event.name !== 'note') continue;

      const durationTicks = ticksOf(childNumber(event, 'duration') ?? 0, state.divisions);
      const grace = isGrace(event);
      const chord = isChordMember(event);
      const start = chord ? lastStart : cursor;

      if (isRest(event)) {
        // [IN-X24] a rest sounds nothing; it only moves the cursor.
        cursor += durationTicks;
        measureEnd = Math.max(measureEnd, cursor);
        continue;
      }

      const written = writtenPitch(event);
      if (written === undefined) {
        cursor += grace ? 0 : durationTicks;
        continue;
      }
      const pitch = written + state.transposeSemitones; // [IN-X12]
      const technical = readTechnical(event, state.numStrings);
      const voice = childNumber(event, 'voice');
      for (const warning of technical.warnings) {
        warnings.push({
          code: warning.code,
          message: `${partId} m${measureNumber}: ${warning.message}`,
        });
      }

      if (hasTie(event, 'stop')) {
        // [IN-X22] the continuation of a tie is not a new note: it
        // lengthens the one already sounding. No new pluck, no finger
        // change -- which is exactly what the right hand needs to know.
        const held = lastSounding(notes, pitch);
        if (held !== undefined) {
          notes[notes.indexOf(held)] = {
            ...held,
            durationTicks: held.durationTicks + durationTicks,
            techniques: withTechnique(held.techniques, 'tieContinuation'),
          };
          if (!chord && !grace) {
            cursor += durationTicks;
            measureEnd = Math.max(measureEnd, cursor);
          }
          continue;
        }
      }

      const techniques: Technique[] = grace ? ['grace'] : [];
      if (technical.lockedString !== undefined && technical.lockedFret !== undefined) hasTab = true;

      notes.push({
        noteId: `${partId}-m${measureNumber}-v${childText(event, 'voice') ?? '1'}-n${index++}`,
        pitch,
        tick: start,
        durationTicks: grace ? 0 : durationTicks,
        time: 0,
        duration: 0,
        ...(voice !== undefined ? { voice } : {}),
        ...(technical.lockedString !== undefined ? { lockedString: technical.lockedString } : {}),
        ...(technical.lockedFret !== undefined ? { lockedFret: technical.lockedFret } : {}),
        ...(technical.lockedFinger !== undefined ? { lockedFinger: technical.lockedFinger } : {}),
        ...(technical.lockedPickDir !== undefined
          ? { lockedPickDir: technical.lockedPickDir }
          : {}),
        techniques,
        sourceRef: { format: 'musicxml', part: partId, measure: measureNumber, index: index - 1 },
      });
      linkEnds.set(notes[notes.length - 1]?.noteId ?? '', technical.links);

      if (!chord && !grace) {
        lastStart = start;
        cursor += durationTicks;
        measureEnd = Math.max(measureEnd, cursor);
      }
    }

    globalTick = Math.max(measureEnd, cursor, measureStart);
  }

  const instrumentHint: Partial<ParsedPart['instrumentHint']> = {
    ...(state.tuning !== undefined
      ? { tuning: state.tuning, numStrings: state.tuning.length }
      : {}),
    ...(state.capo !== undefined ? { capo: state.capo } : {}),
  };

  return {
    partId,
    instrumentHint,
    notes: checkTabAgainstPitch(pairLinks(notes, linkEnds), state, warnings, partId),
    tempoMap: tempoMap(TICKS_PER_QUARTER),
    timeSignatures: [],
    hasTab,
  };
}

function ticksOf(duration: number, divisions: number): number {
  if (!(divisions > 0)) return 0;
  return Math.round((duration / divisions) * TICKS_PER_QUARTER);
}

function withTechnique(
  techniques: readonly Technique[],
  technique: Technique,
): readonly Technique[] {
  return techniques.includes(technique) ? techniques : [...techniques, technique];
}

/** The most recent note of this pitch that a tie could continue. */
function lastSounding(notes: readonly NoteEvent[], pitch: number): NoteEvent | undefined {
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];
    if (note !== undefined && note.pitch === pitch) return note;
  }
  return undefined;
}

function readAttributes(
  node: XmlNode,
  state: PartState,
  tick: number,
  timeSignatures: Map<number, TimeSignatureChange>,
): void {
  const divisions = childNumber(node, 'divisions');
  if (divisions !== undefined && divisions > 0) state.divisions = divisions;

  const time = childNamed(node, 'time');
  const beats = childNumber(time, 'beats');
  const beatType = childNumber(time, 'beat-type');
  if (beats !== undefined && beatType !== undefined && !timeSignatures.has(tick)) {
    timeSignatures.set(tick, { tick, numerator: beats, denominator: beatType });
  }

  // [IN-X12] written pitch + <transpose> = sounding pitch.
  const transpose = childNamed(node, 'transpose');
  if (transpose !== undefined) {
    const chromatic = childNumber(transpose, 'chromatic') ?? 0;
    const octaveChange = childNumber(transpose, 'octave-change') ?? 0;
    state.transposeSemitones = chromatic + octaveChange * 12;
  }

  for (const details of childrenNamed(node, 'staff-details')) {
    const lines = childNumber(details, 'staff-lines');
    if (lines !== undefined && lines >= 4) state.numStrings = lines;
    const tuning = readStaffTuning(details);
    if (tuning.tuning !== undefined) {
      state.tuning = tuning.tuning;
      state.numStrings = tuning.numStrings ?? state.numStrings;
    }
    const capo = childNumber(details, 'capo'); // [IN-X11]
    if (capo !== undefined) state.capo = capo;
  }
}

/**
 * Join the two ends of every hammer-on, pull-off and slide.
 *
 * MusicXML writes `start` on the note that leaves and `stop` on the
 * note that arrives, and neither element says which note is at the
 * other end. They are paired in time order, on the same string when
 * both notes name one -- and the pairing matters beyond the
 * technique itself: [RH-P03] the arriving note is NOT picked, because
 * the left hand makes that sound, and a pick stroke drawn there would
 * be a lie.
 */
function pairLinks(
  notes: readonly NoteEvent[],
  linkEnds: ReadonlyMap<string, readonly TechnicalLinkEnd[]>,
): readonly NoteEvent[] {
  const links = new Map<string, TechniqueLink[]>();
  const ordered = [...notes].sort((a, b) => a.tick - b.tick);

  for (let i = 0; i < ordered.length; i++) {
    const from = ordered[i];
    if (from === undefined) continue;
    for (const end of linkEnds.get(from.noteId) ?? []) {
      if (end.role !== 'start') continue;
      const to = ordered
        .slice(i + 1)
        .find(
          (other) =>
            other.tick > from.tick &&
            (from.lockedString === undefined ||
              other.lockedString === undefined ||
              other.lockedString === from.lockedString),
        );
      if (to === undefined) continue;
      push(links, from.noteId, { type: end.type, toNoteId: to.noteId });
      push(links, to.noteId, { type: end.type, fromNoteId: from.noteId });
    }
  }

  return notes.map((note) => {
    const own = links.get(note.noteId);
    return own === undefined ? note : { ...note, techniqueLinks: own };
  });
}

function push(map: Map<string, TechniqueLink[]>, key: string, link: TechniqueLink): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [link]);
  else if (
    !list.some(
      (existing) =>
        existing.type === link.type &&
        existing.fromNoteId === link.fromNoteId &&
        existing.toNoteId === link.toNoteId,
    )
  ) {
    list.push(link);
  }
}

/**
 * [IN-X13] When the file carries tab, the tab and the pitch have to agree.
 *
 * They disagree in one common, boring way: a guitar part notated an
 * octave above where it sounds, exported without a `<transpose>`. If
 * EVERY note is out by the same octave, that is what happened, and
 * the pitch is corrected. Any other mismatch keeps the tab as the
 * authority -- the file's author put the note on that string on
 * purpose -- and says so.
 */
function checkTabAgainstPitch(
  notes: readonly NoteEvent[],
  state: PartState,
  warnings: EngineWarning[],
  partId: string,
): readonly NoteEvent[] {
  const tuning = state.tuning ?? STANDARD_TUNING;
  const tabbed = notes.filter(
    (note) => note.lockedString !== undefined && note.lockedFret !== undefined,
  );
  if (tabbed.length === 0) return notes;

  let octaveOff = 0;
  let mismatched = 0;
  for (const note of tabbed) {
    const open = tuning[(note.lockedString as number) - 1];
    if (open === undefined) continue;
    const expected = open + (note.lockedFret as number);
    const difference = expected - note.pitch;
    if (difference === 0) continue;
    if (Math.abs(difference) === 12) octaveOff++;
    else mismatched++;
  }

  if (octaveOff > 0 && octaveOff >= tabbed.length - mismatched && mismatched === 0) {
    warnings.push({
      code: 'OCTAVE_CORRECTED',
      message: `${partId}: every tabbed note was an octave from its string and fret; the pitch was corrected`,
    });
    return notes.map((note) => {
      if (note.lockedString === undefined || note.lockedFret === undefined) return note;
      const open = tuning[note.lockedString - 1];
      if (open === undefined) return note;
      return { ...note, pitch: open + note.lockedFret };
    });
  }

  if (mismatched > 0) {
    warnings.push({
      code: 'PITCH_TAB_MISMATCH',
      message: `${partId}: ${mismatched} note(s) sound a different pitch than their string and fret; the tab was kept`,
    });
  }
  return notes;
}

/**
 * [IN-X02] The parts that look like a guitar.
 *
 * By name, by General MIDI program (24..31 are the guitars), or
 * because the part brought tab with it. A file where nothing matches
 * returns everything, so the caller can still ask the user.
 */
export function guitarParts(parts: readonly ParsedPart[]): readonly ParsedPart[] {
  const looksLikeGuitar = (part: ParsedPart): boolean => {
    if (part.hasTab) return true;
    if (part.gmProgram !== undefined && part.gmProgram >= 24 && part.gmProgram <= 31) return true;
    return /guitar|gtr|guit/i.test(part.name);
  };
  const found = parts.filter(looksLikeGuitar);
  return found.length > 0 ? found : parts;
}
