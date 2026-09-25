/**
 * fretboard.ts — where the strings and the frets are.
 *
 * Pure geometry in the box it is given, exported because two
 * renderers need the SAME answer: the page draws the neck as SVG, and
 * the video engine paints the moving parts onto a canvas. A mark a
 * few pixels off its string is exactly the kind of thing nobody
 * notices until it is in a published video.
 *
 * The neck is drawn HORIZONTALLY: strings run left to right, fret
 * wires stand across them, string 1 (the thinnest, highest) at the
 * top, as a player looking down at their own guitar sees it.
 */
import type { FretboardOptions, FretWire, GuitarNote, LivePosition, StringLine } from './types.js';

export const DEFAULT_STRINGS = 6;
export const DEFAULT_FIRST_FRET = 0;
export const DEFAULT_LAST_FRET = 12;

/**
 * The neck is a WEDGE, and these three numbers are its shape.
 *
 * A real neck is narrow at the nut and wide at the body, which is
 * most of why a photograph of a guitar reads as a guitar and a row of
 * parallel lines reads as a ladder. The board is drawn to fill the
 * height at its widest point and to be `NECK_TAPER` times narrower at
 * the nut; the strings sit inside it with a margin of wood either
 * side, the way they do on the instrument.
 */
const NECK_TAPER = 1.18;
/** How much of the height the board takes at its widest. */
const BOARD_FILL = 0.88;
/** The wood outside the outer strings, as a share of the board's half-height. */
const STRING_MARGIN = 0.18;

/**
 * The picture is a GUITAR, not a fretboard on its own: a headstock at
 * the left, the fretted neck in the middle, the body at the right.
 * These are the shares of the width each takes.
 */
const HEADSTOCK_SHARE = 0.1;
/**
 * The gutter at the far left, where each string's number and name go.
 *
 * Its own strip, OUTSIDE the instrument: printed over the headstock
 * they would sit on top of the tuners, and a picture meant to look
 * like a guitar cannot have writing across its head.
 */
const LABELS_SHARE = 0.055;
const BODY_SHARE = 0.2;
/** The strip under the board where the fret numbers go. */
const NUMBERS_SHARE = 0.16;
/** The thinnest and thickest string, as a fraction of the gap between two strings. */
const THINNEST = 0.07;
const THICKEST = 0.2;
/** The frets an acoustic marks with a dot, and the pair at the twelfth. */
const INLAY_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE_INLAY_FRETS = new Set([12, 24]);

export function stringCount(options: { strings?: number }): number {
  const value = options.strings;
  return Number.isFinite(value) && (value as number) >= 2
    ? Math.round(value as number)
    : DEFAULT_STRINGS;
}

export function fretRange(options: { firstFret?: number; lastFret?: number }): {
  first: number;
  last: number;
} {
  const first = Number.isFinite(options.firstFret)
    ? Math.max(0, Math.round(options.firstFret as number))
    : DEFAULT_FIRST_FRET;
  const lastRaw = Number.isFinite(options.lastFret)
    ? Math.round(options.lastFret as number)
    : DEFAULT_LAST_FRET;
  return { first, last: Math.max(first + 1, lastRaw) };
}

/**
 * The three parts of the instrument, and the strip under them.
 *
 * Exported because a mark, a fret wire and a string all have to agree
 * about where the neck IS -- and because a page measuring the picture
 * needs the same numbers.
 */
export function guitarLayout(options: {
  width: number;
  height: number;
  fretNumbers?: boolean;
  stringLabels?: boolean;
}): {
  board: { x: number; y: number; width: number; height: number };
  labels: { x: number; y: number; width: number; height: number };
  neck: { x: number; y: number; width: number; height: number };
  headstock: { x: number; y: number; width: number; height: number };
  body: { x: number; y: number; width: number; height: number };
  numbersY: number;
} {
  const width = Math.max(0, options.width);
  const height = Math.max(0, options.height);
  const numbers = options.fretNumbers === false ? 0 : height * NUMBERS_SHARE;
  const boardHeight = height - numbers;
  const labelsWidth = options.stringLabels === false ? 0 : width * LABELS_SHARE;
  const headstockWidth = width * HEADSTOCK_SHARE;
  const bodyWidth = width * BODY_SHARE;
  return {
    board: { x: 0, y: 0, width, height: boardHeight },
    labels: { x: 0, y: 0, width: labelsWidth, height: boardHeight },
    headstock: { x: labelsWidth, y: 0, width: headstockWidth, height: boardHeight },
    neck: {
      x: labelsWidth + headstockWidth,
      y: 0,
      width: Math.max(1, width - labelsWidth - headstockWidth - bodyWidth),
      height: boardHeight,
    },
    body: { x: width - bodyWidth, y: 0, width: bodyWidth, height: boardHeight },
    numbersY: boardHeight,
  };
}

