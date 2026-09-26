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
import {
  photoEdgeY,
  photoFretCount,
  photoStringMiddle,
  photoWireX,
  type GuitarPhotograph,
  type PhotoMeasurements,
} from './photo.js';
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
 * BLEED: the instrument runs off both edges of the picture.
 *
 * A guitar photographed for a video does not sit inside the frame
 * with air around it -- the neck runs in from one edge and the body
 * out of the other, and the frame is a window onto an instrument
 * bigger than it. In this mode the nut is at the left edge (the
 * headstock is off-screen) and only the near part of the body is
 * seen, which leaves far more room for the frets that matter.
 */
const BLEED_BODY_VISIBLE = 0.26;
const BLEED_BODY_SHARE = 0.3;
/** The band above the neck where the hand legend sits, when one is drawn. */
const HAND_BAND_SHARE = 0.22;
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

export function fretRange(options: {
  firstFret?: number;
  lastFret?: number;
  photo?: GuitarPhotograph;
}): {
  first: number;
  last: number;
} {
  // A photograph shows the frets it shows. Asking it for twelve would
  // only stop the marks at a fret that is plainly there in the
  // picture, and the picture is the one thing here nobody can redraw.
  const photo = options.photo;
  if (photo !== undefined) return { first: 0, last: photoFretCount(photo) };
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
  bleed?: boolean;
  handLegend?: boolean;
}): {
  board: { x: number; y: number; width: number; height: number };
  labels: { x: number; y: number; width: number; height: number };
  neck: { x: number; y: number; width: number; height: number };
  headstock: { x: number; y: number; width: number; height: number };
  body: { x: number; y: number; width: number; height: number };
  /** The strip above the neck, empty unless a hand legend is drawn in it. */
  hand: { x: number; y: number; width: number; height: number };
  numbersY: number;
} {
  const width = Math.max(0, options.width);
  const height = Math.max(0, options.height);
  const numbers = options.fretNumbers === false ? 0 : height * NUMBERS_SHARE;
  const handBand = options.handLegend === true ? height * HAND_BAND_SHARE : 0;
  const boardHeight = Math.max(1, height - numbers - handBand);
  const bleed = options.bleed === true;
  // Bled, the head and the label gutter are off the left edge and the
  // body runs off the right; otherwise the whole instrument is inside
  // the picture with its gutter beside it.
  const labelsWidth = bleed || options.stringLabels === false ? 0 : width * LABELS_SHARE;
  const headstockWidth = bleed ? 0 : width * HEADSTOCK_SHARE;
  const bodyWidth = width * (bleed ? BLEED_BODY_SHARE : BODY_SHARE);
  const bodyX = bleed ? width * (1 - BLEED_BODY_VISIBLE) : width - bodyWidth;
  return {
    board: { x: 0, y: handBand, width, height: boardHeight },
    labels: { x: 0, y: handBand, width: labelsWidth, height: boardHeight },
    headstock: { x: labelsWidth, y: handBand, width: headstockWidth, height: boardHeight },
    neck: {
      x: labelsWidth + headstockWidth,
      y: handBand,
      width: Math.max(1, bodyX - labelsWidth - headstockWidth),
      height: boardHeight,
    },
    // The body is TALLER than the neck, as it is on the instrument:
    // without that there is no room above the neck for a cutaway horn
    // or below it for the bout, and the body can only ever be a box
    // the same height as the fretboard.
    body: {
      x: bodyX,
      y: handBand * 0.25,
      width: bodyWidth,
      height: height - handBand * 0.25 - numbers * 0.25,
    },
    hand: { x: 0, y: 0, width, height: handBand },
    numbersY: handBand + boardHeight,
  };
}

/**
 * How tall the stage should be, for a picture drawn across it.
 *
 * A photograph is scaled to the WIDTH of the frame, so its height is
 * decided the moment the width is. Asking for a box of some other
 * height does not make the picture fill it -- it leaves a band of
 * nothing above and below, which is exactly what a fretboard strip
 * dropped into a box meant for a whole guitar looks like.
 *
 * So the box follows the picture: this is the height at which the
 * picture's board lands squarely in the board's own band, with the
 * hand legend above it and the fret numbers below.
 */
