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
 * THE STUDIO RENDERS.
 *
 * The photoreal plugins do not draw their instruments at runtime.
 * They model one, light it, render it once at high resolution and
 * blit the picture -- a filmstrip, in that trade. These four are that
 * step: `tools/render_fretboard.py` builds each board out of the real
 * measurements of the instrument (the 17.817 rule, the nut width, the
 * string gauges), lights it, and writes a strip.
 *
 * Which is why these numbers are not measured off anything. The
 * renderer knows where it put every fret wire and every string,
 * because it put them there, and prints these on its way out. Re-run
 * it and paste what it prints.
 */

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

/** A classical: a wide, flat rosewood board with nothing set into it, and nylon strings. Nineteen frets. */
export const CLASSICAL_BOARD: PhotoMeasurements = {
  width: 2880,
  height: 488,
  frets: [
    85.2, 307.3, 516.9, 714.8, 901.5, 1077.8, 1244.2, 1401.2, 1549.5, 1689.4, 1821.4, 1946.1,
    2063.7, 2174.8, 2279.6, 2378.5, 2471.9, 2560.0, 2643.2, 2721.7,
  ],
  boardEndX: 2880.0,
  stringsAtNut: [113.1, 374.9],
  stringsAtEnd: [60.4, 427.6],
  boardAtNut: [85.7, 402.3],
  boardAtEnd: [42.7, 445.3],
};

/** A steel-string acoustic: rosewood, pearl dots, three wound strings. Twenty frets. */
export const ACOUSTIC_BOARD: PhotoMeasurements = {
  width: 2880,
  height: 418,
  frets: [
    83.3, 299.8, 504.1, 696.9, 879.0, 1050.8, 1212.9, 1366.0, 1510.5, 1646.8, 1775.5, 1897.0,
    2011.7, 2119.9, 2222.1, 2318.5, 2409.5, 2495.4, 2576.5, 2653.0, 2725.3,
  ],
  boardEndX: 2880.0,
  stringsAtNut: [101.9, 316.1],
  stringsAtEnd: [65.2, 352.8],
  boardAtNut: [81.0, 337.0],
  boardAtEnd: [42.2, 375.8],
};

/** An electric: a dark bound board with pearl blocks in it, and the shorter scale that goes with it. Twenty-two frets. */
export const ELECTRIC_BOARD: PhotoMeasurements = {
  width: 2880,
  height: 408,
  frets: [
    82.0, 288.4, 483.2, 667.1, 840.7, 1004.5, 1159.2, 1305.1, 1442.9, 1573.0, 1695.7, 1811.5,
    1920.9, 2024.1, 2121.5, 2213.5, 2300.2, 2382.2, 2459.5, 2532.5, 2601.3, 2666.4, 2727.7,
  ],
  boardEndX: 2880.0,
  stringsAtNut: [101.5, 306.5],
  stringsAtEnd: [63.6, 344.4],
  boardAtNut: [81.0, 327.0],
  boardAtEnd: [40.9, 367.1],
};

/** An extended-range electric: a flatter, wider board with small dots, going all the way to the twenty-fourth fret. */
export const EXTENDED_BOARD: PhotoMeasurements = {
  width: 2880,
  height: 408,
  frets: [
    76.7, 275.8, 463.7, 641.2, 808.6, 966.7, 1115.8, 1256.6, 1389.5, 1515.0, 1633.4, 1745.2, 1850.6,
    1950.2, 2044.2, 2132.9, 2216.6, 2295.6, 2370.2, 2440.6, 2507.1, 2569.8, 2629.0, 2684.9, 2737.6,
  ],
  boardEndX: 2880.0,
  stringsAtNut: [108.2, 299.8],
  stringsAtEnd: [63.0, 345.0],
  boardAtNut: [86.3, 321.7],
  boardAtEnd: [38.7, 369.3],
};

/**
 * Every set of measurements this engine carries, by the name of the
 * file it belongs to.
 *
 * A page names a picture; only the engine knows where that picture's
 * frets are. Anything not in here has to be measured before it can be
 * used, and using it unmeasured would put every mark in the wrong
 * place -- so an unknown name is nothing, not a guess.
 */
export const PHOTOS: Readonly<Record<string, PhotoMeasurements>> = {
  'acoustic-cutaway': ACOUSTIC_CUTAWAY,
  'fretboard-classical': CLASSICAL_BOARD,
  'fretboard-acoustic': ACOUSTIC_BOARD,
  'fretboard-electric': ELECTRIC_BOARD,
  'fretboard-extended': EXTENDED_BOARD,
};

/** The picture a page names, at the path the page keeps it. */
export function photoNamed(name: string, href: string): GuitarPhotograph | undefined {
  const measurements = PHOTOS[name];
  return measurements === undefined ? undefined : { ...measurements, href };
}

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
