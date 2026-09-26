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
  /**
   * What the picture IS, and so what box it wants.
   *
   * `board` is a strip of fretboard and nothing else: it belongs in
   * the board's own band, with the hand legend above it and the fret
   * numbers below.
   *
   * `frame` is a whole guitar, framed -- neck, the body opening out
   * past the joint, and the body running off the top and the bottom
   * because a body is wider than any frame. It IS the frame, so it
   * fills it, and the legend and the numbers are drawn over it. Such a
   * picture is made with its strings already where the board's band
   * has its middle, so the two line up without anything being moved.
   */
  readonly fit?: 'board' | 'frame';
  /**
   * Which stretch of the picture fills the frame's width, in the
   * file's own pixels: `[left, right]`.
   *
   * A picture is scaled to the frame's width and laid against its
   * left edge, which is the right answer when the guitar was framed
   * for it -- neck in from one edge, body out of the other. A picture
   * framed differently, with air around the guitar, comes out small
   * with the notation towering over it, and the part that matters --
   * the fretboard -- gets a fraction of the frame.
   *
   * This says which part of the file to show instead. `[251, 1293]`
   * means the frame starts just before the nut and ends just past the
   * bridge: the headstock runs off the left edge and the rest of the
   * body off the right, and the whole playing length of the guitar
   * gets the frame. It sets the scale AND the offset, because those
   * are one decision: fit that stretch across the width.
   *
   * Everything moves with it -- the marks, the fret numbers, the
   * board -- because they are all worked out from where the picture
   * lands.
   */
  readonly span?: readonly [number, number];
  /**
   * How far DOWN the frame to hang this picture, as a share of the
   * stage's height.
   *
   * A picture hangs by its strings, and they land where the drawn
   * neck's middle would. This moves them: 0 is that middle, 0.08 is a
   * twelfth of the stage lower. The guitar goes down and the notation
   * gets the room, which is what a frame with a lot of music in it
   * wants.
   */
  readonly drop?: number;
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

/**
 * The photograph the page draws for an acoustic: a natural-top
 * dreadnought, framed by its owner -- neck in from the left edge,
 * body filling the right, background cut away.
 *
 * Twenty-one lines across the board, and they are the NUT and twenty
 * frets. Measured off the file, and the INLAY DOTS are what settle
 * the numbering, because the wires alone cannot: a geometric series
 * fits equally well however they are numbered -- the nut position
 * and the scale length absorb any shift -- so counting from the
 * first line is a coin toss, and getting it wrong puts every mark a
 * fret out, which it did twice here.
 *
 * The dots cannot move. There are seven, at 262, 420, 562, 690, 859,
 * 1003 and 1086, and they have to come out as fret numbers a guitar
 * is actually inlaid at. Taking the first line as the nut lands them
 * on 3, 5, 7, 9, 12, 15 and 17, every one within a pixel of the
 * midpoint it belongs to -- the standard set. Taking it as the first
 * fret instead lands them on 4, 6, 8, 10, 13, 16, 18, which is not a
 * pattern any guitar has ever been built with. So the first line is
 * the nut, and it is on the picture.
 *
 * (This one is double-dotted at the SEVENTH as well as the twelfth,
 * which is unusual and is why "the double dot is the twelfth" is not
 * the check here. The whole set is.)
 *
 * The strings were fitted across twenty-six places and land within
 * half a pixel, where a string gap is twenty-two.
 */
export const ACOUSTIC_NATURAL: PhotoMeasurements = {
  width: 1920,
  height: 711,
  fit: 'frame',
  frets: [
    34, 132, 220, 304, 383, 458, 529, 596, 660, 721, 779, 834, 885, 934, 980, 1025, 1066, 1106,
    1143, 1178, 1212,
  ],
  boardEndX: 1255.0,
  stringsAtNut: [489.2, 592.2],
  stringsAtEnd: [470.3, 610.0],
  boardAtNut: [485.6, 596.7],
  boardAtEnd: [463.7, 620.8],
};

/**
 * The classical guitar the page draws: the owner's own drawing, not a
 * photograph.
 *
 * An Illustrator file, upright -- headstock at the top, body at the
 * bottom -- turned a quarter turn counter-clockwise so it lies the way
 * every other guitar here lies. `classical-drawn.svg` in the assets
 * folder is that turned copy; `Classic Guitar.svg` beside it is the
 * upright original it was built from.
 *
 * Nothing here was measured off pixels. A drawing carries its own
 * numbers, so these are read straight out of the file: every fret bar
 * is a rectangle with a stated y and height, and the centre of the
 * bar is the wire. Which line is the nut needs no argument either --
 * it is the one drawn 7.3 thick where every fret is 3.6, so it can be
 * picked out rather than guessed at, which is what the dots have to
 * do on a photograph. TWENTY lines: the nut and nineteen frets, which
 * is what a classical has.
 *
 * The drawing is a good one. Taking the nut and the twelfth as the
 * scale, every other wire lands within 2.6 units of where the real
 * 17.817 rule puts it, across a scale of 920.
 *
 * Turning it puts the low E at the BOTTOM: upright it is on the left,
 * and a quarter turn counter-clockwise sends the left side down,
 * which is where the engine numbers string 6.
 */