export function stageHeightFor(
  width: number,
  photo: GuitarPhotograph,
  options?: { handLegend?: boolean; fretNumbers?: boolean },
): number {
  if (!(width > 0) || !(photo.width > 0) || !(photo.height > 0)) return 0;
  const scaled = photo.height * photoScale(width, photo);
  const numbers = options?.fretNumbers === false ? 0 : NUMBERS_SHARE;
  const hand = options?.handLegend === true ? HAND_BAND_SHARE : 0;
  const share = Math.max(0.2, 1 - numbers - hand);
  if (photo.fit === 'frame') {
    // A whole guitar IS the frame, so the box is as tall as the
    // picture can COVER while its strings stay in the board's band.
    // A photograph is framed by whoever took it -- this one's strings
    // sit two thirds of the way down it, not in the middle -- and a
    // box any taller than this shows a band of nothing under the
    // guitar, which is what a picture "filling the frame" must never
    // do.
    const at = photoStringMiddle(photo) / photo.height;
    const band = Math.min(0.95, Math.max(0.05, hand + share / 2 + photoDrop(photo)));
    const cover = Math.min(at / band, (1 - at) / (1 - band));
    return Math.round(scaled * Math.max(0.05, cover));
  }
  return Math.round(scaled / share);
}

/**
 * A photograph, placed in the picture.
 *
 * Scaled to the WIDTH of the frame and hung by the strings: their
 * middle sits where the drawn neck's middle would, so the hand legend
 * keeps its band above and the fret numbers keep their strip below. A
 * photograph is framed by whoever took it -- neck in from one edge,
 * body out of the other -- and stretching it to a box would throw
 * that away, so the body is left to run off the top and the bottom
 * the way it runs off the side.
 */
