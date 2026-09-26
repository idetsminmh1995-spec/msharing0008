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
   *
   * `whole` shows the ENTIRE picture and cuts nothing: it is scaled
   * to fit the box on both axes and centred in it, the way a photo
   * viewer shows a photograph. A guitar that is all there reads as a
   * guitar; one with its body sliced across the top reads as a
   * picture that did not fit. `span` and `drop` are for deciding
   * which PART of a picture to show, so they do not apply here.
   */
  readonly fit?: 'board' | 'frame' | 'whole';
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
 * The dreadnought acoustic the page draws: the owner's own drawing,
 * and it already lies the way the page wants it.
 *
 * The file is a 177.2 square with the guitar across the middle, so
 * the copy the page loads carries a tight viewBox -- the guitar's own
 * bounding box at ten pixels to the unit, 1743 by 682, which is the
 * space these numbers are in. Without that the engine would take the
 * stage's height from a picture that is mostly empty sky.
 *
 * Measured off a render, like the electric: an <img> at the picture's
 * exact size in a page with no margin, never the SVG opened as a
 * document. Twenty-one lines cross the board and the first is wider
 * than the rest, which makes it the nut: the nut and TWENTY frets,
 * which is what a dreadnought has.
 *
 * The numbering is settled here by the FRET RULE rather than by the
 * dots, because this drawing is accurate about the one and stylised
 * about the other. Fitting the nut and the scale to all twenty wires
 * at once lands every one of them within 1.7 of where the real 17.817
 * rule puts it, across a scale of 1091 -- and puts the nut at 254.7,
 * which is the front edge of the nut bar as drawn, where a string
 * really does leave it. No other numbering fits that way.
 *
 * The dots agree as far as they go and then wander: 5, 7 (a double,
 * as on this owner's other drawings), 9 and 12 land within a pixel of
 * their own midpoints, but the last two sit on 14 and 16 where a real
 * guitar would put 15 and 17. They are decoration here, so the rule
 * wins.
 */
export const ACOUSTIC_DRAWN: PhotoMeasurements = {
  width: 1743,
  height: 682,
  fit: 'whole',
  frets: [
    254.7, 316, 374, 428, 479, 529, 574.5, 617, 657, 698.5, 732, 767, 801.5, 830, 859, 886, 912,
    936.5, 959, 982, 1003,
  ],
  boardEndX: 1035,
  stringsAtNut: [300.8, 361.7],
  stringsAtEnd: [294.7, 378.4],
  boardAtNut: [292, 369.4],
  boardAtEnd: [284.5, 389.1],
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
  fit: 'whole',
  frets: [
    277.85, 331, 378.7, 423.5, 466.7, 508.5, 545.9, 581.3, 616.7, 649.6, 680.7, 711.1, 738, 764.1,
    788.3, 812.7, 835.3, 855.7, 874.9, 893.4,
  ],
  boardEndX: 937.5,
  stringsAtNut: [267.7, 325.9],
  stringsAtEnd: [256.7, 336.9],
  boardAtNut: [261.2, 332.3],
  boardAtEnd: [249.0, 344.5],
};

/**
 * The double-cut electric the page draws: the owner's own drawing, a
 * Stratocaster shape.
 *
 * Their file is upright, headstock at the top, so `strat-drawn.svg`
 * is the same artwork turned a quarter turn counter-clockwise with
 * its bounding box turned with it -- 3058 by 1002, which is the
 * space these numbers are in. Counter-clockwise puts the low E at
 * the bottom, where the engine numbers string 6.
 *
 * Measured off a render at the picture's own size, in a page with no
 * margin. Twenty-three lines cross the board: the first is drawn
 * eight wide where every fret is four or five, which makes it the
 * nut. The nut and TWENTY-TWO frets.
 *
 * Both checks agree here, which is the comfortable case. Fitting the
 * fret rule to all twenty-two wires at once lands every one of them
 * within 1.1 of it, across a scale of 2002, and puts the nut at
 * 570.5 -- the front edge of the bar as drawn. And all NINE inlay
 * dots come out as 3, 5, 7, 9, 12 (the double), 15, 17, 19 and 21,
 * every one within two of its own midpoint: the full standard
 * electric set, with nothing wandering the way the acoustic's last
 * two do.
 */
export const STRAT_DRAWN: PhotoMeasurements = {
  width: 3058,
  height: 1002,
  fit: 'whole',
  frets: [
    570.5, 683, 790, 889, 983, 1072, 1156.5, 1236.5, 1311, 1382, 1449, 1512, 1571, 1626.5, 1680,
    1731, 1778, 1822, 1865, 1904, 1942, 1978, 2010.5,
  ],
  boardEndX: 2033,
  stringsAtNut: [450.5, 561.9],
  stringsAtEnd: [436.2, 583],
  boardAtNut: [446.1, 568.9],
  boardAtEnd: [422.5, 595.6],
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
  fit: 'whole',
  frets: [
    407.6, 471, 531, 587.2, 641, 691.2, 738.5, 783.2, 825.8, 865.5, 903.2, 938.8, 972.2, 1004.2,
    1033.8, 1062.8, 1089.2, 1114.5, 1138.2, 1161, 1182.2, 1203.2, 1222,
  ],
  boardEndX: 1242.5,
  stringsAtNut: [285.5, 345.4],
  stringsAtEnd: [277.7, 355.9],
  boardAtNut: [281.1, 351.5],
  boardAtEnd: [269.8, 360],
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
  'acoustic-drawn': ACOUSTIC_DRAWN,
  'classical-drawn': CLASSICAL_DRAWN,
  'electric-drawn': ELECTRIC_DRAWN,
  'strat-drawn': STRAT_DRAWN,
};

/** The picture a page names, at the path the page keeps it. */
export function photoNamed(name: string, href: string): GuitarPhotograph | undefined {
  const measurements = PHOTOS[name];
  return measurements === undefined ? undefined : { ...measurements, href };
}

/** A photograph to draw with: measurements, and where the file is. */
export function guitarPhoto(
  href: string,
  measurements: PhotoMeasurements = ACOUSTIC_DRAWN,
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