export const CLASSICAL_DRAWN: PhotoMeasurements = {
  width: 1513.5,
  height: 584.3,
  fit: 'frame',
  frets: [
    277.85, 331, 378.7, 423.5, 466.7, 508.5, 545.9, 581.3, 616.7, 649.6, 680.7, 711.1, 738, 764.1,
    788.3, 812.7, 835.3, 855.7, 874.9, 893.4,
  ],
  boardEndX: 937.5,
  stringsAtNut: [267.7, 325.9],
  stringsAtEnd: [256.7, 336.9],
  boardAtNut: [261.2, 332.3],
  boardAtEnd: [249.0, 344.5],
  // The owner marked the two ends they wanted in the frame: just
  // before the nut and just past the bridge. The drawing has air
  // around the guitar where a photograph has the body already
  // running off the edges, so scaled to the width it sat small with
  // the notation towering over it and the headstock taking a
  // quarter of the frame.
  span: [251, 1293],
  drop: 0.13,
};

/**
 * The single-cut electric the page draws: the owner's own drawing, a
 * Telecaster shape, and it already lies the way the page wants it --
 * headstock in from the left, body out to the right.
 *
 * Unlike the classical, the file is not structured enough to read
 * numbers out of: 860 paths, all under a transform. So this one was
 * measured off a render, the way the photographs were, at twice its
 * size and drawn into a page with no margin and the picture's exact
 * width -- open an SVG as a document instead and the browser hands
 * back the drawing offset by the body margin and stretched to the
 * window, which is a measurement of the browser rather than of the
 * guitar, and it was worth eleven pixels here.
 *
 * The wires give themselves away by their SHADING. They are drawn
 * white along the top of the board and grey along the bottom, the
 * way a round wire catches the light, so a white run in the upper
 * board is a fret and nothing else is. Twenty-three lines answer to
 * that -- but the last, at 1242.5, is white all the way down, which
 * makes it the end of the fretboard and not a wire. So: the nut and
 * TWENTY-TWO frets, which is what a Telecaster has, and what the
 * page's list already said.
 *
 * The inlay dots settle the numbering completely. There are nine --
 * 559, 666, 760.5, 845.5, 955.5 (a DOUBLE), 1048, 1102, 1149, 1192 --
 * and against these wires they come out as 3, 5, 7, 9, 12, 15, 17, 19
 * and 21, every one within 0.7 of its own midpoint and the double one
 * on the twelfth. That is the standard set, and nothing else is near.
 *
 * The nut is at 407.6, which is not the middle of the bone bar it is
 * drawn as (405.3) but close to its front edge, where a string
 * actually leaves it. That is the line the fret spacing is measured
 * from: take it and the whole series lands within 2.1 of the real
 * 17.817 rule, across a scale of 1129.
 */
export const ELECTRIC_DRAWN: PhotoMeasurements = {
  width: 1920,
  height: 638,
  fit: 'frame',
  frets: [
    407.6, 471, 531, 587.2, 641, 691.2, 738.5, 783.2, 825.8, 865.5, 903.2, 938.8, 972.2, 1004.2,
    1033.8, 1062.8, 1089.2, 1114.5, 1138.2, 1161, 1182.2, 1203.2, 1222,
  ],
  boardEndX: 1242.5,
  stringsAtNut: [285.5, 345.4],
  stringsAtEnd: [277.7, 355.9],
  boardAtNut: [281.1, 351.5],
  boardAtEnd: [269.8, 360],
  // Framed like the classical, because the owner asked for the same:
  // the nut on one edge of the frame and the bridge on the other, so
  // the headstock runs off the left and the rest of the body off the
  // right. The bridge plate ends at 1602.
  span: [375, 1654],
  drop: 0.13,
};
/**
 * The photograph: a sunburst cutaway dreadnought, neck running in
 * from the left and the body filling the right.
 *
 * A real photograph, and the only thing here that is. The renders
 * below are good; a photograph of a real instrument is better, and no
 * renderer written by hand is going to beat one. Measured the hard
 * way, off the file: the fret wires as the bright lines across the
 * dark board, the strings as the bright lines along it, both fitted
 * across the whole run -- the board edges to within about a pixel,
 * the strings to within two, where a string gap is twenty-three.
 *
 * Twenty frets, and the light band at 1590 is where the board ENDS
 * rather than a twenty-first: the soundhole starts just past it. The
 * numbering was checked the way the natural-top one was -- fitted to
 * the inlay dots, which land its wires within 0.18 of whole fret
 * numbers with the first of them at fret 1.
 */