/**
 * How far along the taper a point is: 0 at the nut, 1 where the neck
 * meets the body. Beyond the body the strings stay as they are --
 * they are heading for the bridge, and the neck has ended.
 */
function taperAt(options: FretboardOptions, x: number): number {
  const layout = guitarLayout(options);
  const nut = layout.neck.x;
  const end = Math.max(nut + 1, layout.body.x);
  return Math.min(1, Math.max(0, (x - nut) / (end - nut)));
}

/** Half the board's height at a point along the neck. */
export function boardHalfAt(options: FretboardOptions, x: number): number {
  const board = guitarLayout(options).board;
  const widest = (board.height * BOARD_FILL) / 2;
  const narrow = widest / NECK_TAPER;
  return narrow + (widest - narrow) * taperAt(options, x);
}

/** Half the span the strings themselves take, at a point along the neck. */
export function stringHalfAt(options: FretboardOptions, x: number): number {
  return boardHalfAt(options, x) * (1 - STRING_MARGIN);
}

/**
 * Every string, in the order they are drawn, AT THE NUT.
 *
 * String 1 is at the top and the thinnest; the lowest string is at the
 * bottom and the thickest. Thickness is drawn because it is how a
 * player recognises which string is which at a glance. Where a string
 * is further along the neck is `stringYAt`, because by then it has
 * fanned out.
 */
export function stringLines(options: {
  width?: number;
  height: number;
  strings?: number;
  firstFret?: number;
  lastFret?: number;
  fretNumbers?: boolean;
  stringLabels?: boolean;
}): readonly StringLine[] {
  const count = stringCount(options);
  if (!(options.height > 0)) return [];
  const full: FretboardOptions = {
    width: options.width ?? 1,
    height: options.height,
    ...(options.strings !== undefined ? { strings: options.strings } : {}),
    ...(options.fretNumbers !== undefined ? { fretNumbers: options.fretNumbers } : {}),
    ...(options.stringLabels !== undefined ? { stringLabels: options.stringLabels } : {}),
  };
  const board = guitarLayout(full).board;
  const middle = board.y + board.height / 2;
  const half = stringHalfAt(full, guitarLayout(full).neck.x);
  const gap = count > 1 ? (half * 2) / (count - 1) : 0;
  const lines: StringLine[] = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    lines.push({
      string: i + 1,
      offset: middle - half + i * gap,
      thickness: Math.max(1, (THINNEST + (THICKEST - THINNEST) * t) * (gap || board.height / 6)),
    });
  }
  return lines;
}

/** Where a string is, at a point along the neck. */
export function stringYAt(options: FretboardOptions, string: number, x: number): number {
  const lines = stringLines(options);
  const line = lines.find((candidate) => candidate.string === string);
  const board = guitarLayout(options).board;
  const middle = board.y + board.height / 2;
  if (line === undefined) return middle;
  const atNut = stringHalfAt(options, guitarLayout(options).neck.x);
  if (!(atNut > 0)) return middle;
  return middle + (line.offset - middle) * (stringHalfAt(options, x) / atNut);
}

/**
 * Where a fret wire stands, and where a note in that fret is drawn.
 *
 * Evenly spaced, not to the real 17.817 rule: this is a diagram for
 * reading, not a picture of a neck, and even spacing keeps the high
 * frets wide enough to hold a mark. The nut (fret 0) is the left edge
 * when the board starts there.
 */
