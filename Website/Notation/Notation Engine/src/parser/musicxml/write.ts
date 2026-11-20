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
 * Everything the reader turns into a `ParseResult` and the renderer draws:
 * part names and their MIDI routing, per-measure attributes, notes, rests,
 * chords, ties, accidentals, stems, notations, dynamics and unpitched
 * percussion. Elements the parser keeps only as prose the renderer cannot
 * draw (words, rehearsal marks, harmonies) are not re-emitted; losing them
 * on an edit is a known limit, stated here rather than left to be
 * discovered.
 */

import { TICKS_PER_QUARTER, ticksToXmlDivisions } from '../../core/duration-math.js';
import type { Chord } from '../../core/chord.js';
import type { Duration } from '../../core/duration.js';
import type { Measure } from '../../core/measure.js';
import type { MeasureEvent } from '../../core/measure-event.js';
import type { Note } from '../../core/note.js';
import type { Part } from '../../core/part.js';
import type { Pitch } from '../../core/pitch.js';
import type { Rest } from '../../core/rest.js';
import type { Voice } from '../../core/voice.js';
import { drumKitEntry } from '../../notation-defaults/drum-kit.js';
import type { MidiInstrumentInfo } from './instrument.js';
import type { MeasureAttributes, ParseResult } from './parse.js';

/** `<divisions>` values tried in order, the same list the editor used before this module existed. */
const DIVISION_CANDIDATES = [4, 8, 16, 32, 64, 128, 256, 512] as const;
const FALLBACK_DIVISIONS = 4;

/** MusicXML's own names for the accidentals an `<alter>` can produce. */
const ACCIDENTAL_NAME: Readonly<Record<number, string>> = {
  [-2]: 'flat-flat',
  [-1]: 'flat',
  0: 'natural',
  1: 'sharp',
  2: 'double-sharp',
};

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

/** A `<divisions>` that keeps every duration and measure length a whole number. */
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
  for (const divisions of DIVISION_CANDIDATES) {
    if (values.every((ticks) => Number.isInteger((ticks * divisions) / TICKS_PER_QUARTER))) {
      return divisions;
    }
  }
  return FALLBACK_DIVISIONS;
}

const toDivisions = (ticks: number, divisions: number): number =>
  Math.round(ticksToXmlDivisions(ticks, divisions));

// ---- note elements ------------------------------------------------------

function pitchXml(pitch: Pitch): string {
  if (pitch.kind === 'unpitched') {
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

function accidentalXml(note: Note): string {
  const pitch = note.pitch;
  if (pitch.kind !== 'pitched') return '';
  const alter = pitch.alter || 0;
  if (!alter) return '';
  const name = ACCIDENTAL_NAME[alter];
  return name === undefined ? '' : `<accidental>${name}</accidental>`;
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
 * A note's `<notations>`: ties, slurs, articulations, ornaments and fermata,
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
  const articulations = (note.articulations ?? []).filter(
    (mark) => ARTICULATION_ELEMENT[mark] !== undefined,
  );
  const ornaments = (note.ornaments ?? []).filter((mark) => ORNAMENT_ELEMENT[mark] !== undefined);
  if (articulations.length === 0 && ornaments.length === 0 && !note.hasFermata && !tied && !slurs) {
    return '';
  }
  const inner =
    tied +
    slurs +
    (articulations.length
      ? `<articulations>${articulations
          .map((mark) => `<${ARTICULATION_ELEMENT[mark]}/>`)
          .join('')}</articulations>`
      : '') +
    (ornaments.length
      ? `<ornaments>${ornaments.map((mark) => `<${ORNAMENT_ELEMENT[mark]}/>`).join('')}</ornaments>`
      : '') +
    (note.hasFermata ? '<fermata/>' : '');
  return `<notations>${inner}</notations>`;
}

function noteXml(note: Note, duration: Duration, divisions: number, chordMember: boolean): string {
  return (
    '<note>' +
    (chordMember ? '<chord/>' : '') +
    pitchXml(note.pitch) +
    durationXml(note.tieStart === true, note.tieStop === true, duration, divisions) +
    instrumentXml(note) +
    voiceTypeXml(duration, note.voice) +
    accidentalXml(note) +
    stemXml(note) +
    `<staff>${note.staff ?? 1}</staff>` +
    notationsXml(note) +
    '</note>'
  );
}

function restXml(rest: Rest, divisions: number): string {
  const positioned =
    rest.displayStep !== undefined && rest.displayOctave !== undefined
      ? `<display-step>${rest.displayStep}</display-step><display-octave>${rest.displayOctave}</display-octave>`
      : '';
  return (
    '<note>' +
    `<rest>${positioned}</rest>` +
    durationXml(false, false, rest.duration, divisions) +
    voiceTypeXml(rest.duration, rest.voice) +
    `<staff>${rest.staff ?? 1}</staff>` +
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
    previous.clefLine === attribute.clefLine;
  if (same) return '';

  const beats = attribute.timeNumeratorDisplay ?? String(attribute.timeNumerator);
  const mode = attribute.mode === undefined ? '' : `<mode>${attribute.mode}</mode>`;
  const clef =
    `<clef><sign>${attribute.clefSign}</sign>` +
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
    '</attributes>'
  );
}

/** One `<direction>` for a dynamic mark, at the tick the caller flushes it on. */
function directionXml(direction: {
  readonly dynamics: readonly string[];
  readonly placement?: 'above' | 'below';
  readonly staff?: number;
}): string {
  if (direction.dynamics.length === 0) return '';
  const placement = direction.placement === 'above' ? ' placement="above"' : '';
  return (
    `<direction${placement}>` +
    '<direction-type>' +
    `<dynamics>${direction.dynamics.map((level) => `<${level}/>`).join('')}</dynamics>` +
    '</direction-type>' +
    `<staff>${direction.staff ?? 1}</staff>` +
    '</direction>'
  );
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
  const head = attributesXml(attributeFor(parsed, partId, measure.number), divisions, previous);
  const body: string[] = [];

  // Dynamics carry their own tick; flushing each just before the first
  // event at or after it puts the mark where it sounds.
  const directions = parsed.directions
    .filter((d) => d.partId === partId && d.measureNumber === measure.number)
    .sort((a, b) => a.tick - b.tick);
  let directionIndex = 0;
  const flushDirections = (upToTick: number): void => {
    for (;;) {
      const direction = directions[directionIndex];
      if (direction === undefined || direction.tick > upToTick) return;
      const xml = directionXml(direction);
      if (xml !== '') body.push(xml);
      directionIndex += 1;
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
      flushDirections(start);
      body.push(eventXml(event, divisions));
      cursor = start + event.duration.ticks;
    }
    if (voiceIndex < measure.voices.length - 1 && cursor > 0) {
      body.push(`<backup><duration>${toDivisions(cursor, divisions)}</duration></backup>`);
    }
  });
  flushDirections(Number.POSITIVE_INFINITY);

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
