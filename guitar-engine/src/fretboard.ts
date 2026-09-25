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
 * How much of the height the strings span, leaving the rest as the
 * edge of the neck above and below them.
 */
const STRING_SPAN = 0.82;
/**
 * The picture is a GUITAR, not a fretboard on its own: a headstock at
 * the left, the fretted neck in the middle, the body at the right.
 * These are the shares of the width each takes.
 */
const HEADSTOCK_SHARE = 0.085;
const BODY_SHARE = 0.16;
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
export function guitarLayout(options: { width: number; height: number; fretNumbers?: boolean }): {
  board: { x: number; y: number; width: number; height: number };
  neck: { x: number; y: number; width: number; height: number };
  headstock: { x: number; y: number; width: number; height: number };
  body: { x: number; y: number; width: number; height: number };
  numbersY: number;
} {
  const width = Math.max(0, options.width);
  const height = Math.max(0, options.height);
  const numbers = options.fretNumbers === false ? 0 : height * NUMBERS_SHARE;
  const boardHeight = height - numbers;
  const headstockWidth = width * HEADSTOCK_SHARE;
  const bodyWidth = width * BODY_SHARE;
  return {
    board: { x: 0, y: 0, width, height: boardHeight },
    headstock: { x: 0, y: 0, width: headstockWidth, height: boardHeight },
    neck: {
      x: headstockWidth,
      y: 0,
      width: Math.max(1, width - headstockWidth - bodyWidth),
      height: boardHeight,
    },
    body: { x: width - bodyWidth, y: 0, width: bodyWidth, height: boardHeight },
    numbersY: boardHeight,
  };
}

/**
 * Every string, in the order they are drawn.
 *
 * String 1 is at the top and the thinnest; the lowest string is at the
 * bottom and the thickest. Thickness is drawn because it is how a
 * player recognises which string is which at a glance.
 */
export function stringLines(options: {
  width?: number;
  height: number;
  strings?: number;
  fretNumbers?: boolean;
}): readonly StringLine[] {
  const count = stringCount(options);
  if (!(options.height > 0)) return [];
  // The strings run across the BOARD, which is the height minus the
  // strip the fret numbers sit in.
  const board = guitarLayout({
    width: options.width ?? 1,
    height: options.height,
    ...(options.fretNumbers !== undefined ? { fretNumbers: options.fretNumbers } : {}),
  }).board;
  const span = board.height * STRING_SPAN;
  const top = board.y + (board.height - span) / 2;
  const gap = count > 1 ? span / (count - 1) : 0;
  const lines: StringLine[] = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    lines.push({
      string: i + 1,
      offset: top + i * gap,
      thickness: Math.max(1, (THINNEST + (THICKEST - THINNEST) * t) * (gap || board.height / 6)),
    });
  }
  return lines;
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
