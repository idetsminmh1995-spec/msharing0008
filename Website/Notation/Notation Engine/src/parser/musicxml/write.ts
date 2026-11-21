/**
 * MusicXML writing — the inverse of `parseMusicXml`.
 *
 * The engine has always read MusicXML and drawn it. Editing needs the other
 * direction: a host turns a parsed, edited `ParseResult` back into a file.
 * That direction belongs here rather than in the host for one reason — a
 * drum note's identity is `<instrument id="...">`, resolved through the
 * part's `<midi-instrument>` table. A writer that does not know that rule
 * drops the identity, and a drum score saved and reopened comes back with
 * every notehead on the middle line and no sound. The knowledge of which
 * element carries a drum's identity is the same knowledge the reader and the
 * renderer already hold, so it lives beside them.
 *
 * ## What is written back
 *
 * Everything the reader turns into a `ParseResult` and the renderer draws,
 * including the side-tables that attach to a measure POSITION rather than to
 * a note: `<barline>` (bar style, repeats, endings, on either edge),
 * `<direction>` (dynamics, wedges, pedals, words, rehearsal marks),
 * `<metronome>`/`<sound tempo>` tempo marks, `<harmony>` chord symbols,
 * `<octave-shift>`, and `<print>`'s system/page breaks and layout hints.
 *
 * They are written because they are all load-bearing on a re-read: a score
 * saved and reopened without its repeats plays straight through, one without
 * its tempo marks plays at the wrong speed, and one without its chord symbols
 * loses the lead sheet. The reader already keeps them, so dropping them on
 * the way out was a data loss with nothing to recommend it.
 *
 * The one thing not preserved exactly: a tempo mark whose visual position
 * differs from its playback position (a source `offset` without
 * `sound="yes"`). It is written at its playback tick, because that is the
 * position a synthesiser must obey; the drawn position then follows it.
 */

import { TICKS_PER_QUARTER, ticksToXmlDivisions } from '../../core/duration-math.js';
import type { Chord } from '../../core/chord.js';
import type { Duration, DurationType } from '../../core/duration.js';
import type { Measure } from '../../core/measure.js';
import type { MeasureEvent } from '../../core/measure-event.js';
import type { Note } from '../../core/note.js';
import type { FermataPlacement, FermataShape, SlideKind } from '../../core/note.js';
import type { Part } from '../../core/part.js';
import type { Pitch } from '../../core/pitch.js';
import type { Rest } from '../../core/rest.js';
import type { Voice } from '../../core/voice.js';
import { drumKitEntry } from '../../notation-defaults/drum-kit.js';
import {
  musicXmlAccidentalGlyphName,
  musicXmlAccidentalValueForGlyphName,
} from '../../geometry/accidental.js';
import { TENTHS_PER_STAFF_SPACE } from './defaults.js';
import type { MidiInstrumentInfo } from './instrument.js';
import type { ClefSpec, TransposeSpec } from './attributes.js';
import type { PrintLayout } from './parse.js';
import type {
  DirectionEvent,
  HarmonyEvent,
  MeasureAttributes,
  OctaveShiftEvent,
  ParseResult,
  PrintEvent,
  TempoMarkEvent,
} from './parse.js';

/** The `<divisions>` a score with no tuplets keeps writing, so its file stays as it was. */
const DIVISION_FLOOR = 4;
/** Upper bound for the search when a duration is not a whole number of ticks at all. */
const MAX_DIVISIONS = 4096;

/** The engine's articulation names back to the MusicXML elements that produce them. */
const ARTICULATION_ELEMENT: Readonly<Record<string, string>> = {
  accent: 'accent',
  marcato: 'strong-accent',
  sforzato: 'soft-accent',
  staccato: 'staccato',
  tenuto: 'tenuto',
  staccatissimo: 'staccatissimo',
};

const ORNAMENT_ELEMENT: Readonly<Record<string, string>> = {
  trill: 'trill-mark',
  mordent: 'mordent',
  turn: 'turn',
  turnInverted: 'inverted-turn',
};