export const ACOUSTIC_SUNBURST: PhotoMeasurements = {
  width: 2000,
  height: 714,
  fit: 'frame',
  frets: [
    106.8, 220, 332, 439, 539, 636, 725, 808, 885, 960, 1028, 1093, 1157, 1214, 1270, 1321, 1368,
    1416, 1458, 1498, 1538,
  ],
  boardEndX: 1590.0,
  stringsAtNut: [434.8, 547.9],
  stringsAtEnd: [414.1, 565.1],
  boardAtNut: [428.0, 558.6],
  boardAtEnd: [398.3, 578.5],
};

/** A classical: a wide, flat rosewood board with nothing set into it, and nylon strings. Nineteen frets. */
export const CLASSICAL_BOARD: PhotoMeasurements = {
  width: 2880,
  height: 824,
  fit: 'frame',
  frets: [
    71.8, 259.1, 435.8, 602.5, 760.0, 908.6, 1048.8, 1181.2, 1306.1, 1424.1, 1535.4, 1640.4, 1739.6,
    1833.2, 1921.6, 2005.0, 2083.7, 2158.0, 2228.1, 2294.3,
  ],
  boardEndX: 2880.0,
  stringsAtNut: [326.4, 547.0],
  stringsAtEnd: [270.2, 603.2],
  boardAtNut: [303.3, 570.1],
  boardAtEnd: [260.1, 613.3],
};

/** A steel-string acoustic: rosewood, pearl dots, three wound strings. Twenty frets. */
export const ACOUSTIC_BOARD: PhotoMeasurements = {
  width: 2880,
  height: 824,
  fit: 'frame',
  frets: [
    68.8, 246.8, 414.8, 573.3, 723.0, 864.2, 997.5, 1123.4, 1242.2, 1354.3, 1460.1, 1560.0, 1654.2,
    1743.2, 1827.2, 1906.5, 1981.3, 2051.9, 2118.6, 2181.5, 2240.9,
  ],
  boardEndX: 2880.0,
  stringsAtNut: [348.2, 525.2],
  stringsAtEnd: [309.0, 564.4],
  boardAtNut: [328.6, 544.9],
  boardAtEnd: [289.3, 584.1],
};

/** An electric: a dark bound board with pearl blocks in it, and the shorter scale that goes with it. Twenty-two frets. */
export const ELECTRIC_BOARD: PhotoMeasurements = {
  width: 2880,
  height: 824,
  fit: 'frame',
  frets: [
    68.1, 239.7, 401.6, 554.4, 698.6, 834.8, 963.3, 1084.6, 1199.1, 1307.1, 1409.1, 1505.4, 1596.3,
    1682.1, 1763.0, 1839.4, 1911.5, 1979.6, 2043.9, 2104.5, 2161.8, 2215.8, 2266.8,
  ],
  boardEndX: 2880.0,
  stringsAtNut: [351.6, 521.9],
  stringsAtEnd: [311.3, 562.2],
  boardAtNut: [334.5, 538.9],
  boardAtEnd: [294.2, 579.2],
};

/** A Stratocaster: a rosewood board with small dots, three single coils on a cream scratchplate, and twenty-one frets. */
export const STRAT_BOARD: PhotoMeasurements = {
  width: 2880,
  height: 824,
  fit: 'frame',
  frets: [
    67.7, 243.7, 409.7, 566.5, 714.4, 854.1, 985.9, 1110.3, 1227.7, 1338.5, 1443.1, 1541.9, 1635.1,
    1723.0, 1806.1, 1884.4, 1958.4, 2028.2, 2094.1, 2156.3, 2215.1, 2270.5,
  ],
  boardEndX: 2880.0,
  stringsAtNut: [352.1, 521.4],
  stringsAtEnd: [313.0, 560.4],
  boardAtNut: [335.1, 538.3],
  boardAtEnd: [293.9, 579.5],
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
  'acoustic-sunburst': ACOUSTIC_SUNBURST,
  'acoustic-natural': ACOUSTIC_NATURAL,
  'classical-drawn': CLASSICAL_DRAWN,
  'electric-drawn': ELECTRIC_DRAWN,
  'fretboard-classical': CLASSICAL_BOARD,
  'fretboard-acoustic': ACOUSTIC_BOARD,
  'fretboard-electric': ELECTRIC_BOARD,
  'fretboard-strat': STRAT_BOARD,
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