export interface PhotoPlacement {
  readonly photo: GuitarPhotograph;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export function photoPlacement(options: FretboardOptions): PhotoPlacement | undefined {
  const photo = options.photo;
  if (photo === undefined || !(photo.width > 0) || !(options.width > 0)) return undefined;
  const scale = photoScale(options.width, photo);
  const board = guitarLayout(options).board;
  return {
    photo,
    scale,
    x: -photoSpan(photo)[0] * scale,
    y:
      board.y +
      board.height / 2 -
      photoStringMiddle(photo) * scale +
      photoDrop(photo) * options.height,
  };
}

/**
 * The stretch of the file that fills the frame's width.
 *
 * The whole picture unless it says otherwise, and never a stretch
 * that runs backwards or is too thin to scale from -- a picture that
 * asks for nonsense is drawn whole rather than drawn wrong.
 */
function photoSpan(photo: GuitarPhotograph | PhotoMeasurements): readonly [number, number] {
  const span = photo.span;
  const whole: readonly [number, number] = [0, photo.width];
  if (span === undefined) return whole;
  const [from, to] = span;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return whole;
  return to - from > photo.width * 0.05 ? [from, to] : whole;
}

/** How big the picture is drawn, for a frame of this width. */
function photoScale(width: number, photo: GuitarPhotograph | PhotoMeasurements): number {
  const [from, to] = photoSpan(photo);
  return width / (to - from);
}

/** How far down the stage it hangs, as a share of the stage's height. */
function photoDrop(photo: GuitarPhotograph | PhotoMeasurements): number {
  const drop = photo.drop;
  return typeof drop === 'number' && drop > -0.9 && drop < 0.9 ? drop : 0;
}

/** A length along the file, where it lands in the picture. */
function alongPhoto(place: PhotoPlacement, x: number): number {
  return place.x + x * place.scale;
}

/** The same across it. */
function acrossPhoto(place: PhotoPlacement, y: number): number {
  return place.y + y * place.scale;
}

/** A point in the picture, back in the file's own pixels. */
function inPhoto(place: PhotoPlacement, x: number): number {
  return (x - place.x) / place.scale;
}

/**
 * Where the nut is: the photograph's, or the drawn neck's own start.
 *
 * Everything across the neck is measured from the nut, and in a
 * photograph the nut is wherever the picture puts it -- which is not
 * the left edge of the box.
 */
function nutXOf(options: FretboardOptions): number {
  const place = photoPlacement(options);
  if (place === undefined) return guitarLayout(options).neck.x;
  return alongPhoto(place, place.photo.frets[0] ?? 0);
}

/** The strings' middle, which is what a mark is measured from. */
function middleOf(options: FretboardOptions): number {
  const place = photoPlacement(options);
  if (place !== undefined) return acrossPhoto(place, photoStringMiddle(place.photo));
  const board = guitarLayout(options).board;
  return board.y + board.height / 2;
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
  const place = photoPlacement(options);
  if (place !== undefined) return photoHalfAt(place, 'board', x);
  const board = guitarLayout(options).board;
  const widest = (board.height * BOARD_FILL) / 2;
  const narrow = widest / NECK_TAPER;
  return narrow + (widest - narrow) * taperAt(options, x);
}

/** Half the span the strings themselves take, at a point along the neck. */
export function stringHalfAt(options: FretboardOptions, x: number): number {
  const place = photoPlacement(options);
  if (place !== undefined) return photoHalfAt(place, 'strings', x);
  return boardHalfAt(options, x) * (1 - STRING_MARGIN);
}

/**
 * The board's edges -- the wood outside the outer strings -- at a
 * point along the neck.
 *
 * Drawn, the board is centred on the strings; photographed, it is
 * wherever it was measured, which is very nearly but not exactly the
 * same. Anything that has to sit UNDER the board (a fret number, a
 * fret wire's ends) asks here rather than adding a half to a middle,
 * so it lands on the picture rather than near it.
 */
export function boardEdgesAt(
  options: FretboardOptions,
  x: number,
): { top: number; bottom: number } {
  const place = photoPlacement(options);
  if (place !== undefined) {
    const at = inPhoto(place, x);
    return {
      top: acrossPhoto(place, photoEdgeY(place.photo, 'board', 0, at)),
      bottom: acrossPhoto(place, photoEdgeY(place.photo, 'board', 1, at)),
    };
  }
  const middle = middleOf(options);
  const half = boardHalfAt(options, x);
  return { top: middle - half, bottom: middle + half };
}

/** Half of one of the photograph's two spans, where the picture is drawn. */
function photoHalfAt(place: PhotoPlacement, edge: 'strings' | 'board', x: number): number {
  const at = inPhoto(place, x);
  const top = photoEdgeY(place.photo, edge, 0, at);
  const bottom = photoEdgeY(place.photo, edge, 1, at);
  return ((bottom - top) / 2) * place.scale;
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
  bleed?: boolean;
  handLegend?: boolean;
  photo?: GuitarPhotograph;
}): readonly StringLine[] {
  const count = stringCount(options);
  if (!(options.height > 0)) return [];
  const full: FretboardOptions = {
    width: options.width ?? 1,
    height: options.height,
    ...(options.strings !== undefined ? { strings: options.strings } : {}),
    ...(options.fretNumbers !== undefined ? { fretNumbers: options.fretNumbers } : {}),
    ...(options.stringLabels !== undefined ? { stringLabels: options.stringLabels } : {}),
    // These two move the board -- a bled neck starts at the left edge,
    // and a hand legend pushes everything down under its band -- so a
    // string worked out without them lands somewhere there is no neck.
    ...(options.bleed !== undefined ? { bleed: options.bleed } : {}),
    ...(options.handLegend !== undefined ? { handLegend: options.handLegend } : {}),
    // And this one moves the strings themselves onto a photograph.
    ...(options.photo !== undefined ? { photo: options.photo } : {}),
  };
  const board = guitarLayout(full).board;
  // A photographed neck's strings are not symmetric about one line:
  // the band between the outer two drifts as well as widening, and a
  // middle-and-a-half model puts every string a sixth of a gap out at
  // both ends. So the outer two are asked for where they ARE, and the
  // rest are spread evenly between them.
  const ends = stringEdgesAt(full, nutXOf(full));
  const middle = (ends.top + ends.bottom) / 2;
  const half = (ends.bottom - ends.top) / 2;
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
  // On a photograph the two outer strings are measured at both ends
  // of the board, so a string at any point is simply its share of the
  // way between them -- which follows the drift of the band as well
  // as its spread, and a fan about a single middle line does not.
  if (options.photo !== undefined) {
    const count = stringCount(options);
    const { top, bottom } = stringEdgesAt(options, x);
    const at = Math.min(Math.max(string, 1), count);
    return count > 1 ? top + ((bottom - top) * (at - 1)) / (count - 1) : (top + bottom) / 2;
  }
  const lines = stringLines(options);
  const line = lines.find((candidate) => candidate.string === string);
  const middle = middleOf(options);
  if (line === undefined) return middle;
  const atNut = stringHalfAt(options, nutXOf(options));
  if (!(atNut > 0)) return middle;
  return middle + (line.offset - middle) * (stringHalfAt(options, x) / atNut);
}

