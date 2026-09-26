/**
 * photo.ts — a photograph of a guitar, measured.
 *
 * Everything else in this engine DRAWS a guitar. This file lets a
 * picture of one stand in for the drawing, which is the only way to
 * get the thing a player recognises instantly: real wood, a real
 * soundhole, a body whose curve nobody chose.
 *
 * A picture on its own is useless here -- a mark has to land on the
 * fifth fret of the second string, and only the file knows where that
 * is. So a photograph arrives MEASURED: the x of every fret wire and
 * the y of the outer strings at both ends of the board, in the file's
 * own pixels. Those numbers are the contract. Scale and shift them
 * with the picture and every mark the engine draws lands on the real
 * string in the real fret.
 */

/**
 * A guitar photograph, and where its parts are in it.
 *
 * All of it is in the FILE's pixels, top-left origin, so the same
 * measurements hold however big the picture is drawn.
 */
export interface GuitarPhotograph {
  /**
   * Where the file is. The caller's, always: an engine that guessed a
   * path would be guessing about a page it has never seen.
   */
  readonly href: string;
  readonly width: number;
  readonly height: number;
  /**
   * Every fret wire across the board: index 0 is the nut, index n is
   * the wire at the far end of fret n. So the picture shows as many
   * frets as this has entries, less one -- there is no arguing with a
   * photograph about how many frets it has.
   */
  readonly frets: readonly number[];
  /** Where the board stops, past the last wire. */
  readonly boardEndX: number;
  /** The outer strings at the nut: the thinnest first, the thickest second. */
  readonly stringsAtNut: readonly [number, number];
  /** The same two where the board ends. They fan out on the way. */
  readonly stringsAtEnd: readonly [number, number];
  /** The board's own edges -- the wood outside the strings -- at those same two places. */
  readonly boardAtNut: readonly [number, number];
  readonly boardAtEnd: readonly [number, number];
}

/** A photograph's measurements without the path to it. */
export type PhotoMeasurements = Omit<GuitarPhotograph, 'href'>;

/**
 * The sample: a cutaway dreadnought, neck running in from the left
 * edge and the body leaving by the right.
 *
 * The numbers were read off the file itself -- the fret wires are
 * where the picture's fret wires are, not where the 17.817 rule says
 * they should be, because the picture is what the marks are landing
 * on. Frets 0 to 20, which is what a cutaway shows.
 */
export const ACOUSTIC_CUTAWAY: PhotoMeasurements = {
  width: 1920,
  height: 636,
  frets: [
    80, 222, 329, 430, 525, 614, 698, 777, 852, 922, 988, 1050, 1110, 1165, 1217, 1268, 1313, 1359,
    1398, 1437, 1475,
  ],
  boardEndX: 1521,
  stringsAtNut: [409, 517],
  stringsAtEnd: [392, 534],
  boardAtNut: [413, 527],
  boardAtEnd: [376, 548],
};

/** A photograph to draw with: measurements, and where the file is. */
export function guitarPhoto(
  href: string,
  measurements: PhotoMeasurements = ACOUSTIC_CUTAWAY,
): GuitarPhotograph {
  return { ...measurements, href };
}

/** How many frets the picture actually shows. */
export function photoFretCount(photo: GuitarPhotograph): number {
  return Math.max(1, photo.frets.length - 1);
}

/**
 * A fret wire's x in the file, for a fret that may be between two of
 * them.
 *
 * Fractional because a slide is between frets while it travels. Past
 * the last wire it carries on at the last spacing rather than
 * stopping dead, so a note the picture does not reach still has a
 * place rather than a pile-up on the final fret.
 */
export function photoWireX(photo: GuitarPhotograph, fret: number): number {
  const wires = photo.frets;
  const last = wires.length - 1;
  const first = wires[0] ?? 0;
  if (last < 1) return first;
  if (fret <= 0) return first;
  if (fret >= last) {
    const end = wires[last] as number;
    const before = wires[last - 1] as number;
    return end + (fret - last) * (end - before);
  }
  const low = Math.floor(fret);
  const a = wires[low] as number;
  const b = wires[low + 1] as number;
  return a + (b - a) * (fret - low);
}

/**
 * Where a point across the board is, at a point along it.
 *
 * `edge` picks which pair of measurements to read -- the strings or
 * the board's own edges -- and `side` is 0 for the top one and 1 for
 * the bottom. Straight lines between the two ends, and carried on
 * beyond them: the neck does not stop at the nut, it goes on to the
 * tuners.
 */
export function photoEdgeY(
  photo: GuitarPhotograph,
  edge: 'strings' | 'board',
  side: 0 | 1,
  x: number,
): number {
  const nutX = photo.frets[0] ?? 0;
  const endX = photo.boardEndX;
  const from = (edge === 'strings' ? photo.stringsAtNut : photo.boardAtNut)[side];
  const to = (edge === 'strings' ? photo.stringsAtEnd : photo.boardAtEnd)[side];
  const span = endX - nutX;
  if (!(Math.abs(span) > 0)) return from;
  return from + (to - from) * ((x - nutX) / span);
}

/** The middle of the strings, which is what the picture is hung by. */
export function photoStringMiddle(photo: GuitarPhotograph): number {
  const nut = (photo.stringsAtNut[0] + photo.stringsAtNut[1]) / 2;
  const end = (photo.stringsAtEnd[0] + photo.stringsAtEnd[1]) / 2;
  return (nut + end) / 2;
}