export function fretWires(options: FretboardOptions): readonly FretWire[] {
  const { first, last } = fretRange(options);
  if (!(options.width > 0)) return [];
  const neck = guitarLayout(options).neck;
  const perFret = neck.width / (last - first);
  const wires: FretWire[] = [];
  for (let fret = first; fret <= last; fret++) {
    wires.push({ fret, offset: neck.x + (fret - first) * perFret });
  }
  return wires;
}

/** How wide one fret is drawn. */
export function fretWidth(options: FretboardOptions): number {
  const { first, last } = fretRange(options);
  return guitarLayout(options).neck.width / Math.max(1, last - first);
}

/**
 * Where a mark sits for a fret, along the neck.
 *
 * A stopped note is drawn BETWEEN its wire and the one before it,
 * because that is where the finger goes. An open string (fret 0) is
 * drawn on the nut itself, which is where the string is free.
 * Fractional frets are honoured, so a slide passes smoothly between.
 */
export function fretCenter(fret: number, options: FretboardOptions): number {
  const { first } = fretRange(options);
  const neck = guitarLayout(options).neck;
  const per = fretWidth(options);
  // An open string is played at the nut, which is where the neck
  // starts -- not at fret 1's own place.
  if (fret <= 0) return neck.x;
  return neck.x + (fret - first - 0.5) * per;
}

/** The dots down the middle of the neck: one at 3, 5, 7, 9, two at the twelfth. */
export function inlayFrets(options: { firstFret?: number; lastFret?: number }): readonly {
  fret: number;
  double: boolean;
}[] {
  const { first, last } = fretRange(options);
  const out: { fret: number; double: boolean }[] = [];
  for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
    if (INLAY_FRETS.has(fret)) out.push({ fret, double: false });
    else if (DOUBLE_INLAY_FRETS.has(fret)) out.push({ fret, double: true });
  }
  return out;
}

/**
 * The notes sounding right now, each at the fret it is on AT THIS
 * MOMENT.
 *
 * A slide is the reason this is not simply a filter: while one is
 * travelling, its fret is between two frets, and the fraction is how
 * far through the note's own length it has got. Everything else
 * reports the fret it was written on.
 */
export function positionsAt(
  notes: readonly GuitarNote[],
  seconds: number,
): readonly LivePosition[] {
  const live: LivePosition[] = [];
  for (const note of notes) {
    if (note.startSeconds > seconds || note.endSeconds <= seconds) continue;
    const to = note.slideToFret;
    const sliding = to !== undefined && Number.isFinite(to) && to !== note.fret;
    let fret = note.fret;
    if (sliding) {
      const span = Math.max(1e-6, note.endSeconds - note.startSeconds);
      const through = Math.min(1, Math.max(0, (seconds - note.startSeconds) / span));
      fret = note.fret + (to - note.fret) * through;
    }
    live.push({
      string: note.string,
      fret,
      ...(note.finger !== undefined ? { finger: note.finger } : {}),
      sliding,
      fromFret: note.fret,
      toFret: sliding ? to : note.fret,
    });
  }
  return live;
}

/** Standard tuning, in the order the strings are drawn: 1 = high E. */
export const STANDARD_TUNING: readonly number[] = [64, 59, 55, 50, 45, 40];

const NOTE_LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * What a string is called.
 *
 * The highest string is written in lower case -- "e" against "E" for
 * the lowest -- which is how guitarists have always written the two
 * apart, and how the string labels read on a real diagram.
 */
export function stringName(midi: number, isHighest: boolean): string {
  if (!Number.isFinite(midi)) return '';
  const letter = NOTE_LETTERS[((Math.round(midi) % 12) + 12) % 12] ?? '';
  return isHighest ? letter.toLowerCase() : letter;
}

/** The tuning to draw with: the caller's, padded or cut to the strings actually drawn. */
export function tuningFor(options: {
  strings?: number;
  tuning?: readonly number[];
}): readonly number[] {
  const count = stringCount(options);
  const given = options.tuning ?? STANDARD_TUNING;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const value = given[i];
    // A string the tuning does not name keeps going down in fourths,
    // which is how a seven-string is tuned below a six.
    out.push(
      Number.isFinite(value) ? (value as number) : (out[i - 1] ?? STANDARD_TUNING[0] ?? 64) - 5,
    );
  }
  return out;
}