/** How `writeMusicXml` writes, for the rare caller that must pin `<divisions>`. */
export interface WriteMusicXmlOptions {
  /**
   * The `<divisions>` value to write. Omitted means "pick the smallest
   * candidate that keeps every duration and measure length a whole
   * number", which is what a file has to do to stay readable.
   */
  readonly divisions?: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attributeFor(
  parsed: ParseResult,
  partId: string,
  measureNumber: number,
): MeasureAttributes | undefined {
  return parsed.attributes.find((a) => a.partId === partId && a.measureNumber === measureNumber);
}

/** How many ticks one measure of this part's meter holds. */
function measureTicks(attribute: MeasureAttributes | undefined): number {
  if (attribute === undefined) return TICKS_PER_QUARTER * 4;
  return attribute.timeNumerator * (4 / attribute.timeDenominator) * TICKS_PER_QUARTER;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

/**
 * A `<divisions>` that keeps every duration and measure length a whole
 * number.
 *
 * The answer is the smallest multiple of the value the score's own tick
 * lengths demand. A triplet eighth is 160 ticks, which is exact only at
 * multiples of 3 -- so a score with a tuplet cannot use the power of two a
 * plain score uses, and rounding its 160 to 120 shortens every triplet and
 * leaves the bar a beat's worth of ticks short on the next open.
 */
function divisionsFor(parsed: ParseResult): number {
  const values: number[] = [];
  for (const part of parsed.score.parts) {
    for (const measure of part.measures) {
      values.push(measureTicks(attributeFor(parsed, part.id, measure.number)));
      for (const voice of measure.voices) {
        for (const event of voice.events) values.push(event.duration.ticks);
      }
    }
  }
  let required = 1;
  for (const ticks of values) {
    if (ticks === 0 || !Number.isInteger(ticks)) continue;
    required = lcm(required, TICKS_PER_QUARTER / gcd(ticks, TICKS_PER_QUARTER));
  }
  // Multiples of `required` at or above the floor: a third becomes 6, which
  // is the smallest unit a triplet score can be written in.
  const first = Math.ceil(DIVISION_FLOOR / required) * required;
  for (let divisions = first; divisions <= MAX_DIVISIONS; divisions += required) {
    if (values.every((ticks) => Number.isInteger((ticks * divisions) / TICKS_PER_QUARTER))) {
      return divisions;
    }
  }
  return DIVISION_FLOOR;
}

const toDivisions = (ticks: number, divisions: number): number =>
  Math.round(ticksToXmlDivisions(ticks, divisions));

// ---- note elements ------------------------------------------------------

/**
 * `<pitch>` or `<unpitched>`, in MusicXML's own shape.
 *
 * A drum note's display position is written only when the file stated one.
 * The reader fills in a neutral B4 when `<unpitched>` names no position,
 * and that placeholder exists only so the note has somewhere to sit while
 * the drum table decides. Writing it back would turn the placeholder into
 * a real instruction, and the note would move to the middle line the next
 * time the file was opened.
 */
function pitchXml(pitch: Pitch, hasExplicitDisplayPosition: boolean | undefined): string {
  if (pitch.kind === 'unpitched') {
    if (hasExplicitDisplayPosition !== true) return '<unpitched/>';
    return (
      '<unpitched>' +
      `<display-step>${pitch.displayStep}</display-step>` +
      `<display-octave>${pitch.displayOctave}</display-octave>` +
      '</unpitched>'
    );
  }
  const alter = pitch.alter || 0;
  return (
    '<pitch>' +
    `<step>${pitch.step}</step>` +
    (alter ? `<alter>${alter}</alter>` : '') +
    `<octave>${pitch.octave}</octave>` +
    '</pitch>'
  );
}

/**
 * `<accidental>`, with the glyph the file asked for and the wrappers that
 * say how to draw it.
 *
 * Only a note the file actually marked gets an element. A sharpened pitch
 * in E major already says so in `<alter>`, and the reader works out from
 * the key signature whether to draw the sign; writing `<accidental>` for
 * every altered note would turn each one into an explicit mark, and the
 * score would come back covered in sharps nobody wrote.
 *
 * A `<natural>` on an unaltered pitch is a real mark -- it cancels a key
 * signature -- so it survives through `hasExplicitAccidental` even though
 * the pitch agrees with it.
 */
function accidentalXml(note: Note): string {
  const pitch = note.pitch;
  if (pitch.kind !== 'pitched') return '';
  const glyph = note.accidentalGlyphName;
  if (glyph === undefined && note.hasExplicitAccidental !== true) return '';
  const value =
    glyph === undefined ? 'natural' : (musicXmlAccidentalValueForGlyphName(glyph) ?? 'other');
  // A value that already draws this glyph needs no `smufl` hint; one that
  // does not (`other`) has to carry the glyph it really meant.
  const smufl =
    glyph === undefined || musicXmlAccidentalGlyphName(value) === glyph
      ? ''
      : ` smufl="${escapeXml(glyph)}"`;
  const parentheses =
    note.accidentalParentheses === undefined
      ? ''
      : ` parentheses="${note.accidentalParentheses ? 'yes' : 'no'}"`;
  const bracket =
    note.accidentalBracket === undefined
      ? ''
      : ` bracket="${note.accidentalBracket ? 'yes' : 'no'}"`;
  return `<accidental${smufl}${parentheses}${bracket}>${escapeXml(value)}</accidental>`;
}

/** `<duration>` and `<tie>`, in MusicXML's order: duration first, then tie. */
function durationXml(
  tieStart: boolean,
  tieStop: boolean,
  duration: Duration,
  divisions: number,
): string {
  const ties = (tieStart ? '<tie type="start"/>' : '') + (tieStop ? '<tie type="stop"/>' : '');
  return `<duration>${toDivisions(duration.ticks, divisions)}</duration>${ties}`;
}

/**
 * `<instrument id="...">`, which is the whole of a drum note's identity.
 *
 * MusicXML orders it after `<duration>`/`<tie>` and before `<voice>`. A note
 * with no instrument writes nothing, so a pitched part's output is unchanged
 * from before this element was handled.
 */
function instrumentXml(note: Note): string {
  return note.instrumentId === undefined
    ? ''
    : `<instrument id="${escapeXml(note.instrumentId)}"/>`;
}

/** `<voice>`, `<type>` and `<dot>`, in MusicXML's order. */
function voiceTypeXml(duration: Duration, voice: number): string {
  const dots = '<dot/>'.repeat(duration.dots || 0);
  return `<voice>${voice}</voice><type>${duration.type}</type>${dots}`;
}

const stemXml = (note: Note): string =>
  note.explicitStemDirection === undefined ? '' : `<stem>${note.explicitStemDirection}</stem>`;

/**
 * `<fermata type="...">shape</fermata>`: the orientation lives in `type`
 * and the shape in the element's text, so the two are written together.
 */
function fermataXml(
  placement: FermataPlacement | undefined,
  shape: FermataShape | undefined,
): string {
  const type = placement === 'below' ? ' type="inverted"' : '';
  return `<fermata${type}>${shape ?? ''}</fermata>`;
}

/** `<slide>` or `<glissando>`, whichever kind this endpoint was read as. */
function slideXml(type: 'start' | 'stop', kind: SlideKind | undefined): string {
  const element = kind === 'glissando' ? 'glissando' : 'slide';
  return `<${element} type="${type}"/>`;
}

/**
 * A note's `<notations>`: ties, slurs, tuplets, tremolo, articulations,
 * ornaments, tablature marks, slides, arpeggiation, harmonic and fermata,
 * in MusicXML's own order. Returns '' for an ordinary note so its output
 * stays byte-identical to what the engine wrote before notations existed.
 */
function notationsXml(note: Note): string {
  const tied =
    (note.tieStart ? '<tied type="start"/>' : '') + (note.tieStop ? '<tied type="stop"/>' : '');
  const slurs = [
    ...(note.slurStarts ?? []).map((number) => `<slur type="start" number="${number}"/>`),
    ...(note.slurStops ?? []).map((number) => `<slur type="stop" number="${number}"/>`),
  ].join('');
  const tuplets =
    (note.tupletStart ? '<tuplet type="start"/>' : '') +
    (note.tupletStop ? '<tuplet type="stop"/>' : '');
  const tremolo =
    note.tremoloStrokes === undefined
      ? ''
      : `<tremolo${note.tremoloType === undefined ? '' : ` type="${note.tremoloType}"`}>` +
        `${note.tremoloStrokes}</tremolo>`;
  const articulations = (note.articulations ?? []).filter(
    (mark) => ARTICULATION_ELEMENT[mark] !== undefined,
  );
  const ornaments = (note.ornaments ?? []).filter((mark) => ORNAMENT_ELEMENT[mark] !== undefined);
  const technical =
    note.stringNumber === undefined && note.fret === undefined && note.fingering === undefined
      ? ''
      : '<technical>' +
        (note.stringNumber === undefined ? '' : `<string>${note.stringNumber}</string>`) +
        (note.fret === undefined ? '' : `<fret>${note.fret}</fret>`) +
        (note.fingering === undefined ? '' : `<fingering>${note.fingering}</fingering>`) +
        '</technical>';
  // A slide and a glissando are one gesture to a fretboard but two elements
  // in the file, so each endpoint is written back as the kind it was read as.
  const slides =
    (note.slideStart ? slideXml('start', note.slideStartKind) : '') +
    (note.slideStop ? slideXml('stop', note.slideStopKind) : '');
  const arpeggiate =
    note.nonArpeggiate === true
      ? '<non-arpeggiate/>'
      : note.arpeggiate === undefined
        ? ''
        : `<arpeggiate direction="${note.arpeggiate}"/>`;
  const inner =
    tied +
    slurs +
    tuplets +
    tremolo +
    (articulations.length
      ? `<articulations>${articulations
          .map((mark) => `<${ARTICULATION_ELEMENT[mark]}/>`)
          .join('')}</articulations>`
      : '') +
    (ornaments.length
      ? `<ornaments>${ornaments.map((mark) => `<${ORNAMENT_ELEMENT[mark]}/>`).join('')}</ornaments>`
      : '') +
    technical +
    slides +
    arpeggiate +
    (note.isHarmonic === true ? '<harmonic/>' : '') +
    (note.hasFermata ? fermataXml(note.fermataPlacement, note.fermataShape) : '');
  return inner === '' ? '' : `<notations>${inner}</notations>`;
}

/**
 * `<time-modification>`, which is what makes a note's written value differ
 * from its sounding length. Without it a triplet reads back as three plain
 * eighths and the bar no longer adds up.
 */
function timeModificationXml(duration: Duration): string {
  const tuplet = duration.tuplet;
  if (tuplet === undefined) return '';
  return (
    '<time-modification>' +
    `<actual-notes>${tuplet.actualNotes}</actual-notes>` +
    `<normal-notes>${tuplet.normalNotes}</normal-notes>` +
    '</time-modification>'
  );
}

/** `<notehead>`, with the attributes that say how to draw it. */
function noteheadXml(note: Note): string {
  const value = note.explicitNotehead;
  if (value === undefined) return '';
  const attributes =
    (note.explicitNoteheadSmufl === undefined
      ? ''
      : ` smufl="${escapeXml(note.explicitNoteheadSmufl)}"`) +
    (note.noteheadFilled === undefined ? '' : ` filled="${note.noteheadFilled ? 'yes' : 'no'}"`) +
    (note.noteheadParentheses === undefined
      ? ''
      : ` parentheses="${note.noteheadParentheses ? 'yes' : 'no'}"`);
  return `<notehead${attributes}>${escapeXml(value)}</notehead>`;
}

/** `<beam>` hints, in the order the file gave them. */
function beamsXml(note: Note): string {
  return (note.beams ?? [])
    .map((beam) => `<beam number="${beam.number}">${beam.value}</beam>`)
    .join('');
}

/** `<lyric>` syllables, one element per verse. */
function lyricsXml(note: Note): string {
  return (note.lyrics ?? [])
    .map(
      (lyric) =>
        `<lyric number="${lyric.number}">` +
        (lyric.syllabic === undefined ? '' : `<syllabic>${lyric.syllabic}</syllabic>`) +
        `<text>${escapeXml(lyric.text)}</text>` +
        (lyric.extend ? '<extend/>' : '') +
        '</lyric>',
    )
    .join('');
}

function noteXml(note: Note, duration: Duration, divisions: number, chordMember: boolean): string {
  return (
    '<note>' +
    (note.isGrace === true ? `<grace${note.graceSlash === true ? ' slash="yes"' : ''}/>` : '') +
    (note.isCue === true ? '<cue/>' : '') +
    (chordMember ? '<chord/>' : '') +
    pitchXml(note.pitch, note.hasExplicitDisplayPosition) +
    durationXml(note.tieStart === true, note.tieStop === true, duration, divisions) +
    instrumentXml(note) +
    voiceTypeXml(duration, note.voice) +
    accidentalXml(note) +
    timeModificationXml(duration) +
    stemXml(note) +
    noteheadXml(note) +
    `<staff>${note.staff ?? 1}</staff>` +
    beamsXml(note) +
    notationsXml(note) +
    lyricsXml(note) +
    '</note>'
  );
}

function restXml(rest: Rest, divisions: number): string {
  const positioned =
    rest.displayStep !== undefined && rest.displayOctave !== undefined
      ? `<display-step>${rest.displayStep}</display-step><display-octave>${rest.displayOctave}</display-octave>`
      : '';
  // A rest carries a fermata as readily as a note does -- it is what holds
  // a whole bar while the conductor waits.
  const notations =
    rest.hasFermata === true
      ? `<notations>${fermataXml(rest.fermataPlacement, rest.fermataShape)}</notations>`
      : '';
  return (
    '<note>' +
    `<rest>${positioned}</rest>` +
    durationXml(false, false, rest.duration, divisions) +
    voiceTypeXml(rest.duration, rest.voice) +
    timeModificationXml(rest.duration) +
    `<staff>${rest.staff ?? 1}</staff>` +
    notations +
    '</note>'
  );
}

function chordXml(chord: Chord, divisions: number): string {
  return chord.notes
    .map((note, index) => noteXml(note, chord.duration, divisions, index > 0))
    .join('');
}

function eventXml(event: MeasureEvent, divisions: number): string {
  if (event.kind === 'rest') return restXml(event, divisions);
  if (event.kind === 'chord') return chordXml(event, divisions);
  return noteXml(event, event.duration, divisions, false);
}

// ---- measures and parts -------------------------------------------------

function attributesXml(
  attribute: MeasureAttributes | undefined,
  divisions: number,
  previous: MeasureAttributes | undefined,
): string {
  if (attribute === undefined) return '';
  const same =
    previous !== undefined &&
    previous.fifths === attribute.fifths &&
    previous.mode === attribute.mode &&
    previous.timeNumerator === attribute.timeNumerator &&
    previous.timeDenominator === attribute.timeDenominator &&
    previous.timeNumeratorDisplay === attribute.timeNumeratorDisplay &&
    previous.clefSign === attribute.clefSign &&
    previous.clefLine === attribute.clefLine &&
    previous.staves === attribute.staves &&
    sameStaffDetail(previous, attribute);
  if (same) return '';

  const beats = attribute.timeNumeratorDisplay ?? String(attribute.timeNumerator);
  const mode = attribute.mode === undefined ? '' : `<mode>${attribute.mode}</mode>`;
  // A multi-staff part states its clefs per staff; a single-staff one keeps
  // the plain unnumbered `<clef>` every other reader expects.
  const clef =
    attribute.staves > 1
      ? ''
      : `<clef><sign>${attribute.clefSign}</sign>` +
        (attribute.clefLine === undefined ? '' : `<line>${attribute.clefLine}</line>`) +
        '</clef>';
  const staves =
    attribute.staves !== undefined && attribute.staves > 1
      ? `<staves>${attribute.staves}</staves>`
      : '';
  return (
    '<attributes>' +
    `<divisions>${divisions}</divisions>` +
    `<key><fifths>${attribute.fifths}</fifths>${mode}</key>` +
    `<time><beats>${beats}</beats><beat-type>${attribute.timeDenominator}</beat-type></time>` +
    clef +
    staves +
    staffDetailXml(attribute) +
    '</attributes>'
  );
}

/** True when two bars state the same per-staff clefs, line counts and transpose. */
function sameStaffDetail(a: MeasureAttributes, b: MeasureAttributes): boolean {
  return (
    JSON.stringify(a.clefsByStaff) === JSON.stringify(b.clefsByStaff) &&
    JSON.stringify(a.staffLinesByStaff) === JSON.stringify(b.staffLinesByStaff) &&
    a.transpose.chromatic === b.transpose.chromatic &&
    a.transpose.diatonic === b.transpose.diatonic &&
    a.transpose.octaveChange === b.transpose.octaveChange
  );
}

/**
 * One `<direction>` holding everything a `DirectionEvent` carries.
 *
 * MusicXML allows several `<direction-type>` children in one `<direction>`,
 * but each of these draws in a different place on the page (a dynamic under
 * the staff, a wedge spanning the passage, a rehearsal mark above it), so
 * they are written as one `<direction>` each: a reader that only understands
 * one of them then still keeps the others.
 */
function fullDirectionXml(event: DirectionEvent): string {
  const placement = event.placement === undefined ? '' : ` placement="${event.placement}"`;
  const wrap = (inner: string): string =>
    `<direction${placement}>` + inner + `<staff>${event.staff}</staff></direction>`;
  const parts: string[] = [];
  if (event.dynamics.length > 0) {
    parts.push(
      wrap(
        '<direction-type>' +
          `<dynamics>${event.dynamics.map((level) => `<${level}/>`).join('')}</dynamics>` +
          '</direction-type>',
      ),
    );
  }
  for (const wedge of event.wedges) {
    parts.push(
      wrap(
        '<direction-type>' +
          `<wedge type="${wedge.type}" number="${wedge.number}"/>` +
          '</direction-type>',
      ),
    );
  }
  for (const pedal of event.pedals) {
    parts.push(
      wrap(
        '<direction-type>' +
          `<pedal type="${pedal.type}" number="${pedal.number}"/>` +
          '</direction-type>',
      ),
    );
  }
  for (const text of event.rehearsals) {
    parts.push(wrap(`<direction-type><rehearsal>${escapeXml(text)}</rehearsal></direction-type>`));
  }
  for (const text of event.words) {
    parts.push(wrap(`<direction-type><words>${escapeXml(text)}</words></direction-type>`));
  }
  return parts.join('');
}

/**
 * One `<direction>` holding a metronome mark, with a `<sound tempo>` beside
 * it.
 *
 * Both are written because exporters read different ones: notation software
 * draws the metronome, playback software reads `<sound tempo>`. The `sound`
 * attribute is the quarter-notes-per-minute equivalent, which is what a
 * reader that ignores `<beat-unit>` falls back to.
 */
function tempoXml(event: TempoMarkEvent): string {
  const dots = '<beat-unit-dot/>'.repeat(event.beatUnitDots);
  const perQuarter =
    event.perMinute * (quarterNotesPerBeat(event.beatUnit) * dottedFactor(event.beatUnitDots));
  return (
    '<direction placement="above"><direction-type><metronome>' +
    `<beat-unit>${event.beatUnit}</beat-unit>${dots}<per-minute>${event.perMinute}</per-minute>` +
    '</metronome></direction-type>' +
    `<sound tempo="${Number(perQuarter.toFixed(4))}"/>` +
    '</direction>'
  );
}

/** How many quarter notes one of this note value is worth. */
function quarterNotesPerBeat(type: DurationType): number {
  const beats: Readonly<Record<string, number>> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    '16th': 0.25,
    '32nd': 0.125,
    '64th': 0.0625,
    '128th': 0.03125,
    '256th': 0.015625,
    '512th': 0.0078125,
  };
  return beats[type] ?? 1;
}

/** A dotted note's multiplier: one dot adds half, two add three quarters, and so on. */
function dottedFactor(dots: number): number {
  return 2 - 1 / 2 ** dots;
}

/** One `<harmony>` (chord symbol). */
function harmonyXml(event: HarmonyEvent): string {
  const root =
    event.rootStep === undefined
      ? ''
      : '<root>' +
        `<root-step>${event.rootStep}</root-step>` +
        (event.rootAlter ? `<root-alter>${event.rootAlter}</root-alter>` : '') +
        '</root>';
  const kind =
    event.kind === undefined
      ? ''
      : `<kind${event.kindText === undefined ? '' : ` text="${escapeXml(event.kindText)}"`}>` +
        `${escapeXml(event.kind)}</kind>`;
  const bass =
    event.bassStep === undefined
      ? ''
      : '<bass>' +
        `<bass-step>${event.bassStep}</bass-step>` +
        (event.bassAlter ? `<bass-alter>${event.bassAlter}</bass-alter>` : '') +
        '</bass>';
  if (root === '' && kind === '') return '';
  return `<harmony>${root}${kind}${bass}</harmony>`;
}

/** One `<direction>` holding an octave shift, or the `stop` that closes it. */
function octaveShiftXml(event: OctaveShiftEvent): string {
  return (
    '<direction placement="above"><direction-type>' +
    `<octave-shift type="${event.type}" size="${event.size}" number="${event.number}"/>` +
    '</direction-type>' +
    `<staff>${event.staff}</staff>` +
    '</direction>'
  );
}

/** Staff spaces back to the tenths MusicXML writes. */
const toTenths = (staffSpaces: number): number =>
  Number((staffSpaces * TENTHS_PER_STAFF_SPACE).toFixed(4));

/** One `<print>`: its system/page break and any layout hints it carries. */
function printXml(event: PrintEvent): string {
  const attributes =
    (event.newSystem ? ' new-system="yes"' : '') + (event.newPage ? ' new-page="yes"' : '');
  const layout = event.layout === undefined ? '' : printLayoutXml(event.layout);
  if (attributes === '' && layout === '') return '';
  return `<print${attributes}>${layout}</print>`;
}

function printLayoutXml(layout: PrintLayout): string {
  const staves = Object.entries(layout.staffDistances ?? {})
    .map(
      ([number, distance]) =>
        `<staff-layout number="${number}"><staff-distance>${toTenths(distance)}</staff-distance></staff-layout>`,
    )
    .join('');
  const system = [
    layout.systemDistance === undefined
      ? ''
      : `<system-distance>${toTenths(layout.systemDistance)}</system-distance>`,
    layout.topSystemDistance === undefined
      ? ''
      : `<top-system-distance>${toTenths(layout.topSystemDistance)}</top-system-distance>`,
    layout.systemLeftMargin === undefined || layout.systemRightMargin === undefined
      ? ''
      : '<system-margins>' +
        `<left-margin>${toTenths(layout.systemLeftMargin)}</left-margin>` +
        `<right-margin>${toTenths(layout.systemRightMargin)}</right-margin>` +
        '</system-margins>',
  ].join('');
  return staves + (system === '' ? '' : `<system-layout>${system}</system-layout>`);
}

/**
 * One edge's `<barline>`: its bar style, a repeat, and any ending it closes.
 *
 * `side` is the `location` attribute MusicXML wants, or `undefined` for the
 * default right-hand barline -- writing `location="right"` there would be
 * legal but noisy, and the reader treats the two identically.
 */
function barlineXml(
  side: 'left' | 'right',
  style: string | undefined,
  repeatDirection: 'forward' | 'backward' | undefined,
  repeatTimes: number | undefined,
  endingNumbers: readonly number[] | undefined,
  endingType: 'start' | 'stop' | 'discontinue' | undefined,
): string {
  const children: string[] = [];
  if (style !== undefined) children.push(`<bar-style>${escapeXml(style)}</bar-style>`);
  if (endingNumbers !== undefined && endingNumbers.length > 0) {
    children.push(`<ending number="${endingNumbers.join(',')}" type="${endingType ?? 'start'}"/>`);
  }
  if (repeatDirection !== undefined) {
    // MusicXML's default is 2, so a plain repeat writes nothing there.
    const times = repeatTimes === undefined || repeatTimes === 2 ? '' : ` times="${repeatTimes}"`;
    children.push(`<repeat direction="${repeatDirection}"${times}/>`);
  }
  if (children.length === 0) return '';
  const location = side === 'left' ? ' location="left"' : '';
  return `<barline${location}>${children.join('')}</barline>`;
}

/**
 * `<attributes>`'s per-staff detail: each staff's clef, its line count and
 * the part's transpose.
 *
 * A grand staff needs this: writing one clef for the whole part collapses a
 * piano's bass staff onto its treble staff, which is what a saved and
 * reopened piano score used to look like.
 */
function staffDetailXml(attribute: MeasureAttributes): string {
  const staves = attribute.staves > 1 ? attribute.staves : 1;
  const clefs: string[] = [];
  // A single-staff part already wrote its one `<clef>` unnumbered above;
  // repeating it as `<clef number="1">` would state the same clef twice.
  if (staves > 1) {
    for (let staff = 1; staff <= staves; staff += 1) {
      const clef: ClefSpec | undefined = attribute.clefsByStaff[staff];
      if (clef === undefined) continue;
      clefs.push(
        `<clef number="${staff}">` +
          `<sign>${clef.sign}</sign>` +
          (clef.line === undefined ? '' : `<line>${clef.line}</line>`) +
          '</clef>',
      );
    }
  }
  const details = Object.entries(attribute.staffLinesByStaff)
    .filter(([staff, lines]) => lines !== 5 && Number(staff) <= staves)
    .map(
      ([staff, lines]) =>
        `<staff-details number="${staff}"><staff-lines>${lines}</staff-lines></staff-details>`,
    );
  return clefs.join('') + details.join('') + transposeXml(attribute.transpose);
}

/**
 * `<transpose>`: what to add to a written pitch to get a sounding one.
 *
 * The parser derives `semitones` from `chromatic` and `octave-change`, so
 * only those two are written back.
 */
function transposeXml(transpose: TransposeSpec): string {
  const octave =
    transpose.octaveChange === undefined
      ? ''
      : `<octave-change>${transpose.octaveChange}</octave-change>`;
  const diatonic =
    transpose.diatonic === undefined ? '' : `<diatonic>${transpose.diatonic}</diatonic>`;
  // A zero chromatic with no octave change is the parser's default for "no
  // <transpose>", not something the file stated: writing it back would add
  // the element to every part of every score.
  if (transpose.chromatic === 0 && octave === '') return '';
  return `<transpose>${diatonic}<chromatic>${transpose.chromatic}</chromatic>${octave}</transpose>`;
}

const sortEvents = (events: readonly MeasureEvent[]): readonly MeasureEvent[] =>
  [...events].sort((a, b) => (a.startTick ?? 0) - (b.startTick ?? 0));

function measureXml(
  parsed: ParseResult,
  partId: string,
  measure: Measure,
  divisions: number,
  previous: MeasureAttributes | undefined,
): string {
  const attribute = attributeFor(parsed, partId, measure.number);
  const head = attributesXml(attribute, divisions, previous);
  const body: string[] = [];

  // A <print> and a left-edge barline both come before the bar's music.
  for (const print of parsed.prints) {
    if (print.partId !== partId || print.measureNumber !== measure.number) continue;
    const xml = printXml(print);
    if (xml !== '') body.push(xml);
  }
  if (attribute !== undefined) {
    const left = barlineXml(
      'left',
      attribute.leftBarlineStyle,
      attribute.leftRepeatDirection,
      attribute.leftRepeatTimes,
      attribute.leftEndingNumbers,
      attribute.leftEndingType,
    );
    if (left !== '') body.push(left);
  }

  // Every marking that attaches to a POSITION in this bar, keyed by that
  // tick, so one flush writes them all in the order the bar reaches them.
  // Dynamics, wedges, pedals, words, rehearsal marks, tempo marks, chord
  // symbols and octave shifts all belong here: they are drawn at a tick,
  // not owned by a note, and losing them on save was the whole data loss.
  type Mark = { readonly tick: number; readonly xml: string };
  const marks: Mark[] = [];
  const inMeasure = (event: { partId: string; measureNumber: number }): boolean =>
    event.partId === partId && event.measureNumber === measure.number;
  for (const direction of parsed.directions.filter(inMeasure)) {
    const xml = fullDirectionXml(direction);
    if (xml !== '') marks.push({ tick: direction.tick, xml });
  }
  for (const tempo of parsed.tempoMarks.filter(inMeasure)) {
    marks.push({ tick: tempo.visualTick ?? tempo.tick, xml: tempoXml(tempo) });
  }
  for (const harmony of parsed.harmonies.filter(inMeasure)) {
    const xml = harmonyXml(harmony);
    if (xml !== '') marks.push({ tick: harmony.tick, xml });
  }
  for (const shift of parsed.octaveShifts.filter(inMeasure)) {
    marks.push({ tick: shift.tick, xml: octaveShiftXml(shift) });
  }
  marks.sort((a, b) => a.tick - b.tick);
  let markIndex = 0;
  const flushMarks = (upToTick: number): void => {
    for (;;) {
      const mark = marks[markIndex];
      if (mark === undefined || mark.tick > upToTick) return;
      body.push(mark.xml);
      markIndex += 1;
    }
  };

  measure.voices.forEach((voice: Voice, voiceIndex) => {
    let cursor = 0;
    for (const event of sortEvents(voice.events)) {
      const start = event.startTick ?? cursor;
      if (start > cursor) {
        body.push(
          `<forward><duration>${toDivisions(start - cursor, divisions)}</duration></forward>`,
        );
      } else if (start < cursor) {
        body.push(
          `<backup><duration>${toDivisions(cursor - start, divisions)}</duration></backup>`,
        );
      }
      flushMarks(start);
      body.push(eventXml(event, divisions));
      cursor = start + event.duration.ticks;
    }
    if (voiceIndex < measure.voices.length - 1 && cursor > 0) {
      body.push(`<backup><duration>${toDivisions(cursor, divisions)}</duration></backup>`);
    }
  });
  flushMarks(Number.POSITIVE_INFINITY);

  if (attribute !== undefined) {
    const right = barlineXml(
      'right',
      attribute.barlineStyle,
      attribute.repeatDirection,
      attribute.repeatTimes,
      attribute.endingNumbers,
      attribute.endingType,
    );
    if (right !== '') body.push(right);
  }

  return `<measure number="${measure.number}">${head}${body.join('')}</measure>`;
}

/**
 * A part's `<score-part>`, carrying the `<midi-instrument>` routing that
 * makes its unpitched notes sound.
 *
 * The routing is the parser's own side-table written back out. A drum's
 * `<instrument-name>` is taken from the engine's standard kit when the GM
 * key names a known drum, so a file this engine writes says "Acoustic
 * Snare" rather than repeating the part name nine times.
 */
function scorePartXml(
  part: Part,
  instruments: ReadonlyMap<string, MidiInstrumentInfo> | undefined,
): string {
  const partName = escapeXml(part.name ?? 'Music');
  const entries = [...(instruments ?? new Map<string, MidiInstrumentInfo>())];
  if (entries.length === 0) {
    return `<score-part id="${escapeXml(part.id)}"><part-name>${partName}</part-name></score-part>`;
  }
  const children = entries
    .map(([instrumentId, info]) => {
      const kitName = info.gmNote === undefined ? undefined : drumKitEntry(info.gmNote)?.name;
      const name = escapeXml(kitName ?? part.name ?? 'Music');
      const routing: string[] = [];
      // Every one of these is 1-based on the wire; the parser stored them
      // decremented, so writing them back adds one.
      if (info.channel !== undefined) {
        routing.push(`<midi-channel>${info.channel + 1}</midi-channel>`);
      }
      if (info.program !== undefined) {
        routing.push(`<midi-program>${info.program + 1}</midi-program>`);
      }
      if (info.bank !== undefined) routing.push(`<midi-bank>${info.bank + 1}</midi-bank>`);
      if (info.gmNote !== undefined) {
        routing.push(`<midi-unpitched>${info.gmNote + 1}</midi-unpitched>`);
      }
      const midi =
        routing.length === 0
          ? ''
          : `<midi-instrument id="${escapeXml(instrumentId)}">${routing.join('')}</midi-instrument>`;
      return (
        `<score-instrument id="${escapeXml(instrumentId)}">` +
        `<instrument-name>${name}</instrument-name>` +
        '</score-instrument>' +
        midi
      );
    })
    .join('');
  return `<score-part id="${escapeXml(part.id)}"><part-name>${partName}</part-name>${children}</score-part>`;
}

/**
 * A parsed, edited score as a portable MusicXML 4.0 partwise file.
 *
 * The output is what `parseMusicXml` reads back to the same score — the
 * round trip the save path depends on. Call it on the `ParseResult` an edit
 * produced, not on a re-parsed string, so the side-tables the edits carry
 * (MIDI routing above all) are still in hand.
 */
export function writeMusicXml(parsed: ParseResult, options: WriteMusicXmlOptions = {}): string {
  const divisions = options.divisions ?? divisionsFor(parsed);
  const title = parsed.score.title ?? parsed.identity.workTitle ?? 'Untitled score';
  const composer = parsed.score.composer ?? parsed.identity.creators.composer;

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
    `<work><work-title>${escapeXml(title)}</work-title></work>`,
  ];
  if (composer !== undefined) {
    lines.push(
      `<identification><creator type="composer">${escapeXml(composer)}</creator></identification>`,
    );
  }
  lines.push('<part-list>');
  for (const part of parsed.score.parts) {
    lines.push(scorePartXml(part, parsed.midiInstrumentInfoByPart.get(part.id)));
  }
  lines.push('</part-list>');
  for (const part of parsed.score.parts) {
    lines.push(`<part id="${escapeXml(part.id)}">`);
    let previous: MeasureAttributes | undefined;
    for (const measure of part.measures) {
      lines.push(measureXml(parsed, part.id, measure, divisions, previous));
      previous = attributeFor(parsed, part.id, measure.number);
    }
    lines.push('</part>');
  }
  lines.push('</score-partwise>');
  return lines.join('\n');
}