/**
 * Where the two OUTER strings run, at a point along the neck.
 *
 * The photograph's own, where it has one: measured at the nut and at
 * the board's end and read off in between. Without one, the drawn
 * neck's symmetric band.
 */
function stringEdgesAt(options: FretboardOptions, x: number): { top: number; bottom: number } {
  const place = photoPlacement(options);
  if (place !== undefined) {
    const at = inPhoto(place, x);
    return {
      top: acrossPhoto(place, photoEdgeY(place.photo, 'strings', 0, at)),
      bottom: acrossPhoto(place, photoEdgeY(place.photo, 'strings', 1, at)),
    };
  }
  const middle = middleOf(options);
  const half = stringHalfAt(options, x);
  return { top: middle - half, bottom: middle + half };
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
  // A photograph's wires are where they were measured, which is the
  // real spacing: wide at the nut, crowding at the body.
  const place = photoPlacement(options);
  if (place !== undefined) {
    return place.photo.frets.map((offset, fret) => ({ fret, offset: alongPhoto(place, offset) }));
  }
  const neck = guitarLayout(options).neck;
  const perFret = neck.width / (last - first);
  const wires: FretWire[] = [];
  for (let fret = first; fret <= last; fret++) {
    wires.push({ fret, offset: neck.x + (fret - first) * perFret });
  }
  return wires;
}

/**
 * How wide one fret is drawn.
 *
 * Drawn, every fret is the same width, and that is the answer. On a
 * photograph they shrink all the way up the neck, and the only thing
 * that asks this is deciding what will FIT in a fret -- so the answer
 * is the narrowest one in the picture, which is the fret that decides
 * it.
 */
export function fretWidth(options: FretboardOptions): number {
  const place = photoPlacement(options);
  if (place !== undefined) {
    const wires = place.photo.frets;
    let narrowest = Infinity;
    for (let index = 1; index < wires.length; index++) {
      narrowest = Math.min(narrowest, (wires[index] as number) - (wires[index - 1] as number));
    }
    return Number.isFinite(narrowest) ? narrowest * place.scale : place.photo.width * place.scale;
  }
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
  // On a photograph a fret is the gap between two real wires, so the
  // finger goes halfway between them -- and half of a shrinking fret
  // is not half of an even one.
  const place = photoPlacement(options);
  if (place !== undefined) {
    const photo = place.photo;
    if (fret <= 0) return alongPhoto(place, photoWireX(photo, 0));
    return alongPhoto(place, (photoWireX(photo, fret - 1) + photoWireX(photo, fret)) / 2);
  }
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
